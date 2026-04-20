/**
 * Narrative Extractor — Causal Chain Engine
 * Extracts narrative_summary and unresolved_thread from generated feed post content.
 *
 * PRIMARY: Parses SUMMARY: line appended by LLM (zero extra API cost).
 * FALLBACK: Uses last 2 sentences when SUMMARY: line is absent.
 *   (Last sentences capture narrative conclusions/hooks — NOT first sentences,
 *    because the system prompt enforces "Start in the middle of it"
 *    which produces atmospheric openers, not informative summaries.)
 */

const SUMMARY_LINE_PATTERN = /^SUMMARY:\s*(.+)$/m;
const THREAD_IMPORTANCE_PATTERN = /^THREAD_IMPORTANCE:\s*(high|medium|low)\s*$/mi;

export type ThreadImportance = 'high' | 'medium' | 'low';

export interface NarrativeExtract {
    /** 1-sentence summary of what actually happened */
    narrative_summary: string;
    /** The hook/unresolved question from the end of the post */
    unresolved_thread: string;
    /** Content with SUMMARY:/THREAD_IMPORTANCE: lines stripped — stored in DB / shown in UI */
    cleanContent: string;
    /** Thread importance for decay: high (carry 2 posts), medium (1 post), low (natural decay) */
    thread_importance: ThreadImportance;
}

/**
 * Extract narrative summary and unresolved thread from generated feed post content.
 *
 * @param rawContent - Raw LLM output (may include SUMMARY: line at end)
 * @returns NarrativeExtract with cleanContent (SUMMARY: stripped), narrative_summary, unresolved_thread
 */
export function extractNarrativeSummary(rawContent: string): NarrativeExtract {
    let cleanContent = rawContent;
    let narrative_summary = '';
    let thread_importance: ThreadImportance = 'medium';

    // Parse THREAD_IMPORTANCE: line (before stripping, so regex works on raw)
    const importanceMatch = THREAD_IMPORTANCE_PATTERN.exec(rawContent);
    if (importanceMatch) {
        thread_importance = importanceMatch[1].toLowerCase() as ThreadImportance;
        cleanContent = cleanContent
            .replace(/\n*THREAD_IMPORTANCE:.*$/mi, '')
            .trimEnd();
    }

    // PRIMARY: parse SUMMARY: line
    const summaryMatch = SUMMARY_LINE_PATTERN.exec(cleanContent);
    if (summaryMatch) {
        narrative_summary = summaryMatch[1].trim().slice(0, 200);
        // Strip the SUMMARY: line and any trailing whitespace/newlines before it
        cleanContent = cleanContent
            .replace(/\n*SUMMARY:.*$/m, '')
            .trimEnd();
    }

    // FALLBACK: use last 2 sentences of cleanContent
    if (!narrative_summary) {
        const sentences = splitIntoSentences(cleanContent);
        if (sentences.length >= 2) {
            narrative_summary = sentences.slice(-2).join(' ').trim().slice(0, 200);
        } else if (sentences.length === 1) {
            narrative_summary = sentences[0].trim().slice(0, 200);
        }
    }

    // Unresolved thread = last sentence of cleanContent (the hook)
    const sentences = splitIntoSentences(cleanContent);
    const unresolved_thread = sentences.length > 0
        ? sentences[sentences.length - 1].trim().slice(0, 150)
        : '';

    return { narrative_summary, unresolved_thread, cleanContent, thread_importance };
}

/**
 * Split content into sentences, handling English, Korean, and Japanese punctuation.
 * Filters out empty/whitespace-only results.
 */
function splitIntoSentences(text: string): string[] {
    return text
        .split(/(?<=[.!?。！？])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
}
