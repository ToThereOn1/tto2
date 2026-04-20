import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { calculateToThereOnDay, getZoneForDay } from '@/lib/time-engine-v2'
import { generateStatusEvent, generateArrivalEvent, calculateTothereonDay, determineEventType } from '@/lib/event-generator'
import type { StatusEventContext } from '@/lib/event-generator'
import { getCurrentZone } from '@/lib/zone-manager'
import type { PersonaProfile, DimensionalScores } from '@/lib/types/database'

/**
 * POST /api/test/simulate-day
 * 
 * Test endpoint to simulate a day passing and generate a new event.
 * If a persona exists, it generates a personalized event using v2.0 generator.
 */
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Get authenticated user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await request.json()
        const { petId } = body

        if (!petId) {
            return NextResponse.json({ error: 'petId is required' }, { status: 400 })
        }

        // Verify pet ownership
        const { data: pet, error: petError } = await supabase
            .from('pets')
            .select('*')
            .eq('id', petId)
            .eq('user_id', user.id)
            .single()

        if (petError || !pet) {
            return NextResponse.json({ error: 'Pet not found' }, { status: 404 })
        }

        // Get last event for this pet
        const { data: lastEvent } = await supabase
            .from('pet_status_events')
            .select('tothereon_day')
            .eq('pet_id', petId)
            .order('tothereon_day', { ascending: false })
            .limit(1)
            .single()

        const lastDay = lastEvent?.tothereon_day ?? -1
        const nextDay = lastDay + 1

        // Check for persona
        const { data: persona } = await supabase
            .from('pet_personas')
            .select('*')
            .eq('pet_id', petId)
            .single()

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let event: any;

        if (nextDay === 0) {
            event = generateArrivalEvent({ name: pet.name, species: pet.species })
            event = { type: event.eventType, title: `Day 0`, description: event.content, zone: event.zone }
        } else if (persona) {
            // Generate personalized event using v2.0 generator
            console.log(`Generating v2.0 event for ${pet.name} (Day ${nextDay})`)
            const personaProfile = (persona.persona_profile || {}) as PersonaProfile
            const dimensionalScores = (persona.dimensional_scores || {
                social_energy: 50, curiosity_drive: 50, affection_style: 50,
                emotional_resilience: 50, playfulness_intensity: 50,
                food_motivation: 50, empathy_sensitivity: 50, social_preference: 50,
            }) as DimensionalScores

            const currentZone = getCurrentZone(nextDay)
            const eventType = determineEventType(nextDay, false, dimensionalScores)

            const memoryAnchors: string[] = []
            if (personaProfile.memory_anchors && Array.isArray(personaProfile.memory_anchors)) {
                personaProfile.memory_anchors.forEach((anchor: any) => {
                    if (anchor.details) memoryAnchors.push(`${anchor.category}: ${anchor.details}`)
                })
            }

            const eventResult = await generateStatusEvent({
                petId,
                petName: pet.name,
                species: pet.species,
                breed: pet.breed,
                relationship: pet.relationship,
                personaProfile,
                dimensionalScores,
                currentDay: nextDay,
                realDaysElapsed: nextDay * 7,
                currentZone,
                eventType,
                userLanguage: 'Korean',
                languageSource: 'Test',
                recentLetter: null,
                memoryAnchors,
                isPremium: false,
            })

            event = {
                type: eventResult.eventType,
                title: `Day ${nextDay}`,
                description: eventResult.content,
                zone: eventResult.zone,
                mood: 'peaceful',
                metadata: eventResult.metadata,
                event_language: eventResult.language,
            }
        } else {
            // Fallback: simple arrival-like event
            event = {
                type: 'daily_routine',
                title: `Day ${nextDay}`,
                description: `${pet.name} spent a quiet day in ToThereOn World, watching the light shift across the meadow.`,
                zone: getCurrentZone(nextDay),
            }
        }

        // Save to database
        const { data: newEvent, error: insertError } = await supabase
            .from('pet_status_events')
            .insert({
                pet_id: petId,
                tothereon_day: nextDay,
                event_type: event.type,
                event_title: event.title,
                event_description: event.description,
                zone: event.zone,
            })
            .select()
            .single()

        if (insertError) {
            console.error('Failed to insert event:', insertError)
            return NextResponse.json({ error: 'Failed to save event' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: `Generated Day ${nextDay} event for ${pet.name}`,
            event: newEvent,
            isPersonalized: !!persona
        })
    } catch (error) {
        console.error('Simulate day error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
