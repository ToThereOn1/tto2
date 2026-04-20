
-- Fix for "column reference pet_id is ambiguous" error in get_pending_reviews RPC

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
