/**
 * lib/letter-imprint.ts
 * Letter-World Engine v1
 *
 * Extracts an emotional "imprint" from guardian letters via LLM directive or heuristic fallback.
 * Applies temporal decay based on ToThereOn days elapsed.
 * Scans reply content for canonical location mentions.
 */

import { CANON_LOCATIONS } from '@/lib/world-bible';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LetterImprint {
    npcs: string[];
    emotion: 'joy' | 'grief' | 'worry' | 'gratitude' | 'longing' | 'neutral';
    intensity: number;              // 0.0–1.0
    topics: string[];
    worldEcho: string | null;
    replyLocationMentioned: string | null;
    imprint_tothereon_day: number;
}

export interface ActiveImprint extends LetterImprint {
    effectiveIntensity: number;     // intensity after decay scaling
}

// ─── Validation ──────────────────────────────────────────────────────────────

const VALID_EMOTIONS = ['joy', 'grief', 'worry', 'gratitude', 'longing', 'neutral'] as const;
type ValidEmotion = typeof VALID_EMOTIONS[number];

function isValidEmotion(value: unknown): value is ValidEmotion {
    return typeof value === 'string' && (VALID_EMOTIONS as readonly string[]).includes(value);
}

// ─── LLM Parse ───────────────────────────────────────────────────────────────

/**
 * Parses LETTER_IMPRINT:{...} line from raw LLM reply content.
 * Returns parsed imprint and cleanContent (LETTER_IMPRINT line stripped).
 * Returns { imprint: null, cleanContent: rawContent } if parsing fails.
 */
export function parseImprintFromReply(rawContent: string): {
    imprint: Omit<LetterImprint, 'imprint_tothereon_day' | 'replyLocationMentioned'> | null;
    cleanContent: string;
} {
    const match = rawContent.match(/^LETTER_IMPRINT:(\{[\s\S]*?\})\s*$/m);
    if (!match) {
        return { imprint: null, cleanContent: rawContent };
    }

    // Strip the LETTER_IMPRINT line from content shown to user
    const cleanContent = rawContent.replace(/^LETTER_IMPRINT:\{[\s\S]*?\}\s*\n?/m, '').trimEnd();

    let parsed: unknown;
    try {
        parsed = JSON.parse(match[1]);
    } catch {
        return { imprint: null, cleanContent };
    }

    if (typeof parsed !== 'object' || parsed === null) {
        return { imprint: null, cleanContent };
    }

    const p = parsed as Record<string, unknown>;

    const emotion: ValidEmotion = isValidEmotion(p.emotion) ? p.emotion : 'neutral';
    const intensity = Math.max(0.0, Math.min(1.0, typeof p.intensity === 'number' ? p.intensity : 0.5));
    const npcs: string[] = Array.isArray(p.npcs)
        ? (p.npcs as unknown[]).filter((x): x is string => typeof x === 'string')
        : [];
    const topics: string[] = Array.isArray(p.topics)
        ? (p.topics as unknown[]).filter((x): x is string => typeof x === 'string').slice(0, 5)
        : [];
    const worldEcho: string | null =
        typeof p.worldEcho === 'string' && p.worldEcho.length > 0 ? p.worldEcho : null;

    return {
        imprint: { npcs, emotion, intensity, topics, worldEcho },
        cleanContent,
    };
}

// ─── Heuristic Fallback ───────────────────────────────────────────────────────

const EMOTION_PATTERNS: Array<{ keywords: string[]; emotion: ValidEmotion }> = [
    { keywords: ['sad', 'cry', 'crying', '슬프', '울었', '泣', '悲'], emotion: 'grief' },
    { keywords: ['miss', 'longing', '그리워', '보고싶', '寂', '恋'], emotion: 'longing' },
    { keywords: ['worry', 'scared', 'afraid', '걱정', '무서워', '心配', '怖'], emotion: 'worry' },
    { keywords: ['happy', 'glad', '기쁘', '행복', '嬉', '幸'], emotion: 'joy' },
    { keywords: ['thank', 'grateful', 'love', '고마워', '사랑', '感謝', '愛'], emotion: 'gratitude' },
];

