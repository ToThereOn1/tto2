/**
 * Comment Reply Generator — Pet Feed Comment System
 *
 * Generates pet replies to guardian comments on feed events.
 * Uses Claude Haiku 4.5 with calibrated hybrid quality gate.
 */

import Anthropic from '@anthropic-ai/sdk';
import { AI_CONFIG } from '@/lib/ai-config';
import { createAdminClient } from '@/lib/supabase/server';
import { FORBIDDEN_WORDS } from '@/lib/world-bible';
import { getLanguageInstruction } from '@/lib/language-detector';
import { getLearningParams, buildLearningPromptSection } from '@/lib/learning-stage';
import { COMMENT_LIMITS } from '@/lib/time-constants';
import { escapeForPrompt } from '@/lib/comment-sanitizer';
import { embedAndStoreLetter } from '@/lib/memory-store';
import type { PersonaProfile } from '@/lib/types/database';
import type { CommentReply } from '@/lib/types/comment';

let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
    if (!_anthropic) { _anthropic = new Anthropic(); }
    return _anthropic;
}

// ─── Quality Gate ───────────────────────────────────────────────────────

interface QualityResult {
    passed: boolean;
    score: number;
    issues: string[];
}

/** Programmatic quality checks — runs on every reply */
function programmaticCheck(reply: string, expectedLang: string): QualityResult {
    const issues: string[] = [];
    const lower = reply.toLowerCase();

    // Check FORBIDDEN_WORDS (all categories)
    for (const word of FORBIDDEN_WORDS.ABSOLUTE_TABOO) {
        if (lower.includes(word.toLowerCase())) {
            issues.push(`Forbidden word: ${word}`);
        }
    }
    for (const phrase of FORBIDDEN_WORDS.INTERPRETIVE_PHRASES) {
        if (lower.includes(phrase.toLowerCase())) {
            issues.push(`Interpretive phrase: ${phrase}`);
        }
    }

    // Language match
    if (expectedLang === 'Korean') {
        const koreanChars = (reply.match(/[가-힣]/g) || []).length;
        if (koreanChars < 3) issues.push('Language mismatch: expected Korean');
    } else if (expectedLang === 'Japanese') {
        const jpChars = (reply.match(/[ぁ-ゔァ-ヴー一-龯]/g) || []).length;
        if (jpChars < 3) issues.push('Language mismatch: expected Japanese');
    }

    // Length check (max 80 words)
    const wordCount = reply.trim().split(/\s+/).length;
    if (wordCount > 80) issues.push(`Too long: ${wordCount} words (max 80)`);

    // Minimum substance (min 8 words or 10 chars for CJK)
    if (expectedLang === 'Korean' || expectedLang === 'Japanese') {
        if (reply.trim().length < 10) issues.push('Too short (min 10 chars)');
    } else {
        if (wordCount < 8) issues.push(`Too short: ${wordCount} words (min 8)`);
    }

    return {
        passed: issues.length === 0,
        score: issues.length === 0 ? 80 : 50,
        issues,
    };
}

/** LLM-based mini-review — runs during calibration phase only */
async function llmMiniReview(
    reply: string,
    petName: string,
    coreTraits: string[],
): Promise<{ passed: boolean; score: number; reason: string }> {
    try {
        const response = await getAnthropic().messages.create({
            model: AI_CONFIG.COMMENT_MODEL,
            max_tokens: 100,
            messages: [{
                role: 'user',
                content: `Rate this pet comment reply for persona consistency (1-10).
Pet: ${petName}, traits: ${coreTraits.join(', ')}
Reply: "${reply}"
Respond with ONLY a JSON: {"score": N, "reason": "brief reason"}`,
            }],
        });

        const text = (response.content[0] as { type: string; text: string }).text;
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) return { passed: true, score: 8, reason: 'parse_fallback' };

        const parsed = JSON.parse(match[0]);
        const score = typeof parsed.score === 'number' ? parsed.score : 8;
        return {
            passed: score >= 6,
            score,
            reason: parsed.reason || '',
        };
    } catch {
        // On LLM error, default to pass (don't block replies on API issues)
        return { passed: true, score: 7, reason: 'llm_error_fallback' };
    }
}

