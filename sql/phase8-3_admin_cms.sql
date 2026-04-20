
-- Phase 8-3: Admin CMS & Data Wiring

-- 1. Create `admin_configs` table for JSON-based CMS
CREATE TABLE IF NOT EXISTS admin_configs (
  key         TEXT PRIMARY KEY, -- e.g., 'worldview', 'npc_list', 'checklist'
  type        TEXT NOT NULL,    -- e.g., 'worldview', 'npc', 'checklist'
  config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by  UUID REFERENCES auth.users(id)
);

-- RLS: Only Admins can view/edit
ALTER TABLE admin_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view configs" ON admin_configs
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can update configs" ON admin_configs
  FOR ALL TO authenticated
  USING (is_admin());

-- 2. RPC to get Pending Reviews with Join
-- Returns: reply_id, reply_content, pet_name, pet_id, user_email, original_letter_content
CREATE OR REPLACE FUNCTION get_pending_reviews()
RETURNS TABLE (
  reply_id UUID,
  reply_content TEXT,
  reply_created_at TIMESTAMPTZ,
  pet_id UUID,
  pet_name TEXT,
  user_email TEXT, -- We will try to fetch from auth.users, requires SECURITY DEFINER
  original_content TEXT,
  original_created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id AS reply_id,
    r.content AS reply_content,
    r.created_at AS reply_created_at,
    p.id AS pet_id,
    p.name AS pet_name,
    au.email::text AS user_email,
    o.content AS original_content,
    o.created_at AS original_created_at
  FROM letters r
  JOIN pets p ON r.pet_id = p.id
  JOIN auth.users au ON r.user_id = au.id
  LEFT JOIN LATERAL (
    SELECT content, created_at
    FROM letters 
    WHERE pet_id = r.pet_id 
      AND direction = 'user_to_pet' 
      AND created_at < r.created_at 
    ORDER BY created_at DESC 
    LIMIT 1
  ) o ON true
  WHERE r.direction = 'pet_to_user'
    AND r.status = 'pending_review'
  ORDER BY r.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- SECURITY DEFINER allows accessing auth.users inside the function
