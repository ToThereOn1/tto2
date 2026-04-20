// MODULE_07 참조: Zone Manager v2.0
// ToThereOn World 구역 관리 - 펫의 현재 위치, 구역 진행, 로케이션/시간 유틸

import { WORLDBOOK } from './worldview-constants';

// ─── Zone Progression ──────────────────────────────────────────────────
export function getCurrentZone(toThereOnDay: number): string {
    if (toThereOnDay < 3) return 'crystal_meadow'       // Days 0-2: Gentle introduction
    if (toThereOnDay < 10) return 'eternity_forest'      // Days 3-9: Deeper exploration
    if (toThereOnDay < 30) return 'crystal_lake'         // Days 10-29: Settling in
    if (toThereOnDay < 100) return 'sunset_hill'         // Days 30-99: Reflective phase
    // After day 100, cycle through zones based on day
    const zones = ['crystal_meadow', 'eternity_forest', 'crystal_lake', 'sunset_hill'];
    return zones[(toThereOnDay - 100) % zones.length];
}

export function getZoneDisplayName(zoneKey: string): string {
    const zones: Record<string, string> = {
        central_plaza: 'Central Plaza',
        crystal_meadow: 'Crystal Meadow',
        eternity_forest: 'Eternity Forest',
        crystal_lake: 'Crystal Lake',
        sunset_hill: 'Sunset Hill',
        // Legacy mappings (for DB records created before zone unification)
        meadow: 'Crystal Meadow',
        forest: 'Eternity Forest',
        lake: 'Crystal Lake',
        cloud_peaks: 'Sunset Hill',
        arrival_gate: 'Central Plaza',
        rainbow_valley: 'Crystal Meadow',
        memory_village: 'Crystal Lake',
        peaceful_sanctuary: 'Sunset Hill',
    };
    return zones[zoneKey] || zoneKey;
}

export function getZoneEmoji(zoneKey: string): string {
    const emojis: Record<string, string> = {
        central_plaza: '🏛️',
        crystal_meadow: '🌸',
        eternity_forest: '🌲',
        crystal_lake: '💎',
        sunset_hill: '🌅',
        // Legacy
        rainbow_valley: '🌈',
        memory_village: '🏘️',
        peaceful_sanctuary: '🕊️',
    };
    return emojis[zoneKey] || '🌍';
}

// ─── Location Selection ────────────────────────────────────────────────

interface Location {
    id: string;
    name: string;
    description: string;
    suitable_for_events: string[];
}

/**
 * Get all locations available in a given zone
 */
export function getLocationsForZone(zoneKey: string): Location[] {
    // Check living areas
    const livingArea = WORLDBOOK.ZONES.LIVING_AREAS.find(z => z.id === zoneKey);
    if (livingArea) return livingArea.locations as unknown as Location[];

    // Check central plaza
    if (zoneKey === 'central_plaza') {
        return WORLDBOOK.ZONES.CENTRAL_PLAZA.locations as unknown as Location[];
    }

    // Fallback: return crystal_meadow locations
    const fallback = WORLDBOOK.ZONES.LIVING_AREAS[0] as any;
    return fallback.locations as Location[];
}

/**
 * Select a location based on event type and personality
 */
