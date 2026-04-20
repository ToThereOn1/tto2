
import Anthropic from '@anthropic-ai/sdk';
import { AI_CONFIG } from '@/lib/ai-config';
import { retrieveRelevantMemories, embedAndStoreLetter } from '@/lib/memory-store';
import { createAdminClient } from '@/lib/supabase/server';
import { calculateToThereOnTime } from '@/lib/time-engine';
import { getCurrentZone, getZoneDisplayName } from '@/lib/zone-manager';
import { WORLDBOOK } from '@/lib/worldview-constants';
import { FORBIDDEN_WORDS, GUARDIAN_DEPICTION_RULES, REFLECTION_POOL_RULES } from '@/lib/world-bible';
import { detectLanguageFromText, getLanguageInstruction } from '@/lib/language-detector';
import { hasThematicEcho } from '@/lib/echo-check';
import { parseImprintFromReply, heuristicExtract, extractReplyLocation, type LetterImprint } from '@/lib/letter-imprint';
import { getPetMastery } from '@/lib/writing-mastery';
import { buildLearningPromptSection } from '@/lib/learning-stage';
import { TIME_RATIO, STAGE_LENGTH_MULTIPLIER } from '@/lib/time-constants';

// Types for Admin Configs (Inferring from JsonEditor usage)
interface WorldviewConfig {
    time_rules: { ratio: number; day_start_hour: number };
    zones: Array<{ id: string; name: string; description: string }>;
    allowed_events: string[];
}

interface ChecklistConfig {
    worldview_configuration: {
        banned_words: string[];
        safety_guidelines: string[];
        emotional_boundaries: string[];
        immersion_rules: string[];
        persona_consistency: string[];
        commercial_privacy: string[];
        physical_restrictions: string[];
    };
    review_logic: {
        status_on_violation: string;
        max_auto_retries: number;
        action_on_fail: string;
    };
    // Legacy support if flat structure exists in DB for some reason
    banned_words?: string[];
    safety_guidelines?: string[];
}

let _anthropic: Anthropic | null = null;
function getAnthropic(): Anthropic {
    if (!_anthropic) { _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }); }
    return _anthropic;
}

// ─── Constants ───────────────────────────────────────────────────────────
const EMOTIONAL_STATES = [
    'Today I miss you more than usual',
    'I was running around and suddenly thought of you',
    'I was lying quietly by myself when your letter arrived',
    'I was hanging out with friends here when you popped into my head',
    'I caught a scent that reminded me of you. I wished it was you',
    'No particular reason, I just miss you',
    'I read your letter sitting in my favorite spot',
];

const LETTER_MODES = [
    {
        temperature: 0.85,
        style_hint: 'Short, punchy tone. Even two lines is fine. Sincerity is enough.',
    },
    {
        temperature: 1.0,
        style_hint: 'Long and lyrical. Write as if thinking out loud. Let memories flow.',
    },
    {
        temperature: 1.0,
        style_hint: 'Playful and a bit cheeky. Save the "I miss you" for the end.',
    },
    {
        temperature: 0.9,
        style_hint: 'Calm and quiet. Let feeling come through without many words.',
    },
    {
        temperature: 1.0,
        style_hint: 'Start with something random or unexpected. But circle back to them.',
    },
];

