/**
 * Micro-Event Engine — Type Definitions
 * Template-based micro-events (no LLM cost, 6-8/day).
 * Uses a SEPARATE table (pet_micro_events) from the LLM pipeline (pet_status_events).
 */

export type MicroEventCategory =
    | 'atmosphere'
    | 'pet_action'
    | 'npc_sighting'
    | 'letter_echo'
    | 'world_ambient'
    | 'time_marker';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export type PersonalityBucket = 'shy' | 'balanced' | 'bold' | 'playful' | 'curious';

export type SupportedLanguage = 'en' | 'ko' | 'ja';

// ─── Context passed to the template renderer ────────────────────────────────

export interface MicroEventContext {
    petName: string;
    species: string;
    breed: string | null;
    currentDay: number;
    currentZone: string;
    zoneDisplayName: string;
    timeOfDay: TimeOfDay;
    language: SupportedLanguage;
    personalityBucket: PersonalityBucket;
    /** 0–100 from DimensionalScores */
    socialEnergy: number;
    curiosityDrive: number;
    playfulnessIntensity: number;
    emotionalResilience: number;
    activeNpc: {
        name: string;
        activity: string;
        displayName: Record<SupportedLanguage, string>;
    } | null;
    letterEcho: { emotion: string; intensity: number } | null;
    secretHabit: string | null;
    preciousMemory: string | null;
}

// ─── Template definition ─────────────────────────────────────────────────────

export interface MicroEventTemplate {
    id: string;
    category: MicroEventCategory;
    /** Which species this template applies to. 'any' matches all. */
    species: ('dog' | 'cat' | 'any')[];
    /** Which personality buckets may use this template. 'all' matches every bucket. */
    personalityBuckets: PersonalityBucket[] | 'all';
    /** Which times of day this template fires. 'all' matches every time slot. */
    timeOfDay: TimeOfDay[] | 'all';
    /** Which zones this template fires in. 'all' matches every zone. */
    zones: string[] | 'all';
    /** Template requires an activeNpc in context to render. */
    requiresNpc: boolean;
    /** Template requires a letterEcho in context to render. */
    requiresLetterEcho: boolean;
    /** Trilingual template text. Use {petName}, {zoneName}, {npcName}, {secretHabit}, {preciousMemory}.
     *  Korean: also use {eun}, {i}, {eul} — resolved by koreanParticle(). */
    text: Record<SupportedLanguage, string>;
    mood: string;
    tags: string[];
}

// ─── Rendered output ─────────────────────────────────────────────────────────

export interface MicroEventOutput {
    templateId: string;
    category: MicroEventCategory;
    content: string;
    mood: string;
    npcInvolved: string | null;
    zone: string;
    timeOfDay: TimeOfDay;
    tothereonDay: number;
    language: SupportedLanguage;
}

// ─── DB row shape (matches pet_micro_events table) ──────────────────────────

export interface PetMicroEvent {
    id: string;
    pet_id: string;
    category: MicroEventCategory;
    template_id: string;
    content: string;
    zone: string;
    mood: string | null;
    npc_involved: string | null;
    time_of_day: TimeOfDay;
    tothereon_day: number;
    language: string;
    metadata: Record<string, unknown>;
    created_at: string;
}

// ─── Korean particle helper ──────────────────────────────────────────────────

/**
 * Returns the correct Korean postposition for a given name based on whether
 * its final syllable has a final consonant (받침).
 *
 * @param name  The Korean or romanized name to check.
 * @param type  'eun' → 은/는, 'i' → 이/가, 'eul' → 을/를
 *
 * @example
 * koreanParticle('달래', 'eun')  // '는'  (no final consonant)
 * koreanParticle('굴돌이', 'eun') // '가'  ... wait, use type 'i' for subject marker
 * koreanParticle('뭉실', 'i')    // '이'  (final consonant ㄹ)
 */
export function koreanParticle(name: string, type: 'eun' | 'i' | 'eul'): string {
    const lastChar = name.charAt(name.length - 1);
    const lastCharCode = name.charCodeAt(name.length - 1);

    let hasFinalConsonant: boolean;

    if (lastCharCode >= 0xAC00 && lastCharCode <= 0xD7A3) {
        // Korean syllable block — check jongseong (final consonant)
        hasFinalConsonant = (lastCharCode - 0xAC00) % 28 !== 0;
    } else {
        // ASCII/romanized name heuristic
        // Consonant endings: treat as having final consonant
        // e.g., "Biscuit" ends in 't' → has consonant, "Luna" ends in 'a' → no consonant
        const lower = lastChar.toLowerCase();
        const vowels = new Set(['a', 'e', 'i', 'o', 'u']);
        hasFinalConsonant = !vowels.has(lower);
    }

    switch (type) {
        case 'eun': return hasFinalConsonant ? '은' : '는';
        case 'i': return hasFinalConsonant ? '이' : '가';
        case 'eul': return hasFinalConsonant ? '을' : '를';
    }
}