export function selectLocation(
    eventType: string,
    personality: { social_energy: number; playfulness_intensity: number; emotional_resilience: number; curiosity_drive: number },
    currentZone: string
): Location {
    const locations = getLocationsForZone(currentZone);

    // Filter by event type suitability
    const suitable = locations.filter(loc =>
        loc.suitable_for_events.includes(eventType) ||
        loc.suitable_for_events.includes('any')
    );

    const pool = suitable.length > 0 ? suitable : locations;

    // Arrival → welcome plaza in central_plaza
    if (eventType === 'arrival') {
        const welcomePlaza = WORLDBOOK.ZONES.CENTRAL_PLAZA.locations.find(
            loc => loc.id === 'welcome_plaza'
        );
        if (welcomePlaza) return welcomePlaza as unknown as Location;
    }

    // Learning events → prefer meadow/grove spaces (quiet, open)
    if (eventType === 'learning_observation' || eventType === 'first_lesson' || eventType === 'practice_session') {
        const learningSpot = pool.find(loc =>
            loc.id.includes('edge') || loc.id.includes('hollow') || loc.id.includes('grove') || loc.id.includes('center')
        );
        if (learningSpot) return learningSpot;
    }

    // Personality-based selection
    if (eventType === 'guardian_observation' || eventType === 'letter_response') {
        // Prefer reflection pools
        const reflectionPool = pool.find(loc => loc.id.includes('reflection_pool') || loc.id.includes('quiet') || loc.id.includes('edge'));
        if (reflectionPool) return reflectionPool;
    }

    if ((100 - personality.emotional_resilience) > 60) {
        // High anxiety → prefer quiet/safe spots
        const quiet = pool.find(loc => loc.id.includes('quiet') || loc.id.includes('edge') || loc.id.includes('hollow'));
        if (quiet) return quiet;
    }

    if (personality.playfulness_intensity > 70) {
        // Playful → prefer open/center spots
        const open = pool.find(loc => loc.id.includes('center') || loc.id.includes('garden') || loc.id.includes('shore'));
        if (open) return open;
    }

    if (personality.curiosity_drive > 70) {
        // Curious → prefer exploration spots
        const explore = pool.find(loc => loc.id.includes('grove') || loc.id.includes('canopy') || loc.id.includes('deep'));
        if (explore) return explore;
    }

    // Random from pool
    return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Time of Day ───────────────────────────────────────────────────────

/**
 * Get the time of day based on current hour
 */
export function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getUTCHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
}

/**
 * Get atmospheric description for time of day
 */
export function getTimeAtmosphere(timeOfDay: string): string {
    const atmospheres: Record<string, string> = {
        morning: 'The first light crept across the horizon, turning everything to soft gold.',
        afternoon: 'The sun hung high, casting sharp shadows and warming every surface.',
        evening: 'The sky deepened to copper and violet, and the world grew quiet.',
        night: 'Stars appeared one by one, and the blue-glowing moss softly illuminated the paths.'
    };
    return atmospheres[timeOfDay] || atmospheres.afternoon;
}

// ─── NPC Selection ─────────────────────────────────────────────────────

interface NPC {
    id: string;
    name: string;
    species: string;
    personality: string;
    trait: string;
    zones: readonly string[];
}

/**
 * Select a teacher NPC for learning events based on pet personality.
 * - High anxiety (emotional_resilience < 40) → nurturing/gentle teacher
 * - Low social energy (< 50) → quiet/calm teacher
 * - Default → patient/wise teacher
 */
export function selectTeacherNPC(
    personality: { social_energy: number; emotional_resilience: number },
    currentZone: string
): NPC {
    const allNPCs = [...WORLDBOOK.EVENT_NPCS] as NPC[];

    const anxiety = 100 - personality.emotional_resilience;

    // High anxiety pet → nurturing teacher (Gentle/Empathetic personality)
    if (anxiety > 60) {
        const nurturing = allNPCs.find(npc =>
            npc.personality === 'Gentle' ||
            npc.trait.includes('Empathetic') ||
            npc.trait.includes('Warm')
        );
        if (nurturing) return nurturing;
    }

    // Shy/low social energy → quiet teacher (Calm/Cautious)
    if (personality.social_energy < 50) {
        const quiet = allNPCs.find(npc =>
            npc.personality === 'Cautious' ||
            npc.trait.includes('Calm') ||
            npc.personality === 'Lazy'
        );
        if (quiet) return quiet;
    }

    // Default → patient/wise teacher
    const patient = allNPCs.find(npc =>
        npc.trait.includes('Wise') ||
        npc.trait.includes('Steady') ||
        npc.personality === 'Sensitive'
    );
    if (patient) return patient;

    // Final fallback: first available NPC
    return allNPCs[0];
}

/**
 * Select an NPC based on pet personality and current zone.
 * If preferredNpcName is provided, tries to return the same NPC (narrative continuity).
 */