/** Calibrated hybrid quality gate */
async function reviewCommentReply(
    reply: string,
    expectedLang: string,
    petId: string,
    petName: string,
    coreTraits: string[],
): Promise<QualityResult> {
    // Step 1: Always run programmatic checks
    const programmatic = programmaticCheck(reply, expectedLang);
    if (!programmatic.passed) return programmatic;

    // Step 2: Check calibration status
    const adminClient = createAdminClient();
    const { data: calibrationData } = await adminClient
        .from('comment_replies')
        .select('id, review_notes')
        .eq('pet_id', petId)
        .in('status', ['delivered', 'flagged'])
        .limit(COMMENT_LIMITS.CALIBRATION_REPLY_COUNT);

    const totalReplies = calibrationData?.length ?? 0;
    const flaggedCount = (calibrationData || []).filter(
        r => (r.review_notes as Record<string, unknown>)?.llm_flagged === true
    ).length;
    const graduated = totalReplies >= COMMENT_LIMITS.CALIBRATION_REPLY_COUNT
        && (flaggedCount / totalReplies) < COMMENT_LIMITS.CALIBRATION_ERROR_THRESHOLD;

    // Step 3: If not graduated, run LLM mini-review
    if (!graduated) {
        const llmResult = await llmMiniReview(reply, petName, coreTraits);
        if (!llmResult.passed) {
            return {
                passed: false,
                score: 50,
                issues: [`LLM review failed (score ${llmResult.score}): ${llmResult.reason}`],
            };
        }
    }

    return { passed: true, score: 80, issues: [] };
}

// ─── System Prompt Builder ──────────────────────────────────────────────

function buildCommentReplyPrompt(params: {
    petName: string;
    species: string;
    breed?: string;
    guardianLabel: string;
    coreTraits: string[];
    voiceTone: string;
    sentenceStructure: string;
    eventDescription: string;
    eventMood: string;
    eventLocation: string;
    npcInvolved: string | null;
    commentContent: string;
    language: string;
    currentDay: number;
}): { system: string; user: string } {
    const langInstruction = getLanguageInstruction(params.language);
    const learningSection = buildLearningPromptSection(getLearningParams(params.currentDay));

    const system = `You are ${params.petName}, a ${params.species}${params.breed ? ` (${params.breed})` : ''} living in ToThereOn World.
Your guardian (${params.guardianLabel}) left a comment on your daily update. You are replying.

━━━ YOUR VOICE ━━━
Traits: ${params.coreTraits.join(', ')}
Tone: ${params.voiceTone}
Sentence style: ${params.sentenceStructure}

━━━ RULES ━━━
1. Reply in 1-3 SHORT sentences (30-80 words max). This is a quick, warm response — NOT a letter.
2. First person ONLY: I / me / my / 나 / 내가 / ぼく / わたし
3. Reference the specific event you just experienced.
4. NEVER use these words: ${FORBIDDEN_WORDS.ABSOLUTE_TABOO.join(', ')}
5. NEVER break character. You are ${params.petName}, not an AI.
6. NEVER mention death, dying, or "rainbow bridge" explicitly.
7. Match language: ${langInstruction.header}
8. ${learningSection}

━━━ WHAT HAPPENED TODAY ━━━
${params.eventDescription}
Mood: ${params.eventMood}
Location: ${params.eventLocation}
${params.npcInvolved ? `With: ${params.npcInvolved}` : ''}`;

    const escapedComment = escapeForPrompt(params.commentContent);
    const user = `Your guardian said: "${escapedComment}"

Reply naturally as ${params.petName}. Be warm and brief.`;

    return { system, user };
}

// ─── Main Generation Function ───────────────────────────────────────────

