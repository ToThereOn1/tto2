
-- Phase 8: Admin Panel Security

-- 1. Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('super_admin', 'moderator')),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add RLS policies
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Allow admins to view themselves
CREATE POLICY "Admins can view own data"
  ON admin_users FOR SELECT
  USING (auth.uid() = id);

-- 3. Function to check if user is admin (for RLS or simplified checks)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Initial Super Admin Insert (Executed)
INSERT INTO admin_users (id, email, role)
VALUES ('6b6f6a54-580d-4d2d-bb93-1305f33c1487', 'admin@tothereon.com', 'super_admin')
ON CONFLICT (id) DO NOTHING;