export function selectNPC(
    personality: { social_energy: number; playfulness_intensity: number; emotional_resilience: number },
    currentZone: string,
    preferredNpcName?: string
): NPC | null {
    const allNPCs = [...WORLDBOOK.EVENT_NPCS] as NPC[];

    // Narrative continuity: if a preferred NPC is known, return them (friendship persists across zones)
    if (preferredNpcName) {
        const preferred = allNPCs.find(npc => npc.name === preferredNpcName);
        if (preferred) return preferred;
    }

    const availableNPCs = allNPCs.filter(npc =>
        (npc.zones as readonly string[]).includes(currentZone)
    );

    if (availableNPCs.length === 0) return null;

    // Match by personality
    if (personality.social_energy < 50) {
        const match = availableNPCs.find(npc =>
            npc.personality === 'Gentle' || npc.personality === 'Cautious' || npc.trait.includes('Calm')
        );
        if (match) return match;
    }

    if (personality.playfulness_intensity > 70) {
        const match = availableNPCs.find(npc =>
            npc.personality === 'Extroverted' || npc.personality === 'Curious' || npc.personality === 'Mischievous'
        );
        if (match) return match;
    }

    if ((100 - personality.emotional_resilience) > 60) {
        const match = availableNPCs.find(npc =>
            npc.personality === 'Gentle' || npc.personality === 'Sensitive' || npc.trait.includes('Steady')
        );
        if (match) return match;
    }

    // Random from available
    return availableNPCs[Math.floor(Math.random() * availableNPCs.length)];
}

// ─── World Spark System ─────────────────────────────────────────────────
// Random world-state details that add unpredictability and freshness.
// The AI may or may not incorporate these — they're ingredients, not rules.

const WORLD_SPARKS: Record<string, string[]> = {
    crystal_meadow: [
        'The crystal flowers are mid-bloom — their reflections scatter light across the grass in shifting patterns',
        'Several recently-arrived pets are near the butterfly garden, still uncertain of where to go',
        'Kitsune passed through earlier — there are tracks in the grass that suggest whatever happened involved considerable speed',
        'The butterflies are flying in tight spirals today, circling the same cluster of flowers without landing',
        'The meadow is quieter than usual — most regulars have drifted toward the lake this morning',
        'A light rain left the crystal flowers dripping; the sound of water on petals is the only sound',
        'Something in the center of the meadow caught the light differently than yesterday — it is unclear what changed',
        '',  // ordinary day — no special conditions
        '',
    ],
    eternity_forest: [
        'The blue moss is particularly bright today — it glows even in daylight, which is unusual',
        'There is a low sound from somewhere deeper in the forest that no one is moving toward or away from',
        'Baize was seen nearby at dawn — the forest has been unusually still since then',
        'Rain from an unknown source has left the ferns heavy and the paths between trees darker than usual',
        'Several pine cones have fallen in the northern grove, arranged in a way that does not look accidental',
        'The silver bark of the oldest trees is warmer than it should be in the afternoon shade',
        'Something moved through the canopy earlier — too large for a bird, too quiet for a branch',
        '',
        '',
    ],
    crystal_lake: [
        'The water is at its warmest today — you can see the smooth stones at the very bottom of the deepest part',
        'A small fish appeared near the quiet cove — the first time most residents have seen one in the lake',
        "The lake's surface is so still that the reflection pool and the actual lake are nearly indistinguishable",
        'Flat stones have been stacked along the shore in careful piles — no one admits to doing it',
        'Terra was visible from the shore earlier, moving slowly through the deep center water',
        'The pebbles on the beach were rearranged overnight into a long curved line along the waterline',
        'An unfamiliar scent is coming off the water — not unpleasant, just unknown',
        '',
        '',
    ],
    sunset_hill: [
        "The sunset began two hours earlier than expected and is lasting longer than it should",
        'Wind from the meadow carries pollen today — a fine gold dust that settles on everything',
        'Sol was spotted at the hilltop before dawn; residents noticed without asking why',
        'The tall grass is all leaning one direction despite inconsistent wind',
        'Someone found a path through the tall grass that leads somewhere no one has named yet',
        'The wind carried a sound from far away that lasted exactly three seconds before stopping',
        'The horizon looks different today — more distant somehow, or simply more visible',
        '',
        '',
    ],
    central_plaza: [
        'Guardian Tower bell rang at an unusual hour — not the scheduled chime',
        'A new arrival was at the welcome plaza this morning, still learning which direction to walk',
        "Aria's song carried across the whole world today — residents describe what they heard differently",
        'The bonfire burned a different color this evening — briefly, unmistakably, then back to normal',
        'Galaxy was talking with someone near the plaza entrance for a long time — no one overheard what about',
        '',
        '',
    ],
};

