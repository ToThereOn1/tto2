/**
 * POST /api/admin/generate-arrival?petId=xxx
 * Admin-only (CRON_SECRET): Generate/regenerate the initial arrival event for a pet.
 * Used when the first feed is missing after Deep Remembrance completion.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import {
    generateStatusEvent,
    calculateTothereonDay,
    calculateIntelligenceScore,
    calculateLearningStage,
} from '@/lib/event-generator';
import { detectUserLanguage } from '@/lib/language-detector';
import { getCurrentZone } from '@/lib/zone-manager';
import type { PersonaProfile, DimensionalScores } from '@/lib/types/database';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    // Auth via CRON_SECRET
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const petId = request.nextUrl.searchParams.get('petId');
    if (!petId) {
        return NextResponse.json({ error: 'Missing petId query param' }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // 1. Fetch pet + persona
    const { data: pet, error: petError } = await adminClient
        .from('pets')
        .select(`
            id, name, species, breed, relationship, passed_date,
            pet_personas (
                id, persona_profile, dimensional_scores
            )
        `)
        .eq('id', petId)
        .single();

    if (petError || !pet) {
        return NextResponse.json({ error: 'Pet not found', detail: petError?.message }, { status: 404 });
    }

    const persona = Array.isArray(pet.pet_personas) ? pet.pet_personas[0] : pet.pet_personas;
    if (!persona) {
        return NextResponse.json({ error: 'No persona found. Complete Deep Remembrance first.' }, { status: 404 });
    }

    const personaProfile = persona.persona_profile as PersonaProfile;
    const dimensionalScores = (persona.dimensional_scores || {
        social_energy: 50,
        curiosity_drive: 50,
        affection_style: 50,
        emotional_resilience: 50,
        playfulness_intensity: 50,
        food_motivation: 50,
        empathy_sensitivity: 50,
        social_preference: 50,
    }) as DimensionalScores;

    // 2. Calculate current ToThereOn day
    const tothereonDay = calculateTothereonDay(pet.passed_date);
    const realDaysElapsed = Math.ceil(
        Math.abs(Date.now() - new Date(pet.passed_date).getTime()) / (1000 * 60 * 60 * 24)
    );

    console.log(`[generate-arrival] Pet: ${pet.name} | Day: ${tothereonDay}`);

    // 3. Delete any existing event for this day (clean slate for first feed)
    const { data: existingEvent } = await adminClient
        .from('pet_status_events')
        .select('id')
        .eq('pet_id', petId)
        .eq('tothereon_day', tothereonDay)
        .maybeSingle();

    if (existingEvent) {
        await adminClient
            .from('pet_status_events')
            .delete()
            .eq('pet_id', petId)
            .eq('tothereon_day', tothereonDay);
        console.log(`[generate-arrival] Deleted existing event for Day ${tothereonDay}`);
    }

    // 4. Detect language from Deep Remembrance responses
    const { data: drData } = await adminClient
        .from('deep_remembrance_responses')
        .select('responses')
        .eq('pet_id', petId)
        .maybeSingle();

    const drForLang = drData?.responses
        ? { deep_remembrance_responses: { responses: drData.responses } }
        : null;
    const userLanguage = detectUserLanguage(drForLang || {}, null, null);

    console.log(`[generate-arrival] Language: ${userLanguage}`);

    // 5. Build context (arrival = first feed, always)
    const currentZone = getCurrentZone(tothereonDay);
    const intelligenceScore = calculateIntelligenceScore(dimensionalScores);
    const { speed: learningSpeed, daysUntilMastery } = calculateLearningStage(tothereonDay, intelligenceScore);

    const memoryAnchors: string[] = [];
    if (personaProfile.memory_anchors && Array.isArray(personaProfile.memory_anchors)) {
        personaProfile.memory_anchors.forEach((anchor: any) => {
            if (anchor.details) memoryAnchors.push(`${anchor.category}: ${anchor.details}`);
        });
    }

    // 6. Generate arrival event
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
        eventType: 'arrival',
        userLanguage,
        languageSource: 'Deep Remembrance',
        recentLetter: null,
        memoryAnchors,
        isPremium: false,
        intelligenceScore,
        learningStage: 'just_arrived',
        learningSpeed,
        daysUntilMastery,
        recentEvents: [],
    });

    // 7. Save to database
    const { data: savedEvent, error: saveError } = await adminClient
        .from('pet_status_events')
        .insert({
            pet_id: petId,
            tothereon_day: tothereonDay,
            event_type: eventResult.eventType,
            event_title: `Day ${tothereonDay}`,
            event_description: eventResult.content,
            mood: 'peaceful',
            event_language: eventResult.language,
            zone: eventResult.zone,
            location: eventResult.location,
            npc_involved: eventResult.npcInvolved,
            is_learning_event: eventResult.isLearningEvent,
            learning_stage: eventResult.learningStage,
            metadata: { ...eventResult.metadata },
        } as any)
        .select()
        .single();

    if (saveError) {
        console.error('[generate-arrival] Save error:', saveError);
        return NextResponse.json({ error: saveError.message }, { status: 500 });
    }

    console.log(`[generate-arrival] ✅ Arrival event created | Pet: ${pet.name} | Day: ${tothereonDay} | Lang: ${userLanguage}`);

    return NextResponse.json({
        success: true,
        petName: pet.name,
        day: tothereonDay,
        language: userLanguage,
        eventType: eventResult.eventType,
        content: eventResult.content,
        savedEventId: savedEvent.id,
    });
}