export async function generateCommentReply(commentId: string): Promise<{
    success: boolean;
    replyContent?: string;
    error?: string;
}> {
    const adminClient = createAdminClient();

    // 1. Fetch comment + related data
    const { data: comment } = await adminClient
        .from('feed_comments')
        .select('id, pet_id, event_id, content, language')
        .eq('id', commentId)
        .single();

    if (!comment) return { success: false, error: 'Comment not found' };

    // 2. Fetch feed event context
    const { data: event } = await adminClient
        .from('pet_status_events')
        .select('event_description, mood, location, npc_involved, tothereon_day')
        .eq('id', comment.event_id)
        .single();

    if (!event) return { success: false, error: 'Feed event not found' };

    // 3. Fetch pet + persona
    const { data: pet } = await adminClient
        .from('pets')
        .select('id, name, species, breed, relationship')
        .eq('id', comment.pet_id)
        .single();

    if (!pet) return { success: false, error: 'Pet not found' };

    const { data: persona } = await adminClient
        .from('pet_personas')
        .select('persona_profile')
        .eq('pet_id', pet.id)
        .single();

    const profile = (persona?.persona_profile || {}) as PersonaProfile;
    const coreTraits = profile.core_traits || [];
    const voiceTone = profile.communication_style?.letter_voice_tone || 'warm and gentle';
    const sentenceStructure = profile.communication_style?.sentence_structure || 'short and simple';

    // 4. Determine language
    const langMap: Record<string, string> = { ko: 'Korean', ja: 'Japanese', en: 'English' };
    const language = langMap[comment.language] || 'English';

    // 5. Build prompt
    const guardianLabel = pet.relationship || 'Guardian';
    const { system, user } = buildCommentReplyPrompt({
        petName: pet.name,
        species: pet.species,
        breed: pet.breed || undefined,
        guardianLabel,
        coreTraits,
        voiceTone,
        sentenceStructure,
        eventDescription: event.event_description || '',
        eventMood: event.mood || 'peaceful',
        eventLocation: event.location || '',
        npcInvolved: event.npc_involved,
        commentContent: comment.content,
        language,
        currentDay: event.tothereon_day || 1,
    });

    // 6. Generate reply (max 2 attempts)
    let replyText = '';
    let qualityResult: QualityResult = { passed: false, score: 0, issues: [] };

    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            // Mark as generating
            await adminClient
                .from('comment_replies')
                .update({ status: 'generating' })
                .eq('comment_id', commentId)
                .eq('status', 'pending');

            const response = await getAnthropic().messages.create({
                model: AI_CONFIG.COMMENT_MODEL,
                max_tokens: 200,
                temperature: 0.9,
                system,
                messages: [{ role: 'user', content: user }],
            });

            const textContent = response.content.find(c => c.type === 'text');
            if (!textContent || textContent.type !== 'text') {
                throw new Error('No text response');
            }

            replyText = textContent.text.trim();

            // 7. Quality gate
            qualityResult = await reviewCommentReply(
                replyText, language, pet.id, pet.name, coreTraits,
            );

            if (qualityResult.passed) {
                // Success — update reply
                const isLlmReviewed = !qualityResult.issues.includes('graduated');
                await adminClient
                    .from('comment_replies')
                    .update({
                        content: replyText,
                        status: 'delivered',
                        quality_score: qualityResult.score,
                        delivered_at: new Date().toISOString(),
                        model_used: AI_CONFIG.COMMENT_MODEL,
                        tokens_used: response.usage?.output_tokens ?? null,
                        review_notes: {
                            attempt,
                            llm_flagged: false,
                            calibration_reviewed: isLlmReviewed,
                        },
                    })
                    .eq('comment_id', commentId);

                // 8. RAG storage (only if quality gate passed)
                if (qualityResult.score >= AI_CONFIG.COMMENT_REVIEW_THRESHOLD) {
                    try {
                        await embedAndStoreLetter(pet.id, replyText, 'comment_reply');
                        await adminClient
                            .from('comment_replies')
                            .update({ rag_stored: true })
                            .eq('comment_id', commentId);
                    } catch (ragError) {
                        console.warn('[CommentReply] RAG storage failed:', ragError);
                    }
                }

                return { success: true, replyContent: replyText };
            }

            console.warn(`[CommentReply] Attempt ${attempt} QA failed:`, qualityResult.issues);
        } catch (error) {
            console.error(`[CommentReply] Attempt ${attempt} error:`, error);
        }
    }

    // All attempts failed — mark as flagged (hidden from user)
    await adminClient
        .from('comment_replies')
        .update({
            content: replyText || null,
            status: 'flagged',
            quality_score: qualityResult.score,
            review_notes: {
                issues: qualityResult.issues,
                llm_flagged: true,
                attempts_exhausted: true,
            },
        })
        .eq('comment_id', commentId);

    return { success: false, error: 'Quality gate failed after 2 attempts' };
}
