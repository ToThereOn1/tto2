-- =============================================================
-- ToThereOn Payment System Final Migration
-- 실행 환경: Supabase SQL Editor
-- 주의: 테이블 존재 여부와 무관하게 안전하게 실행 가능
-- =============================================================

-- =============================================================
-- 1. users 테이블: pet_limit / subscription_tier 컬럼 추가
-- =============================================================
ALTER TABLE users
ADD COLUMN IF NOT EXISTS pet_limit INTEGER NOT NULL DEFAULT 1;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';

-- 기존 max_pets_allowed 값을 pet_limit 에 복사
UPDATE users SET pet_limit = COALESCE(max_pets_allowed, 1)
WHERE pet_limit = 1 AND max_pets_allowed IS NOT NULL AND max_pets_allowed != 1;

UPDATE users SET subscription_tier = 'free' WHERE subscription_tier IS NULL;

-- =============================================================
-- 2. subscriptions 테이블: 없으면 생성, 있으면 컬럼 추가
-- =============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    lemon_squeezy_subscription_id TEXT UNIQUE,
    lemon_squeezy_customer_id TEXT,
    -- 레거시 컬럼 (기존 호환)
    lemon_squeezy_id TEXT,
    customer_id TEXT,
    tier TEXT DEFAULT 'free',
    status TEXT DEFAULT 'active',
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    -- 레거시 컬럼
    renews_at TIMESTAMP WITH TIME ZONE,
    ends_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 테이블이 이미 있었던 경우: 신규 컬럼만 추가
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS lemon_squeezy_subscription_id TEXT;

ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS lemon_squeezy_customer_id TEXT;

ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMP WITH TIME ZONE;

ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP WITH TIME ZONE;

ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS cancel_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

-- lemon_squeezy_subscription_id unique index (이미 있으면 무시)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'subscriptions'
        AND indexname = 'idx_subscriptions_ls_subscription_id'
    ) THEN
        CREATE UNIQUE INDEX idx_subscriptions_ls_subscription_id
        ON subscriptions(lemon_squeezy_subscription_id)
        WHERE lemon_squeezy_subscription_id IS NOT NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

-- tier CHECK constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_name = 'subscriptions_tier_check'
    ) THEN
        ALTER TABLE subscriptions
        ADD CONSTRAINT subscriptions_tier_check
        CHECK (tier IN ('free', 'basic', 'plus', 'pro'));
    END IF;
END $$;

-- =============================================================
-- 3. letter_quota 테이블: 없으면 생성, 있으면 컬럼 추가
-- =============================================================
CREATE TABLE IF NOT EXISTS letter_quota (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    pet_id UUID REFERENCES pets(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    letters_sent INTEGER DEFAULT 0,
    letters_allowed INTEGER NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 테이블이 이미 있었던 경우: pet_id 컬럼 추가
ALTER TABLE letter_quota
ADD COLUMN IF NOT EXISTS pet_id UUID REFERENCES pets(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_letter_quota_user_month
ON letter_quota(user_id, month);

CREATE INDEX IF NOT EXISTS idx_letter_quota_user_pet_month
ON letter_quota(user_id, pet_id, month);

-- =============================================================
-- 4. payment_history 테이블
-- =============================================================
CREATE TABLE IF NOT EXISTS payment_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    lemon_squeezy_order_id TEXT,
    amount_usd DECIMAL(10, 2),
    currency TEXT DEFAULT 'USD',
    status TEXT CHECK (status IN ('paid', 'failed', 'refunded')),
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_history_user_id
ON payment_history(user_id);

ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'payment_history'
        AND policyname = 'Users can view own payment history'
    ) THEN
        CREATE POLICY "Users can view own payment history"
        ON payment_history FOR SELECT
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- =============================================================
-- 5. waitlist 테이블: 없으면 생성, 있으면 컬럼 추가
-- =============================================================
CREATE TABLE IF NOT EXISTS waitlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    plan TEXT CHECK (plan IN ('plus', 'pro')),
    plan_interest TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 테이블이 이미 있었던 경우
ALTER TABLE waitlist
ADD COLUMN IF NOT EXISTS plan TEXT;

ALTER TABLE waitlist
ADD COLUMN IF NOT EXISTS plan_interest TEXT;

-- plan_interest 값을 plan 으로 복사
UPDATE waitlist SET plan = plan_interest
WHERE plan IS NULL AND plan_interest IN ('plus', 'pro');

-- email+plan unique constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'waitlist'
        AND constraint_name = 'waitlist_email_plan_unique'
    ) THEN
        ALTER TABLE waitlist
        ADD CONSTRAINT waitlist_email_plan_unique UNIQUE (email, plan);
    END IF;
END $$;

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'waitlist'
        AND policyname = 'Anyone can join waitlist'
    ) THEN
        CREATE POLICY "Anyone can join waitlist"
        ON waitlist FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- =============================================================
-- 6. subscriptions RLS
-- =============================================================
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'subscriptions'
        AND policyname = 'Users can view own subscription'
    ) THEN
        CREATE POLICY "Users can view own subscription"
        ON subscriptions FOR SELECT
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- =============================================================
-- 완료 확인 쿼리
-- =============================================================
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN ('users', 'subscriptions', 'letter_quota', 'payment_history', 'waitlist')
AND column_name IN ('pet_limit', 'subscription_tier', 'lemon_squeezy_subscription_id', 'pet_id', 'plan')
ORDER BY table_name, column_name;
