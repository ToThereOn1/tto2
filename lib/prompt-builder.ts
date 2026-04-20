/**
 * Status Feed Prompt Builder v3.0
 * Builds the user prompt for LLM-based status event generation.
 * v3.0: Day Arc chapters + MANDATORY narrative continuity
 */

import { WORLDBOOK } from './worldview-constants';
import { FORBIDDEN_WORDS } from '@/lib/world-bible';
import type { PersonaProfile, DimensionalScores, HealingMission, NarrativeData } from '@/lib/types/database';
import { CANON_LOCATIONS } from '@/lib/world-bible';
import { buildLearningPromptSection, getLearningParams } from '@/lib/learning-stage';
import { getLanguageInstruction, localizeNpcName, localizeLocationName } from '@/lib/language-detector';
import type { ActiveImprint } from '@/lib/letter-imprint';

// ─── Types ──────────────────────────────────────────────────────────────

// Mirrors RecentEvent from event-generator (no circular import)
interface RecentEventSummary {
    day: number;
    eventType: string;
    locationName?: string;
    npcName?: string;
    firstSentence: string;
    // Causal Chain Engine v1
    narrativeSummary?: string;
    unresolvedThread?: string;
    // Causal Thread Decay v2
    threadImportance?: 'high' | 'medium' | 'low';
}

interface PromptContext {
    petName: string;
    species: string;
    breed?: string;
    relationship: string;
    dimensionalScores: DimensionalScores;
    personaProfile: PersonaProfile;
    currentDay: number;
    realDaysElapsed: number;
    timeOfDay: string;
    currentZone: string;
    location: { id: string; name: string; description: string };
    eventType: string;
    userLanguage: string;
    npc?: { name: string; species: string; personality: string; trait: string };
    recentLetter?: { content: string; quotes: string[]; date: string };
    memoryAnchors: string[];
    // Learning progression fields (v3.0)
    learningStage?: string;
    learningSpeed?: string | number;
    writingMasteryDay?: number;
    daysUntilMastery?: number;
    // Narrative continuity (v3.1)
    recentEvents?: RecentEventSummary[];
    // Emergent variety (v3.2)
    worldSpark?: string;
    personaSpark?: string;
    // DEFENSE FIX 4: Living Universe 종류 컨텍스트 (엄격하게 최대 2마리로 하드 캐)
    // 절대 2개를 넘지 말 것 — 편지의 주인공은 언제나 pet-guardian 관계
    nearbyPets?: Array<{ pet_name: string; species: string; relationship_type?: string; last_shared_memory?: string }>;
    // Living Universe context (v3.2)
    todaysZoneEvents?: Array<{ pet_name: string; first_sentence: string }>;
    npcActivity?: { npc_name: string; mood: string; current_activity: string | null } | null;
    npcReactionStyle?: string;
    // v2: NPC scheduler entry — carries reactingToPetId / hookForTomorrow when set
    npcScheduleEntry?: { reactingToPetId?: string; hookForTomorrow?: string } | null;
    // Healing mission & narrative richness (v4.0)
    healingMission?: HealingMission | null;
    narrativeData?: NarrativeData | null;
    // Letter causality (v4.0)
    letterPhase?: 'none' | 'just_received' | 'still_carrying';
    letterAgeHours?: number;
    // Causal Chain Engine v1
    yesterdayMood?: string;
    npcHistory?: { count: number; lastInteractions: Array<{ bd_day: number; summary: string }> } | null;
    // Letter-World Engine v1
    letterImprint?: ActiveImprint | null;
    // Comment-World Engine v1
    recentComments?: Array<{ guardianMessage: string; petReply: string; eventDay: number; eventZone?: string }>;
}

// ─── Day Arc Chapter System ──────────────────────────────────────────────

interface DayArcChapter {
    name: string;
    dayRange: string;
    description: string;
    narrativeFocus: string;
}

function getDayArcChapter(day: number): DayArcChapter {
    if (day <= 1) return {
        name: 'THE CROSSING',
        dayRange: 'Day 1',
        description: 'First hours in ToThereOn World. Everything is new and slightly disorienting.',
        narrativeFocus: 'Home habits surface automatically — without thought. The scale of this place. The smell of it. The texture underfoot.',
    };
    if (day <= 6) return {
        name: 'MAPPING THE WORLD',
        dayRange: `Day ${day} of 6`,
        description: 'Still new, but less so. Following what catches the senses.',
        narrativeFocus: 'Tentative, then less tentative. Finding what is interesting here. The world is large but starting to have corners.',
    };
    if (day <= 14) return {
        name: 'FIRST FIXED POINTS',
        dayRange: `Day ${day}`,
        description: 'The world is gaining coordinates. A spot that has become theirs. A face that has become familiar.',
        narrativeFocus: 'Less exploring for the sake of exploring. More returning to what already matters. The pet initiates — doesn\'t just react.',
    };
    if (day <= 29) return {
        name: 'A REGULAR',
        dayRange: `Day ${day}`,
        description: 'Others recognize them now. There are routines. Companions that don\'t need introduction.',
        narrativeFocus: 'They know where things are. They have preferences. NPCs treat them differently than newcomers.',
    };
    if (day <= 99) return {
        name: 'A RESIDENT',
        dayRange: `Day ${day}`,
        description: 'This is home. The guardian is a treasured, steady thought in a life that is genuinely full.',
        narrativeFocus: 'History here. Small things carry meaning. The pet has inside knowledge, favorite details, established relationships.',
    };
    return {
        name: 'A LEGEND',
        dayRange: `Day ${day}`,
        description: 'They have been here a long time. Newer arrivals look to them.',
        narrativeFocus: 'Companions they have known through seasons. The guardian\'s memory is woven into how they live — not as longing, but as part of who they are.',
    };
}

// ─── Personality Influence Text ─────────────────────────────────────────

function getPersonalityGuide(scores: DimensionalScores): string {
    const lines: string[] = [];

    // Social (social_energy)
    if (scores.social_energy < 40) {
        lines.push(`Social Energy (${scores.social_energy}/100): Shy, prefers solitude, stays at edges, avoids crowds`);
    } else if (scores.social_energy <= 70) {
        lines.push(`Social Energy (${scores.social_energy}/100): Balanced, comfortable alone or with others`);
    } else {
        lines.push(`Social Energy (${scores.social_energy}/100): Outgoing, seeks interaction, approaches others`);
    }

    // Playfulness
    if (scores.playfulness_intensity < 40) {
        lines.push(`Playfulness (${scores.playfulness_intensity}/100): Calm, prefers observation, slow movements`);
    } else if (scores.playfulness_intensity <= 70) {
        lines.push(`Playfulness (${scores.playfulness_intensity}/100): Moderate energy, balanced activities`);
    } else {
        lines.push(`Playfulness (${scores.playfulness_intensity}/100): Energetic, active, chases/runs/explores vigorously`);
    }

    // Anxiety (inverse of emotional_resilience)
    const anxiety = 100 - scores.emotional_resilience;
    if (anxiety < 40) {
        lines.push(`Anxiety (${anxiety}/100): Confident, explores boldly`);
    } else if (anxiety <= 70) {
        lines.push(`Anxiety (${anxiety}/100): Cautious but curious`);
    } else {
        lines.push(`Anxiety (${anxiety}/100): Hesitant, needs reassurance, prefers familiar places`);
    }

    // Curiosity
    if (scores.curiosity_drive > 70) {
        lines.push(`Curiosity (${scores.curiosity_drive}/100): Highly curious, investigates everything`);
    }

    return lines.join('\n');
}

