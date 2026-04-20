
-- Final Fix for Letters Schema and RPC
-- Addresses:
-- 1. "column l_sub.direction does not exist" -> Ensures direction column exists
-- 2. "structure of query does not match function result type" -> Casts timestamps to TIMESTAMPTZ explicitly

-- A. Fix Table Schema
-- Ensure 'direction' exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'letters' AND column_name = 'direction') THEN
        ALTER TABLE letters ADD COLUMN direction TEXT CHECK (direction IN ('user_to_pet', 'pet_to_user'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'letters' AND column_name = 'sender_type') THEN
        ALTER TABLE letters ADD COLUMN sender_type TEXT CHECK (sender_type IN ('user', 'pet'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'letters' AND column_name = 'status') THEN
        ALTER TABLE letters ADD COLUMN status TEXT DEFAULT 'unread';
    END IF;
    
    -- Ensure created_at is TIMESTAMPTZ (or just handle it in RPC)
    -- We can try to alter it, but casting in RPC is safer if table has data
    -- ALTER TABLE letters ALTER COLUMN created_at TYPE TIMESTAMPTZ; 
END $$;

-- B. Re-create RPC with EXPLICIT CASTS to avoid type mismatch errors
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
    r.created_at::TIMESTAMPTZ, -- Explicitly cast to match RETURNS logic
    p.id,
    p.name,
    au.email::text,
    o.content,
    o.created_at::TIMESTAMPTZ -- Explicitly cast
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