/**
 * Returns a random world-state detail for today's scene.
 * Empty string = ordinary day (no special conditions).
 * The AI may choose to use or ignore this detail.
 */
export function getWorldSpark(zone: string): string {
    const zonePool = WORLD_SPARKS[zone] || [];
    const anyPool = WORLD_SPARKS['crystal_meadow']; // fallback
    const pool = zonePool.length > 0 ? zonePool : anyPool;
    return pool[Math.floor(Math.random() * pool.length)] || '';
}

// ─── Persona Spark System ────────────────────────────────────────────────
// Based on extreme personality traits, generates a behavioral tendency
// that might manifest in an unexpected or contradictory way today.
// These are possibilities, not requirements.

interface DimensionalScoresForSpark {
    social_energy: number;
    curiosity_drive: number;
    affection_style: number;
    emotional_resilience: number;
    playfulness_intensity: number;
    food_motivation: number;
    empathy_sensitivity: number;
}

export function getPersonaSpark(scores: DimensionalScoresForSpark): string {
    const anxiety = 100 - scores.emotional_resilience;
    const sparks: string[] = [];

    if (scores.curiosity_drive > 80) {
        sparks.push(
            'High curiosity: may have investigated something entirely unrelated to where they were supposed to be',
            'High curiosity: a detail others walked past held their attention for much longer than made sense'
        );
    }
    if (scores.playfulness_intensity > 80) {
        sparks.push(
            'High playfulness: something started as play and became something else — not clear what',
            'High playfulness: they tried to involve someone who was not interested, then found a way to make it work anyway'
        );
    }
    if (anxiety > 70) {
        sparks.push(
            'High anxiety: took the long way, or stopped and started twice before committing to a direction',
            'High anxiety: settled somewhere, then moved — once — before staying'
        );
    }
    if (scores.social_energy < 30) {
        sparks.push(
            'Very low social: actively found a quieter spot when the usual place got crowded',
            'Very low social: was present with others but maintained exactly one body-length of space throughout'
        );
    }
    if (scores.affection_style > 85) {
        sparks.push(
            'High affection: proximity to one particular individual mattered today — without making it obvious',
            "High affection: found a reason to stay close to someone without it appearing intentional"
        );
    }
    if (scores.food_motivation > 80) {
        sparks.push(
            'Food motivated: something edible was nearby; whether they got to it is another matter',
            'Food motivated: a detour happened; the reason for the detour became clear only afterward'
        );
    }
    if (scores.empathy_sensitivity > 85) {
        sparks.push(
            'High empathy: responded to something happening nearby without being directly involved — adjusted position, pace, or direction',
            "High empathy: noticed something others didn't and moved accordingly"
        );
    }

    // The interesting case: a contradiction — acting slightly against type
    if (scores.social_energy < 40 && Math.random() < 0.3) {
        sparks.push('Contradiction: the one who usually keeps distance made the first move today — briefly, then retreated');
    }
    if (scores.playfulness_intensity < 30 && Math.random() < 0.3) {
        sparks.push("Contradiction: something made the calm one move quickly — just for a moment");
    }
    if (anxiety > 60 && Math.random() < 0.25) {
        sparks.push('Contradiction: the cautious one went somewhere new first, without hesitating');
    }

    if (sparks.length === 0) return '';
    // Pick one
    return sparks[Math.floor(Math.random() * sparks.length)];
}
