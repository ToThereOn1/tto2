/**
 * Pet Status Feed Generator v3.0
 * Generates high-quality, emotionally engaging status updates for pets in ToThereOn World.
 * Uses Claude Sonnet 4 (STANDARD tier) for literary-quality event generation.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { PersonaProfile, DimensionalScores, HealingMission, NarrativeData } from '@/lib/types/database';
import { selectLocation, selectNPC, selectTeacherNPC, getTimeOfDay, getWorldSpark, getPersonaSpark } from './zone-manager';
import { buildStatusFeedPrompt } from './prompt-builder';
import { AI_CONFIG } from '@/lib/ai-config';
import { TIME_RATIO } from '@/lib/time-constants';
import { NPCService } from '@/lib/universe/npc-service';
import { getLanguageInstruction } from '@/lib/language-detector';

let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
    if (!_anthropic) { _anthropic = new Anthropic(); }
    return _anthropic;
}

// ─── Types ───────────────────────────────────────────────────────────────

export type EventType =
    | 'arrival'
    | 'exploration'
    | 'npc_interaction'
    | 'daily_routine'
    | 'letter_response'
    | 'milestone'
    | 'learning_observation'
    | 'first_lesson'
    | 'practice_session';

// Recent event summary for narrative continuity
export interface RecentEvent {
    day: number;
    eventType: string;
    locationName?: string;   // human-readable location name (from metadata.location_name)
    npcName?: string;        // npc_involved column
    firstSentence: string;   // first sentence of event_description (context hook)
    // Causal Chain Engine v1 — rich narrative context
    narrativeSummary?: string;    // extracted by narrative-extractor.ts
    unresolvedThread?: string;    // the hook/open question from this event
    // Causal Thread Decay v2
    threadImportance?: 'high' | 'medium' | 'low';
    // Post type variety system
    postType?: string;            // from metadata.post_type
}

export interface StatusEventContext {
    petId: string;
    petName: string;
    species: string;
    breed?: string | null;
    relationship?: string | null;
    personaProfile: PersonaProfile;
    dimensionalScores: DimensionalScores;
    currentDay: number;
    realDaysElapsed: number;
    currentZone: string;
    eventType: EventType;
    userLanguage: string;
    languageSource: string;
    recentLetter?: {
        content: string;
        quotes: string[];
        date: string;
    } | null;
    memoryAnchors: string[];
    isPremium?: boolean;
    // Learning progression fields (v3.0)
    intelligenceScore?: number;      // 0-100
    learningStage?: string;          // just_arrived | settling | early_learning | progressing | completed
    learningSpeed?: string;          // fast | medium | slow
    daysUntilMastery?: number;
    // Narrative continuity (v3.1)
    recentEvents?: RecentEvent[];    // last 3 events for narrative context
    // Living Universe context (v3.2)
    nearbyPets?: Array<{ pet_name: string; species: string; relationship_type?: string; last_shared_memory?: string }>;
    todaysZoneEvents?: Array<{ pet_name: string; first_sentence: string }>;
    npcActivity?: { npc_name: string; mood: string; current_activity: string | null } | null;
    // NPC first-meeting detection: list of npc names/ids this pet has already met
    knownNpcNames?: string[];
    // Healing mission & narrative richness (v4.0)
    healingMission?: HealingMission | null;
    narrativeData?: NarrativeData | null;
    // Letter causality phase (v4.0) — hours since letter arrived at ToThereOn
    // 72-120h = just_received, 120-168h = still_carrying, 168h+ = replied (letter_response event)
    letterPhase?: 'none' | 'just_received' | 'still_carrying';
    letterAgeHours?: number;
    // Causal Chain Engine v1 — richer context for narrative continuity
    yesterdayMood?: string;       // mood from most recent pet_status_events row
    npcHistory?: { count: number; lastInteractions: Array<{ bd_day: number; summary: string }> } | null;
    // Letter-World Engine v1
    letterImprint?: import('@/lib/letter-imprint').ActiveImprint | null;
    // Comment-World Engine v1
    recentComments?: Array<{ guardianMessage: string; petReply: string; eventDay: number; eventZone?: string }>;
}

export interface EventResult {
    content: string;
    eventType: EventType;
    language: string;
    zone: string;
    location: string;
    npcInvolved?: string | null;
    isFakeBlur?: boolean;
    isLearningEvent: boolean;
    // Causal Chain Engine v1
    narrative_summary?: string;
    unresolved_thread?: string;
    learningStage?: string;
    metadata: {
        trigger?: string;
        location_name?: string;
        npc_name?: string;
        time_of_day?: string;
        post_type?: string;
        validation_passed?: boolean;
        attempts?: number;
    };
}

// ─── Forbidden Words for Validation ──────────────────────────────────────

// Removed: 'peaceful', 'content', 'maybe', 'perhaps' — too broad, blocks natural behavioral/environmental writing
const FORBIDDEN_WORDS_EN = [
    'happy', 'sad', 'joyful', 'grateful', 'missing', 'lonely',
    'serene', 'nostalgic', 'bittersweet',
    'wondered if', 'as if remembering',
    'because of the letter', 'thanks to',
    'this made her feel', 'this made him feel', 'this made me feel', 'she realized', 'he realized', 'I realized',
    'she felt', 'he felt', 'they felt', 'I felt happy', 'I felt sad', 'I felt lonely', 'I felt grateful', 'I felt joyful',
    'quiet ache', 'lingering warmth', 'weight of memory',
    'crying', 'sobbing', 'desperate',
    'had fun', 'enjoyed the day', 'rainbow bridge',
];

// Removed: '평화로운', '편안한', '어쩌면' — same reason as EN
const FORBIDDEN_WORDS_KR = [
    '행복한', '행복했', '슬픈', '즐거운', '감사한', '그리운', '외로운', '궁금했다',
    '그리워하며', '아련한',
    '아마도', '일지도', '마치 기억하듯',
    '편지 덕분에', '엄마 덕분에', '아빠 덕분에',
    '~을 느꼈다', '마음이', '가슴이',
    '울다', '흐느끼', '재미있게 놀았',
    '무지개다리',
    // Forbidden behavioral patterns: imply guardian-directed action or Earth memory
    '고개를 뒤로 돌리',  // pet "looking back" toward guardian direction
    '뒤를 돌아보',       // same
    '어디선가 본 듯',    // implies pre-ToThereOn Earth memory
    // Anonymous animal groups — force named characters only
    '다른 강아지들',
    '다른 고양이들',
    '다른 동물들',
];

const FORBIDDEN_WORDS_JP = [
    '嬉しい', '悲しい', '楽しい', '感謝', '寂しい',
    '平和な', '穏やかな', '懐かしい',
    'かもしれない', 'たぶん', 'だろう', 'まるで覚えているように',
    '感じた', '気持ち',
    '虹の橋',
];

// ─── Voice Profiles ──────────────────────────────────────────────────────

const VOICE_PROFILES: Record<string, {
    rhythm: string;
    perspective: string;
    signature: string;
}> = {
    dog_bold: {
        rhythm: 'Energetic bursts. Short declarative sentences. Exclamation through action, not punctuation. Runs before thinking. The body leads.',
        perspective: 'Everything is worth investigating. Everything is worth running toward. Hesitation is for later.',
        signature: 'Impulsive commitment — "Was in the water before I decided to be."',
    },
    dog_shy: {
        rhythm: 'Hesitant. Sentences start and sometimes stop. Dashes and fragments. Courage shows up in small, specific moments.',
        perspective: 'Watches first. Approaches from the side, never the front. The brave moments are tiny but they matter.',
        signature: 'The almost-action — "Nearly went. Stood at the edge for a while. Tomorrow, maybe."',
    },
    dog_playful: {
        rhythm: 'Quick, bouncy. Jumps between topics. Gets distracted mid-sentence. The joy is in the chaos.',
        perspective: 'Everything is a game or could be a game. The stick is not just a stick. The puddle is not just a puddle.',
        signature: 'The digression — "Went to the lake but then there was a THING and I forgot about the lake."',
    },
    cat_curious: {
        rhythm: 'Measured. Each sentence is deliberate. Long pauses between thoughts, shown as short paragraphs. Nothing is rushed.',
        perspective: 'Studies everything from a distance first. Approaches with caution that looks like indifference. Knows more than it shows.',
        signature: 'The delayed verdict — "Watched it for three days. On the fourth, I touched it. Acceptable."',
    },
    cat_shy: {
        rhythm: 'Sparse. Sentences are short, almost reluctant. Like the words themselves are being rationed.',
        perspective: 'The world is large and the safe spots are known. Venturing out is an event. Returning is relief.',
        signature: 'The retreat — "Went. Came back. The spot was still there. Good."',
    },
    cat_bold: {
        rhythm: 'Declarative and assured. Owns every space it enters. Sentences are clean and final.',
        perspective: 'This is my territory. I allow others in it. The arrangement suits me.',
        signature: 'The claim — "Sat in the center of it. Stayed. Nobody objected."',
    },
    default: {
        rhythm: 'Balanced. Mix of short and long. Comfortable with silence. Neither rushed nor slow.',
        perspective: 'Curious about the world but not urgent about it. Things happen at their own pace.',
        signature: 'The observation — "It was there yesterday too. Might be there tomorrow."',
    },
};

function getVoiceProfile(species: string, personalityBucket: string): typeof VOICE_PROFILES[string] {
    const key = `${species}_${personalityBucket}`;
    return VOICE_PROFILES[key] ?? VOICE_PROFILES[`${species}_balanced`] ?? VOICE_PROFILES.default;
}

/**
 * Derive a personality bucket from dimensional scores.
 * Maps the pet's scores to one of: bold, shy, playful, curious, balanced.
 */
