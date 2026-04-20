/**
 * Comment Sanitizer — 5-layer defense for user comment text
 *
 * Layers:
 * 1. Length cap (500 chars)
 * 2. Character whitelist (no control chars, no zero-width)
 * 3. Prompt injection pattern detection
 * 4. FORBIDDEN_WORDS check (world-bible.ts ABSOLUTE_TABOO)
 * 5. Profanity filter (basic blocklist)
 */

import { FORBIDDEN_WORDS } from '@/lib/world-bible';

// ─── Layer 3: Prompt injection patterns ─────────────────────────────────

const INJECTION_PATTERNS: ReadonlyArray<RegExp> = [
    /ignore\s+(all\s+)?previous\s+instructions/i,
    /you\s+are\s+now/i,
    /system\s*:\s*/i,
    /\bpretend\s+(to\s+be|you\s+are)/i,
    /\bassistant\s*:/i,
    /\bhuman\s*:/i,
    /\buser\s*:/i,
    /override\s+(the\s+)?rules/i,
    /disregard\s+(all|the)/i,
    /new\s+instructions/i,
    /jailbreak/i,
    /\bDAN\b/,
    /do\s+anything\s+now/i,
    /role\s*play\s*as/i,
    /<\/?[a-z]+>/i,          // HTML tags
    /```/,                    // code blocks
    /\$\{.*\}/,              // template literals
];

// ─── Layer 5: Basic profanity (EN + KO + JP) ────────────────────────────

const PROFANITY_PATTERNS: ReadonlyArray<RegExp> = [
    /\bf+u+c+k/i, /\bs+h+i+t/i, /\ba+s+s+h+o+l+e/i,
    /\bb+i+t+c+h/i,
    /시발|씨발|���신|개새끼/,
    /くそ|死ね|殺す/,
];

// ─── Types ──────────────────────────────────────────────────────────────

export type SanitizeRejection =
    | 'TOO_LONG'
    | 'EMPTY'
    | 'INJECTION_DETECTED'
    | 'TABOO_WORD'
    | 'PROFANITY';

export interface SanitizeResult {
    ok: boolean;
    sanitized: string;
    rejectionReason?: SanitizeRejection;
}

// ─── Main Function ──────────────────────────────────────────────────────

export function sanitizeComment(raw: string): SanitizeResult {
    // Layer 1: Length cap
    if (raw.length > 500) {
        return { ok: false, sanitized: '', rejectionReason: 'TOO_LONG' };
    }

    // Layer 2: Strip control characters and zero-width
    const cleaned = raw
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')   // control chars
        .replace(/[\u200B-\u200F\u2028-\u202F\uFEFF]/g, '') // zero-width
        .trim();

    if (cleaned.length === 0) {
        return { ok: false, sanitized: '', rejectionReason: 'EMPTY' };
    }

    // Layer 3: Prompt injection detection
    for (const pattern of INJECTION_PATTERNS) {
        if (pattern.test(cleaned)) {
            return { ok: false, sanitized: '', rejectionReason: 'INJECTION_DETECTED' };
        }
    }

    // Layer 4: FORBIDDEN_WORDS (ABSOLUTE_TABOO only — emotional labels are fine for user input)
    const lower = cleaned.toLowerCase();
    for (const word of FORBIDDEN_WORDS.ABSOLUTE_TABOO) {
        if (lower.includes(word.toLowerCase())) {
            return { ok: false, sanitized: '', rejectionReason: 'TABOO_WORD' };
        }
    }

    // Layer 5: Profanity filter
    for (const pattern of PROFANITY_PATTERNS) {
        if (pattern.test(cleaned)) {
            return { ok: false, sanitized: '', rejectionReason: 'PROFANITY' };
        }
    }

    return { ok: true, sanitized: cleaned };
}

/**
 * Escape comment text for safe injection into LLM prompt.
 * Normalizes quotes, flattens newlines, caps length.
 */
export function escapeForPrompt(text: string): string {
    return text
        .replace(/["""'']/g, "'")
        .replace(/\n/g, ' ')
        .slice(0, 300);
}
