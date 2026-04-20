
-- Drop the function first to ensure clean state
DROP FUNCTION IF EXISTS send_letter_transaction(UUID, UUID, TEXT, TEXT, TEXT[], INTEGER);

-- Ensure columns exist (Idempotent)
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS remaining_letters INTEGER DEFAULT 4;

ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS next_available_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Re-create the function with strict type checking and safety
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
  v_sub_id UUID;
  v_remaining INTEGER;
  v_next_available TIMESTAMP WITH TIME ZONE;
  v_letter_id UUID;
  v_now TIMESTAMP WITH TIME ZONE := NOW();
  v_now_local TIMESTAMP := NOW()::TIMESTAMP; -- For tables using TIMESTAMP without TZ
BEGIN
  -- 1. Lock Subscription Row
  -- We assume one subscription per user
  SELECT id, remaining_letters, next_available_at 
  INTO v_sub_id, v_remaining, v_next_available
  FROM public.subscriptions
  WHERE user_id = p_user_id
  LIMIT 1
  FOR UPDATE;

  -- 2. Checks
  IF v_sub_id IS NULL THEN
    -- Try to auto-create subscription if missing (Self-healing)
    INSERT INTO public.subscriptions (user_id, remaining_letters, next_available_at, tier, status)
    VALUES (p_user_id, 4, v_now, 'free', 'active')
    RETURNING id, remaining_letters, next_available_at 
    INTO v_sub_id, v_remaining, v_next_available;
  END IF;

  -- Treat NULL remaining as 0 (safety)
  IF v_remaining IS NULL THEN
     v_remaining := 0;
  END IF;

  -- Check Quota
  IF v_remaining <= 0 THEN
    RETURN jsonb_build_object('error', 'Monthly letter quota exceeded', 'code', 'QUOTA_EXCEEDED');
  END IF;

  -- Check Cooldown (Handle NULL next_available_at as NOW)
  IF v_next_available IS NULL THEN
     v_next_available := v_now;
  END IF;

  IF v_now < v_next_available THEN
    RETURN jsonb_build_object('error', 'Cooldown active', 'code', 'COOLDOWN_ACTIVE', 'next_available_at', v_next_available);
  END IF;

  -- 3. Update Subscription
  UPDATE public.subscriptions
  SET remaining_letters = remaining_letters - 1,
      next_available_at = v_now + INTERVAL '1 day', -- 24h cooldown (plan-independent)
      updated_at = v_now_local -- Cast to proper type
  WHERE id = v_sub_id;

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
    'sent', -- Must match check constraint
    p_current_tothereon_day, 
    v_now_local -- Cast to proper type if column is TIMESTAMP
  ) RETURNING id INTO v_letter_id;

  RETURN jsonb_build_object('success', true, 'letter_id', v_letter_id, 'remaining', v_remaining - 1);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM, 'code', 'INTERNAL_ERROR');
END;
$$ LANGUAGE plpgsql;
