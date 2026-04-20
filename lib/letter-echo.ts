import { createAdminClient } from '@/lib/supabase/server';
import { generateMicroEvents, getTimeOfDay, getPersonalityBucket } from '@/lib/micro-event-engine';
import { getCurrentZone, getZoneDisplayName } from '@/lib/zone-manager';
import type { MicroEventContext, SupportedLanguage } from '@/lib/micro-event-types';

interface LetterEchoParams {
    petId: string;
    petName: string;
    species: string;
    breed: string | null;
    currentDay: number;
}

export async function createLetterEchoEvent(params: LetterEchoParams): Promise<void> {
    const { petId, petName, species, breed, currentDay } = params;
    const adminClient = createAdminClient();

    const { data: persona } = await adminClient
        .from('pet_personas')
        .select('dimensional_scores, narrative_data')
        .eq('pet_id', petId)
        .single();

    if (!persona?.dimensional_scores) return;

    const scores = persona.dimensional_scores as Record<string, number>;
    const narrativeData = persona.narrative_data as Record<string, unknown> | null;
    const currentZone = getCurrentZone(currentDay);

    const lang: SupportedLanguage = narrativeData?.language === 'Korean' ? 'ko'
        : narrativeData?.language === 'Japanese' ? 'ja'
        : 'en';

    const ctx: MicroEventContext = {
        petName: petName || 'Pet',
        species: species || 'dog',
        breed: breed ?? null,
        currentDay,
        currentZone,
        zoneDisplayName: getZoneDisplayName(currentZone),
        timeOfDay: getTimeOfDay(),
        language: lang,
        personalityBucket: getPersonalityBucket({
            socialEnergy: scores.social_energy ?? 50,
            curiosityDrive: scores.curiosity_drive ?? 50,
            playfulnessIntensity: scores.playfulness_intensity ?? 50,
            emotionalResilience: scores.emotional_resilience ?? 50,
        }),
        socialEnergy: scores.social_energy ?? 50,
        curiosityDrive: scores.curiosity_drive ?? 50,
        playfulnessIntensity: scores.playfulness_intensity ?? 50,
        emotionalResilience: scores.emotional_resilience ?? 50,
        activeNpc: null,
        letterEcho: { emotion: 'warmth', intensity: 1.0 },
        secretHabit: null,
        preciousMemory: null,
    };

    const echoEvents = generateMicroEvents(ctx, new Set(), 1);

    if (echoEvents.length > 0) {
        const echo = echoEvents[0];
        await adminClient
            .from('pet_micro_events')
            .insert({
                pet_id: petId,
                category: echo.category,
                template_id: echo.templateId,
                content: echo.content,
                zone: echo.zone,
                mood: echo.mood,
                npc_involved: echo.npcInvolved,
                time_of_day: echo.timeOfDay,
                tothereon_day: echo.tothereonDay,
                language: echo.language,
                metadata: { trigger: 'letter_send' },
            });
    }
}