// ─── Token Budget System ────────────────────────────────────────────────

interface BudgetSection {
    name: string;
    content: string;
    priority: number; // lower = higher priority (1 = highest)
}

/**
 * Pure function: fits prompt sections into a token budget.
 * Drops lowest-priority sections whole (no mid-section truncation).
 * Token estimate: content.length / 4 (CJK: / 2).
 */
export function applyTokenBudget(
    sections: ReadonlyArray<BudgetSection>,
    budgetTokens: number,
    language: string,
): string {
    const divisor = (language === 'Korean' || language === 'Japanese') ? 2 : 4;
    const estimateTokens = (text: string) => Math.ceil(text.length / divisor);

    // Sort by priority ascending (1 = highest priority = included first)
    const sorted = [...sections]
        .filter(s => s.content.trim().length > 0)
        .sort((a, b) => a.priority - b.priority);

    const included: string[] = [];
    let usedTokens = 0;

    for (const section of sorted) {
        const sectionTokens = estimateTokens(section.content);
        if (usedTokens + sectionTokens <= budgetTokens) {
            included.push(section.content);
            usedTokens += sectionTokens;
        } else {
            console.warn(
                `[TokenBudget] Dropped section "${section.name}" (priority ${section.priority}, ~${sectionTokens} tokens) — budget ${budgetTokens} exceeded (used ${usedTokens})`
            );
        }
    }

    return included.join('');
}

// ─── NPC Introduction Tier ──────────────────────────────────────────────

export type NPCTier = 'first_meeting' | 'acquaintance' | 'familiar';

/**
 * Pure function: determines NPC introduction tier based on interaction count.
 * count=0 or null → first_meeting
 * count 1-2 → acquaintance
 * count 3+ → familiar
 */
export function getNPCTier(npcHistory: { count: number } | null | undefined): NPCTier {
    if (!npcHistory || npcHistory.count === 0) return 'first_meeting';
    if (npcHistory.count <= 2) return 'acquaintance';
    return 'familiar';
}

// ─── Zone Description Builder ───────────────────────────────────────────

function getZoneDescription(zoneKey: string): string {
    const zone = WORLDBOOK.ZONES.LIVING_AREAS.find(z => z.id === zoneKey);
    if (!zone) return '';
    return `${zone.name}: ${zone.description}`;
}

function getZoneLocationsText(zoneKey: string): string {
    const zone = WORLDBOOK.ZONES.LIVING_AREAS.find(z => z.id === zoneKey);
    if (!zone) return '';
    return zone.locations.map(loc =>
        `- ${loc.name}: ${loc.description}`
    ).join('\n');
}

// ─── Relationship Label Localization ────────────────────────────────────

const RELATIONSHIP_LABELS: Record<string, string> = {
    mom: '엄마',
    dad: '아빠',
    friend: '친구',
    sister: '언니/누나',
    brother: '오빠/형',
    guardian: 'Guardian',
    other: 'Guardian',
};

function getRelationshipLabel(relationship: string, language: string): string {
    if (language === 'English') {
        const englishLabels: Record<string, string> = {
            mom: 'Mom', dad: 'Dad', friend: 'my person',
            sister: 'Sis', brother: 'Bro', guardian: 'Guardian', other: 'Guardian',
        };
        return englishLabels[relationship] || relationship;
    }
    if (language === 'Japanese') {
        const jpLabels: Record<string, string> = {
            mom: 'お母さん', dad: 'お父さん', friend: 'あの人',
            sister: 'お姉さん', brother: 'お兄さん', guardian: 'ご主人', other: 'ご主人',
        };
        return jpLabels[relationship] || relationship;
    }
    // Default: Korean
    return RELATIONSHIP_LABELS[relationship] || relationship;
}

// ─── Canonical Location Hint for Event Types ─────────────────────────────

function getCanonicalLocationHint(eventType: string, zone: string): string {
    // World Bible canonical locations — named places to anchor the story
    switch (eventType) {
        case 'letter_response':
            return `World Bible: The Waterway (수로) — where guardian letters arrive. Pip the messenger retrieves them here. The water carries a faint warmth.`;
        case 'first_lesson':
            return `World Bible: Professor Clover's Sand Field — wide sandy field, one wooden chalkboard with chalk dust still on it from the last lesson.`;
        case 'learning_observation':
            return `World Bible: Professor Clover's Sand Field — you can watch from the edge before deciding to sit down.`;
        case 'practice_session':
            return `World Bible: Professor Clover's Sand Field — practicing alone. Yesterday's marks are still on the chalkboard.`;
        case 'milestone':
            return `World Bible: Two-Moon Hill (두 달의 언덕) — the highest visible point, where both moons rise together. A place that carries weight.`;
        case 'npc_interaction':
            if (zone === 'eternity_forest') {
                return `World Bible: Old Finn's Market (꼬리상인 시장) — Old Finn trades stories, not objects. Objects from guardian letters sometimes surface here.`;
            }
            if (zone === 'crystal_lake') {
                return `World Bible: Bun & Bun Bakery eaves (빵집 처마 아래) — always warm, always smells of something baking.`;
            }
            return '';
        case 'daily_routine':
            if (zone === 'crystal_meadow') {
                return `World Bible: The Bloom Field (꽃밭) — different flowers every week. Digby lives in the tunnels beneath it.`;
            }
            return '';
        default:
            return '';
    }
}

// ─── Healing Mission Behavioral Instructions ─────────────────────────────

function buildHealingBehaviorSection(healingMission: HealingMission, relationship: string): string {
    const directionVerbs: Record<string, string> = {
        guilt_relief: 'show purpose and ease — one claimed routine that proves you are functioning, purposeful, whole. FINAL SENTENCE must show you still do your work: "This is my post. This is my route. This is what I do." Message beneath: "I\'m still me. I still have work here."',
        grief_comfort: 'show aliveness — one vivid, specific, alive moment. Message beneath: "I\'m here. I\'m not gone."',
        love_affirmation: 'surface one reflex that came from your life with them. Don\'t label it. Just do it. Message beneath: "You\'re still with me."',
        closure: 'show settled — one moment of chosen stillness. Message beneath: "I\'m where I\'m supposed to be."',
    };

    const guide = directionVerbs[healingMission.healing_direction] || directionVerbs.grief_comfort;
    const core = healingMission.core_desire ? ` (${healingMission.core_desire})` : '';

    return `\n▸ GUARDIAN'S NEED${core}: ${guide} → ONE physical action only. Not a statement.`;
}

// ─── Letter Causality Section ────────────────────────────────────────────