/**
 * Heuristic fallback when LLM LETTER_IMPRINT directive is absent or malformed.
 * Returns a basic imprint derived from keyword scanning the guardian's letter.
 */
export function heuristicExtract(
    letterContent: string,
): Omit<LetterImprint, 'imprint_tothereon_day' | 'replyLocationMentioned'> {
    const lower = letterContent.toLowerCase();

    let emotion: ValidEmotion = 'neutral';
    for (const { keywords, emotion: mapped } of EMOTION_PATTERNS) {
        if (keywords.some(k => lower.includes(k))) {
            emotion = mapped;
            break;
        }
    }

    const stopwords = new Set([
        'that', 'this', 'with', 'from', 'your', 'have', 'been', 'were',
        'they', 'them', 'just', 'what', 'when', 'here', 'there', 'then',
    ]);
    const words = letterContent.match(/\b[a-zA-Z가-힣ぁ-ゔ一-龯]{4,}\b/g) || [];
    const topics = [...new Set(
        words.filter(w => !stopwords.has(w.toLowerCase()))
    )].slice(0, 5);

    return {
        npcs: [],
        emotion,
        intensity: 0.5,
        topics,
        worldEcho: null,
    };
}

// ─── Decay-Aware Retrieval ────────────────────────────────────────────────────

// Decay schedule constants (ToThereOn days since imprint was set)
const DECAY_SCHEDULE: ReadonlyArray<{ maxDays: number; factor: number }> = [
    { maxDays: 1, factor: 1.0 },   // 0–1 days → 100%
    { maxDays: 2, factor: 0.7 },   // 2 days   →  70% (was 60%)
    { maxDays: 3, factor: 0.4 },   // 3 days   →  40% (was 30%)
    { maxDays: 4, factor: 0.2 },   // 4 days   →  20% (NEW — was expired)
];
const MAX_IMPRINT_DAYS = 4;

/**
 * Returns an active imprint with temporal decay applied, or null if expired/missing.
 *
 * Decay schedule v2 (ToThereOn days since imprint was set):
 *   0–1 days → 100% of original intensity
 *   2 days   →  70% of original intensity
 *   3 days   →  40% of original intensity
 *   4 days   →  20% of original intensity
 *   5+ days  → expired (returns null)
 *
 * 1 ToThereOn day = 3 real Earth days, so the 4-day window ≈ 12 real days of residue.
 */
export function getActiveImprint(
    metadata: Record<string, unknown> | null | undefined,
    currentDay: number,
): ActiveImprint | null {
    if (!metadata?.letter_imprint) return null;

    const raw = metadata.letter_imprint as LetterImprint;
    if (typeof raw.imprint_tothereon_day !== 'number') return null;

    const daysSince = currentDay - raw.imprint_tothereon_day;
    if (daysSince < 0 || daysSince > MAX_IMPRINT_DAYS) return null;

    const entry = DECAY_SCHEDULE.find(d => daysSince <= d.maxDays);
    const decayFactor = entry?.factor ?? 0;

    const effectiveIntensity = Math.max(0.0, Math.min(1.0, (raw.intensity ?? 0.5) * decayFactor));

    return { ...raw, effectiveIntensity };
}

// ─── Reply Location Extractor ─────────────────────────────────────────────────

/**
 * Scans reply content for any CANON_LOCATIONS language variant (en/ko/jp).
 * Returns the ENGLISH canonical name of the first match, or null.
 * Multilingual: Korean and Japanese location names are also scanned.
 */
export function extractReplyLocation(replyContent: string): string | null {
    for (const loc of Object.values(CANON_LOCATIONS)) {
        const variants = [loc.en, loc.ko, loc.jp].filter(Boolean);
        for (const variant of variants) {
            if (replyContent.toLowerCase().includes(variant.toLowerCase())) {
                return loc.en; // always return canonical English name
            }
        }
    }
    return null;
}
