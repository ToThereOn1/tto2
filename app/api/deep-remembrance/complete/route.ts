import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { getMasterAnalyzer, type SurveyResponse, type PetInfo } from '@/lib/analysis/master-analyzer'
import { generatePersonaPrompt } from '@/lib/analysis/prompt-generator'
import { analyzeAge } from '@/lib/analysis/age-analyzer'
import { getBreedReference } from '@/lib/analysis/breed-reference'
import { analyzeAndSaveVisualDNA } from '@/lib/visual-dna'
import { revalidatePath } from 'next/cache'
import { generateStatusEvent, calculateTothereonDay, calculateIntelligenceScore, calculateLearningStage } from '@/lib/event-generator'
import { getCurrentZone } from '@/lib/zone-manager'
import { detectUserLanguage } from '@/lib/language-detector'
import { AI_CONFIG } from '@/lib/ai-config'

/**
 * POST /api/deep-remembrance/complete
 * Trigger Visual DNA analysis and Persona Generation
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

        // =====================================================
        // [VISUAL DNA TRIGGER]
        // Workflow A: Initial Creation
        // =====================================================
        // Only run if visual_description is missing and photos exist
        if (!pet.visual_description && pet.photos && pet.photos.length > 0) {
            console.log(`Visual DNA: Triggering initial analysis for pet ${petId}`)
            // Fire-and-forget to not block the persona response
            analyzeAndSaveVisualDNA(petId, pet.photos).catch(err =>
                console.error('Visual DNA Analysis background error:', err)
            )
        } else {
            if (pet.visual_description) console.log(`Visual DNA: Description already exists for ${petId}`)
            else console.log(`Visual DNA: No photos available for ${petId}`)
        }
        // =====================================================

        // 3. Fetch survey responses
        const { data: response, error: responseError } = await supabase
            .from('deep_remembrance_responses')
            .select('*')
            .eq('id', responseId)
            .single()

        if (responseError || !response) {
            return NextResponse.json({ error: 'Survey response not found' }, { status: 404 })
        }

        // 4. Prepare pet info for Master Analyzer
        const petInfo: PetInfo = {
            id: petId,
            name: pet.name,
            species: pet.species || 'dog',
            breed: pet.breed || 'Mixed',
            birth_year: pet.birth_year || undefined,
            passing_year: pet.passing_year || undefined,
        }

        // Determine survey version from response
        const surveyVersion: number = response.survey_version ?? 1;

        // Fetch Survey Questions from DB (for structured response conversion)
        const { data: dbQuestions, error: qError } = await supabase
            .from('survey_questions')
            .select('*')
            .eq('is_active', true)
            .eq('version', surveyVersion)
            .order('order_index', { ascending: true });

        if (qError || !dbQuestions) {
            console.error('Failed to fetch survey questions:', qError);
            return NextResponse.json({ error: 'Failed to fetch survey configuration' }, { status: 500 });
        }

        // Convert flat responses to structured SurveyResponse format
        const structuredResponses: Record<string, SurveyResponse> = {};
        const rawResponses = response.responses || {};

        for (const q of (dbQuestions as any[])) {
            const qKey = q.question_key;
            const rawAnswer = rawResponses[qKey];
            if (!rawAnswer) continue;

            const options = Array.isArray(q.options) ? q.options : [];
            const isMultiple = q.allow_multiple === true;
            const inputType = q.type || q.input_type;

            // Text question
            if (inputType === 'text' || inputType === 'long_text' || inputType === 'short_text') {
                structuredResponses[qKey] = {
                    question_key: qKey,
                    answer_type: 'text',
                    text_answer: typeof rawAnswer === 'string' ? rawAnswer : (rawAnswer?.text_answer || String(rawAnswer)),
                };
                continue;
            }

            // Already structured answer (from v2.0 frontend)
            if (typeof rawAnswer === 'object' && rawAnswer.answer_type) {
                structuredResponses[qKey] = rawAnswer as SurveyResponse;
                continue;
            }

            // Multiple choice (array of selections)
            if (isMultiple && typeof rawAnswer === 'object' && rawAnswer.selected_choices) {
                structuredResponses[qKey] = {
                    question_key: qKey,
                    answer_type: 'multiple_choice',
                    selected_choices: rawAnswer.selected_choices,
                    other_text: rawAnswer.other_text,
                };
                continue;
            }

            // Legacy: flat string answer — match to option
            if (typeof rawAnswer === 'string') {
                const matchedOption = options.find((o: any) => o.value === rawAnswer || o.label === rawAnswer);

                if (rawAnswer.startsWith('Other') || rawAnswer.includes('기타')) {
                    structuredResponses[qKey] = {
                        question_key: qKey,
                        answer_type: 'other',
                        other_text: rawAnswer,
                    };
                } else if (matchedOption) {
                    structuredResponses[qKey] = {
                        question_key: qKey,
                        answer_type: 'single_choice',
                        selected_choice: {
                            label: matchedOption.label || rawAnswer,
                            value: matchedOption.value || rawAnswer,
                            score: matchedOption.score,
                            dimension: matchedOption.dimension,
                        },
                    };
                } else {
                    // Unmatched string — treat as text
                    structuredResponses[qKey] = {
                        question_key: qKey,
                        answer_type: 'text',
                        text_answer: rawAnswer,
                    };
                }
            }
        }

        // =====================================================
        // [BACKGROUND PROCESSING]
        // =====================================================
        // We moved the heavy Persona Analysis and Initial Event Generation
        // to a background task so the user doesn't have to wait 20+ seconds.
        after(
            (async () => {
                try {
                    // 5. Run Master Analyzer
                    console.log(`[BACKGROUND] 🧬 Running Deep Persona Analysis for ${pet.name}(${petId})...`)
                    const analyzer = getMasterAnalyzer()
                    const personaAnalysis = await analyzer.analyzeComplete(structuredResponses, petInfo, surveyVersion)

                    // 5.5. Age Profile & Breed Reference (NEW - v3.0)
                    const ageAtPassing = pet.age_at_passing
                        ?? (pet.birth_date && pet.passed_date
                            ? Math.round((new Date(pet.passed_date).getTime() - new Date(pet.birth_date).getTime()) / (365.25 * 24 * 3600 * 1000) * 10) / 10
                            : null)

                    const ageProfile = ageAtPassing
                        ? analyzeAge(ageAtPassing, petInfo.species as 'dog' | 'cat', petInfo.breed)
                        : null

                    let breedRef = null
                    try {
                        breedRef = await getBreedReference(petInfo.species as 'dog' | 'cat', petInfo.breed)
                    } catch (breedErr) {
                        console.warn('Breed reference lookup failed (non-critical):', breedErr)
                    }

                    console.log(`📊 Age Profile: ${ageProfile ? `${ageProfile.age_years}y, ${ageProfile.life_stage_kr}` : 'N/A'} `)
                    console.log(`🐾 Breed Reference: ${breedRef ? breedRef.breed_name : 'N/A'} `)

                    // 6. Generate System Prompt (ENHANCED - v3.0)
                    const systemPrompt = generatePersonaPrompt(personaAnalysis, petInfo, breedRef, ageProfile)
                    console.log(`✅ System prompt generated: ${systemPrompt.length} chars`)

                    // 7. Save to Database (upsert to handle re-analysis)
                    // Extract healing_mission from grief_context (v2.2)
                    const healingMission = personaAnalysis.grief_context?.healing_mission ?? null;

                    const { data: savedPersona, error: saveError } = await supabase
                        .from('pet_personas')
                        .upsert({
                            pet_id: petId,
                            response_id: responseId,
                            persona_analysis: {
                                ...personaAnalysis,
                                age_profile: ageProfile,
                                breed_reference: breedRef,
                            },
                            system_prompt: systemPrompt,
                            persona_profile: personaAnalysis,
                            dimensional_scores: personaAnalysis.temperament.behavioral_scores,
                            confidence_score: personaAnalysis.analysis_metadata.confidence_score,
                            data_quality: personaAnalysis.analysis_metadata.data_quality,
                            healing_mission: healingMission,
                            analysis_version: surveyVersion >= 2 ? '2.2' : '2.0',
                            analyzed_at: new Date().toISOString(),
                            generation_model: AI_CONFIG.EVENT_MODEL,
                        }, { onConflict: 'pet_id' })
                        .select()
                        .single()

                    if (saveError) {
                        console.error('Failed to save persona:', saveError)
                        return NextResponse.json({ error: 'Failed to save persona to database' }, { status: 500 })
                    }

                    // Alias for downstream usage
                    const personaProfile = personaAnalysis as any;

                    // 7. Update pet status
                    await supabase
                        .from('pets')
                        .update({ persona_generated: true })
                        .eq('id', petId)

                    // Revalidate paths
                    revalidatePath(`/dashboard/pets/${petId}`)

                    // =====================================================
                    // [INITIAL STATUS EVENT TRIGGER]
                    // Generate the first "Day 1" (or Day 0) status update immediately
                    // =====================================================

                    // ToThereOn day calculation
                    const tothereonDay = calculateTothereonDay(pet.passed_date);
                    const realDaysElapsed = Math.ceil(
                        Math.abs(Date.now() - new Date(pet.passed_date).getTime()) / (1000 * 60 * 60 * 24)
                    );

                    // Language detection: use actual survey text answers (not the pet table column)
                    const userLanguage = detectUserLanguage(
                        { deep_remembrance_responses: { responses: response.responses } },
                        null,
                        null
                    );
                    console.log(`[Initial Event] Detected language: ${userLanguage} from survey responses`);

                    // Dimensional scores: use behavioral_scores from analysis if available
                    const dimensionalScores = {
                        social_energy: personaAnalysis.temperament.big_five.sociability ?? 50,
                        curiosity_drive: personaAnalysis.temperament.big_five.openness ?? 50,
                        affection_style: personaAnalysis.temperament.big_five.agreeableness ?? 50,
                        emotional_resilience: 100 - (personaAnalysis.temperament.big_five.neuroticism ?? 50),
                        playfulness_intensity: personaAnalysis.temperament.big_five.energy ?? 50,
                        food_motivation: 50,
                        empathy_sensitivity: personaAnalysis.emotional_profile.empathy_level ?? 50,
                        social_preference: personaAnalysis.temperament.big_five.sociability ?? 50,
                    };

                    const currentZone = getCurrentZone(tothereonDay);

                    // Learning context
                    const intelligenceScore = calculateIntelligenceScore(dimensionalScores);
                    const { speed: learningSpeed, daysUntilMastery } = calculateLearningStage(tothereonDay, intelligenceScore);

                    // First event is ALWAYS arrival ("discovery" bulletin)
                    const eventType = 'arrival' as const;
                    const learningStage = 'just_arrived';

                    // Memory anchors from analysis
                    const memoryAnchors: string[] = [];
                    const sigMoments = personaAnalysis.uniqueness.signature_moments || [];
                    sigMoments.forEach((m: any) => {
                        if (m.description) memoryAnchors.push(m.description);
                    });
                    if (personaAnalysis.uniqueness.one_sentence_essence) {
                        memoryAnchors.push(personaAnalysis.uniqueness.one_sentence_essence);
                    }

                    const eventResult = await generateStatusEvent({
                        petId,
                        petName: pet.name,
                        species: pet.species,
                        breed: pet.breed,
                        relationship: pet.relationship,
                        personaProfile: personaAnalysis as any,
                        dimensionalScores,
                        currentDay: tothereonDay,
                        realDaysElapsed,
                        currentZone,
                        eventType,
                        userLanguage,
                        languageSource: 'Deep Remembrance',
                        recentLetter: null,
                        memoryAnchors,
                        isPremium: false,
                        intelligenceScore,
                        learningStage,
                        learningSpeed,
                        daysUntilMastery,
                    });

                    await supabase.from('pet_status_events').insert({
                        pet_id: petId,
                        tothereon_day: tothereonDay,
                        event_type: eventResult.eventType,
                        event_title: `Day ${tothereonDay}`,
                        // Prepend the discovery note — pet has been there since passed_date, not since DR
                        event_description: `We found ${pet.name} — already ${tothereonDay} day${tothereonDay !== 1 ? 's' : ''} into life in ToThereOn World.\n\n${eventResult.content}`,
                        mood: 'peaceful',
                        event_language: userLanguage || 'English',
                        zone: eventResult.zone,
                        location: eventResult.location,
                        npc_involved: eventResult.npcInvolved,
                        is_learning_event: eventResult.isLearningEvent,
                        learning_stage: eventResult.learningStage,
                        metadata: { ...eventResult.metadata },
                    } as any);
                    console.log(`[Initial Event] First contact event created | Day ${tothereonDay} | Lang: ${userLanguage || 'English'} | is_learning: ${eventResult.isLearningEvent}`);

                } catch (backgroundError) {
                    console.error('[BACKGROUND] Unhandled background error:', backgroundError);
                }
            })()
        );

        // =====================================================
        // [IMMEDIATE RESPONSE]
        // Return quickly so the UI can proceed immediately
        // =====================================================
        return NextResponse.json({
            success: true,
            message: "Persona generation started in background",
            // Note: personaId and detailed previews are no longer available instantly
            // The frontend should rely on the `persona_generated` flag on the pet record 
            // becoming `true` later
        })

    } catch (error) {
        console.error('Deep Remembrance Complete Error:', error)
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal server error' },
            { status: 500 }
        )
    }
}
