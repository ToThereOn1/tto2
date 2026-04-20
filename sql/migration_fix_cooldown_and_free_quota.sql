-- ==============================================================================
-- migration_fix_cooldown_and_free_quota.sql
--
-- Fixes:
--   1. Free tier auto-create quota: 1 letter lifetime → 2 letters/month
--      (Free now uses calendar month 'YYYY-MM', same pattern as paid billing period)
--   2. Add 7-day cooldown enforcement in RPC
--      (Previously removed for testing — now enforced server-side)
--
-- Run this in Supabase SQL Editor (replaces 20260226_billing_cycle_quota.sql).
-- ==============================================================================

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
  v_last_sent_at TIMESTAMP WITH TIME ZONE;
  v_next_available_at TIMESTAMP WITH TIME ZONE;
  v_now TIMESTAMP WITH TIME ZONE := NOW();
  v_now_local TIMESTAMP := NOW()::TIMESTAMP;
  v_cooldown_interval INTERVAL := INTERVAL '7 days';
BEGIN
  -- 1. Look up user's subscription tier
  SELECT COALESCE(subscription_tier, 'free')
  INTO v_user_tier
  FROM public.users
  WHERE id = p_user_id;

  -- 2. Determine quota period key
  --    Free:   calendar month 'YYYY-MM'  (2 letters/month, resets monthly)
  --    Basic+: billing period 'YYYY-MM-DD' (resets on subscription renewal)
  IF v_user_tier = 'free' OR v_user_tier IS NULL THEN
    v_month_key := to_char(v_now, 'YYYY-MM');
  ELSE
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

  -- 4. Auto-create quota record if it doesn't exist
  IF v_quota_id IS NULL THEN
    IF v_user_tier = 'free' OR v_user_tier IS NULL THEN
      -- Free: 2 letters per calendar month
      INSERT INTO public.letter_quota (user_id, pet_id, month, letters_allowed, letters_sent)
      VALUES (p_user_id, p_pet_id, v_month_key, 2, 0)
      ON CONFLICT (user_id, pet_id, month) DO UPDATE
        SET letters_allowed = 2
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
      'error', 'Letter quota exceeded for this period.',
      'code', 'QUOTA_EXCEEDED'
    );
  END IF;

  -- 6. Check 7-day cooldown (based on last user letter sent for this pet)
  SELECT created_at
  INTO v_last_sent_at
  FROM public.letters
  WHERE user_id = p_user_id
    AND pet_id = p_pet_id
    AND sender_type = 'user'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_last_sent_at IS NOT NULL AND v_now < v_last_sent_at + v_cooldown_interval THEN
    v_next_available_at := v_last_sent_at + v_cooldown_interval;
    RETURN jsonb_build_object(
      'error', 'Please wait 7 days between letters.',
      'code', 'COOLDOWN_ACTIVE',
      'next_available_at', v_next_available_at
    );
  END IF;

  -- 7. Consume 1 quota
  UPDATE public.letter_quota
  SET letters_sent = letters_sent + 1,
      updated_at = v_now_local
  WHERE id = v_quota_id;

  -- 8. Insert the letter
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