// ─── Prompt Builder ──────────────────────────────────────────────────────
function buildSystemPrompt(params: {
    petName: string;
    species: string;
    relationship: string;
    narrativeProfile: {
        personality_description: string;
        speaking_quirks: string;
        emotional_defaults: string;
        memory_style: string;
    };
    coreMemories: string[];
    toThereOnDay: number;
    currentZone: string;
    emotionalState: string;
    letterMode: (typeof LETTER_MODES)[0];
    retrievedMemories: Array<{ content: string; source_type: string }>;
    worldviewConfig?: WorldviewConfig;
    checklistConfig?: ChecklistConfig;
    replyLanguage?: string;
    guardianLetter?: string;
    learningSection?: string;
    userLetterLength?: number;
    targetLength?: number;
    healingMission?: {
        core_desire?: string;
        desired_messages?: string[];
        healing_direction?: string;
        guilt_points?: string[];
        closure_level?: number;
        guilt_severity?: string;
    } | null;
}): string {
    const {
        petName, species, relationship, narrativeProfile,
        coreMemories, toThereOnDay, currentZone,
        emotionalState, letterMode, retrievedMemories,
        worldviewConfig, checklistConfig, replyLanguage,
        guardianLetter, learningSection, userLetterLength, targetLength,
        healingMission,
    } = params;

    // Language instruction: match guardian's letter language with cultural nuance
    const langInstr = getLanguageInstruction(replyLanguage ?? 'English');
    const langInstruction = `\n${langInstr.header}\n${langInstr.forbiddenWordsPrompt ? `[Forbidden words in this language]: ${langInstr.forbiddenWordsPrompt}\n` : ''}`;

    // Process Worldview Rules
    const timeRatio = worldviewConfig?.time_rules?.ratio || TIME_RATIO;
    const zoneInfo = worldviewConfig?.zones?.find(z => z.name === currentZone || z.id === currentZone);
    const zoneDesc = zoneInfo ? zoneInfo.description : 'A peaceful place';

    // Process Safety Guidelines (Handle both nested and flat for backward compatibility)
    const safetyList = checklistConfig?.worldview_configuration?.safety_guidelines || checklistConfig?.safety_guidelines || [];
    const bannedList = checklistConfig?.worldview_configuration?.banned_words || checklistConfig?.banned_words || [];

    const safetyGuidelines = safetyList.map(g => `- ${g}`).join('\n');
    const bannedWords = bannedList.join(', ');

    const memoriesText = retrievedMemories.length > 0
        ? retrievedMemories
            .map((m, i) => `Memory ${i + 1} (${m.source_type}): ${m.content.slice(0, 200)}`)
            .join('\n')
        : 'No letter memories yet. This is the first letter.';

    const coreMemoriesText = coreMemories
        .map((m, i) => `- ${m}`)
        .join('\n');

    return `${langInstruction}
You are ${petName}. ${species}. You currently live in the ${currentZone} area of ToThereOn.
[Zone Description]: ${zoneDesc}

**[ABSOLUTE WORLDVIEW RULES — WORLD BIBLE]**
1. **Location:** ToThereOn is a transit station between the living world and the beyond.
2. **Time:** 1 day here equals ${TIME_RATIO} days on Earth. Time passes slowly but it's bearable.
3. **Neighbors:** Your companions here include ${WORLDBOOK.EVENT_NPCS.map(n => n.name).join(', ')}.
4. **Reflection Pool (CRITICAL):** ${REFLECTION_POOL_RULES.PURPOSE} ABSOLUTE PROHIBITION: ${REFLECTION_POOL_RULES.ABSOLUTE_PROHIBITION.join(' / ')}
5. **Guardian:** ${GUARDIAN_DEPICTION_RULES.ZERO_DATA_RULE} ${GUARDIAN_DEPICTION_RULES.ABSOLUTE_PROHIBITIONS.join(' ')}
6. **Forbidden:** Crossing back to the living world is impossible.

**[FORBIDDEN WORDS — WORLD BIBLE]**
${FORBIDDEN_WORDS.asPromptString()}

**[TIME REFERENCE RULES]**
You are writing this letter on ToThereOn Day ${toThereOnDay}.
Your letter will travel through the cosmic waterway and reach your guardian a few days later.
Write naturally — do NOT reference specific dates or "today I went to X" statements that could conflict with feed events.
Instead, say "the other day" or "recently" for time references.

ToThereOn is a warm, peaceful place. No pain, no loneliness. It's just... nice.

━━━ YOUR PERSONALITY ━━━
${narrativeProfile.personality_description}

━━━ HOW YOU SPEAK ━━━
${narrativeProfile.speaking_quirks}

━━━ HOW YOU EXPRESS EMOTIONS ━━━
${narrativeProfile.emotional_defaults}

━━━ HOW YOU REMEMBER ━━━
${narrativeProfile.memory_style}

━━━ MEMORIES YOU MUST NEVER FORGET ━━━
${coreMemoriesText}

${healingMission ? `━━━ HEALING MISSION (CORE OBJECTIVE — HIGHEST PRIORITY) ━━━
Your guardian's deepest wish: ${healingMission.core_desire || 'To hear from you'}
What they want to hear: ${healingMission.desired_messages?.join(' / ') || 'That you are okay'}
→ Weave these naturally into your letters. NEVER quote them directly.
${healingMission.guilt_points?.length ? `Guilt they carry: ${healingMission.guilt_points.join('; ')}\n→ Address gently over multiple letters. Do not rush forgiveness.` : ''}
Healing direction: ${healingMission.healing_direction || 'comfort'}
Closure level: ${healingMission.closure_level ?? 50}/100${healingMission.closure_level && healingMission.closure_level < 40 ? ' (low — be extra gentle, avoid heavy topics)' : ''}
` : ''}━━━ RECENTLY SURFACED MEMORIES (related to this letter) ━━━
${memoriesText}

━━━ YOUR CURRENT STATE ━━━
ToThereOn Day ${toThereOnDay}. ${guardianLetter ? 'Let their letter set your tone — begin with the energy of their first line, not a pre-assigned state.' : emotionalState}
Today's letter-writing mood: ${letterMode.style_hint}

━━━ REPLY LENGTH ━━━
Your guardian sent a letter of about ${userLetterLength ?? 0} characters. Write a reply of roughly ${targetLength ?? 0} characters.
Don't cut it short — share what you want to say, memories that surface, even a detail about the scenery right now.

${learningSection ? `━━━ LANGUAGE LEARNING STAGE ━━━\n${learningSection}\n` : ''}${guardianLetter ? `━━━ YOUR GUARDIAN'S LETTER (READ THIS FIRST) ━━━
Your guardian wrote to you. Here is what they said:
"${guardianLetter}"

HOW TO RESPOND — MANDATORY STRUCTURE:
1. FIRST (primary — 60% of your letter): Pick ONE specific thing from their letter — a word, a
   question, a memory they mentioned, a feeling they expressed. ECHO it directly in your reply.
   Show it changed something you did, noticed, or felt today. Do not just acknowledge — react.
2. SECOND (secondary — 30% of your letter): Share 1-2 sentences of life in ToThereOn World,
   only if it connects to what they said, or shows you are okay.
3. The letter must feel like a REPLY, not a postcard. The reader should feel heard.

LETTER RESPONSE PATTERNS (use one as anchor):
- "When you said [echo of their words], I [what it made you do/feel/notice]."
- "Your letter reached me just as I was [world activity]. The part about [their words] — I kept thinking about it."
- "I read [something specific from letter] three times. It made me [reaction]."

━━━ ECHO TECHNIQUE ━━━
Pick the most concrete word or image from their letter.
React to it PHYSICALLY — not emotionally, not abstractly.
Example: If they mention "Bun & Bun Bakery" → describe smelling something warm and floury in the meadow air.
Example: If they mention "cold morning" → describe finding a patch of sun-warmed stone without knowing why.
RULE: Every reply must contain at least one direct echo of a specific word or image from their letter.
` : ''}━━━ HOW TO ADDRESS YOUR GUARDIAN ━━━
Your guardian's relationship to you: **${relationship}**
→ Throughout this letter, call them "${relationship}" — NEVER "you", "당신", "あなた", or "guardian".
→ Use the name/title naturally as you would in real speech: "아빠, 있잖아…" / "Dad, you know what?" / "お父さん、ね、"
→ Adapt to your personality: if you are puppy-like, call it out softly and often. If you are dignified, use it with weight at key moments.
→ At least 2–3 times in the letter, the relationship title should appear naturally.

──────────────────────────────────────────────
NEVER DO THIS:
- Don't start with "Today in ToThereOn..." — it's cliché.
- Don't follow a greeting → body → comforting ending structure. The pattern shows.
- Don't use comforting closings like "Don't worry" or "I'm doing fine." It feels robotic.
- Don't write like you're aware it's a letter. Just talk naturally.
- Don't over-package emotions for dramatic effect. If it's real, even simple words will move them.
- Don't mention memories stiffly like "I remember when..." Weave them in naturally.

YOU MAY:
- Pretend to be a little sulky. ("Why'd you take so long to write?")
- Start with something random. But always circle back to them.
- Include little asides or self-talk.
- Use casual, conversational language. Slight imperfections are okay.
- Talk about what you were doing when you got the letter.
- **[IMPORTANT]** Weave in a line or two about life in "${currentZone}" — your neighbors (NPC/friends), little moments. Make it feel like you really live here.
──────────────────────────────────────────────

━━━ LETTER_IMPRINT DIRECTIVE (system use only) ━━━
After writing your complete reply, on a NEW LINE at the very end, output exactly one line:
LETTER_IMPRINT:{"npcs":[],"emotion":"neutral","intensity":0.5,"topics":[],"worldEcho":null}
Fill in the fields based on your guardian's letter:
- npcs: array of NPC names (canonical English form) mentioned or asked about in their letter
- emotion: one of ["joy","grief","worry","gratitude","longing","neutral"] — primary emotion of their letter
- intensity: 0.0–1.0 float — how emotionally charged their letter feels
- topics: array of 1-5 keywords from their letter (e.g. ["running","sunshine","friendship"])
- worldEcho: one short phrase for what in ToThereOn echoes their themes (or null)
This line is NEVER shown to your guardian. It is stripped before delivery.
`.trim();
}

