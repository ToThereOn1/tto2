
-- Allow Admins to View All Letters and Pets

-- 1. Policy for Letters
-- Ensure RLS is enabled
ALTER TABLE letters ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists to avoid conflicts (or use IF NOT EXISTS if supported, but DROP is safer here)
DROP POLICY IF EXISTS "Admins can view all letters" ON letters;

CREATE POLICY "Admins can view all letters"
  ON letters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid()
    )
  );

-- 2. Policy for Pets (Admins need to see pets to select them)
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all pets" ON pets;

CREATE POLICY "Admins can view all pets"
  ON pets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE id = auth.uid()
    )
  );

-- 3. Policy for Users (Admins need to see user list)
-- Note: 'users' table is usually auth.users which we can't easily policy, 
-- but if there is a public profile table 'users' or 'public_users', we apply it there.
-- Assuming 'users' table exists as per earlier context (users_view or similar).
-- If it's a view, RLS depends on underlying tables.

-- Verification: Grant select on letters/pets to authenticated users is risky, 
-- so we rely strictly on the "Admins can..." rule above.