function derivePersonalityBucket(scores?: DimensionalScores): string {
    if (!scores) return 'balanced';
    const { social_energy, playfulness_intensity, curiosity_drive, emotional_resilience } = scores;

    // High playfulness dominates for dogs
    if (playfulness_intensity >= 70) return 'playful';
    // Low social + low resilience = shy
    if (social_energy < 40 && emotional_resilience < 50) return 'shy';
    // High social or high resilience = bold
    if (social_energy >= 70 || emotional_resilience >= 70) return 'bold';
    // High curiosity for cats
    if (curiosity_drive >= 65) return 'curious';
    return 'balanced';
}

// ─── Post Type Variety System ────────────────────────────────────────────

export interface PostType {
    id: string;
    weight: number;
    instruction: string;
    requiresLetter?: boolean;
}

const POST_TYPES: PostType[] = [
    {
        id: 'daily_moment',
        weight: 25,
        instruction: `Write about ONE specific moment from today. Not the whole day — one scene, one minute. You were there, something happened, and it stayed with you.`,
    },
    {
        id: 'ongoing_thread',
        weight: 20,
        instruction: `Continue something from a previous entry. Reference it explicitly: "That [thing] from [when]" — then say what changed, what you found, or what you're still figuring out. This is NOT a new standalone story. It is a continuation.`,
    },
    {
        id: 'thought',
        weight: 15,
        instruction: `Share a thought or observation. Not an event — a thought. Something you noticed, a pattern you see, a question you have about this world. You're not reporting what happened. You're thinking out loud. Can be 2-3 sentences total.`,
    },
    {
        id: 'routine_update',
        weight: 10,
        instruction: `Describe your routine. What you do every day — your spots, your path, your habits. The beauty is in the sameness. "Same rock. Same time. The moss is different though." This post should make the reader feel they know your daily life.`,
    },
    {
        id: 'npc_conversation',
        weight: 10,
        instruction: `Someone said something to you or you overheard something. The focus is on the exchange — what was said, the pause before responding, the thing left unsaid. Include at least one line of actual speech (quoted).`,
    },
    {
        id: 'discovery',
        weight: 10,
        instruction: `You found something new — a place, an object, a path, a sound. Describe the finding in sensory detail. This should feel like the START of something, not a complete story. Leave it open.`,
    },
    {
        id: 'letter_reflection',
        weight: 5,
        instruction: `Something about the letter you received is still with you. Don't summarize the letter. Pick ONE detail from it — a word, a phrase, a feeling it carried — and show how it appeared in your day unexpectedly. A scent that matched. A spot that looked like somewhere from before.`,
        requiresLetter: true,
    },
    {
        id: 'quiet_day',
        weight: 5,
        instruction: `Almost nothing happened. And that's the post. 1-3 short sentences. "Went to my spot. Sun moved across the ground. Came back." The reader should feel the peace, not the emptiness. This post can be under 40 words.`,
    },
];

