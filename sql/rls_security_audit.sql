-- RLS Security Audit & Enforcement
-- 1. Enable RLS on all sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE letter_quota ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any to avoid conflicts (optional but recommended for clean slate)
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can view own pets" ON pets;
DROP POLICY IF EXISTS "Users can insert own pets" ON pets;
DROP POLICY IF EXISTS "Users can update own pets" ON pets;
DROP POLICY IF EXISTS "Users can delete own pets" ON pets;
DROP POLICY IF EXISTS "Users can view own letters" ON letters;
DROP POLICY IF EXISTS "Users can insert own letters" ON letters;
DROP POLICY IF EXISTS "Users can view own quota" ON letter_quota;
DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;

-- 3. Create strict Policies (auth.uid() = user_id)
-- Users
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Pets
CREATE POLICY "Users can view own pets" ON pets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pets" ON pets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pets" ON pets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pets" ON pets FOR DELETE USING (auth.uid() = user_id);

-- Letters
CREATE POLICY "Users can view own letters" ON letters FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own letters" ON letters FOR INSERT WITH CHECK (auth.uid() = user_id);
-- No update/delete for letters to preserve immutability and memory, except by admin

-- Letter Quota
CREATE POLICY "Users can view own quota" ON letter_quota FOR SELECT USING (auth.uid() = user_id);
-- Only system can update/insert quota

-- Subscriptions
CREATE POLICY "Users can view own subscriptions" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
-- Only webhook/system can update/insert subscriptions
