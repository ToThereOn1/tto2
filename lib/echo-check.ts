/**
 * echo-check.ts
 * Language-aware thematic echo detection for letter review.
 *
 * Purpose: Verify that the pet's reply letter echoes at least one meaningful
 * concept from the guardian's letter. Replaces the broken \b-regex approach
 * that silently failed for all Korean/CJK input.
 *
 * Design principles:
 * - Pure function — no side effects, fully testable
 * - Language-branching: Korean / Japanese / English each handled differently
 * - Cross-language pairs: defer to LLM reviewer (skip programmatic check)
 * - Fail-open: when content words cannot be extracted, return true (no false penalty)
 */

import { detectLanguageFromText } from '@/lib/language-detector';

// ─── Korean particle list (sorted longest-first for greedy suffix stripping) ──
const KO_PARTICLES = [
    '에서는', '으로는', '에서도', '으로도', '이라는', '라는',
    '에서', '으로', '부터', '까지', '처럼', '만큼', '이란', '이라', '에게',
    '은', '는', '이', '가', '을', '를', '의', '에', '로', '도', '만',
    '와', '과', '라', '야', '아',
];

// ─── English stopwords (common words that carry no echo signal) ────────────
const EN_STOPWORDS = new Set([
    'that', 'this', 'with', 'from', 'they', 'were', 'have', 'been', 'said',
    'each', 'will', 'when', 'what', 'your', 'their', 'here', 'just', 'some',
    'more', 'than', 'time', 'know', 'like', 'into', 'them', 'made', 'after',
    'before', 'there', 'about', 'would', 'could', 'should', 'then', 'also',
    'very', 'even', 'back', 'still', 'only', 'well', 'down', 'away', 'over',
]);

/**
 * Strip common Korean grammatical particles from end of a token.
 * Returns the stem (minimum 1 character preserved).
 * List is sorted longest-first to ensure greedy matching.
 */
export function stripKoreanParticles(token: string): string {
    for (const p of KO_PARTICLES) {
        if (token.length > p.length && token.endsWith(p)) {
            return token.slice(0, -p.length);
        }
    }
    return token;
}

/**
 * Extract meaningful content words from text, language-aware.
 * Returns an array of deduplicated stems/tokens suitable for echo matching.
 */
export function extractContentWords(text: string, language: string): string[] {
    const lower = text.toLowerCase();

    if (language === 'Korean') {
        // Extract sequences of Korean syllable blocks
        const tokens = lower.match(/[가-힣]+/g) ?? [];
        const stems = tokens.map(stripKoreanParticles);
        // Minimum 2 syllables = meaningful content word (not a single particle)
        return [...new Set(stems.filter(s => s.length >= 2))];
    }

    if (language === 'Japanese') {
        // Extract kana/kanji sequences (hiragana, katakana, CJK unified ideographs)
        const tokens = lower.match(/[ぁ-ゔァ-ヴーｦ-ﾟ一-龯]+/g) ?? [];
        return [...new Set(tokens.filter(t => t.length >= 2))];
    }

    // English (default): word-boundary extraction with stopword filter
    const words = lower.match(/\b[a-z]{4,}\b/g) ?? [];
    return [...new Set(words.filter(w => !EN_STOPWORDS.has(w)))];
}

/**
 * Extract character bigrams from a cleaned string (for CJK fallback matching).
 */
function extractBigrams(cleanText: string): Set<string> {
    const bigrams = new Set<string>();
    for (let i = 0; i < cleanText.length - 1; i++) {
        bigrams.add(cleanText.slice(i, i + 2));
    }
    return bigrams;
}

/**
 * Detect whether a reply contains at least one thematic echo of the guardian's letter.
 *
 * Algorithm:
 * 1. Detect languages of letter and reply.
 * 2. Cross-language pair → return true (LLM reviewer handles semantic echo).
 * 3. No extractable words in letter → return true (letter too short, skip check).
 * 4. Korean/Japanese: stem matching + bigram fallback.
 * 5. English: stopword-filtered word matching.
 *
 * @param originalLetter - The guardian's original letter text
 * @param replyContent   - The pet's generated reply text
 * @param letterLanguage - Pre-detected language of the letter (avoids double detection)
 * @returns true if echo detected or check should be skipped; false if no echo found
 */
export function hasThematicEcho(
    originalLetter: string,
    replyContent: string,
    letterLanguage: string
): boolean {
    // Guard: empty reply has no echo
    if (!replyContent || replyContent.trim().length === 0) {
        return false;
    }

    // Detect reply language to handle cross-language pairs
    const replyLanguage = detectLanguageFromText(replyContent);

    // Cross-language: string-matching is meaningless.
    // The LLM reviewer (section [E]) handles semantic echo for these pairs.
    if (letterLanguage !== replyLanguage) {
        return true;
    }

    const contentWords = extractContentWords(originalLetter, letterLanguage);

    // Letter too short or no extractable content words → skip programmatic check
    if (contentWords.length === 0) {
        return true;
    }

    const replyLower = replyContent.toLowerCase();

    // Primary check: any content word appears as substring in reply
    if (contentWords.some(w => replyLower.includes(w))) {
        return true;
    }

    // CJK bigram fallback: checks for shared 2-character sequences
    // (handles morphological variation where exact stems don't match)
    if (letterLanguage === 'Korean' || letterLanguage === 'Japanese') {
        const letterClean = originalLetter.replace(/[^가-힣ぁ-ゔァ-ヴーｦ-ﾟ一-龯]/g, '');
        const replyClean = replyContent.replace(/[^가-힣ぁ-ゔァ-ヴーｦ-ﾟ一-龯]/g, '');

        if (letterClean.length < 2 || replyClean.length < 2) {
            return true; // Too short for bigram analysis
        }

        const letterBigrams = extractBigrams(letterClean);
        const replyBigrams = extractBigrams(replyClean);

        let shared = 0;
        for (const bg of replyBigrams) {
            if (letterBigrams.has(bg)) shared++;
        }

        // Threshold: 3+ shared bigrams = thematic overlap detected
        if (shared >= 3) return true;
    }

    return false;
}