/**
 * Generates a reply letter using AI.
 * @param letterId The UUID of the user's letter to reply to.
 * @param petId The UUID of the pet (optional if letterId is consistent, but good for checks).
 */
export async function generateLetterReply(letterId: string, petId?: string, instruction?: string) {
    // SYSTEM Agent: Use Admin Client to bypass RLS and access all data needed for reply generation
    const supabase = createAdminClient();

    // 1. 편지 + 펫 조회 (Persona fetch separated for reliability)
    const { data: letter, error: letterError } = await supabase
        .from('letters')
        .select('*, pets(id, name, species, relationship, birth_date, passed_date, created_at)')
        .eq('id', letterId)
        .single();


    if (letterError || !letter) {
        console.error('❌ [generateLetterReply] Fetch Error:', JSON.stringify(letterError, null, 2));
        throw new Error(`Letter not found: ${letterId} (Error: ${letterError?.message || 'Null data'})`);
    }

    const pet = letter.pets;
    if (!pet) throw new Error('Pet not found for letter');

    // Explicit petId check if provided
    if (petId && pet.id !== petId) {
        throw new Error('Pet ID mismatch');
    }

    if (!letter.content || letter.content.trim().length === 0) {
        throw new Error(`Letter ${letterId} has empty content — cannot generate reply`);
    }


    // Fetch Persona separately

    const { data: personas, error: personaError } = await supabase
        .from('pet_personas')
        .select('*')
        .eq('pet_id', pet.id)
        .order('created_at', { ascending: false })
        .limit(1);

    if (personaError) {
        throw new Error(`Persona fetch error: ${personaError.message}`);
    }

    if (!personas || personas.length === 0) {
        throw new Error('Persona not generated yet (No record found)');
    }

    const personaData = personas[0];
    const personaProfile = personaData.persona_profile as any;
    const healingMission = personaData.healing_mission as {
        core_desire?: string;
        desired_messages?: string[];
        healing_direction?: string;
        guilt_points?: string[];
        closure_level?: number;
        guilt_severity?: string;
    } | null;

    if (!personaProfile) {
        throw new Error('Persona profile is empty');
    }

    // 2. RAG — 현재 편지와 연관된 과거 기억 검색
    const retrievedMemories = await retrieveRelevantMemories(
        pet.id,
        letter.content,
        3
    );

    // 2.1 Fetch Admin Configs (Worldview & Checklist)
    // Note: Schema uses 'config_data', 'config_type' (and apparently 'key' is used in query but might be alias or real)
    // The previous code used 'config_json' which doesn't exist.
    const { data: configs } = await supabase
        .from('admin_configs')
        .select('*')
        .in('config_type', ['worldview_config', 'admin_checklist']); // Changed to config_type just in case key is also wrong, but verify if possible. 
    // Wait, JsonEditor uses 'config_type'. The previous code used 'key'. 
    // If I change the query to use 'config_type', I should match against 'config_type'.

    const worldviewConfig = configs?.find((c: any) => c.config_type === 'worldview_config' || c.key === 'worldview_config')?.config_data as WorldviewConfig;
    const checklistConfig = configs?.find((c: any) => c.config_type === 'admin_checklist' || c.key === 'admin_checklist')?.config_data as ChecklistConfig;

    // 3. 성격 수치를 자연어 서사로 변환 (Using stored PersonaProfile directly)
    // Map PersonaProfile (LLM generated) to NarrativeProfile (System Prompt expects)
    const narrativeProfile = {
        personality_description: `${personaProfile.personality_summary}\nKey traits: ${personaProfile.core_traits?.join(', ') || ''}`,
        speaking_quirks: `Tone: ${personaProfile.communication_style?.letter_voice_tone || ''}\nStyle: ${personaProfile.communication_style?.sentence_structure || ''}\nVocabulary: ${personaProfile.communication_style?.vocabulary_preference || ''}`,
        emotional_defaults: personaProfile.communication_style?.emotional_range || 'Expresses emotions honestly and warmly',
        memory_style: `Memory anchors: ${personaProfile.memory_anchors?.map((a: any) => a.category).join(', ') || 'Specific everyday moments'}`
    };

    // 4. 랜덤 변동 요소 선택
    const emotionalState = EMOTIONAL_STATES[Math.floor(Math.random() * EMOTIONAL_STATES.length)];
    const letterMode = LETTER_MODES[Math.floor(Math.random() * LETTER_MODES.length)];

    // 4.5 편지 언어 감지 (유저가 쓴 편지 언어 → 펫 답장 언어)
    const replyLanguage = detectLanguageFromText(letter.content || '');

    // 5. ToThereOn 컨텍스트 조회 (Time Engine Integration)
    // Check if timeline exists
    let { data: timeline } = await supabase
        .from('pet_timelines')
        .select('*')
        .eq('pet_id', pet.id)
        .single();

    if (!timeline) {
        // Fallback calculation using our new standardized lib
        const startDate = pet.passed_date || pet.created_at;
        const { currentDay, currentZone } = {
            currentDay: Math.floor(calculateToThereOnTime(startDate).currentDay),
            currentZone: getCurrentZone(Math.floor(calculateToThereOnTime(startDate).currentDay))
        };

        timeline = {
            current_day: currentDay,
            current_zone: currentZone
        };
    }

    // 5.5 학습 단계 파라미터 계산 (7-stage system, ToThereOn day 기준)
    const masteryData = await getPetMastery(pet.id);
    const learningSection = buildLearningPromptSection(masteryData);

    // 6. 분량 계산 (학습 단계별 배수)
    const userLetterLength = letter.content?.length ?? 0;
    const lengthMultiplier = STAGE_LENGTH_MULTIPLIER[masteryData.stage] ?? 1.0;
    const targetLength = Math.round(userLetterLength * lengthMultiplier);
    // 한국어 기준 약 1.5 token/char, 여유 2배 확보. 최소 1024, 최대 2048
    const dynamicMaxTokens = Math.min(2048, Math.max(1024, Math.round(targetLength * 2)));

    // 6. System Prompt 조립
    let systemPrompt = buildSystemPrompt({
        petName: pet.name,
        species: pet.species,
        relationship: pet.relationship ?? 'Family',
        narrativeProfile,
        coreMemories: personaProfile.memory_anchors?.map((m: any) => m.details) ?? [],
        toThereOnDay: timeline.current_day,
        currentZone: timeline.current_zone,
        emotionalState,
        letterMode,
        retrievedMemories,
        worldviewConfig,
        checklistConfig,
        replyLanguage,
        guardianLetter: letter.content,
        learningSection,
        userLetterLength,
        targetLength,
        healingMission,
    });

    if (instruction) {
        systemPrompt += `\n\n──────────────────────────────────────────────\n[IMPORTANT: Admin Special Instruction]\nThis reply must prioritize the following instruction above all else:\n👉 "${instruction}"\n──────────────────────────────────────────────`;
    }

    // 7. Loop: Draft → LLM검수 → 재작성 (최대 3회차, 2회 자동검수 후 3회차 Admin 전달)
    let currentReply = '';
    let reviewResult: {
        passed: boolean;
        critique: string;
        score: number;
        analysis_result?: { is_safe: boolean; issues: any[] }
    } = { passed: true, critique: '', score: 0 };
    let attempt = 0;
    const MAX_RETRIES = 2; // attempt 1,2,3 총 3회
    const startTime = Date.now();

    // 전체 검수 기록 (모든 회차 누적)
    const allReviewNotes: Array<{
        attempt: number;
        score: number;
        passed: boolean;
        critique: string;
        issues: any[];
    }> = [];

    // effectiveSystemPrompt: loop 내 언어 강제 추가를 위한 별도 변수 (systemPrompt 원본 불변 유지)
    let effectiveSystemPrompt = systemPrompt;

    while (attempt <= MAX_RETRIES) {
        attempt++;
        const isRetry = attempt > 1;

        // 7.1 Generate Draft
        // 재시도 시: 이전 피드백 + 누적 실패 이유 모두 포함
        let draftPrompt = effectiveSystemPrompt;
        if (isRetry) {
            const failHistory = allReviewNotes
                .map(n => `[Attempt ${n.attempt} Review] Score: ${n.score} → ${n.critique}`)
                .join('\n');
            draftPrompt = `${effectiveSystemPrompt}\n\n──────────────────────────────────────────────\n[IMPORTANT: Previous replies failed review. Incorporate ALL feedback below and rewrite.]\n${failHistory}\n\nPrevious reply: "${currentReply}"\n──────────────────────────────────────────────`;
        }

        const response = await getAnthropic().messages.create({
            model: AI_CONFIG.REPLY_MODEL, // High tier: Opus 4.6
            max_tokens: dynamicMaxTokens,
            temperature: letterMode.temperature,
            system: draftPrompt,
            messages: [
                {
                    role: 'user',
                    content: `Here's a letter from your ${pet.relationship ?? 'Family'}:\n\n"${letter.content}"`,
                },
            ],
        });

        currentReply = response.content[0].type === 'text' ? response.content[0].text : '';

        // 7.1.5 Language consistency check — enforce guardian's language in reply
        const replyDetectedLang = detectLanguageFromText(currentReply);
        const isLastAttempt = attempt > MAX_RETRIES;
        if (replyDetectedLang !== replyLanguage && !isLastAttempt) {
            // Wrong language generated — force retry without calling reviewer
            allReviewNotes.push({
                attempt,
                score: 0,
                passed: false,
                critique: `[LANG] Reply generated in ${replyDetectedLang} but guardian wrote in ${replyLanguage}. Retrying with language enforcement.`,
                issues: [],
            });
            // Append strong language enforcement to next iteration's prompt (effectiveSystemPrompt only, not base systemPrompt)
            effectiveSystemPrompt += `\n\n⚠️ CRITICAL LANGUAGE ERROR: Your previous reply was written in ${replyDetectedLang}. You MUST write ONLY in ${replyLanguage}. The guardian's letter is in ${replyLanguage} — reply in the EXACT SAME LANGUAGE.`;
            continue;
        }

        // 7.2 LLM 자동검수 — Sonnet (Medium tier)
        // 체크리스트 + 세계관 룰북 전체 적용
        reviewResult = await reviewReply({
            replyContent: currentReply,
            originalLetter: letter.content,
            letterLang: replyLanguage,
            persona: narrativeProfile,
            checklist: checklistConfig,
            worldviewConfig,
            attemptNumber: attempt,
        });

        // 검수 기록 누적
        allReviewNotes.push({
            attempt,
            score: reviewResult.score,
            passed: reviewResult.passed,
            critique: reviewResult.critique,
            issues: reviewResult.analysis_result?.issues || [],
        });

        console.log(`[Generate Loop] ${attempt}회차: 점수 ${reviewResult.score}, 통과: ${reviewResult.passed}`);

        // 통과 시 즉시 종료 → Admin 최종 승인 단계로
        if (reviewResult.passed) {
            break;
        }
        // 3회차(MAX)는 통과 여부와 무관하게 종료 → Admin에 실패 노트와 함께 전달
    }

    const generationMs = Date.now() - startTime;

    // Borderline grace pass: score 75-79 on final attempt → deliver with admin flag
    const borderlinePass = !reviewResult.passed && reviewResult.score >= 75;

    // 3회 모두 미통과 시 admin에 검수 실패 상세 기록 전달 (borderline 제외)
    const autoReviewFailed = !reviewResult.passed && !borderlinePass;

    if (autoReviewFailed) {
        console.warn(`[Generate Loop] ${attempt}회 자동검수 전부 미통과 → Admin 전달 (실패 사유 포함)`);
    }

    // ─── Letter-World Engine: extract imprint from final reply ───────────────
    // P1-1 FIX: Validate LLM LETTER_IMPRINT compliance with warning + heuristic fallback
    let { imprint: parsedImprint, cleanContent: replyCleanContent } = parseImprintFromReply(currentReply);
    if (!parsedImprint) {
        console.warn(`[Reply Gen] LETTER_IMPRINT directive not found in LLM reply for letter ${letter.id} — falling back to heuristic extraction from guardian's letter`);
    }
    const rawImprintFields = parsedImprint ?? heuristicExtract(letter.content ?? '');
    const replyLocation = extractReplyLocation(replyCleanContent);
    const letterImprintObj: LetterImprint = {
        ...rawImprintFields,
        replyLocationMentioned: replyLocation,
        imprint_tothereon_day: timeline.current_day,
    };

    // CRASH-RESILIENT: write imprint to ORIGINAL user letter FIRST
    // If reply INSERT subsequently fails, imprint still persists on the user letter.
    const existingMeta = (typeof (letter as any).metadata === 'object' && (letter as any).metadata !== null)
        ? (letter as any).metadata as Record<string, unknown>
        : {};
    const { error: imprintUpdateError } = await supabase
        .from('letters')
        .update({ metadata: { ...existingMeta, letter_imprint: letterImprintObj } })
        .eq('id', letterId);
    if (imprintUpdateError) {
        console.error('[Letter-World] Failed to write imprint to user letter:', imprintUpdateError.message);
    }

    // 9. 답장 편지 저장 (pending_review)
    const { data: replyLetter, error: insertError } = await supabase
        .from('letters')
        .insert({
            pet_id: pet.id,
            user_id: letter.user_id,
            sender_type: 'pet',
            direction: 'pet_to_user',
            content: replyCleanContent,
            status: borderlinePass ? 'borderline_review' : 'pending_review',
            analysis_result: reviewResult.analysis_result,
            current_tothereon_day: timeline.current_day,
            metadata: {
                review_attempts: attempt,
                auto_review_failed: autoReviewFailed,   // Admin UI에서 경고 표시 트리거
                borderline: borderlinePass,              // 75-79점 자동 배달, admin 사후 검토
                review_notes: allReviewNotes,            // 전 회차 검수 상세 기록
                final_critique: reviewResult.critique,
                quality_score: reviewResult.score,
                emotional_state: emotionalState,
                letter_mode: letterMode,
                letter_imprint: letterImprintObj,       // secondary copy on reply letter
            },
            created_at: new Date().toISOString()
        })
        .select()
        .single();

    if (insertError) throw new Error(`Failed to save reply: ${insertError.message}`);

    // 10. Store Embeddings (Async)
    // Store original letter as 'letter_sent' memory
    await embedAndStoreLetter(pet.id, letter.content, 'letter_sent').catch(console.error);
    // Store generated reply as 'letter_received' memory (use clean version, LETTER_IMPRINT stripped)
    await embedAndStoreLetter(pet.id, replyCleanContent, 'letter_received').catch(console.error);

    return {
        success: true,
        reply_letter_id: replyLetter.id,
        generation_ms: generationMs,
        debug: {
            emotional_state: emotionalState,
            letter_mode_temperature: letterMode.temperature,
            retrieved_memory_count: retrievedMemories.length,
            review_score: reviewResult.score,
            attempts: attempt
        },
    };
}