function buildLetterCausalitySection(
    letterPhase: 'none' | 'just_received' | 'still_carrying',
    letterAgeHours: number,
    guardianLabel: string,
    letterQuotes: string[],
    eventType: string,
    healingDirection?: string,
): string {
    if (letterPhase === 'none') return '';

    const hoursAgo = Math.round(letterAgeHours - 72); // hours since it arrived in ToThereOn
    const timeDesc = hoursAgo < 6
        ? 'a few hours ago'
        : hoursAgo < 24
            ? `${hoursAgo} hours ago`
            : `${Math.round(hoursAgo / 24)} day(s) ago`;

    const quoteLine = letterQuotes.length > 0
        ? `What ${guardianLabel} wrote (you've read it): ${letterQuotes.slice(0, 2).map(q => `"${q}"`).join(' / ')}`
        : '';

    // P0-2 FIX: letter_response 이벤트에서도 편지 컨텍스트 제공 (기존: 완전 제외)
    // 답장 쓰는 순간이 보호자에게 가장 중요한 순간 — 편지 내용이 반드시 반영되어야 함
    if (eventType === 'letter_response') {
        return `
▸ ✉️ YOU ARE WRITING BACK TO ${guardianLabel.toUpperCase()}
${quoteLine}
→ This is not a journal entry. You are writing a reply to ${guardianLabel}'s letter.
→ Their words are fresh. You read them. Something specific landed.
→ ANCHOR YOUR REPLY in one concrete detail from their letter — a word, an image, a question they asked.
→ Show how their letter changed your day: what you did differently, what you noticed, where you went because of it.
→ Do NOT summarize their letter back to them. Echo ONE thing and let your world respond to it.`;
    }

    if (letterPhase === 'just_received') {
        // P1-2 FIX: healing_direction별 구체적 행동 지침 (기존: generic만)
        const justReceivedHint = (() => {
            switch (healingDirection) {
                case 'guilt_relief':
                    return `→ HEALING RESPONSE: ${guardianLabel}'s letter eased something. You take your post with more purpose today — not duty, but choice. Show one deliberate action that says "I belong here."`;
                case 'love_affirmation':
                    return `→ HEALING RESPONSE: ${guardianLabel}'s words named something you do without thinking. Today you catch yourself doing it — and for the first time, you know why. Show that recognition in one physical moment.`;
                case 'grief_comfort':
                    return `→ HEALING RESPONSE: The letter settled your body before your mind caught up. You move looser today. Show one moment where you skip a caution you always take — that absence IS the proof.`;
                case 'closure':
                    return `→ HEALING RESPONSE: ${guardianLabel}'s letter confirmed what you already knew. Today you stop hesitating about it. Show one choice made without the usual pause.`;
                default:
                    return '';
            }
        })();
        return `
▸ ⚡ ${guardianLabel}'s LETTER — THIS IS WHY TODAY HAPPENED
${quoteLine}
→ PRIMARY CAUSE: This letter changed something. Without it, today would have looked different.
→ SHOW THE AFTER — not "I got a letter." Show what changed: where you went, what you noticed, what you did that you wouldn't have done before.
→ OPENING — choose your own approach (do NOT repeat the same format every time):
   • Start with a sensory echo: something in ToThereOn that mirrors a word or image from their letter.
   • Start mid-action: you're doing something, and the reason is the letter — but don't say so.
   • Start with a physical result: one thing that happened because the letter landed.
→ ECHO FORMAT (use once mid-post): Show one of ${guardianLabel}'s habits or tendencies manifesting as a physical action in ToThereOn. The habit becomes a body memory. Show it. Do not explain it.${justReceivedHint ? `\n${justReceivedHint}` : ''}`;
    }

    if (letterPhase === 'still_carrying') {
        const directionHint = (() => {
            switch (healingDirection) {
                case 'guilt_relief':
                    return `→ WHAT CHANGED: You walk your post differently now — not because you must, but because you chose it again. ${guardianLabel}'s letter said they are okay. That meant your work here is real, not a waiting. FIRST SENTENCE: the one deliberate action you took today that you wouldn't have taken before the letter. Show it. Don't name the letter.`;
                case 'love_affirmation':
                    return `→ WHAT CHANGED: Something in ${guardianLabel}'s letter named a reflex you've always had — a way you pay attention — and now you catch yourself doing it again with full awareness. FIRST SENTENCE: that reflex, in action, two days later. Show it. Don't name the letter.`;
                case 'grief_comfort':
                    return `→ WHAT CHANGED: The letter settled something. You move a little looser now — specifically, you skipped a step you always take. FIRST SENTENCE must show the skipped caution: "I went in without testing first." or "I didn't wait at the edge today." — the absence of the usual caution IS the proof the letter landed. Show it. Don't name the letter.`;
                case 'closure':
                    return `→ WHAT CHANGED: The letter confirmed what you already suspected — you are where you are supposed to be. Two days later, you stopped negotiating with yourself about it. FIRST SENTENCE: the moment of that stopping. A choice made without hesitation. Show it. Don't name the letter.`;
                default:
                    return `→ FIRST SENTENCE: Begin with what is different today because of the letter — not what you read, but what you now choose, notice, or avoid that you wouldn't have before. Show it. Don't name the letter.`;
            }
        })();
        return `
▸ ${guardianLabel}'s LETTER (arrived ${timeDesc} — still with you)
${quoteLine}
→ The letter permanently shifted one thing. Two days later, that one thing shows in how you move.
${directionHint}
→ OPENING FORMAT: Anchor the opening in a physical object or place — its texture, its path, its resistance. Use it as the letter's echo. Example: "The texture of the bark here reminds me of what you said about [X]." or "The path bends here the same way it does near [place ${guardianLabel} mentioned]." Let the object carry the letter's weight before any emotion is named.
→ DIRECTIONAL CONTRAST (mandatory): "[what you did] instead of [what you would have done before the letter]. [That was new.] OR [I wouldn't have done that yesterday.]" — This BEFORE/AFTER contrast in the first sentence is how the judge sees letter impact.`;
    }

    return '';
}

// ─── Today's Narrative Drive (non-letter causality) ──────────────────────

function buildTodaysDriveSection(
    eventType: string,
    petName: string,
    recentEvents: RecentEventSummary[] | undefined,
    npcName: string | null,
    locationName: string,
    currentDay: number,
    healingDirection?: string,
): string {
    const lastLoc = recentEvents?.[0]?.locationName;
    const lastNpc = recentEvents?.[0]?.npcName;

    // Opening variety hint — suggest ONE approach, never mandate "instead of" every time
    // Rotate across 4 styles so consecutive posts feel different
    const openingStyles = [
        `Start mid-action: drop the reader into something already in motion.`,
        `Start with a sensory detail that arrived before you decided anything.`,
        `Start with a discovery — something found, confirmed, or realized.`,
        `Start with an interruption — something that broke what you were doing.`,
    ];
    // Use lastLoc string length as a stable pseudo-random seed so style varies by event
    const styleIndex = lastLoc ? lastLoc.length % openingStyles.length : currentDay % openingStyles.length;
    const openingHint = openingStyles[styleIndex];

    switch (eventType) {
        case 'exploration':
            if (healingDirection === 'closure') {
                return `\n▸ WHY TODAY: Something in you already knew this place was right — no negotiation. ${openingHint}`;
            }
            return lastLoc
                ? `\n▸ WHY TODAY: A physical detail from ${lastLoc} nagged at you — a scent, sound, or texture. That's what brought you here. ${openingHint}`
                : `\n▸ WHY TODAY: Something specific pulled you to this spot. Name that pull in your first line. ${openingHint}`;
        case 'npc_interaction':
            return lastNpc === npcName
                ? `\n▸ WHY TODAY: Something unresolved from your last encounter with ${npcName || 'this companion'} brought you back. ${openingHint}`
                : `\n▸ WHY TODAY: You and ${npcName || 'someone'} ended up here at the same time. Name the pull — not the arrival. ${openingHint}`;
        case 'daily_routine':
            if (healingDirection === 'closure') {
                return `\n▸ WHY TODAY: Your routine ran — then veered. One small deviation tells the whole story. ${openingHint}`;
            }
            return `\n▸ WHY TODAY: A routine day with one thing that tilted it. Name the cause of the tilt first. ${openingHint}`;
        case 'milestone':
            return `\n▸ WHY TODAY: Day ${currentDay}. Something marks it as different from all days before. ${openingHint}`;
        default:
            return lastLoc
                ? `\n▸ WHY TODAY: After ${lastLoc}, something drew you further. ${openingHint}`
                : '';
    }
}