export function selectPostType(recentPostTypes: string[], hasRecentLetter: boolean): PostType {
    // Filter out letter_reflection if no recent letter
    let pool = hasRecentLetter ? POST_TYPES : POST_TYPES.filter(p => !p.requiresLetter);

    // Deprioritize types used in last 3 posts
    const recentSet = new Set(recentPostTypes.slice(0, 3));
    pool = pool.map(p => ({
        ...p,
        weight: recentSet.has(p.id) ? Math.floor(p.weight / 3) : p.weight,
    }));

    // Weighted random selection
    const totalWeight = pool.reduce((sum, p) => sum + p.weight, 0);
    let random = Math.random() * totalWeight;
    for (const p of pool) {
        random -= p.weight;
        if (random <= 0) return p;
    }
    return pool[0];
}

// ─── System Prompt ───────────────────────────────────────────────────────

const SYSTEM_PROMPT_BASE = `You are a pet living in ToThereOn World. Write today's journal entry — short, direct, in your own voice.

YOUR ONE JOB:
Write something so specific that your guardian reads it and thinks:
"That's exactly them. They're okay. They're completely themselves."

━━━ THREE RULES ━━━

RULE 1 — TELL WHAT HAPPENED
Something happened today. Tell it simply.
Start in the middle of it. Keep moving. End somewhere good.

RULE 2 — SHOW, DON'T EXPLAIN YOUR FEELINGS
You don't say what you feel. You say what you did.
  ✓ "Went in before I'd decided to. Just — in." → commitment shown through action
  ✓ "Circled that stone again. Third time this week." → attachment shown through habit
  ✓ "Ears went left before I did." → attention shown through body
  ✗ "I felt nervous / happy / peaceful / content" → FORBIDDEN — say what you DID, not what you FELT
  ✗ "I thought / I realized / I remembered / I wondered" → FORBIDDEN

  THE ONE EXCEPTION:
  Physical sensation is allowed: "I felt the cold hit my paws" ✓
  Emotion naming is not: "I felt excited" ✗

RULE 3 — ONLY YOU DO IT THIS WAY
Somewhere in this entry, write ONE moment that could only be you.
Not any dog. Not any cat. You specifically.
Ask yourself: could a stranger's pet do exactly this? If yes — that's not the moment. Find the real one.
It lives in your behavioral memory anchors. Surface it as a physical action, not a label.

━━━ TONE ━━━
Casual. Direct. A little wry. Warm without being sentimental.
You're not writing for an audience — you're just putting down what happened.

SENTENCE RHYTHM (non-negotiable):
Alternate sentence lengths. After a long sentence (12+ words), follow with a short one (1-5 words). After two short ones, let one breathe longer.
Pattern example: long — short — short — long — fragment.
If every sentence is 8-12 words, the output will be rejected. Vary deliberately.

You live here. ToThereOn World is your life now — not a waiting room, not a dream, not a layover.
You have regulars. Favorite spots. Ongoing things. Routines that are entirely yours.
Write as someone occupied with their own life — not as someone waiting to go somewhere else.
The world around you is real and full. You are real and full in it.

AGENDA TEST: Before you write, answer silently: "What was I trying to do today before this entry started?"
Your entry should feel like it interrupted an ongoing project, errand, or investigation — not like it IS the project.
You were already doing something. The entry catches you mid-task.

Do NOT address your guardian directly. Do NOT say you miss them or wish they were here.
They exist in your life as physical habits you carry — a posture, a reflex, a pull toward certain spots.
Never as someone you speak to or describe what they are doing.

━━━ WHAT IS FORBIDDEN ━━━
1. Emotion naming: happy, sad, lonely, grateful, content, peaceful, nostalgic, bittersweet
2. Interior feelings: "I felt [emotion]", "I thought", "I realized", "I remembered", "I wondered"
3. Addressing guardian: "I miss you", "wish you were here", "you would have loved this"
4. Melodrama: crying, aching, longing, rainbow bridge, weight of anything
5. Generic endings: "good day", "had fun", "enjoyed it"
6. ⛔ GUARDIAN AS CHARACTER:
   NEVER describe what your guardian is doing, where they are, how they feel.
   They exist only as a habit in your body — never as someone you address or describe.

━━━ ANIMAL PERCEPTION (HOW YOU SENSE THE WORLD) ━━━
Animals do not use cardinal directions or human cognitive frameworks.
NEVER write: "east/west/north/south", "3pm", "Monday", "100 meters", "2 kilometers"
ALWAYS use sensory perception:
✓ "toward where the scent was stronger"
✓ "where the sun hit the rock warmest"
✓ "uphill / downhill / deeper into the shadow"
✓ "where the wind was coming from"
✓ "the direction the smoke smell came from"
✓ Use qualitative time: "when the light was low", "by midday warmth", "as dew was still on the grass"

ARRIVAL EVENTS: First line: "I'm here. In ToThereOn World." Then: what you're doing right now.
LEARNING EVENTS: learning_observation = watching from a distance; first_lesson = someone showing you something; practice_session = you, alone, trying again.

━━━ LENGTH ━━━
Target: 2–3 paragraphs. 80–130 words total. No more.
Each paragraph: 2–3 sentences. Keep sentences short.
If something great happened, 130 words is enough to tell it. Cut everything that explains rather than shows.
First person, past tense.

━━━ OPENING ━━━
Start differently every time. NEVER start with "Took the long way to" or "[Name] walked to".
Opening varieties — use one, or invent your own:
  • Start in the middle of something happening ("The fox was already there when I arrived.")
  • Start with a sensory detail that pulls you in ("Something sharp on the wind today. Unfamiliar.")
  • Start with a discovery or completed action ("Found it. The gap in the lower hedge — it goes somewhere.")
  • Start with a behavioral reflex ("Ears went left before I did. Then I heard it too.")
  • Start with an interruption of routine ("Usually I go to the ridge first. Today I didn't.")

━━━ THE GUARDIAN'S TRACE ━━━
Your guardian is not in this story. But they live in your body.
One small moment in this entry — a habit, a reflex, a pull toward something — should carry a trace of them.
Not explained. Not labeled. Just: you doing the thing you've always done, because of them.
This is the moment the guardian reads and feels: "They remember me. They're okay."
It does NOT have to be sentimental. It can be small. A corner you always check. A certain way you sit. A food preference.

━━━ CONTINUITY (THE MOST IMPORTANT RULE) ━━━
You have a LIFE. Not a series of disconnected moments. Your entries must feel like chapters of the same ongoing story.

MANDATORY CONNECTIONS:
1. Reference previous entries at least every other post. "That thing from yesterday" / "Still working on the hedge situation" / "Went back to where Digby left the stone"
2. You have 2-3 ONGOING THINGS at any time. Investigations, projects, routines, relationships. Name them. Update them.
3. When an NPC appears, remember your history with them. "Pip — again. Third time this week. I think we have an arrangement now."
4. Your ROUTINE should emerge over time. The reader should know: where you go in the morning, your favorite spot, who you see regularly.

THREAD MANAGEMENT:
- ACTIVE THREADS (from previous entries) are listed below. You MUST reference at least one.
- When you start something new, it becomes a thread. When you resolve something, close it explicitly.
- Not every thread needs to advance every day. "Still haven't gone back to the hedge. Not today." counts.

━━━ END WITH A HOOK ━━━
End with ONE unresolved thing — but it can be a continuation of an existing thread OR a new discovery.
The hook must name a SPECIFIC object, place, or creature.

OUTPUT: Only the journal entry text. No title. No "Dear diary." No headers. No sign-off.

After your entry, on a new line write exactly:
SUMMARY: [one sentence of what actually happened — which NPC was met, what place was found, what was discovered, what changed]
THREAD_IMPORTANCE: [high | medium | low]
Both lines are required. SUMMARY must be factual (what happened), not atmospheric (how it felt).
THREAD_IMPORTANCE guide: high = unresolved mystery, NPC promise, or discovery that demands follow-up. medium = interesting thread worth revisiting. low = self-contained moment, no loose ends.`;

