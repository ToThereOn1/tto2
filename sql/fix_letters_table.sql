
-- Fix Letters Table Schema
-- 1. Ensure 'direction' column exists
-- 2. Ensure references are correct
-- 3. Re-create RPC for pending reviews

-- 1. Add direction column if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'letters' AND column_name = 'direction') THEN
        ALTER TABLE letters ADD COLUMN direction TEXT CHECK (direction IN ('user_to_pet', 'pet_to_user'));
        -- Set default for existing rows if any intuition exists, or leave null
        -- Assuming existing rows might be user letters?
        -- UPDATE letters SET direction = 'user_to_pet' WHERE direction IS NULL; 
    END IF;
END $$;

-- 2. Ensure other columns exist (just in case)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'letters' AND column_name = 'sender_type') THEN
        ALTER TABLE letters ADD COLUMN sender_type TEXT CHECK (sender_type IN ('user', 'pet'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'letters' AND column_name = 'content') THEN
        ALTER TABLE letters ADD COLUMN content TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'letters' AND column_name = 'status') THEN
        ALTER TABLE letters ADD COLUMN status TEXT DEFAULT 'unread'; 
    END IF;
END $$;

-- 3. Index for performance
CREATE INDEX IF NOT EXISTS idx_letters_pet_created ON letters(pet_id, created_at);
CREATE INDEX IF NOT EXISTS idx_letters_status_direction ON letters(status, direction);

-- 4. Re-create RPC with safe referencing
CREATE OR REPLACE FUNCTION get_pending_reviews()
RETURNS TABLE (
  reply_id UUID,
  reply_content TEXT,
  reply_created_at TIMESTAMPTZ,
  pet_id UUID,
  pet_name TEXT,
  user_email TEXT,
  original_content TEXT,
  original_created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.content,
    r.created_at,
    p.id,
    p.name,
    au.email::text,
    o.content,
    o.created_at
  FROM letters r
  JOIN pets p ON r.pet_id = p.id
  JOIN auth.users au ON r.user_id = au.id
  LEFT JOIN LATERAL (
    SELECT l_sub.content, l_sub.created_at
    FROM letters l_sub
    WHERE l_sub.pet_id = r.pet_id 
      AND l_sub.direction = 'user_to_pet' 
      AND l_sub.created_at < r.created_at 
    ORDER BY l_sub.created_at DESC 
    LIMIT 1
  ) o ON true
  WHERE r.direction = 'pet_to_user'
    AND r.status = 'pending_review'
  ORDER BY r.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
