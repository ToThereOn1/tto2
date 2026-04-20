-- ==============================================================================
-- 20260223_fix_letter_quota_rpc.sql
-- Fix the split-brain letter quota problem by shifting the source of truth
-- to the letter_quota table instead of the global subscriptions table.
-- This ensures plus/pro users correctly receive quotas PER PET.
-- ==============================================================================

-- Drop the outdated function first
DROP FUNCTION IF EXISTS send_letter_transaction(UUID, UUID, TEXT, TEXT, TEXT[], INTEGER);

-- Re-create the function to use `letter_quota` table
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
  v_quota_id UUID;
  v_allowed INTEGER;
  v_sent INTEGER;
  v_remaining INTEGER;
  v_letter_id UUID;
  v_now TIMESTAMP WITH TIME ZONE := NOW();
  v_now_local TIMESTAMP := NOW()::TIMESTAMP;
  v_current_month TEXT := to_char(NOW(), 'YYYY-MM');
BEGIN
  -- 1. Lock Letter Quota Row for THIS month & pet
  SELECT id, letters_allowed, letters_sent 
  INTO v_quota_id, v_allowed, v_sent
  FROM public.letter_quota
  WHERE user_id = p_user_id AND pet_id = p_pet_id AND month = v_current_month
  LIMIT 1
  FOR UPDATE;

  -- 2. Checks
  IF v_quota_id IS NULL THEN
    -- If no quota exists yet (cron might have failed or new user), we cannot send.
    -- Alternatively, we can auto-create it with 1 free limit but it's safer to deny
    -- and let the frontend self-heal or run the webhook logic.
    RETURN jsonb_build_object('error', 'Quota record not found for this month. Please try again or contact support.', 'code', 'NO_QUOTA_RECORD');
  END IF;

  v_remaining := v_allowed - v_sent;

  -- Check Quota
  IF v_remaining <= 0 THEN
    RETURN jsonb_build_object('error', 'Monthly letter quota exceeded for this pet', 'code', 'QUOTA_EXCEEDED');
  END IF;

  -- (Cooldown logic was previously using next_available_at on subscriptions table)
  -- Since cooldowns are feature-based, we can just skip heavy DB cooldown checks here
  -- as the UI now controls basic frontend cooldown, and quota is what really matters for monetization.

  -- 3. Update Quota
  UPDATE public.letter_quota
  SET letters_sent = letters_sent + 1,
      updated_at = v_now_local 
  WHERE id = v_quota_id;

  -- 4. Insert Letter
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

  RETURN jsonb_build_object('success', true, 'letter_id', v_letter_id, 'remaining', v_remaining - 1);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM, 'code', 'INTERNAL_ERROR');
END;
$$ LANGUAGE plpgsql;
