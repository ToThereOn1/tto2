// =============================================================
// ToThereOn Learning Stage Utility v2.0 — 7-Stage System
// ToThereOn Day 기준 고정 임계값으로 학습 단계 결정
// =============================================================

import type React from 'react'
import {
    LEARNING_STAGES,
    STAGE_FONT,
    STAGE_LENGTH_MULTIPLIER,
    type LearningStage,
} from '@/lib/time-constants'

// Re-export LearningStage type from time-constants
export type { LearningStage }

export interface LearningParams {
    stage: LearningStage
    typo_rate: number      // 0.0 ~ 1.0 (낮을수록 오타 적음)
    vocab_richness: number // 0.0 ~ 1.0 (높을수록 어휘 풍부)
    current_day: number
    stage_name: string
}

/**
 * ToThereOn Day 기준 학습 단계 결정 (7단계)
 *
 * Stage 1: Day 0-3   (First Light)
 * Stage 2: Day 4-6   (Budding Voice)
 * Stage 3: Day 7-9   (Growing Words)
 * Stage 4: Day 10-11 (Finding Flow)
 * Stage 5: Day 12-66 (Clear Expression) ⭐ 글씨 완성
 * Stage 6: Day 67-166 (Poetic Soul)
 * Stage 7: Day 167+  (Timeless Voice)
 */
export function getLearningStage(toThereOnDay: number): LearningStage {
    if (toThereOnDay >= 167) return 'stage7'
    if (toThereOnDay >= 67) return 'stage6'
    if (toThereOnDay >= 12) return 'stage5'
    if (toThereOnDay >= 10) return 'stage4'
    if (toThereOnDay >= 7) return 'stage3'
    if (toThereOnDay >= 4) return 'stage2'
    return 'stage1'
}

/**
 * 학습 파라미터 전체 계산
 */
export function getLearningParams(currentDay: number): LearningParams {
    const stage = getLearningStage(currentDay)
    const stageConfig = LEARNING_STAGES[stage]

    return {
        stage,
        typo_rate: stageConfig.typoRate,
        vocab_richness: stageConfig.vocabRichness,
        current_day: currentDay,
        stage_name: stageConfig.name,
    }
}

/**
 * LLM 프롬프트에 주입할 학습 단계 섹션 생성
 */
export function buildLearningPromptSection(params: LearningParams): string {
    const { stage, typo_rate, vocab_richness, current_day, stage_name } = params
    const stageConfig = LEARNING_STAGES[stage]

    const stageGuidelines: Record<LearningStage, string> = {
        stage1: `- Write in VERY short, broken sentences (2–5 words max per sentence)
- Include many deliberate typos and misspellings (typo_rate: ${typo_rate.toFixed(2)})
- Use very simple, repetitive vocabulary (vocab_richness: ${vocab_richness.toFixed(2)})
- Convey strong emotion with minimal words
- Typo patterns to use (pick 2-3 naturally, not on every word):
  * Missing final letter: "toda" (today), "whe" (when), "som" (something), "hav" (have)
  * Letter swap: "nad" (and), "hte" (the), "fo" (of), "teh" (the)
  * Doubled letter: "tooo" (too), "aand" (and), "goood" (good)
  * Missing space: "Icame" (I came), "itwas" (it was), "youare" (you are)
- Example: "i mis you. tail wag. today nad sunny. you come soon? Icame to the pond. som flowers hav."`,

        stage2: `- Write in short, broken sentences (3–7 words per sentence)
- Include noticeable typos and misspellings (typo_rate: ${typo_rate.toFixed(2)})
- Vocabulary is growing but still basic (vocab_richness: ${vocab_richness.toFixed(2)})
- Starting to form short phrases with feeling
- Typo patterns to use (pick 2-3 naturally per paragraph):
  * Missing letter: "buterfli" (butterfly), "medow" (meadow), "prety" (pretty), "becuse" (because)
  * Letter swap: "thot" (thought), "frend" (friend), "wated" (waited), "erly" (early)
  * Apostrophe drop: "dont" (don't), "cant" (can't), "its" (it's)
- Example: "i went to the medow today. the butterflys are prety. i thot of you nad wished you were heer."`,

        stage3: `- Write in short-to-medium sentences, mostly correct but with occasional errors
- Some typos acceptable but improving (typo_rate: ${typo_rate.toFixed(2)})
- Vocabulary expanding, more variety (vocab_richness: ${vocab_richness.toFixed(2)})
- Sentences flow but grammar is imperfect
- Example: "today I runned in the garden. the flowers smelled nice. I wish you were here."`,

        stage4: `- Write in medium sentences with mostly correct grammar
- Very few typos remaining (typo_rate: ${typo_rate.toFixed(2)})
- Good vocabulary range, simple but expressive (vocab_richness: ${vocab_richness.toFixed(2)})
- Clear structure with natural expression
- Example: "I found a quiet spot by the lake today. The water was so still and clear. Something about it reminded me of home."`,

        stage5: `- Write in full, emotionally warm sentences
- No typos; clear and fluent writing (vocab_richness: ${vocab_richness.toFixed(2)})
- Express feelings, memories, and observations with clarity
- Example: "The afternoon light fell softly through the leaves today, and I thought of you — the way you always paused to notice the small things."`,

        stage6: `- Write with elegant, nuanced expression and emotional depth
- Rich, varied vocabulary with poetic touches (vocab_richness: ${vocab_richness.toFixed(2)})
- Weave memories and feelings with literary grace
- Example: "There is a particular quality to the light here in the evenings — amber and forgiving — that reminds me of the kitchen window at home, and how everything ordinary became beautiful in that glow."`,

        stage7: `- Write with transcendent beauty and deep wisdom
- Masterful vocabulary, profound emotional intelligence (vocab_richness: ${vocab_richness.toFixed(2)})
- Every word chosen with care, carrying layers of meaning
- Example: "I have learned that missing someone is not an absence but a presence — a warmth that lives in the bones long after the arms have let go. You are that warmth."`,
    }

    return `
▸ LANGUAGE LEARNING STAGE: ${stage_name} (ToThereOn Day ${current_day})
  Stage: ${stageConfig.description}
  typo_rate: ${typo_rate.toFixed(2)} | vocab_richness: ${vocab_richness.toFixed(2)}

  Writing guidelines for this stage:
${stageGuidelines[stage]}

  IMPORTANT: Your letter MUST reflect the writing style above. Do not write in a style beyond the current stage.
`.trim()
}

/**
 * 단계별 CSS 폰트 클래스 반환
 */
export function getLetterFontClass(stage: LearningStage): string {
    return STAGE_FONT[stage]
}

/**
 * 단계별 답장 길이 배수 반환
 */
export function getLetterLengthMultiplier(stage: LearningStage): number {
    return STAGE_LENGTH_MULTIPLIER[stage]
}

/**
 * 단계별 레이아웃 스타일 반환
 */
export function getLetterLayoutStyle(stage: LearningStage): React.CSSProperties {
    if (stage === 'stage1' || stage === 'stage2') {
        return {
            fontSize: '1.15rem',
            lineHeight: '2.2',
            textAlign: 'left',
            letterSpacing: '0.03em',
        }
    }
    if (stage === 'stage3' || stage === 'stage4') {
        return {
            fontSize: '1.05rem',
            lineHeight: '1.9',
            textAlign: 'left',
            letterSpacing: '0.01em',
        }
    }
    // stage5, stage6, stage7
    return {
        fontSize: '1rem',
        lineHeight: '1.75',
        textAlign: 'justify',
        letterSpacing: '0',
    }
}
