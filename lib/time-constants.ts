/**
 * ToThereOn Time Constants — Single Source of Truth
 * 모든 시간 관련 상수를 한 곳에서 관리
 */

// ─── Core Time Ratio ────────────────────────────────────────────────────
export const TIME_RATIO = 3  // 지구 3일 = ToThereOn 1일

// ─── Letter Pipeline (hours from sent) ──────────────────────────────────
export const LETTER_PIPELINE = {
    CROSSING_THE_WATERWAY: 72,   // 0-72h: 우주 수로를 횡단 중
    ARRIVED_AT_TOTHEREON: 72,    // 72h: ToThereOn 도착 (= 1 ToThereOn day)
    READING_YOUR_HEART: 96,      // 96h: 마음 읽는 중
    WRITING_REPLY: 120,          // 120h: AI 생성 트리거
    VISIBLE_TO_USER: 168,        // 168h (7일): 보호자에게 노출
    // Letter causality phases (P0-3: 상수화)
    PHASE_JUST_RECEIVED: 72,     // 72h~: 편지 막 도착, 감정 임팩트 최대
    PHASE_STILL_CARRYING: 120,   // 120h~: 편지 여운, 답장 작성 중
    PHASE_EXPIRED: 168,          // 168h~: 편지 단계 종료
    RELEVANCE_WINDOW: 8 * 24,    // 192h (8일): 최근 편지로 인정하는 최대 시간
} as const

// ─── Letter Status Names ────────────────────────────────────────────────
export const LETTER_STATUSES = {
    SENT: 'sent',
    CROSSING: 'crossing_the_waterway',
    ARRIVED: 'arrived_at_tothereon',
    READING: 'reading_your_heart',
    WRITING: 'writing_reply',
    PENDING_REVIEW: 'pending_review',
    REPLIED: 'replied',
} as const

// ─── Comment System ────────────────────────────────────────────────────
export const COMMENT_LIMITS = {
    /** Max pet replies per feed cycle by tier. Comments themselves are unlimited. */
    MAX_REPLIES_PER_CYCLE: {
        free: 2,
        basic: 3,
        premium: 5,
    },
    /** Reply delay range (hours). Pet replies arrive 2-6h after comment submission. */
    REPLY_DELAY_MIN_HOURS: 2,
    REPLY_DELAY_MAX_HOURS: 6,
    /** Calibration: LLM review for first N replies per pet, then programmatic only */
    CALIBRATION_REPLY_COUNT: 50,
    CALIBRATION_ERROR_THRESHOLD: 0.03, // 3% — graduate when error rate is below this
} as const

// ─── Feed Frequency (Earth days between feeds) ─────────────────────────
export const FEED_FREQUENCY: Record<string, number> = {
    free: 2,      // 2 Earth days (주 3-4회) — 마이크로 이벤트와 함께 기본 체험 제공
    basic: 1,     // 1 Earth day (매일) — 핵심 유료 차별화
    premium: 1,   // 1 Earth day (매일)
}

// ─── Learning Stages (7-stage system) ───────────────────────────────────
export type LearningStage = 'stage1' | 'stage2' | 'stage3' | 'stage4' | 'stage5' | 'stage6' | 'stage7'

export const LEARNING_STAGES: Record<LearningStage, {
    minDay: number
    name: string
    description: string
    typoRate: number
    vocabRichness: number
}> = {
    stage1: {
        minDay: 0,
        name: 'First Light',
        description: 'Just beginning to form words — broken, simple, full of feeling',
        typoRate: 0.8,
        vocabRichness: 0.1,
    },
    stage2: {
        minDay: 4,
        name: 'Budding Voice',
        description: 'Starting to string short phrases together with frequent misspellings',
        typoRate: 0.6,
        vocabRichness: 0.25,
    },
    stage3: {
        minDay: 7,
        name: 'Growing Words',
        description: 'Sentences forming, occasional errors, growing confidence',
        typoRate: 0.35,
        vocabRichness: 0.45,
    },
    stage4: {
        minDay: 10,
        name: 'Finding Flow',
        description: 'Mostly correct writing, simple but expressive',
        typoRate: 0.15,
        vocabRichness: 0.65,
    },
    stage5: {
        minDay: 12,
        name: 'Clear Expression',
        description: 'Fluent writing with warmth and clarity — mastery achieved',
        typoRate: 0.05,
        vocabRichness: 0.85,
    },
    stage6: {
        minDay: 67,
        name: 'Poetic Soul',
        description: 'Elegant, nuanced expression with emotional depth',
        typoRate: 0.0,
        vocabRichness: 0.95,
    },
    stage7: {
        minDay: 167,
        name: 'Timeless Voice',
        description: 'Transcendent, deeply wise and beautifully articulate',
        typoRate: 0.0,
        vocabRichness: 1.0,
    },
}

// ─── Stage Font Mapping ─────────────────────────────────────────────────
export const STAGE_FONT: Record<LearningStage, string> = {
    stage1: 'font-caveat',          // Caveat / Gamja Flower / Zen Kurenaido
    stage2: 'font-caveat',          // Caveat / Gamja Flower / Zen Kurenaido
    stage3: 'font-kalam',           // Kalam / Nanum Pen Script / Zen Kurenaido
    stage4: 'font-kalam',           // Kalam / Nanum Pen Script / Klee One
    stage5: 'font-patrick-hand',    // Patrick Hand / Nanum Pen Script / Klee One
    stage6: 'font-lora',            // Lora / Nanum Myeongjo / Noto Serif JP
    stage7: 'font-lora',            // Lora / Nanum Myeongjo / Noto Serif JP
}

// ─── Stage Length Multiplier (reply length relative to user's letter) ───
// World Bible rule: ALL replies are ~130% the length of the received letter.
// "Longing on that side is always a little greater."
// Early stages express brevity through simple vocabulary and short sentences,
// not through shorter overall length — the handwriting is struggling, not absent.
export const STAGE_LENGTH_MULTIPLIER: Record<LearningStage, number> = {
    stage1: 1.3,
    stage2: 1.3,
    stage3: 1.3,
    stage4: 1.3,
    stage5: 1.3,
    stage6: 1.3,
    stage7: 1.3,
}