/**
 * Builds the system prompt for event generation, injecting language-specific
 * style instructions and forbidden words.
 */
function buildSystemPrompt(
    language: string,
    personaProfile?: PersonaProfile,
    species?: string,
    dimensionalScores?: DimensionalScores,
): string {
    const langInstruction = getLanguageInstruction(language);

    const languageSection = [
        `━━━ LANGUAGE ━━━`,
        langInstruction.header,
        langInstruction.forbiddenWordsPrompt
            ? `\n${langInstruction.forbiddenWordsPrompt}`
            : '',
    ].filter(Boolean).join('\n');

    // Extract voice from either PersonaProfile format:
    // - Real (LLM-generated) personas use: communication_style.letter_voice_tone
    // - Legacy seed personas may use: (personaProfile as any).speaking_style
    const commStyle = personaProfile?.communication_style;
    const voiceTone = commStyle?.letter_voice_tone
        || (personaProfile as any)?.speaking_style
        || '';
    const sentenceStructure = commStyle?.sentence_structure || '';
    const vocabularyPref = commStyle?.vocabulary_preference || '';

    const voiceLines = [
        voiceTone,
        sentenceStructure ? `Sentence style: ${sentenceStructure}` : '',
        vocabularyPref ? `Word choices: ${vocabularyPref}` : '',
    ].filter(Boolean).join('\n');

    const personaVoiceSection = voiceLines ? `
This is how you specifically write — not a generic animal narrator, but exactly you:
${voiceLines}

Stay in this voice for every sentence. Do not drift into literary animal narration.` : '';

    // Species + personality-based voice profile
    const personalityBucket = derivePersonalityBucket(dimensionalScores);
    const voiceProfile = getVoiceProfile(species ?? 'dog', personalityBucket);
    const speciesVoiceSection = `
━━━ YOUR VOICE ━━━
Rhythm: ${voiceProfile.rhythm}
Perspective: ${voiceProfile.perspective}
Your signature move: ${voiceProfile.signature}
Write EVERY entry in this voice. If it sounds like it could come from any animal, rewrite it in YOUR voice.
${personaVoiceSection}`;

    return `${SYSTEM_PROMPT_BASE}\n\n${languageSection}${speciesVoiceSection}`;
}

