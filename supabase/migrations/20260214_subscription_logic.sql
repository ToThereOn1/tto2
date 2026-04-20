-- Add subscription logic columns
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS remaining_letters INTEGER DEFAULT 4,
ADD COLUMN IF NOT EXISTS next_available_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create a function to handle safe letter sending (deduct quota, set cooldown)
-- This ensures atomicity
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
BEGIN
  -- 1. Lock Subscription Row
  SELECT id, remaining_letters, next_available_at 
  INTO v_sub_id, v_remaining, v_next_available
  FROM public.subscriptions
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- 2. Checks
  IF v_sub_id IS NULL THEN
    RETURN jsonb_build_object('error', 'No subscription found', 'code', 'NO_SUB');
  END IF;

  -- Master account bypass (optional, can be done in app, but here for safety if we wanted strict DB rules)
  -- For now, we trust the APP to check master account and not call this function if it wants to bypass,
  -- OR we just enforce it even for master unless we add logic here.
  -- Let's stick to strict logic:
  
  IF v_remaining <= 0 THEN
    RETURN jsonb_build_object('error', 'Monthly letter quota exceeded', 'code', 'QUOTA_EXCEEDED');
  END IF;

  IF v_now < v_next_available THEN
    RETURN jsonb_build_object('error', 'Cooldown active', 'code', 'COOLDOWN_ACTIVE', 'next_available_at', v_next_available);
  END IF;

  -- 3. Update Subscription
  UPDATE public.subscriptions
  SET remaining_letters = remaining_letters - 1,
      next_available_at = v_now + INTERVAL '1 day', -- 24h cooldown (plan-independent)
      updated_at = v_now
  WHERE id = v_sub_id;

  -- 4. Insert Letter
  INSERT INTO public.letters (
    user_id, pet_id, content, font_style, photos, 
    sender_type, status, current_tothereon_day, created_at
  ) VALUES (
    p_user_id, p_pet_id, p_content, p_font_style, p_photos,
    'user', 'sent', p_current_tothereon_day, v_now
  ) RETURNING id INTO v_letter_id;

  RETURN jsonb_build_object('success', true, 'letter_id', v_letter_id, 'remaining', v_remaining - 1);
END;
$$ LANGUAGE plpgsql;
