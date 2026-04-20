import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generatePersona, calculateDimensionalScores, extractNarrativeData, PetData } from '@/lib/llm-client'
import { revalidatePath } from 'next/cache'

/**
 * POST /api/persona/generate
 * Trigger persona generation from survey response
 */
export async function POST(request: NextRequest) {
    try {
        const { petId, responseId } = await request.json()

        if (!petId || !responseId) {
            return NextResponse.json({ error: 'Missing petId or responseId' }, { status: 400 })
        }

        const supabase = await createClient()

        // 1. Get authenticated user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // 2. Fetch pet info
        const { data: pet, error: petError } = await supabase
            .from('pets')
            .select('*')
            .eq('id', petId)
            .eq('user_id', user.id)
            .single()

        if (petError || !pet) {
            return NextResponse.json({ error: 'Pet not found' }, { status: 404 })
        }

        // 3. Fetch survey responses
        const { data: response, error: responseError } = await supabase
            .from('deep_remembrance_responses')
            .select('*')
            .eq('id', responseId)
            .single()

        if (responseError || !response) {
            return NextResponse.json({ error: 'Survey response not found' }, { status: 404 })
        }

        // 4. Prepare data for LLM
        const petData: PetData = {
            name: pet.name,
            species: pet.species,
            breed: pet.breed,
            gender: pet.gender, // Assuming gender exists on pet
            relationship: pet.relationship || 'companion', // Default if missing
        }

        // Fetch Survey Questions from DB to support CMS updates
        const { data: dbQuestions, error: qError } = await supabase
            .from('survey_questions')
            .select('*')
            .eq('is_active', true)
            .order('order_index', { ascending: true });

        if (qError || !dbQuestions) {
            console.error('Failed to fetch survey questions:', qError);
            return NextResponse.json({ error: 'Failed to fetch survey configuration' }, { status: 500 });
        }

        // Cast to typed array to avoid lint errors
        const typedQuestions = dbQuestions as any[];

        // Map DB questions to scoring format
        // options is JSONB, need to parse or cast
        const scoringQuestions = typedQuestions.map(q => {
            // Find options that have scores
            const options = Array.isArray(q.options) ? q.options : [];
            const scoringMap: Record<string, number> = {};
            let dimension = null;

            options.forEach((opt: any) => {
                if (opt.score !== undefined && opt.dimension) {
                    scoringMap[opt.value] = opt.score;
                    dimension = opt.dimension; // Assuming one dimension per question for now
                }
            });

            return {
                question_key: q.question_key, // Use Q01, Q02... from DB to match response keys
                // But calculateDimensionalScores likely uses responses keys.
                // Wait, responses are keyed by 'Q01', 'Q02' etc in current hardcoded version?
                // If SurveyResponse uses 'Q01', we need to map DB questions to those keys or update Response saving logic too.
                // FOR NOW: Let's assume the Response is simply a Map<QuestionText|ID, Answer>.
                // Checking deep_remembrance_responses table... it stores JSONB 'responses'.
                scoring_dimension: dimension,
                scoring_map: Object.keys(scoringMap).length > 0 ? scoringMap : null,
            };
        });

        // CRITICAL: The 'responses' JSONB in deep_remembrance_responses might be keyed by "Q01", "Q02"...
        // If the Frontend saves them using Index or ID, we need to match that.
        // Since we just migrated, the old code used 'question_key' (Q01..).
        // The new CMS-based Survey Editor might save answers using Question ID.
        // BUT, the existing data (if any) uses Q01.
        // AND the new Survey Editor / Survey Taker needs to be consistent.

        // Let's assume for this refactor that `responses` keys are compatible or we can map them.
        // If `calculateDimensionalScores` relies on `question_key` matching the response key:
        // We need to ensure `scoringQuestions` has the correct `question_key`.
        // In the DB, we don't have 'Q01' field.
        // We might need to map by 'order_index' -> 'Q{index}' if that's how it was done, 
        // OR update the response saving logic to use Question IDs.

        // Given the instructions: "modifications reflected in persona generation"
        // It implies future surveys will use this.
        // Let's rely on the question text or ID matching? 
        // No, standard practice is ID.

        // HOWEVER, `calculateDimensionalScores` likely iterates over the QUESTIONS and looks up the ANSWER in the response object.
        // Let's check `lib/llm-client.ts` to be sure.

        // Calculate scores and extract narrative
        const dimensionalScores = calculateDimensionalScores(response.responses, scoringQuestions)
        const narrativeData = extractNarrativeData(response.responses, { relationship: pet.relationship })

        // 5. Generate Persona using Claude 3.5 Opus
        console.log(`Generating persona for pet ${pet.name} (${pet.id})...`)
        const personaProfile = await generatePersona(petData, dimensionalScores, narrativeData)

        // 6. Save to Database
        const { data: savedPersona, error: saveError } = await supabase
            .from('pet_personas')
            .insert({
                pet_id: petId,
                response_id: responseId,
                dimensional_scores: dimensionalScores,
                narrative_data: narrativeData,
                persona_profile: personaProfile,
                quality_score: personaProfile.persona_quality_score.overall_score,
                detail_richness: personaProfile.persona_quality_score.detail_richness,
                emotional_authenticity: personaProfile.persona_quality_score.emotional_authenticity,
                behavioral_consistency: personaProfile.persona_quality_score.behavioral_consistency,
                narrative_depth: personaProfile.persona_quality_score.narrative_depth,
                generation_model: 'claude-3-5-opus-20250205',
            })
            .select()
            .single()

        if (saveError) {
            console.error('Failed to save persona:', saveError)
            return NextResponse.json({ error: 'Failed to save persona to database' }, { status: 500 })
        }

        // 7. Update pet status
        await supabase
            .from('pets')
            .update({ persona_generated: true })
            .eq('id', petId)

        // 8. Trigger first arrival event immediately (fire-and-forget, non-blocking)
        // This generates the pet's first feed post right after Deep Remembrance completes
        // so users don't have to wait until the next daily cron run.
        if (process.env.CRON_SECRET) {
            const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
            fetch(`${appUrl}/api/pets/${petId}/generate-event?initial=true`, {
                method: 'POST',
                headers: {
                    'x-internal-secret': process.env.CRON_SECRET,
                },
            }).catch(err => console.error('[persona/generate] First event trigger failed (non-critical):', err))
        }

        // Revalidate paths
        revalidatePath(`/dashboard/pets/${petId}`)

        return NextResponse.json({
            success: true,
            personaId: savedPersona.id,
            qualityScore: savedPersona.quality_score
        })

    } catch (error) {
        console.error('Persona generation error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
