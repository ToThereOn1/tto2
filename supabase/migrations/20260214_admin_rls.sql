
-- Enable Admins to see ALL Pets and Letters
-- (Existing policies might restrict to "own" data)

-- 1. Policies for PETS
DROP POLICY IF EXISTS "Admins can do everything on pets" ON public.pets;
CREATE POLICY "Admins can do everything on pets" ON public.pets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid())
  );

-- 2. Policies for LETTERS
DROP POLICY IF EXISTS "Admins can do everything on letters" ON public.letters;
CREATE POLICY "Admins can do everything on letters" ON public.letters
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid())
  );

-- 3. Ensure Admin User exists (Self-healing for dev)
-- Replace with your actual admin UUID if known, or insert current user if strictly needed.
-- For now, we assume the user is already in admin_users or will add themselves.