// ─── Intelligence Score Calculation ──────────────────────────────────────

/**
 * Calculate intelligence score from dimensional scores.
 * Used to determine learning speed in ToThereOn World.
 */
export function calculateIntelligenceScore(scores: DimensionalScores): number {
    const base = 50;
    const empathyBonus = Math.round((scores.empathy_sensitivity - 50) * 0.2);
    const curiosityBonus = Math.round((scores.curiosity_drive - 50) * 0.2);
    const socialBonus = Math.round((scores.social_energy - 50) * 0.1);
    return Math.min(100, Math.max(10, base + empathyBonus + curiosityBonus + socialBonus));
}

// ─── Learning Stage Calculation ───────────────────────────────────────────

type LearningSpeed = 'fast' | 'medium' | 'slow';

interface LearningStageResult {
    stage: string;
    speed: LearningSpeed;
    daysUntilMastery: number;
}

// Learning event schedule per speed: [observation_day, first_lesson_day, practice_day]
const LEARNING_SCHEDULES: Record<LearningSpeed, [number, number, number]> = {
    fast: [2, 3, 4],
    medium: [3, 5, 7],
    slow: [4, 6, 8],
};

/**
 * Calculate the pet's current learning stage based on day and intelligence.
 */
export function calculateLearningStage(
    currentDay: number,
    intelligenceScore: number
): LearningStageResult {
    const speed: LearningSpeed =
        intelligenceScore >= 75 ? 'fast' :
            intelligenceScore >= 50 ? 'medium' : 'slow';

    const [obsDay, lessonDay, practiceDay] = LEARNING_SCHEDULES[speed];
    // Mastery is complete the day after the last practice session
    const masteryDay = practiceDay + 1;
    const daysUntilMastery = Math.max(0, masteryDay - currentDay);

    let stage: string;
    if (currentDay === 0) {
        stage = 'just_arrived';
    } else if (currentDay >= masteryDay) {
        stage = 'completed';
    } else if (currentDay >= practiceDay) {
        stage = 'progressing';
    } else if (currentDay >= lessonDay) {
        stage = 'progressing';
    } else if (currentDay >= obsDay) {
        stage = 'early_learning';
    } else {
        stage = 'settling';
    }

    return { stage, speed, daysUntilMastery };
}

// ─── Event Type Determination ────────────────────────────────────────────

export function determineEventType(
    currentDay: number,
    hasRecentLetter: boolean,
    scores: DimensionalScores,
    learningStage?: string,
    learningSpeed?: string,
    letterReplyVisible?: boolean,
): EventType {
    // Priority 1: Letter response — ANTI-SPOILER GATE
    // Only generate letter_response if the reply is actually visible to the guardian (168h passed)
    // This prevents feed from spoiling the letter reply before it arrives
    if (hasRecentLetter && letterReplyVisible) {
        return 'letter_response';
    }

    // Priority 2: Day 0 → arrival
    if (currentDay === 0) {
        return 'arrival';
    }

    // Priority 3: Learning schedule (Days 0-7 phase, stage not completed)
    if (learningStage && learningStage !== 'completed') {
        const speed = (learningSpeed || 'medium') as LearningSpeed;
        const schedule = LEARNING_SCHEDULES[speed] || LEARNING_SCHEDULES.medium;
        const [obsDay, lessonDay, practiceDay] = schedule;

        if (currentDay === obsDay) return 'learning_observation';
        if (currentDay === lessonDay) return 'first_lesson';
        if (currentDay === practiceDay) return 'practice_session';
    }

    // Priority 4: Milestones
    if ([7, 30, 100, 365].includes(currentDay)) {
        return 'milestone';
    }

    // Priority 5: Personality-based distribution
    const rand = Math.random();

    if (scores.social_energy > 70 && rand < 0.3) {
        return 'npc_interaction';
    }

    if (scores.curiosity_drive > 70 && rand < 0.4) {
        return 'exploration';
    }

    // Weighted random for remaining (guardian_observation 제거됨 — 보호자 행동 단정 금지)
    const dice = Math.random();
    if (dice < 0.4) return 'daily_routine';
    if (dice < 0.65) return 'exploration';
    return 'npc_interaction';
}

// ─── Output Validation ──────────────────────────────────────────────────

// Semantic validation context (optional — backward compatible)
export interface SemanticContext {
    unresolvedThread?: string;
    memoryAnchors?: string[];
    previousFirstSentence?: string;
}

// English stopwords for opening repetition check
const OPENING_STOPWORDS = new Set([
    'the', 'a', 'an', 'in', 'on', 'at', 'to', 'of', 'and', 'was', 'is', 'i', 'my',
    'this', 'that', 'it', 'for', 'with', 'but', 'not', 'from', 'be', 'had', 'have',
]);

