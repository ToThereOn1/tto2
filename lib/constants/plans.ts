// ToThereOn 요금제 구조 (3:1 비율 + 플랜 확정 2026-03-01)
// Free + Basic 활성화, Premium 준비 (이미지 생성은 Phase 2)

import { FEED_FREQUENCY } from '@/lib/time-constants';

// ─── Plan Config (01-1 기준) ────────────────────────────────────────────
export type PlanTier = 'free' | 'basic' | 'premium';

export const PLAN_CONFIG: Record<PlanTier, {
    monthlyLetterLimit: number
    feedIntervalEarthDays: number
    letterReplyEarthDays: number
    sendCooldownHours: number
    imageEnabled: boolean
    priceMonthly: number | null
}> = {
    free: {
        monthlyLetterLimit: 2,
        feedIntervalEarthDays: FEED_FREQUENCY.free,
        letterReplyEarthDays: 7,
        sendCooldownHours: 168,
        imageEnabled: false,
        priceMonthly: null,
    },
    basic: {
        monthlyLetterLimit: 4,
        feedIntervalEarthDays: FEED_FREQUENCY.basic,
        letterReplyEarthDays: 7,
        sendCooldownHours: 168,
        imageEnabled: false,
        priceMonthly: 9.99,
    },
    premium: {
        monthlyLetterLimit: 4,
        feedIntervalEarthDays: FEED_FREQUENCY.premium,
        letterReplyEarthDays: 7,
        sendCooldownHours: 168,
        imageEnabled: true,
        priceMonthly: 19.99,
    },
};

export function getPlanConfig(tier: string) {
    return PLAN_CONFIG[tier as PlanTier] ?? PLAN_CONFIG.free;
}

export const LETTER_LIMIT_MESSAGE = (petName: string) =>
    `${petName} is waiting for more letters. Upgrade to keep writing.`;

// ─── UI Display Config ──────────────────────────────────────────────────
export const PRICING_PLANS = {
    free: {
        name: 'Free',
        price_usd: 0,
        pet_limit: 1,
        features: [
            'Register 1 pet',
            'Status updates (text only)',
            'Their life continues in ToThereOn World',
            'View their ongoing journey',
            'Send 2 letters per month',
        ],
        limits: {
            letters_per_month: 2,
            includes_images: false,
        },
        status: 'active' as const,
    },
    basic: {
        name: 'Basic',
        price_usd: 9.99,
        pet_limit: 1,
        features: [
            'Register 1 pet',
            'Send 4 letters per month to your pet',
            'Receive 4 heartfelt letters back',
            'Status feeds twice a week',
            '7-day delivery journey',
        ],
        limits: {
            letters_per_month: 4,
            includes_images: false,
        },
        status: 'active' as const,
        lemon_squeezy_monthly_id: process.env.LEMON_SQUEEZY_BASIC_MONTHLY_ID,
        lemon_squeezy_yearly_id: process.env.LEMON_SQUEEZY_BASIC_YEARLY_ID,
    },
    premium: {
        name: 'Premium',
        price_usd: 19.99,
        pet_limit: 1,
        features: [
            'Register 1 pet',
            'Send 4 letters per month to your pet',
            'Receive 4 heartfelt letters back',
            'Status feeds twice a week + images',
            '7-day delivery journey',
            'Illustrated scenes from their world',
        ],
        limits: {
            letters_per_month: 4,
            includes_images: true,
        },
        status: 'coming_soon' as const,
        lemon_squeezy_monthly_id: process.env.LEMON_SQUEEZY_PREMIUM_MONTHLY_ID,
        lemon_squeezy_yearly_id: process.env.LEMON_SQUEEZY_PREMIUM_YEARLY_ID,
    },
} as const;

export const PLAN_PET_LIMITS: Record<PlanTier, number> = {
    free: 1,
    basic: 1,
    premium: 1,
};

export const PLAN_LETTER_LIMITS: Record<PlanTier, number> = {
    free: 2,
    basic: 4,
    premium: 4,
};

// ─── Premium Image Rules (Phase 2) ─────────────────────────────────────
export const PREMIUM_IMAGE_RULES = {
    petRequired: true,
    faceAllowed: false,
    preferredAngles: ['from behind', 'side profile', 'silhouette'] as const,
    zoneBackgroundRequired: true,
    styleNote: 'determined by API testing (Kling / NanoBanana Pro)',
};

/** variant_id → PlanTier 매핑 */
export function getTierFromVariantId(variantId: string): PlanTier {
    const basicMonthly = process.env.LEMON_SQUEEZY_BASIC_MONTHLY_ID;
    const basicYearly = process.env.LEMON_SQUEEZY_BASIC_YEARLY_ID;
    const premiumMonthly = process.env.LEMON_SQUEEZY_PREMIUM_MONTHLY_ID;
    const premiumYearly = process.env.LEMON_SQUEEZY_PREMIUM_YEARLY_ID;
    if (variantId === basicMonthly || variantId === basicYearly) return 'basic';
    if (variantId === premiumMonthly || variantId === premiumYearly) return 'premium';
    console.warn(`[Plans] Unknown variant ID: ${variantId}, defaulting to free`);
    return 'free';
}