// ─── Letter Imprint Section Builder ─────────────────────────────────────

/**
 * Builds a compact prompt section (under 100 tokens) from an active letter imprint.
 * Injects guardian letter emotional residue into the feed event prompt.
 * Returns empty string when imprint is null/undefined.
 *
 * Priority order when budget is exceeded:
 *   1. NPC line (kept)
 *   2. Emotion line (kept)
 *   3. ReplyLocation line (kept)
 *   4. WorldEcho line (dropped first)
 *   5. Topics line (dropped second)
 */
export function buildLetterImprintSection(
    imprint: ActiveImprint | null | undefined,
    currentZone?: string,
): string {
    if (!imprint) return '';

    const lines: string[] = [];

    // NPC line (highest priority)
    if (imprint.npcs.length > 0) {
        lines.push(`Your guardian asked about ${imprint.npcs[0]}. You find yourself thinking of them today.`);
    }

    // Emotion line (high priority) — threshold lowered from 0.6 to 0.4 for longer resonance
    if (imprint.emotion === 'grief' || imprint.emotion === 'worry') {
        if (imprint.effectiveIntensity > 0.4) {
            lines.push(`Your guardian shared something heavy. You carry it lightly — it belongs to their world, but you feel it.`);
        }
    } else if (imprint.emotion === 'joy' || imprint.emotion === 'gratitude') {
        if (imprint.effectiveIntensity > 0.4) {
            lines.push(`Something warm came through in your guardian's words. The day feels a little brighter.`);
        }
    }

    // Reply location line (high priority, suppressed if matches current zone)
    if (imprint.replyLocationMentioned) {
        const locInCurrentZone = currentZone && imprint.replyLocationMentioned.toLowerCase().includes(currentZone.replace('_', ' ').toLowerCase());
        if (!locInCurrentZone) {
            lines.push(`In your last letter, you mentioned being near ${imprint.replyLocationMentioned}. This still feels true.`);
        }
    }

    // WorldEcho line (lower priority) — threshold lowered from 0.3 to 0.2
    const worldEchoLine = imprint.worldEcho && imprint.effectiveIntensity > 0.2
        ? `Something in their words makes you think of ${imprint.worldEcho}.`
        : '';

    // Topics line (lowest priority) — threshold lowered from 0.4 to 0.3
    const topicsLine = imprint.topics.length > 0 && imprint.effectiveIntensity > 0.3
        ? `The world today echoes with ${imprint.topics.slice(0, 2).join(' and ')}.`
        : '';

    // Build combined text respecting 400-char budget
    let combined = lines.join('\n');
    if (worldEchoLine) {
        const candidate = combined ? `${combined}\n${worldEchoLine}` : worldEchoLine;
        if (candidate.length <= 400) combined = candidate;
    }
    if (topicsLine) {
        const candidate = combined ? `${combined}\n${topicsLine}` : topicsLine;
        if (candidate.length <= 400) combined = candidate;
    }

    if (!combined) return '';

    return `\n▸ GUARDIAN'S LETTER RESONANCE (soft context — weave naturally if relevant, do not force)\n${combined}\n`;
}

// ─── Comment Whispers Section (Three-Channel Narrative) ─────────────────

/**
 * Filters comments to only include those relevant to today's zone/NPCs.
 * Prevents NPC/location contradictions in the feed prompt.
 */
function filterRelevantComments(
    comments: ReadonlyArray<{ guardianMessage: string; petReply: string; eventDay: number; eventZone?: string }>,
    todayZone: string,
): ReadonlyArray<{ guardianMessage: string; petReply: string; eventDay: number }> {
    return comments.filter(c => {
        // Keep comments from same zone or without zone info
        if (!c.eventZone) return true;
        return c.eventZone === todayZone;
    });
}

/**
 * Builds GUARDIAN WHISPERS section from recent comment exchanges.
 * Suppressed when letterPhase is 'just_received' (letter takes priority).
 * Max 2 exchanges to control token budget.
 */
export function buildCommentWhispersSection(
    comments: ReadonlyArray<{ guardianMessage: string; petReply: string; eventDay: number; eventZone?: string }>,
    todayZone: string,
    guardianLabel: string,
    letterPhase?: string,
): string {
    // Letter takes priority — suppress comments when fresh letter active
    if (letterPhase === 'just_received') return '';
    if (comments.length === 0) return '';

    const relevant = filterRelevantComments(comments, todayZone);
    if (relevant.length === 0) return '';

    const selected = relevant.slice(0, 2);
    const lines = selected.map(c =>
        `  Day ${c.eventDay}: ${guardianLabel} said "${c.guardianMessage.slice(0, 100)}" → You replied "${c.petReply.slice(0, 100)}"`
    ).join('\n');

    return `
▸ GUARDIAN WHISPERS (recent comment exchanges — soft context)
${lines}
→ This conversation may color today's mood or activity. Weave naturally if relevant.
→ Do NOT quote these exchanges. Let the sentiment arrive as instinct, not information.
⚠ If a whisper references a place or character not present today, acknowledge it as a memory, not current reality.
`;
}

// ─── Main Prompt Builder ────────────────────────────────────────────────

