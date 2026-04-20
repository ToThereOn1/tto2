-- ==============================================================================
-- 20260226_billing_cycle_quota.sql
--
-- Quota period logic:
--   Free  → month = 'lifetime'  (1 letter total, never resets)
--   Basic+ → month = YYYY-MM-DD (billing period start date, resets on renewal)
--
-- Run this in Supabase SQL Editor.
-- ==============================================================================

-- Step 1: Deduplicate existing letter_quota rows (keep highest letters_sent per group)
DELETE FROM letter_quota
WHERE id NOT IN (
    SELECT DISTINCT ON (user_id, pet_id, month) id
    FROM letter_quota
    ORDER BY user_id, pet_id, month, letters_sent DESC, updated_at DESC NULLS LAST
);

-- Step 2: Add UNIQUE constraint (required for ON CONFLICT / upsert to work)
ALTER TABLE letter_quota
    DROP CONSTRAINT IF EXISTS letter_quota_user_pet_month_unique;
ALTER TABLE letter_quota
    ADD CONSTRAINT letter_quota_user_pet_month_unique
    UNIQUE (user_id, pet_id, month);

-- Step 3: Replace the send_letter_transaction RPC
DROP FUNCTION IF EXISTS send_letter_transaction(UUID, UUID, TEXT, TEXT, TEXT[], INTEGER);

CREATE OR REPLACE FUNCTION send_letter_transaction(
  p_user_id UUID,
  p_pet_id UUID,
  p_content TEXT,
  p_font_style TEXT,
  p_photos TEXT[],
  p_current_tothereon_day INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_user_tier TEXT;
  v_month_key TEXT;
  v_quota_id UUID;
  v_allowed INTEGER;
  v_sent INTEGER;
  v_remaining INTEGER;
  v_letter_id UUID;
  v_now TIMESTAMP WITH TIME ZONE := NOW();
  v_now_local TIMESTAMP := NOW()::TIMESTAMP;
BEGIN
  -- 1. Look up user's subscription tier
  SELECT COALESCE(subscription_tier, 'free')
  INTO v_user_tier
  FROM public.users
  WHERE id = p_user_id;

  -- 2. Determine quota period key
  IF v_user_tier = 'free' OR v_user_tier IS NULL THEN
    -- Free: lifetime 1 letter, never resets
    v_month_key := 'lifetime';
  ELSE
    -- Basic+: use billing period start date (YYYY-MM-DD)
    SELECT to_char(current_period_start, 'YYYY-MM-DD')
    INTO v_month_key
    FROM public.subscriptions
    WHERE user_id = p_user_id
      AND status IN ('active', 'trialing')
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_month_key IS NULL THEN
      RETURN jsonb_build_object(
        'error', 'No active subscription billing period found.',
        'code', 'NO_SUBSCRIPTION'
      );
    END IF;
  END IF;

  -- 3. Lock the quota row for this period & pet
  SELECT id, letters_allowed, letters_sent
  INTO v_quota_id, v_allowed, v_sent
  FROM public.letter_quota
  WHERE user_id = p_user_id
    AND pet_id = p_pet_id
    AND month = v_month_key
  LIMIT 1
  FOR UPDATE;

  -- 4. If no quota record exists:
  --    Free users → auto-create lifetime record
  --    Paid users → deny (webhook/cron should have created it)
  IF v_quota_id IS NULL THEN
    IF v_user_tier = 'free' OR v_user_tier IS NULL THEN
      INSERT INTO public.letter_quota (user_id, pet_id, month, letters_allowed, letters_sent)
      VALUES (p_user_id, p_pet_id, 'lifetime', 1, 0)
      ON CONFLICT (user_id, pet_id, month) DO UPDATE
        SET letters_allowed = 1
      RETURNING id, letters_allowed, letters_sent
      INTO v_quota_id, v_allowed, v_sent;
    ELSE
      RETURN jsonb_build_object(
        'error', 'Quota record not found for current billing period. Please try again.',
        'code', 'NO_QUOTA_RECORD'
      );
    END IF;
  END IF;

  -- 5. Check remaining quota
  v_remaining := v_allowed - v_sent;

  IF v_remaining <= 0 THEN
    RETURN jsonb_build_object(
      'error', 'Letter quota exceeded for this billing period.',
      'code', 'QUOTA_EXCEEDED'
    );
  END IF;

  -- 6. Consume 1 quota
  UPDATE public.letter_quota
  SET letters_sent = letters_sent + 1,
      updated_at = v_now_local
  WHERE id = v_quota_id;

  -- 7. Insert the letter
  INSERT INTO public.letters (
    user_id,
    pet_id,
    content,
    font_style,
    photos,
    sender_type,
    status,
    current_tothereon_day,
    created_at
  ) VALUES (
    p_user_id,
    p_pet_id,
    p_content,
    p_font_style,
    p_photos,
    'user',
    'sent',
    p_current_tothereon_day,
    v_now_local
  ) RETURNING id INTO v_letter_id;

  RETURN jsonb_build_object(
    'success', true,
    'letter_id', v_letter_id,
    'remaining', v_remaining - 1
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM, 'code', 'INTERNAL_ERROR');
END;
$$ LANGUAGE plpgsql;