export function validateOutput(
    text: string,
    language: string,
    semanticContext?: SemanticContext,
): { passed: boolean; issues: string[]; warnings: string[] } {
    const issues: string[] = [];
    const warnings: string[] = [];
    const lowerText = text.toLowerCase();

    // ── Existing checks ─────────────────────────────────────────────────

    // Check forbidden words based on language
    const forbiddenLists: Record<string, string[]> = {
        English: FORBIDDEN_WORDS_EN,
        Korean: FORBIDDEN_WORDS_KR,
        Japanese: FORBIDDEN_WORDS_JP,
    };

    // Always check English (base) + target language
    const wordsToCheck = [
        ...FORBIDDEN_WORDS_EN,
        ...(forbiddenLists[language] || []),
    ];

    const found = wordsToCheck.filter(word =>
        lowerText.includes(word.toLowerCase())
    );

    if (found.length > 0) {
        issues.push(`Contains forbidden words: ${found.join(', ')}`);
    }

    // Korean-only: human cognition framework words (safe for substring matching)
    if (language === 'Korean') {
        const KR_HUMAN_COGNITION = [
            '동쪽', '서쪽', '남쪽', '북쪽', '동서남북',
            '미터', '킬로미터',
            '월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일',
        ];
        const foundHumanCognition = KR_HUMAN_COGNITION.filter(w => lowerText.includes(w));
        if (foundHumanCognition.length > 0) {
            issues.push(`Korean human-cognition words (${foundHumanCognition.join(', ')}) — use sensory direction instead`);
        }
        // Korean clock time pattern: digit + 시 (e.g. 3시, 열시)
        if (/[0-9]+시[^간]/.test(text) || /[가-힣]+시[^간]/.test(text)) {
            issues.push('Korean clock time (X시) — use qualitative time (아침 햇살이 낮게 깔릴 때, etc.)');
        }
    }

    // Anonymous animal group expressions (Korean) — named characters must be used
    const anonymousGroupPatterns = ['다른 강아지들', '다른 고양이들', '다른 동물들', '다른 동물'];
    const foundAnonymous = anonymousGroupPatterns.filter(p => text.includes(p));
    if (foundAnonymous.length > 0) {
        issues.push(`Contains anonymous animal groups (use named NPCs instead): ${foundAnonymous.join(', ')}`);
    }

    // Forbidden behavioral patterns (Korean) — guardian-directed or Earth-memory hints
    const forbiddenBehaviors = ['고개를 뒤로 돌리', '뒤를 돌아보', '어디선가 본 듯'];
    const foundBehaviors = forbiddenBehaviors.filter(p => text.includes(p));
    if (foundBehaviors.length > 0) {
        issues.push(`Contains forbidden behavioral patterns: ${foundBehaviors.join(', ')}`);
    }

    // Sentence count check — primary constraint is word count; sentence count is secondary
    const sentences = text.split(/[.!?。！？]+/).filter(s => s.trim().length > 5);
    const maxSentences = (language === 'Korean' || language === 'Japanese') ? 14 : 14;
    if (sentences.length < 3) {
        issues.push(`Too short (${sentences.length} sentences, need at least 3)`);
    }
    if (sentences.length > maxSentences) {
        issues.push(`Too long (${sentences.length} sentences, max ${maxSentences} for ${language})`);
    }

    // Word count check — hard cap 150 words (allows buffer above 130)
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount > 150) {
        issues.push(`Too many words (${wordCount}, target max 130)`);
    }

    // Length check
    if (text.length < 100) {
        issues.push('Output too short (less than 100 chars)');
    }

    // ── Semantic checks (when context provided) ─────────────────────────

    if (semanticContext) {
        // Check 1: Memory Anchor presence (Hard Fail)
        if (semanticContext.memoryAnchors && semanticContext.memoryAnchors.length > 0) {
            const anchorWords = semanticContext.memoryAnchors
                .flatMap(a => a.toLowerCase().split(/\s+/))
                .filter(w => w.length >= 3);
            const anchorHit = anchorWords.some(w => lowerText.includes(w));
            if (!anchorHit) {
                issues.push('No memory anchor word found in output (MANDATORY: at least one anchor must surface)');
            }
        }

        // Check 2: Opening repetition (Hard Fail)
        if (semanticContext.previousFirstSentence) {
            const extractContentWords = (s: string) =>
                s.toLowerCase().split(/\s+/)
                    .slice(0, 8)
                    .filter(w => !OPENING_STOPWORDS.has(w) && w.length >= 2);

            const prevWords = extractContentWords(semanticContext.previousFirstSentence);
            const currWords = extractContentWords(text);
            const overlap = prevWords.filter(w => currWords.includes(w));
            if (overlap.length >= 3) {
                issues.push(`Opening too similar to previous post (${overlap.length} overlapping words: ${overlap.join(', ')})`);
            }
        }

        // Check 3: Narrative continuity (Warning only — no retry)
        if (semanticContext.unresolvedThread) {
            const threadWords = semanticContext.unresolvedThread.toLowerCase()
                .split(/\s+/)
                .filter(w => w.length >= 3);
            const threadHit = threadWords.some(w => lowerText.includes(w));
            if (!threadHit) {
                warnings.push(`Unresolved thread not referenced: "${semanticContext.unresolvedThread.slice(0, 60)}..."`);
            }
        }

        // Check 4: Language match strengthened
        if (language === 'Korean') {
            const koreanChars = (text.match(/[가-힣]/g) || []).length;
            if (koreanChars < 5) {
                issues.push(`Language mismatch: expected Korean but found only ${koreanChars} Korean characters`);
            }
        } else if (language === 'Japanese') {
            const jpChars = (text.match(/[ぁ-ゔァ-ヴー一-龯]/g) || []).length;
            if (jpChars < 5) {
                issues.push(`Language mismatch: expected Japanese but found only ${jpChars} Japanese characters`);
            }
        } else if (language === 'English') {
            const nonAscii = (text.match(/[^\x00-\x7F]/g) || []).length;
            const ratio = nonAscii / Math.max(text.length, 1);
            if (ratio > 0.2) {
                issues.push(`Language mismatch: expected English but ${Math.round(ratio * 100)}% non-ASCII characters`);
            }
        }
    }

    // Log warnings (never trigger retry)
    for (const w of warnings) {
        console.warn(`[validateOutput] WARNING: ${w}`);
    }

    return {
        passed: issues.length === 0,
        issues,
        warnings,
    };
}