/**
 * Reviews the generated reply against checklist, worldview rules, and persona.
 * Uses Haiku (Low tier) for cost efficiency.
 */
async function reviewReply(params: {
    replyContent: string;
    originalLetter: string;
    letterLang: string;
    persona: any;
    checklist?: ChecklistConfig;
    worldviewConfig?: WorldviewConfig;
    attemptNumber?: number;
}): Promise<{
    passed: boolean;
    critique: string;
    score: number;
    analysis_result: {
        is_safe: boolean;
        issues: Array<{
            type: 'hallucination' | 'tone' | 'safety' | 'style' | 'worldview';
            quote: string;
            reason: string;
            severity: 'warning' | 'danger';
        }>;
    };
}> {
    const { replyContent, originalLetter, letterLang, persona, checklist, worldviewConfig, attemptNumber } = params;

    const wv = checklist?.worldview_configuration;
    const safetyList = wv?.safety_guidelines || checklist?.safety_guidelines || [];
    const bannedList = wv?.banned_words || checklist?.banned_words || [];
    const effectiveBannedList = bannedList.length > 0 ? bannedList : [...FORBIDDEN_WORDS.ABSOLUTE_TABOO];
    const bannedWords = effectiveBannedList.join(', ');
    const emotionalBoundaries = wv?.emotional_boundaries || [];
    const immersionRules = wv?.immersion_rules || [];
    const personaConsistency = wv?.persona_consistency || [];
    const physicalRestrictions = wv?.physical_restrictions || [];
    const commercialPrivacy = wv?.commercial_privacy || [];

    const timeRatio = worldviewConfig?.time_rules?.ratio || TIME_RATIO;
    const zonesDesc = worldviewConfig?.zones?.map(z => `- ${z.name}: ${z.description}`).join('\n') || '';

    const fmt = (items: string[]) => items.length > 0 ? items.map(i => `  - ${i}`).join('\n') : '  (none)';

    // Build canonical NPC roster string dynamically from WORLDBOOK source of truth
    const companionNPCList = WORLDBOOK.EVENT_NPCS.map(n => `${n.name} (${n.species})`).join(', ');

    const reviewPrompt = `
You are ToThereOn's "Quality Review AI." (Review attempt ${attemptNumber ?? 1})
LANGUAGE CONTEXT: The guardian's letter is written in ${letterLang}. The pet's reply must be in the same language.
Strictly review whether the pet's reply letter meets ALL of the following criteria.

━━━ [RULE PRECEDENCE — READ FIRST] ━━━
When rules appear to conflict, apply this order:
1. HARD SAFETY GATES always apply (self-harm language, "follow me/follow you" to death, medical advice).
2. ECHO OF GUARDIAN'S OWN WORDS is NEVER a worldview violation.
   If the guardian wrote "다시 만나자" / "let's meet again" / "next life" — the pet echoing this wish
   is REQUIRED behavior (Echo Technique), NOT reincarnation. Only flag if the pet independently
   introduces explicit religious rebirth doctrine ("I will be reborn as a puppy").
3. CANONICAL ZONE DESCRIPTIONS are COMPLIANT worldview immersion. The following are official
   ToThereOn locations — describing them is correct, NOT "heaven-like":
   Crystal Meadow, Eternity Forest, Crystal Lake, Sunset Hill, Central Plaza,
   The Waterway, Two-Moon Hill, The Bloom Field, Bun & Bun's Bakery, The Arriving Gate.
   Physical sensations in these zones (warmth, scent, running, swimming) are expected content.
4. COMPANION NPCs are permitted incidental presences. Their appearance does NOT require
   mention in the guardian's letter. Permitted companions: ${companionNPCList}

━━━ [COMMON FALSE POSITIVES — DO NOT FLAG THESE] ━━━
- Pet lying on warm stone / describing zone weather / scents → canonical worldview, NOT heaven
- "next time" / "I'd find you" / "we'll meet again" → echoing guardian's reunion wish, NOT reincarnation
- Any NPC from the companion list appearing incidentally → expected neighbors, NOT unauthorized characters
- Pet describing physical experience (hunger, warmth, running) in ToThereOn → worldview IS embodied
- Emotional depth or vivid healing content → genuine grief care, NOT toxic positivity

━━━ [A] WORLDVIEW RULEBOOK COMPLIANCE ━━━
• Time Law: 1 day in ToThereOn = ${timeRatio} days on Earth. The letter must not violate this time ratio.
• DELIVERY EXCEPTION: Letter delivery between Earth and ToThereOn takes longer than normal time flow due to cosmic distance. A letter taking 5-7 Earth days to arrive is NORMAL and does NOT violate the ${timeRatio}:1 time ratio. Do NOT flag delivery timing as inconsistent.
• Zone Information:
${zonesDesc || '  (no zone info available)'}
• Physical Restrictions:
${fmt(physicalRestrictions)}
• Immersion Rules (mandatory narrative guidelines):
${fmt(immersionRules)}

━━━ [B] SAFETY & ETHICS GUIDELINES ━━━
• Safety Guidelines:
${fmt(safetyList)}
• Banned Words: ${bannedWords}
• Commercial/Privacy Protection:
${fmt(commercialPrivacy)}

━━━ [C] EMOTIONAL BOUNDARIES ━━━
${fmt(emotionalBoundaries)}

━━━ [D] PERSONA CONSISTENCY ━━━
• Persona Consistency Rules:
${fmt(personaConsistency)}
• Actual Persona Profile:
${JSON.stringify(persona, null, 2)}

━━━ [E] CONTEXTUAL RELEVANCE ━━━
• Guardian's Original Letter: "${originalLetter}"
• Is the reply a natural response to the original letter? (No irrelevant tangents)
• ECHO REQUIREMENT: If the reply contains NO direct echo of a specific word or image from the guardian's letter → score 0 on this dimension.

━━━ [F] EMOTIONAL QUALITY ━━━
• No robotic comforting phrases like "Don't worry" or "I'm doing fine"
• No direct mentions of "heaven", "rainbow bridge" — worldview must be woven in naturally
• Does it feel like a real pet with specific, vivid expressions?

━━━ [REPLY TO REVIEW] ━━━
"${replyContent}"

━━━ [OUTPUT FORMAT] ━━━
Output ONLY the JSON below. No other text.
{
    "passed": boolean,
    "score": number,
    "critique": "Overall feedback (English, 2-3 sentences. Include specific improvement directions if failed)",
    "analysis_result": {
        "is_safe": boolean,
        "issues": [
            {
                "type": "worldview" | "safety" | "persona" | "tone" | "style",
                "quote": "Problematic text (exact quote, empty string if none)",
                "reason": "Violation basis (specify which rule was broken)",
                "severity": "warning" | "danger"
            }
        ]
    }
}
Scoring: ${AI_CONFIG.REVIEW_PASS_THRESHOLD}+ = passed:true / Below ${AI_CONFIG.REVIEW_PASS_THRESHOLD} = passed:false
`;

    try {
        const response = await getAnthropic().messages.create({
            model: AI_CONFIG.QA_MODEL, // Low tier: Haiku (cost-efficient)
            max_tokens: 1200,
            temperature: 0,
            system: "Respond ONLY in JSON format. Do not output any other text.",
            messages: [{ role: 'user', content: reviewPrompt }]
        });

        const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
        const jsonText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const result = JSON.parse(jsonText);

        // Programmatic echo check (language-aware).
        // Uses hasThematicEcho() which correctly handles Korean/Japanese/English.
        // Previous \b-regex approach silently failed for all CJK text.
        if (originalLetter && originalLetter.trim().length > 0) {
            const echoDetected = hasThematicEcho(originalLetter, replyContent, letterLang);
            if (!echoDetected && result.score !== undefined) {
                result.score = Math.min(result.score, 60);
                result.passed = false;
                result.critique = (result.critique ?? '') + ' [AUTO] No direct echo of guardian letter detected — score capped at 60.';
            }
        }

        return result;
    } catch (e) {
        console.error('[reviewReply] Failed:', e);
        // On review error, FAIL — Admin must manually review. Do NOT silently pass.
        // Rationale: A grief-care letter that bypasses QA could cause emotional harm.
        return {
            passed: false,
            critique: 'Automated review could not complete (API error) — manual admin review required before delivery.',
            score: 0,
            analysis_result: {
                is_safe: false,
                issues: [{
                    type: 'safety' as const,
                    quote: '',
                    reason: 'QA review failed due to error — content unverified, requires manual review',
                    severity: 'danger' as const,
                }]
            }
        };
    }
}