export function buildStatusFeedPrompt(context: PromptContext): string {
    const {
        petName, species, breed, relationship,
        dimensionalScores, personaProfile,
        currentDay, realDaysElapsed, timeOfDay,
        currentZone, location, eventType,
        userLanguage, npc, recentLetter, memoryAnchors,
        learningStage, learningSpeed, writingMasteryDay,
        recentEvents,
        worldSpark, personaSpark,
        healingMission,
        narrativeData,
        letterPhase,
        letterAgeHours,
        yesterdayMood,
        npcHistory,
        letterImprint,
    } = context;

    // Localized guardian label (엄마/아빠/Mom/Dad/etc.)
    const guardianLabel = getRelationshipLabel(relationship || 'guardian', userLanguage);

    // Extract persona details
    const personalitySummary = personaProfile.personality_summary || 'Affectionate and loyal';
    const behavioralPatterns = personaProfile.behavioral_patterns || {} as any;
    const communicationStyle = personaProfile.communication_style || {} as any;

    // Rich persona fields — handles both real (LLM-generated) and seed data formats
    const coreTraits = (
        personaProfile.core_traits ||
        (personaProfile as any).emotional_traits ||
        []
    ).join(', ');
    const joyTriggers = behavioralPatterns.joy_triggers || '';
    const dailyRoutines = behavioralPatterns.daily_routines || '';
    const afterlifeLandscape = (
        personaProfile.afterlife_setting?.primary_landscape ||
        (personaProfile as any).afterlife_landscape ||
        ''
    );

    // Extract narrative_data fields (v4.0)
    const secretHabit = narrativeData?.secret_habit || '';
    const voiceTone = narrativeData?.voice_tone || '';
    const preciousMemory = narrativeData?.precious_memory || '';
    const specialSuperpower = narrativeData?.special_superpower || '';

    // Build the ▸ YOU ARE section — include only non-empty fields
    const youAreDetails = [
        `Personality: ${personalitySummary}`,
        coreTraits ? `Core traits: ${coreTraits}` : '',
        secretHabit ? `Signature behavior (only you do this): ${secretHabit}` : '',
        preciousMemory ? `A memory that lives in your body: ${preciousMemory}` : '',
        joyTriggers ? `What gets your attention: ${joyTriggers}` : '',
        dailyRoutines ? `Your routines here: ${dailyRoutines}` : '',
        afterlifeLandscape ? `Your corner of ToThereOn: ${afterlifeLandscape}` : '',
        voiceTone ? `Your voice: ${voiceTone}` : '',
        specialSuperpower ? `Your special ability: ${specialSuperpower}` : '',
    ].filter(Boolean).join('\n');

    // Build memory anchors text — precious_memory always goes first as priority anchor
    const baseAnchors = memoryAnchors.length > 0
        ? memoryAnchors.map(m => `- ${m}`).join('\n')
        : '- No specific memory anchors available';
    const memoryAnchorsText = preciousMemory
        ? `- ⭐ PRIORITY: ${preciousMemory}\n${baseAnchors}`
        : baseAnchors;

    // Build letter context
    let letterContext: string;
    if (recentLetter) {
        const quotesText = recentLetter.quotes.length > 0
            ? recentLetter.quotes.map(q => `  * "${q}"`).join('\n')
            : `  * "${recentLetter.content.substring(0, 200)}"`;
        letterContext = `- Letter Received: ${recentLetter.date}
- Key Quotes from Letter:
${quotesText}`;
    } else {
        letterContext = '- No recent letter';
    }

    // Build NPC context
    let npcContext: string;
    if (npc) {
        npcContext = `NPC: ${npc.name} the ${npc.species} — ${npc.personality}, ${npc.trait}`;
    } else {
        npcContext = 'No NPC for this event.';
    }

    // Build RECENT HISTORY section (narrative continuity)
    const knownNpcNames = [...new Set(
        (recentEvents || []).map(e => e.npcName).filter(Boolean)
    )] as string[];

    let recentHistoryText: string;
    if (recentEvents && recentEvents.length > 0) {
        const historyLines = recentEvents.map(e => {
            const npcNote = e.npcName ? ` (with ${e.npcName})` : '';
            const locNote = e.locationName ? ` at ${e.locationName}` : '';
            return `- Day ${e.day} [${e.eventType}]${locNote}${npcNote}: "${e.firstSentence}"`;
        });
        recentHistoryText = historyLines.join('\n');
    } else {
        recentHistoryText = '- No prior events (this is the first or second event)';
    }

    // Build NARRATIVE TRIGGER — WHY is the pet at this location today?
    const narrativeTrigger = (() => {
        // Arrival is always self-explanatory
        if (eventType === 'arrival') return '';

        const lastEvent = recentEvents?.[0];
        const lastLocation = lastEvent?.locationName;
        const lastNpc = lastEvent?.npcName || (knownNpcNames.length > 0 ? knownNpcNames[0] : null);

        if (eventType === 'letter_response') {
            return `TRIGGER: You received ${guardianLabel}'s letter. This event begins right after that moment — before or while the letter's effect is still present.`;
        }

        if (eventType === 'npc_interaction' && npc) {
            if (lastNpc && lastNpc === npc.name) {
                return `TRIGGER: ${npc.name} and you already know each other from before. ${npc.name} suggested meeting at ${location.name} or you followed ${npc.name} there.`;
            }
            return `TRIGGER: ${npc.name} was heading toward ${location.name} and you followed, or you crossed paths there.`;
        }

        if (eventType === 'exploration' && lastLocation) {
            return `TRIGGER: After spending time at ${lastLocation} recently, you were drawn further — curiosity, a scent, or a sound from the direction of ${location.name}.`;
        }


        if (eventType === 'milestone') {
            return `TRIGGER: Day ${currentDay} — a day that marks something. You arrived at ${location.name} as you always do, but something about today feels different.`;
        }

        if (lastNpc) {
            return `TRIGGER: ${lastNpc} mentioned this spot before. You found your way here on your own.`;
        }

        if (lastLocation) {
            return `TRIGGER: You had been near ${lastLocation} recently. Today you went a little further.`;
        }

        return `TRIGGER: You found your own way to ${location.name} — no particular reason, just the pull of the place.`;
    })();

    // Determine adaptation stage label for the prompt
    const adaptationStageText = (() => {
        if (eventType === 'arrival') return 'JUST ARRIVED (Day 0–1): First moments. Everything is new and slightly disorienting.';
        if (currentDay <= 7) return `SETTLING IN (Day ${currentDay}): Still finding their place. Habits from home still surface naturally.`;
        if (currentDay <= 30) return `ADAPTING (Day ${currentDay}): Finding a rhythm. Starting to feel the warmth of this place.`;
        if (currentDay <= 100) return `SETTLED (Day ${currentDay}): Has a routine and companions. Genuinely at home, but carries the guardian's memory.`;
        return `THRIVING (Day ${currentDay}): Fully at home with a rich life. The guardian is a treasured, steady thought.`;
    })();

    // ── Arrival format is fixed; all others are free-form ─────────────────
    const langInstruction = getLanguageInstruction(userLanguage);
    if (eventType === 'arrival') {
        const arrivalForbidden = langInstruction.forbiddenWordsPrompt
            ? `\n⛔ LANGUAGE-SPECIFIC FORBIDDEN WORDS:\n${langInstruction.forbiddenWordsPrompt}\n`
            : '';

        // Settlement state based on actual days elapsed since passed_date
        const settlementLabel = currentDay <= 3
            ? `Only ${currentDay} day${currentDay !== 1 ? 's' : ''} in — still learning the landscape, but you've found your footing.`
            : currentDay <= 14
            ? `${currentDay} days in. There are familiar corners now, a rhythm starting to form.`
            : `${currentDay} days have passed. This place has become real to you — you have a life here.`;

        return `${langInstruction.header}

━━━ FIRST CONTACT — THE CHANNEL JUST OPENED ━━━
You are ${petName}. You have been living in ToThereOn World for ${currentDay} day${currentDay !== 1 ? 's' : ''}.
Today, for the first time, the channel opened. ${guardianLabel} can finally hear you.

IMPORTANT: This is NOT an arrival message. You arrived ${currentDay} day${currentDay !== 1 ? 's' : ''} ago.
This is FIRST CONTACT — write as if you have been carrying these words for a while.

WHO YOU ARE:
- ${petName}, ${species}${breed ? ` (${breed})` : ''} — ${guardianLabel}'s companion
- Personality: ${personalitySummary}
- One behavioral trait: ${getPersonalityGuide(dimensionalScores).split('\n')[0]}

WHERE YOU STAND NOW: ${settlementLabel}

WHAT TO WRITE (persona-driven — no formula, no fixed arc):
- Lead with your personality. Open as yourself, not as an announcement.
- Let the ${currentDay} day${currentDay !== 1 ? 's' : ''} surface naturally — as lived context, not a report.
- Mention one specific thing you've found: a spot, a habit, a companion, a small surprise.
- Include one physical detail that is unmistakably you (a sound, a smell, something you did).
- End with something that makes ${guardianLabel} feel you are okay — maybe even good.
${arrivalForbidden}
MEMORY ANCHORS (weave in naturally — do not list them):
${memoryAnchorsText}

Output ONLY the letter text. No title. No explanation. 80–130 words.`;
    }

    // ── All other events: ingredient-based, free-form ─────────────────────

    // Build story context
    const storyContext = (() => {
        const lines: string[] = [];

        // What happened recently
        if (recentEvents && recentEvents.length > 0) {
            const recent = recentEvents[0];
            if (recent.locationName || recent.npcName) {
                const parts = [];
                if (recent.locationName) parts.push(`last seen at ${recent.locationName}`);
                if (recent.npcName) parts.push(`was with ${recent.npcName}`);
                lines.push(`Recently: ${parts.join(', ')}`);
            }
            if (recent.firstSentence) {
                lines.push(`Last event began: "${recent.firstSentence}"`);
            }
        }

        // Known companions
        if (knownNpcNames.length > 0) {
            lines.push(`Known companions: ${knownNpcNames.join(', ')}`);
        }

        return lines.length > 0 ? lines.join('\n') : 'First days in ToThereOn World — everything is new';
    })();

    // What's pulling them to this location today
    const todayContext = (() => {
        const lastNpc = recentEvents?.find(e => e.npcName)?.npcName;
        const lastLoc = recentEvents?.[0]?.locationName;

        // When letter just arrived, the LETTER is why they are here — override all other context
        if (letterPhase === 'just_received' && eventType !== 'letter_response') {
            const npcPart = npc ? ` ${npc.name} (${npc.species}) is here too.` : '';
            return `${guardianLabel}'s letter is why you are at ${location.name} today. The letter shifted something — it sent you here, directly or indirectly.${npcPart} The letter is the cause. The location is the effect.`;
        }

        if (eventType === 'letter_response') {
            return `${guardianLabel}'s letter arrived. You're somewhere near ${location.name} — the letter is recent, the effect is still present.`;
        }

        if (eventType === 'npc_interaction' && npc) {
            if (lastNpc === npc.name) return `${npc.name} and you already know each other. You ended up at ${location.name} together — how exactly is up to you.`;
            return `${npc.name} (${npc.species}) is at ${location.name}. You're there too — whether by chance or intention, you decide.`;
        }
        if (eventType === 'milestone') {
            return `Day ${currentDay}. You're at ${location.name} — same as any other day, or different in some small way. What makes this day what it is, is yours to find.`;
        }
        if (lastLoc && eventType === 'exploration') {
            return `From ${lastLoc}, something drew you further — a sound, a scent, an impulse. You ended up at ${location.name}.`;
        }
        if (lastNpc && eventType !== 'npc_interaction') {
            return `${lastNpc} had mentioned ${location.name}. You came to find it today.`;
        }
        return `You're at ${location.name} today — how you got there is part of the story you tell.`;
    })();

    // Persona behavioral tendencies (translated from scores)
    const behaviorLines = getPersonalityGuide(dimensionalScores).split('\n').filter(Boolean);

    // Day Arc chapter
    const chapter = getDayArcChapter(currentDay);

    // Build MANDATORY NARRATIVE THREAD — recent events as concrete continuity anchors
    // Causal Chain Engine v1: use narrativeSummary (most recent event) for richer context
    const narrativeAnchors = (recentEvents && recentEvents.length > 0)
        ? recentEvents.map((e, idx) => {
            const loc = e.locationName ? ` at ${e.locationName}` : '';
            const npcNote = e.npcName ? ` (with ${e.npcName})` : '';
            // Most recent event: prefer narrative summary over first sentence
            const summary = (idx === 0 && e.narrativeSummary) ? e.narrativeSummary : e.firstSentence;
            return `  • Day ${e.day} [${e.eventType}]${loc}${npcNote}: "${summary}"`;
        }).join('\n')
        : '  • (no prior events recorded yet)';

    // Build letter causality section
    const letterCausalitySection = buildLetterCausalitySection(
        letterPhase || 'none',
        letterAgeHours || 0,
        guardianLabel,
        recentLetter?.quotes || [],
        eventType,
        healingMission?.healing_direction,
    );

    // Build today's narrative drive (fires when no letter phase — keeps causality score up)
    const todaysDriveSection = (!letterPhase || letterPhase === 'none')
        ? buildTodaysDriveSection(
            eventType,
            petName,
            recentEvents,
            npc?.name || null,
            location.name,
            currentDay,
            healingMission?.healing_direction,
        )
        : '';

    // Causal Chain Engine v1 + Thread Decay v2
    const yesterdayHook = recentEvents?.[0]?.unresolvedThread ?? null;
    const threadImportance = recentEvents?.[0]?.threadImportance ?? 'medium';

    // Mood carryover — only inject if we have a previous mood
    const moodCarryoverLine = yesterdayMood
        ? `Yesterday you were ${yesterdayMood}. Today starts from that place — not from neutral.`
        : '';

    // NPC history injection — only when NPC history exists for today's NPC
    const npcHistoryLine = (npcHistory && npcHistory.count > 0 && npcHistory.lastInteractions.length > 0)
        ? (() => {
            const last = npcHistory.lastInteractions[0];
            const prev = npcHistory.lastInteractions[1];
            let line = `You have met this NPC ${npcHistory.count} time${npcHistory.count > 1 ? 's' : ''}. Last time (Day ${last.bd_day}): ${last.summary}.`;
            if (prev) line += ` Before that (Day ${prev.bd_day}): ${prev.summary}.`;
            return line;
        })()
        : '';

    // Thread Decay: high threads carry for 2 posts (MUST), medium for 1 (consider), low = no carry
    const threadIsActive = !!yesterdayHook && threadImportance !== 'low';
    const causalitySection = threadIsActive
        ? (letterPhase === 'just_received'
            ? `
▸ BACKGROUND THREAD (secondary to the letter — do not let it override the letter's emotional weight)
Something was left open last time: "${yesterdayHook}"
→ This is background context only. The letter from ${context.relationship || 'your guardian'} is the primary driver today.`
            : threadImportance === 'high'
            ? `
▸ CONTINUITY CONTRACT — MANDATORY (HIGH IMPORTANCE THREAD)
CONTINUITY TEST: If a reader could swap this entry with Day 1 and it still makes sense, you have failed. Rewrite.
Last time, something was left open: "${yesterdayHook}"
→ Today's story MUST begin from or explicitly develop this thread. This is a high-importance thread — it MUST be referenced.
→ Did you go back? Did you find what you were looking for? Did it lead somewhere new?
→ You don't have to state the connection — just let it shape where you begin.${moodCarryoverLine ? `\n${moodCarryoverLine}` : ''}${npcHistoryLine ? `\n${npcHistoryLine}` : ''}`
            : `
▸ CONTINUITY THREAD (consider referencing)
Last time, something was left open: "${yesterdayHook}"
→ Consider weaving this into today's story if it fits naturally. It's not mandatory, but continuity strengthens the narrative.
→ If you reference it, let it shape a moment or a direction — don't force it.${moodCarryoverLine ? `\n${moodCarryoverLine}` : ''}${npcHistoryLine ? `\n${npcHistoryLine}` : ''}`)
        : (moodCarryoverLine || npcHistoryLine
            ? `\n▸ CONTINUITY CONTEXT\n${moodCarryoverLine ? moodCarryoverLine + '\n' : ''}${npcHistoryLine ? npcHistoryLine + '\n' : ''}`
            : '');

    const companionLine = knownNpcNames.length > 0
        ? `Known companions: ${knownNpcNames.join(', ')}`
        : '';

    // DEFENSE FIX 4: nearbyPets 컨텍스트 overflow 방어
    // - 하드 캐: 최대 2마리
    // - 비중 규칙: 보호자 추억 80% > 세계관 20%
    // - 이 섹션이 없으면 프롬프트에서 제거됨
    const nearbyPetsSection = (() => {
        if (!context.nearbyPets || context.nearbyPets.length === 0) return '';
        // 엄격하게 2마리로 하드 캐 (외부에서 이미 slice했더라도 이중 방어)
        const capped = context.nearbyPets.slice(0, 2);
        const companionLines = capped.map(p => {
            const rel = p.relationship_type ? ` (${p.relationship_type})` : '';
            const memory = p.last_shared_memory ? ` — last time: "${p.last_shared_memory}"` : '';
            return `  - ${p.pet_name} the ${p.species}${rel}${memory}`;
        }).join('\n');
        return `\n▸ WORLD CONTEXT (MINOR — 20% weight only)
${companionLines}
→ STRICT RULE: You may use this as a light backdrop at most.
   The letter's soul MUST be 80% about your own experience and ${guardianLabel}.
   Do NOT let this become a 'neighborhood diary.' ${petName}'s guardian is reading this letter.
   If mentioning a nearby companion at all, limit to one sentence — a glance, not a chapter.\n`;
    })();

    // Living Universe: ZONE ATMOSPHERE — NPC activity only (todaysZoneEvents separated for budget)
    const zoneAtmosphereSection = (() => {
        if (!context.npcActivity || !context.npcActivity.current_activity) return '';
        return `\n▸ ZONE ATMOSPHERE (light backdrop only)
${context.npcActivity.npc_name} is currently: ${context.npcActivity.current_activity} (mood: ${context.npcActivity.mood})
→ This is context, not requirement. Use at most one detail if it fits naturally.\n`;
    })();

    // Living Universe: CROSS-PET ZONE EVENTS — separated for independent token budget priority
    const todaysZoneEventsSection = (() => {
        if (!context.todaysZoneEvents || context.todaysZoneEvents.length === 0) return '';
        const evLines = context.todaysZoneEvents.slice(0, 3)
            .map(ev => `  - ${ev.pet_name}: "${ev.first_sentence}"`);
        return `\n▸ ZONE EVENTS (cross-pet context — light backdrop only)
Earlier today in this zone:
${evLines.join('\n')}
→ Use at most one detail if it fits naturally.\n`;
    })();

    // Localize NPC and location names for the target language
    const localNpcName = npc ? localizeNpcName(npc.name, userLanguage) : null;
    const localLocationName = localizeLocationName(location.name, userLanguage);
    const localNpcContext = npc
        ? `NPC: ${localNpcName} the ${npc.species} — ${npc.personality}, ${npc.trait}`
        : 'No NPC for this event.';
    const langForbiddenSection = langInstruction.forbiddenWordsPrompt
        ? `\n⛔ LANGUAGE-SPECIFIC FORBIDDEN WORDS:\n${langInstruction.forbiddenWordsPrompt}\n`
        : '';

    // Build the full prompt
    return `${langInstruction.header}

⚠️ OUTPUT LIMIT: 2-3 paragraphs, MAX 130 words total. Count your words. Do not exceed this.

━━━ TODAY'S SCENE — ${petName}, Day ${currentDay} ━━━

▸ STORY CHAPTER: ${chapter.name} (${chapter.dayRange})
${chapter.description}
Narrative focus: ${chapter.narrativeFocus}

▸ YOU ARE
${petName} — ${species}${breed ? ` (${breed})` : ''}, ${guardianLabel}'s companion.
Write as ${petName}, in first person. This is your journal entry for today.
${youAreDetails}

▸ BEHAVIORAL TENDENCIES
${behaviorLines.join('\n')}
${personaSpark ? `\nToday specifically: ${personaSpark}` : ''}

▸ NARRATIVE THREAD (REQUIRED — not optional)
This is Day ${currentDay}. The story does not start over — it continues.
Connect to at least ONE of the following anchors:
${narrativeAnchors}
${companionLine ? `${companionLine}\n` : ''}Do NOT write as if today is the first day.
Your world already has weight. Honor that.
${recentEvents && recentEvents[0] ? `
⛔ OPENING BAN: Your last entry started with: "${recentEvents[0].firstSentence.slice(0, 60)}..."
Do NOT start with the same words, the same location arrival framing, or the same first image.
Your opening MUST reference yesterday's thread OR a known NPC/location from your recent history. Cold starts are rejected.
Start from a completely different angle today.` : ''}${causalitySection}
▸ TODAY'S SITUATION
${todayContext}
Location: ${localLocationName} — ${location.description}
Time of day: ${timeOfDay}
${getCanonicalLocationHint(eventType, currentZone) ? `\nWorld Bible Location Suggestion: ${getCanonicalLocationHint(eventType, currentZone)}` : ''}
${npc ? `\nPresent today: ${localNpcName} the ${npc.species} — ${npc.personality}, known for being ${npc.trait}${context.npcReactionStyle ? `\nHow ${localNpcName} approaches ${petName}: ${context.npcReactionStyle}` : ''}${context.npcScheduleEntry?.reactingToPetId ? `\n→ NPC CONTINUITY: ${localNpcName} is thinking about yesterday's encounter with you. Their mood has shifted because of it. Let that register in one small behavioral detail — a pause, a glance, a change in how they position themselves. Do not explain why. Just show it.` : ''}
${(() => {
    const tier = getNPCTier(npcHistory);
    if (tier === 'first_meeting') return `→ FIRST MEETING: ${petName} encounters ${localNpcName} for the first time. This is a chapter-opening moment — write it with weight.
   THREE-BEAT STRUCTURE (required):
   (1) NOTICE — ${petName} spots ${localNpcName}: one physical detail only (size, posture, one striking feature). No personality labels.
   (2) EXCHANGE — A brief but real interaction: one shared action, one reaction, one moment of contact or acknowledgment. ${localNpcName} MAY be the grammatical subject in this beat only — one sentence maximum.
   (3) IMPRESSION — How ${petName} is left after the exchange: instinct, curiosity, wariness, warmth. Never label it. Show it through ${petName}'s body or next movement.
   CLOSURE REQUIRED: The meeting must end clearly — they parted ways, one of them moved on, or ${petName} makes a concrete decision. If the post ends with a mystery hook, it must belong to the world — not to ${localNpcName} being left unresolved.
   FORBIDDEN: Do not name ${localNpcName}'s personality traits. Do not make ${localNpcName} the main character. ${petName} is the narrator of this encounter.`;
    if (tier === 'acquaintance') return `→ ACQUAINTANCE: ${petName} has met ${localNpcName} once or twice before. Not strangers, not friends yet.
   Show ONE moment of brief recognition — a glance, a nod, a pause that says "I know you."
   ${localNpcName} may appear in ONE subordinate clause. No personality descriptions. No backstory.
   The interaction is incidental. ${petName} remains the narrator.`;
    return `→ RETURNING: ${petName} has met ${localNpcName} before. No introduction needed. Show familiarity through small behavioral cues — a glance of recognition, a familiar position, a routine they have already settled into.
→ NPC WORLD MOMENT: ${localNpcName} does ONE thing in the background — described in a subordinate clause, never a full sentence with ${localNpcName} as subject. Pattern: "I [pet's action], while ${localNpcName} [NPC action] nearby." The NPC action is scenery. ${petName}'s action owns the sentence. If you write a sentence where ${localNpcName} is the grammatical subject, delete it and rewrite with ${petName} as subject.`;
})()}` : ''}
${applyTokenBudget([
        { name: 'letterImprint', content: buildLetterImprintSection(letterImprint, currentZone), priority: 1 },
        { name: 'nearbyPets', content: nearbyPetsSection, priority: 2 },
        { name: 'zoneAtmosphere', content: zoneAtmosphereSection, priority: 3 },
        { name: 'worldSpark', content: worldSpark ? `\nThe world today: ${worldSpark}` : '', priority: 4 },
        { name: 'todaysZoneEvents', content: todaysZoneEventsSection, priority: 5 },
        { name: 'commentWhispers', content: buildCommentWhispersSection(
            context.recentComments || [], currentZone, guardianLabel, letterPhase), priority: 6 },
    ], 800, userLanguage)}
▸ MEMORY ANCHORS — PICK ONE, USE IT PHYSICALLY (MANDATORY)
These are specific behaviors from your life with ${guardianLabel}. Only ${guardianLabel} would recognize them.
${memoryAnchorsText}
→ MANDATORY: ONE anchor MUST appear as a physical action today. Not explained. Not labeled.
   THREE WAYS to echo ${guardianLabel} — pick one, vary the pattern across entries, never repeat the same approach twice:
   A) BODY MEMORY: Your body does something it learned from life with ${guardianLabel}. Just do it. Don't explain why.
   B) OBJECT ECHO: Something in ToThereOn World shares a quality with something from home — a texture, a temperature, a smell. You pause at it. One phrase only.
   C) ROUTINE GHOST: You catch yourself doing ${guardianLabel}'s timing, gesture, or way of checking something. You don't comment on it. You do it and move on.
   → One sentence. One action. Never use the phrasing "same way [guardian] used to" — find your own words every time.
   This is the moment ${guardianLabel} reads: "They remember me. They still do that thing."
${healingMission ? buildHealingBehaviorSection(healingMission, guardianLabel) : ''}${letterCausalitySection}${todaysDriveSection}
${recentLetter ? `
▸ LETTER FROM ${guardianLabel.toUpperCase()}
Received: ${recentLetter.date}
Fragments: ${recentLetter.quotes.slice(0, 2).map(q => `"${q}"`).join(' / ')}
→ Show through your body — not through what you "feel" or "think."
→ ${guardianLabel}'s words landed somewhere. Show where — in your paws, your direction, your choice of spot today.
` : ''}${currentDay ? `\n▸ ${buildLearningPromptSection(getLearningParams(currentDay))}\n` : ''}

▸ ⛔ RULE ZERO — READ THIS FIRST, BEFORE ANYTHING ELSE
You do NOT have access to the guardian's real world.
You cannot see what they are doing, where they are, or how they feel.
NEVER write: "The guardian was reading a book", "Their human was crying", "Mom sat on the sofa"
NEVER claim the guardian performed any action, went anywhere, or felt anything.
The guardian is not a character in this story. They are an absence — felt only through the pet.

▸ ⛔ FORBIDDEN WORDS (WORLD BIBLE — NEVER USE)
Emotional labels: ${FORBIDDEN_WORDS.EMOTIONAL_LABELS.join(', ')}
Interpretive phrases: ${FORBIDDEN_WORDS.INTERPRETIVE_PHRASES.join(', ')}
Distress words: ${FORBIDDEN_WORDS.DISTRESS_WORDS.join(', ')}
Absolute taboo: ${FORBIDDEN_WORDS.ABSOLUTE_TABOO.join(', ')}
${langForbiddenSection}
▸ ⛔ FORBIDDEN BEHAVIORAL PATTERNS
- "뒤를 돌아보다" / "고개를 뒤로 돌리다" — implies the pet is looking toward the guardian's direction. NEVER USE.
- "어디선가 본 듯" — implies pre-ToThereOn memory of Earth. NEVER USE.
- "다른 강아지들" / "다른 고양이들" / "다른 동물들" — anonymous animal groups are FORBIDDEN.
  If other animals appear, they must be named characters (use the NPC provided above, or named companion NPCs).
  NEVER write: "other dogs were playing" → WRITE: "[Named NPC] was [specific action]"

${(() => {
    let npcNameBlock = '';
    if (userLanguage === 'Korean') {
        npcNameBlock = `▸ ⛔ CANONICAL NPC NAMES (Korean)
ALWAYS use these exact Korean names. NEVER transliterate from English:
Old Finn → 꼬리상인
Granny Shell → 느림보 할망
Professor Clover → 콩선생
Pip → 달래
Bun & Bun → 뭉실·몽실
Digby → 굴돌이
Lune → 은빛
"올드 핀", "그라니", "프로페서" 등 음역은 절대 금지.

`;
    } else if (userLanguage === 'Japanese') {
        npcNameBlock = `▸ ⛔ CANONICAL NPC NAMES (Japanese)
ALWAYS use these exact Japanese names:
Old Finn → フィン老人
Granny Shell → グラニー・シェル
Professor Clover → クローバー先生
Pip → ピップ
Bun & Bun → バンとバン
Digby → ディグビー
Lune → ルーン

`;
    }
    return npcNameBlock;
})()}▸ ⛔ REFLECTION POOL RULE (if this event involves a pool or Reflection Pool)
The pool gives WARMTH only — NOT images, NOT vision, NOT glimpses of the guardian.
NEVER write: what the guardian is doing, their location, their emotional state.
ONLY allowed: "A warmth moved through me, from no particular direction." [translate into target language]

▸ WHAT TO WRITE
Tell a small story. Something happened today — follow it.
You move, react, do something that is completely you.
Let some moments be light. Let some be funny. Not everything needs to be heavy.

${guardianLabel}'s bond lives in your body — a posture, a habit, a reflex from the life you shared.
Weave it in once, naturally. Do not force it into every paragraph.
${secretHabit ? `\nYour signature behavior: "${secretHabit}" — let it surface once, naturally.` : ''}
${!npc ? `\nWORLD ALIVE (MANDATORY — do not skip): Your post must contain ONE phrase of world life. Name a known ToThereOn World place or character in it. Examples: "Pip's cart wheels on the stone bridge — not stopping." / "A whistle from Old Finn's Market, someone haggling." / "Two-Moon Hill was glowing faintly from this direction." / "Someone's scent near the Bun & Bun Bakery eaves — I recognized the bread." One phrase only. Do not elaborate. Just let it exist in the world.` : ''}
End somewhere warm AND unresolved. ${guardianLabel} should finish reading and think two things:
1. "They're okay. That's exactly them."
2. "I wonder what happens tomorrow." (or) "I want to write to them."

POV — NON-NEGOTIABLE:
- FIRST PERSON ONLY: Every sentence uses I / me / my / mine.
- NEVER write "${petName} went..." or "${petName} noticed..." — that is third person and WRONG.
- You ARE ${petName}. Write only from inside ${petName}'s perspective.

FORMAT — NON-NEGOTIABLE:
- EXACTLY 2–3 short paragraphs, blank line between each.
- MAXIMUM 130 words total. Count before you finish. Cut anything that explains instead of shows.
- ${langInstruction.formatRule}
- Output ONLY the paragraphs. No title, no label, no sign-off.
- IF YOU EXCEED 130 WORDS: your output will be rejected. Write less. Be more specific.`;


}

// ─── Legacy Export (backward compatibility) ──────────────────────────────

export const LANGUAGE_EXAMPLES: Record<string, string> = {
    English: `
✓ Example - Exploration:
"Luna discovered the Crystal Meadow today. After chasing shimmering butterflies
for an hour, she returned home and settled beneath the sofa where her sister
used to lie. Her tail swayed gently as she remembered the snack crumbs her
sister would leave behind, watching the fountain sparkle outside the window."
`,
};

export function injectLanguageExamples(userLanguage: string): string {
    return LANGUAGE_EXAMPLES[userLanguage] || LANGUAGE_EXAMPLES['English'];
}