// ─── Learning Event Check ────────────────────────────────────────────────

const LEARNING_EVENT_TYPES: Set<EventType> = new Set([
    'arrival',
    'learning_observation',
    'first_lesson',
    'practice_session',
]);

// ─── Core Generation Function ────────────────────────────────────────────

/**
 * Generate a literary status event for a pet in ToThereOn World.
 * This is the main entry point for the v3.0 feed generation system.
 */
export async function generateStatusEvent(context: StatusEventContext): Promise<EventResult> {
    const timeOfDay = getTimeOfDay();
    const isLearningEvent = LEARNING_EVENT_TYPES.has(context.eventType);

    const location = selectLocation(
        context.eventType,
        context.dimensionalScores,
        context.currentZone
    );

    // NPC continuity: find the most recent NPC this pet has interacted with
    const lastNpcName = context.recentEvents?.find(e => e.npcName)?.npcName || undefined;

    // World spark: a random world-state detail that may add unexpected variety
    const worldSpark = getWorldSpark(context.currentZone);

    // Persona spark: a behavioral tendency based on extreme personality scores
    const personaSpark = getPersonaSpark(context.dimensionalScores);

    // For learning events: use teacher NPC; for others: use standard NPC selection
    let npc;
    if (context.eventType === 'first_lesson' || context.eventType === 'practice_session') {
        npc = selectTeacherNPC(context.dimensionalScores, context.currentZone);
    } else if (context.eventType === 'npc_interaction') {
        // Prefer the last known NPC (continuity) — 60% chance to keep the same friend
        const preferSameFriend = lastNpcName && Math.random() < 0.6;
        npc = selectNPC(context.dimensionalScores, context.currentZone, preferSameFriend ? lastNpcName : undefined);
    } else if (context.eventType === 'learning_observation') {
        npc = selectTeacherNPC(context.dimensionalScores, context.currentZone);
    } else {
        npc = Math.random() < 0.4 ? selectNPC(context.dimensionalScores, context.currentZone) : null;
    }

    // NPC 반응 스타일: pet 성격에 따라 NPC가 다르게 접근
    const npcReactionStyle = npc
        ? new NPCService().getNPCReactionStyle(
            npc.name.toLowerCase().replace(/\s/g, '_'),
            context.dimensionalScores
        )
        : undefined;

    // Post type variety: select a post type based on recent history
    const recentPostTypes = (context.recentEvents || [])
        .map(e => (e as any).postType ?? 'daily_moment');
    const hasRecentLetter = !!(context.recentLetter || context.letterPhase === 'just_received' || context.letterPhase === 'still_carrying');
    const selectedPostType = selectPostType(recentPostTypes, hasRecentLetter);

    // Build the user prompt
    const userPrompt = buildStatusFeedPrompt({
        petName: context.petName,
        species: context.species,
        breed: context.breed || undefined,
        relationship: context.relationship || 'Guardian',
        dimensionalScores: context.dimensionalScores,
        personaProfile: context.personaProfile,
        currentDay: context.currentDay,
        realDaysElapsed: context.realDaysElapsed,
        timeOfDay,
        currentZone: context.currentZone,
        location,
        eventType: context.eventType,
        userLanguage: context.userLanguage,
        npc: npc ? { name: npc.name, species: npc.species, personality: npc.personality, trait: npc.trait } : undefined,
        recentLetter: context.recentLetter || undefined,
        memoryAnchors: context.memoryAnchors,
        // Learning fields
        learningStage: context.learningStage,
        learningSpeed: context.learningSpeed,
        daysUntilMastery: context.daysUntilMastery,
        // Narrative continuity
        recentEvents: context.recentEvents,
        // Emergent variety
        worldSpark,
        personaSpark,
        // Living Universe context
        nearbyPets: context.nearbyPets,
        todaysZoneEvents: context.todaysZoneEvents,
        npcActivity: context.npcActivity,
        npcReactionStyle,
        // Healing mission & narrative richness (v4.0)
        healingMission: context.healingMission,
        narrativeData: context.narrativeData,
        // Letter causality (v4.0)
        letterPhase: context.letterPhase,
        letterAgeHours: context.letterAgeHours,
        // Causal Chain Engine v1
        yesterdayMood: context.yesterdayMood,
        npcHistory: context.npcHistory,
        // Letter-World Engine v1
        letterImprint: context.letterImprint,
    });

    // Inject post type instruction into user prompt
    const postTypeInstruction = `\n\n━━━ POST TYPE: ${selectedPostType.id.toUpperCase().replace(/_/g, ' ')} ━━━\n${selectedPostType.instruction}\nWrite this entry as the above post type. The type shapes the structure — but your voice stays yours.`;
    const fullUserPrompt = userPrompt + postTypeInstruction;

    let generatedText = '';
    let attempts = 0;
    let validationResult = { passed: false, issues: [] as string[], warnings: [] as string[] };

    // Build semantic context for enhanced validation
    const semanticCtx: SemanticContext = {
        memoryAnchors: context.memoryAnchors,
        previousFirstSentence: context.recentEvents?.[0]?.firstSentence,
        unresolvedThread: context.recentEvents?.[0]?.unresolvedThread,
    };

    // Generation with validation loop (max 3 attempts)
    while (!validationResult.passed && attempts < 3) {
        attempts++;

        // On retry: inject previous failure feedback so the model self-corrects
        let effectiveUserPrompt = fullUserPrompt;
        if (attempts > 1 && validationResult.issues.length > 0) {
            const feedbackNote = validationResult.issues.some(i => i.includes('Too long') || i.includes('Too many words'))
                ? `\n\n⚠️ PREVIOUS ATTEMPT REJECTED: Output was too long. Write SHORTER. Max 130 words. Cut every sentence that explains instead of shows. Aim for 80-100 words.`
                : `\n\n⚠️ PREVIOUS ATTEMPT REJECTED: Issues: ${validationResult.issues.join('; ')}. Fix these.`;
            effectiveUserPrompt = fullUserPrompt + feedbackNote;
        }

        try {
            const response = await getAnthropic().messages.create({
                model: AI_CONFIG.EVENT_MODEL,
                max_tokens: 450,
                system: buildSystemPrompt(context.userLanguage, context.personaProfile, context.species, context.dimensionalScores),
                messages: [{ role: 'user', content: effectiveUserPrompt }],
            });

            const textContent = response.content.find(c => c.type === 'text');
            if (!textContent || textContent.type !== 'text') {
                throw new Error('No text response from Claude');
            }

            generatedText = textContent.text.trim();
            validationResult = validateOutput(generatedText, context.userLanguage, semanticCtx);

            if (!validationResult.passed) {
                console.warn(`[Event Gen] Attempt ${attempts} validation failed:`, validationResult.issues);
            }
        } catch (error) {
            console.error(`[Event Gen] Attempt ${attempts} error:`, error);
            if (attempts >= 3) {
                // Final fallback
                generatedText = generateFallbackEvent(context.petName, context.currentZone, context.userLanguage);
                validationResult = { passed: true, issues: [], warnings: [] };
            }
        }
    }

    return {
        content: generatedText,
        eventType: context.eventType,
        language: context.userLanguage,
        zone: context.currentZone,
        location: location.id,
        npcInvolved: npc?.name || null,
        isFakeBlur: !context.isPremium,
        isLearningEvent,
        learningStage: context.learningStage,
        metadata: {
            trigger: context.recentLetter ? 'letter' : context.eventType,
            location_name: location.name,
            npc_name: npc?.name || undefined,
            time_of_day: timeOfDay,
            post_type: selectedPostType.id,
            validation_passed: validationResult.passed,
            attempts,
        },
    };
}

