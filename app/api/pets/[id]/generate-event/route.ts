import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generateStatusEvent, calculateTothereonDay, determineEventType, calculateIntelligenceScore, calculateLearningStage } from '@/lib/event-generator'
import type { StatusEventContext } from '@/lib/event-generator'
import { detectUserLanguage } from '@/lib/language-detector'
import { getCurrentZone } from '@/lib/zone-manager'
import type { PersonaProfile, DimensionalScores } from '@/lib/types/database'
import { extractLastSentence } from '@/lib/utils/sentence-parser'
import type { SentenceLang } from '@/lib/utils/sentence-parser'

interface RouteParams {
    params: Promise<{ id: string }>
}

/**
 * POST /api/pets/[id]/generate-event
 * Generate a new emotional status event for the pet (v2.0)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: petId } = await params
        console.log(`[generate-event] POST called | petId: ${petId}`)

        // Internal server-to-server trigger (from persona generation) — bypasses cookie auth
        const internalSecret = request.headers.get('x-internal-secret')
        const isInternalTrigger = !!internalSecret && internalSecret === process.env.CRON_SECRET

        // Use admin client for operations
        const adminClient = createAdminClient()
        console.log('[generate-event] ✅ Admin client created')

        // Auth check — skip for internal triggers
        let user: { id: string; email?: string } | null = null
        if (!isInternalTrigger) {
            const supabase = await createClient()
            const { data: { user: authUser } } = await supabase.auth.getUser()
            if (!authUser) {
                console.error('[generate-event] ❌ Unauthorized - no user session')
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }
            user = authUser
            console.log(`[generate-event] ✅ Auth OK | user: ${user?.email}`)
        } else {
            console.log('[generate-event] ✅ Internal trigger — skipping cookie auth')
        }

        // 1. Get pet info
        const { data: pet, error: petError } = await adminClient
            .from('pets')
            .select(`
                id, name, species, breed, relationship, passed_date,
                pet_personas (
                    id, persona_profile, dimensional_scores
                )
            `)
            .eq('id', petId)
            .single()

        if (petError || !pet) {
            console.error('[generate-event] ❌ Pet fetch error:', petError?.message, '| petId:', petId)
            return NextResponse.json({ error: 'Pet not found' }, { status: 404 })
        }
        console.log(`[generate-event] ✅ Pet found: ${pet.name} | passed_date: ${pet.passed_date} | has_persona: ${!!pet.pet_personas}`)

        // 2. Get persona
        const persona = Array.isArray(pet.pet_personas) ? pet.pet_personas[0] : pet.pet_personas
        if (!persona) {
            console.error(`[generate-event] ❌ No persona for pet: ${pet.name} | pet_personas: ${JSON.stringify(pet.pet_personas)}`)
            return NextResponse.json({ error: 'Persona not found. Complete Deep Remembrance first.' }, { status: 404 })
        }
        console.log(`[generate-event] ✅ Persona found | force: ${request.nextUrl.searchParams.get('force')} | isAdmin: ${user?.email === process.env.ADMIN_EMAIL}`)

        const personaProfile = persona.persona_profile as PersonaProfile
        const dimensionalScores = (persona.dimensional_scores || {
            social_energy: 50, curiosity_drive: 50, affection_style: 50,
            emotional_resilience: 50, playfulness_intensity: 50,
            food_motivation: 50, empathy_sensitivity: 50, social_preference: 50,
        }) as DimensionalScores

        // 3. Get recent letter
        const { data: recentLetter } = await adminClient
            .from('letters')
            .select('content, created_at')
            .eq('pet_id', petId)
            .eq('sender_type', 'user')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

        // 4. Fetch recent events for narrative continuity (v3.0: extended to 7 for richer context)
        const { data: recentEventData } = await adminClient
            .from('pet_status_events')
            .select('tothereon_day, event_type, location, npc_involved, event_description, metadata')
            .eq('pet_id', petId)
            .order('tothereon_day', { ascending: false })
            .limit(7)

        const recentEvents = (recentEventData || []).map((e: any) => ({
            day: e.tothereon_day as number,
            eventType: e.event_type as string,
            locationName: (e.metadata as any)?.location_name || e.location || undefined,
            npcName: e.npc_involved || undefined,
            firstSentence: ((e.event_description || '') as string).split(/[.。!！]/)[0]?.trim() || '',
            metadata: { hook_sentence: (e.metadata as any)?.hook_sentence || '' },
        }))

        // 5. Detect Language
        // If no recent letter, fall back to deep_remembrance_responses table for language signal
        let drResponsesForLang: any = null
        if (!recentLetter) {
            const { data: drData } = await adminClient
                .from('deep_remembrance_responses')
                .select('responses')
                .eq('pet_id', petId)
                .maybeSingle()
            if (drData?.responses) {
                drResponsesForLang = { deep_remembrance_responses: { responses: drData.responses } }
            }
        }
        const userLanguage = detectUserLanguage(drResponsesForLang || pet, null, recentLetter)
        const languageSource = recentLetter ? 'Recent Letter' : (drResponsesForLang ? 'Deep Remembrance' : 'Default')

        // Calculate ToThereOn day
        const tothereonDay = calculateTothereonDay(pet.passed_date)
        const realDaysElapsed = Math.ceil(
            Math.abs(Date.now() - new Date(pet.passed_date).getTime()) / (1000 * 60 * 60 * 24)
        )

        // Check for duplicate
        const { data: existingEvent } = await adminClient
            .from('pet_status_events')
            .select('id')
            .eq('pet_id', petId)
            .eq('tothereon_day', tothereonDay)
            .maybeSingle()

        // Admin Override Logic
        const isAdmin = !isInternalTrigger && user?.email === process.env.ADMIN_EMAIL
        const force = request.nextUrl.searchParams.get('force') === 'true'
        // forceArrival: admin-only, generates the initial arrival event (first feed)
        const forceArrival = isAdmin && request.nextUrl.searchParams.get('forceArrival') === 'true'
        // isInitialTrigger: server-side persona generation first event — always arrival, skip duplicate check
        const isInitialTrigger = isInternalTrigger && request.nextUrl.searchParams.get('initial') === 'true'

        if (existingEvent && !(isAdmin && force) && !(isAdmin && forceArrival) && !isInitialTrigger) {
            return NextResponse.json({
                success: false,
                error: `Day ${tothereonDay} event already exists`,
                existingEventId: existingEvent.id
            }, { status: 409 })
        }

        // forceArrival: delete existing and re-insert arrival event
        if (forceArrival && existingEvent) {
            await adminClient
                .from('pet_status_events')
                .delete()
                .eq('pet_id', petId)
                .eq('tothereon_day', tothereonDay)
        }

        // force (admin test): accumulate — insert at next available day instead of overwriting
        let effectiveTothereonDay = tothereonDay
        if (isAdmin && force && existingEvent && !forceArrival) {
            const { data: lastEvent } = await adminClient
                .from('pet_status_events')
                .select('tothereon_day')
                .eq('pet_id', petId)
                .order('tothereon_day', { ascending: false })
                .limit(1)
                .single()
            effectiveTothereonDay = (lastEvent?.tothereon_day ?? tothereonDay) + 1
        }

        // Determine event type & zone
        const hasRecentLetter = !!recentLetter && (
            Date.now() - new Date(recentLetter.created_at).getTime() < 8 * 24 * 60 * 60 * 1000
        )
        const currentZone = getCurrentZone(effectiveTothereonDay)

        // Learning progression (v3.0)
        const intelligenceScore = calculateIntelligenceScore(dimensionalScores)
        const { stage: learningStage, speed: learningSpeed, daysUntilMastery } = calculateLearningStage(tothereonDay, intelligenceScore)

        // forceArrival / isInitialTrigger both force arrival event type
        const useArrivalType = forceArrival || isInitialTrigger
        const eventType = useArrivalType
            ? 'arrival' as const
            : determineEventType(tothereonDay, hasRecentLetter, dimensionalScores, learningStage, learningSpeed)
        const resolvedLearningStage = useArrivalType ? 'just_arrived' : learningStage

        // Memory anchors
        const memoryAnchors: string[] = []
        if (personaProfile.memory_anchors && Array.isArray(personaProfile.memory_anchors)) {
            personaProfile.memory_anchors.forEach((anchor: any) => {
                if (anchor.details) memoryAnchors.push(`${anchor.category}: ${anchor.details}`)
            })
        }

        // Letter context
        let letterContext: StatusEventContext['recentLetter'] = null
        if (hasRecentLetter && recentLetter) {
            const sentences = (recentLetter.content || '').split(/[.!?。！？]+/).filter((s: string) => s.trim().length > 10)
            letterContext = {
                content: recentLetter.content,
                quotes: sentences.slice(0, 3).map((s: string) => s.trim()),
                date: new Date(recentLetter.created_at).toLocaleDateString(),
            }
        }

        console.log(`[generate-event] ✅ tothereonDay: ${tothereonDay} | eventType: ${eventType} | existingEvent: ${existingEvent?.id || 'none'}`)

        // Generate event
        console.log('[generate-event] 🔄 Calling Claude API...')
        const eventResult = await generateStatusEvent({
            petId,
            petName: pet.name,
            species: pet.species,
            breed: pet.breed,
            relationship: pet.relationship,
            personaProfile,
            dimensionalScores,
            currentDay: tothereonDay,
            realDaysElapsed,
            currentZone,
            eventType,
            userLanguage,
            languageSource,
            recentLetter: letterContext,
            memoryAnchors,
            isPremium: false,
            intelligenceScore,
            learningStage: resolvedLearningStage,
            learningSpeed,
            daysUntilMastery,
            recentEvents,
        })

        console.log(`[generate-event] ✅ Claude done | content length: ${eventResult.content.length}`)

        // Determine mood from event type (dynamic, not hardcoded)
        const EVENT_TYPE_MOOD: Record<string, string> = {
            arrival: 'joyful',
            letter_response: 'longing',
            guardian_observation: 'nostalgic',
            milestone: 'peaceful',
            exploration: 'curious',
            npc_interaction: 'playful',
            daily_routine: 'peaceful',
            learning_observation: 'curious',
            first_lesson: 'curious',
            practice_session: 'playful',
        };
        const mood = EVENT_TYPE_MOOD[eventResult.eventType] || 'peaceful';

        // Save to database
        console.log('[generate-event] 🔄 Saving to DB...')
        const detectedLang = (userLanguage === 'ko' || userLanguage === 'ja' ? userLanguage : 'en') as SentenceLang
        const { data: savedEvent, error: saveError } = await adminClient
            .from('pet_status_events')
            .insert({
                pet_id: petId,
                tothereon_day: effectiveTothereonDay,
                event_type: eventResult.eventType,
                event_title: `Day ${effectiveTothereonDay}`,
                event_description: eventResult.content,
                mood,
                event_language: eventResult.language,
                zone: eventResult.zone,
                location: eventResult.location,
                npc_involved: eventResult.npcInvolved,
                is_learning_event: eventResult.isLearningEvent,
                learning_stage: eventResult.learningStage,
                metadata: {
                    ...eventResult.metadata,
                    hook_sentence: extractLastSentence(eventResult.content, detectedLang),
                },
            } as any)
            .select()
            .single()

        if (saveError) {
            console.error('[generate-event] ❌ Save error:', saveError.message, saveError.code, saveError.details)
            return NextResponse.json({ error: 'Failed to save event' }, { status: 500 })
        }

        console.log(`[generate-event] ✅ Saved! event id: ${savedEvent?.id}`)

        // 🔔 Auto-create notification for new pet feed post
        try {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
            await fetch(`${baseUrl}/api/notifications/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.CRON_SECRET}` },
                body: JSON.stringify({
                    userId: user?.id ?? (pet as any).user_id,
                    type: 'new_event',
                    title: `${pet.name} has a new update!`,
                    message: `There's something new happening with ${pet.name} in ToThereOn World. Check the Pet Feed to see what's going on.`,
                    linkUrl: `/dashboard/pets/${petId}/status`,
                    metadata: { petId, eventId: savedEvent?.id }
                })
            })
        } catch (notifErr) {
            console.error('[generate-event] Notification send failed (non-critical):', notifErr)
        }

        return NextResponse.json({
            success: true,
            eventId: savedEvent?.id
        })

    } catch (error) {
        console.error('Generate event error:', error)
        return NextResponse.json({
            error: 'Internal server error'
        }, { status: 500 })
    }
}

/**
 * GET /api/pets/[id]/generate-event
 * Get all status events for the pet (status feed)
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: petId } = await params

        // Auth check
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get events for this pet
        const { data: events, error } = await supabase
            .from('pet_status_events')
            .select('*')
            .eq('pet_id', petId)
            .order('created_at', { ascending: false })
            .limit(20)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ events: events || [] })

    } catch (error) {
        console.error('Get events error:', error)
        return NextResponse.json({ error: 'Internal error' }, { status: 500 })
    }
}
