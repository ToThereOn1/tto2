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

━━━ END WITH A HOOK ━━━
End with ONE unresolved thing that names a SPECIFIC object, place, or creature — not a vague feeling.
This is not sadness. It is curiosity. Something is still happening.
The guardian should finish reading and feel a pull — to come back tomorrow, to send a letter, to know what happens next.

HOOK SPECIFICITY TEST: If you could swap your hook into another pet's entry and it still works, it is too vague. Rewrite.
  ✗ "I'll go back tomorrow." → works for any pet. Too vague.
  ✓ "That gap in the lower hedge — something was on the other side. I heard it breathe." → only this pet, this place, this moment.
  ✗ "Still don't know what that was." → generic.
  ✓ "The stone Digby left near my spot. It wasn't there yesterday." → specific object, named character, concrete detail.

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
function buildSystemPrompt(language: string, personaProfile?: PersonaProfile): string {
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

    const voiceSection = voiceLines ? `

━━━ YOUR VOICE ━━━
This is how you specifically write — not a generic animal narrator, but exactly you:
${voiceLines}

Stay in this voice for every sentence. Do not drift into literary animal narration.` : '';

    return `${SYSTEM_PROMPT_BASE}\n\n${languageSection}${voiceSection}`;
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
        let effectiveUserPrompt = userPrompt;
        if (attempts > 1 && validationResult.issues.length > 0) {
            const feedbackNote = validationResult.issues.some(i => i.includes('Too long') || i.includes('Too many words'))
                ? `\n\n⚠️ PREVIOUS ATTEMPT REJECTED: Output was too long. Write SHORTER. Max 130 words. Cut every sentence that explains instead of shows. Aim for 80-100 words.`
                : `\n\n⚠️ PREVIOUS ATTEMPT REJECTED: Issues: ${validationResult.issues.join('; ')}. Fix these.`;
            effectiveUserPrompt = userPrompt + feedbackNote;
        }

        try {
            const response = await getAnthropic().messages.create({
                model: AI_CONFIG.EVENT_MODEL,
                max_tokens: 450,
                system: buildSystemPrompt(context.userLanguage, context.personaProfile),
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