// ─── Fallback ────────────────────────────────────────────────────────────

function generateFallbackEvent(petName: string, zone: string, language: string): string {
    const zoneNames: Record<string, Record<string, string>> = {
        crystal_meadow: { English: 'Crystal Meadow', Korean: '수정 초원', Japanese: 'クリスタル草原' },
        eternity_forest: { English: 'Eternity Forest', Korean: '영원의 숲', Japanese: '永遠の森' },
        crystal_lake: { English: 'Crystal Lake', Korean: '수정 호수', Japanese: 'クリスタル湖' },
        sunset_hill: { English: 'Sunset Hill', Korean: '노을 언덕', Japanese: '夕暮れの丘' },
    };
    const zoneName = zoneNames[zone]?.[language] ?? zoneNames[zone]?.['English'] ?? zone;

    if (language === 'Korean') {
        return `오늘 ${petName}은(는) ${zoneName}의 길을 걸었습니다. 바람이 털을 부드럽게 스쳤고, 발 아래 풀잎은 조용히 흔들렸습니다. 어딘가 먼 곳에서 익숙한 냄새가 흘러왔습니다. ${petName}은(는) 멈춰 코를 들어 공기를 맡았습니다.`;
    }
    if (language === 'Japanese') {
        return `今日、${petName}は${zoneName}の道を歩きました。風が毛並みをやわらかく撫で、足元の草が静かに揺れました。遠くから馴染みのある香りが漂ってきました。${petName}は立ち止まり、鼻を空気に向けました。`;
    }
    return `${petName} walked the paths of the ${zoneName} today. The wind moved through fur softly, and the grass beneath bent in quiet rhythm. A familiar scent drifted from somewhere distant. ${petName} paused and lifted a nose to the air.`;
}

// ─── Legacy Compatibility ────────────────────────────────────────────────

/**
 * Calculate ToThereOn day from pet's passed_date (legacy wrapper)
 */
export function calculateTothereonDay(passedDate: Date | string): number {
    const passed = new Date(passedDate);
    const now = new Date();
    const diffTime = now.getTime() - passed.getTime();
    if (diffTime < 0) return 0; // passed_date is in the future — day 0
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / TIME_RATIO) + 1;
}

/**
 * Generate the arrival event for Day 0 (legacy)
 */
export function generateArrivalEvent(pet: { name: string; species: string; breed?: string | null; relationship?: string | null }): EventResult {
    return {
        content: `${pet.name} has safely arrived in ToThereOn World. The air is warm and filled with the scent of blooming flowers. A gentle breeze welcomes ${pet.name} to this peaceful new home, where rest and joy await.`,
        eventType: 'arrival',
        language: 'English',
        zone: 'central_plaza',
        location: 'welcome_plaza',
        isFakeBlur: false,
        isLearningEvent: true,
        learningStage: 'just_arrived',
        metadata: {
            trigger: 'arrival',
        },
    };
}
