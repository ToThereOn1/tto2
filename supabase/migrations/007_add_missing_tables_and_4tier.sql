-- =====================================================
-- MIGRATION 007: Add missing tables + Update to 4-tier pricing
-- MODULE_10 기준: free / basic / standard / premium
-- =====================================================

-- 1. UPDATE users subscription_tier to 4-tier
-- (기존: free/basic/premium → 신규: free/basic/standard/premium)
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_subscription_tier_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_subscription_tier_check
  CHECK (subscription_tier IN ('free', 'basic', 'standard', 'premium'));

-- =====================================================
-- 2. SUBSCRIPTIONS TABLE (MODULE_10 - Lemon Squeezy)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  lemon_squeezy_subscription_id TEXT UNIQUE,
  lemon_squeezy_customer_id TEXT,
  tier TEXT CHECK (tier IN ('free', 'basic', 'standard', 'premium')) DEFAULT 'free',
  status TEXT CHECK (status IN ('active', 'past_due', 'cancelled', 'expired', 'trialing')) DEFAULT 'active',
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);

-- =====================================================
-- 3. PAYMENT HISTORY TABLE (MODULE_10)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.payment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  lemon_squeezy_order_id TEXT,
  amount_usd DECIMAL(10, 2),
  currency TEXT DEFAULT 'USD',
  status TEXT CHECK (status IN ('paid', 'failed', 'refunded')),
  receipt_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_history_user ON public.payment_history(user_id);

-- =====================================================
-- 4. TOTHEREON TIMELINE TABLE (MODULE_07 - Time Engine)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tothereon_timeline (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pet_id UUID UNIQUE REFERENCES public.pets(id) ON DELETE CASCADE,
  tothereon_start_date TIMESTAMP NOT NULL,
  current_tothereon_day INTEGER DEFAULT 0,
  last_event_tothereon_day INTEGER DEFAULT 0,
  last_calculated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timeline_pet ON public.tothereon_timeline(pet_id);

-- =====================================================
-- 5. TOTHEREON ZONES TABLE (MODULE_07)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tothereon_zones (
  id SERIAL PRIMARY KEY,
  zone_key TEXT UNIQUE NOT NULL,
  zone_name_en TEXT NOT NULL,
  zone_name_kr TEXT,
  zone_description_en TEXT,
  typical_events JSONB,
  is_active BOOLEAN DEFAULT TRUE
);

-- Seed default zones
INSERT INTO public.tothereon_zones (zone_key, zone_name_en, zone_name_kr, zone_description_en, typical_events)
VALUES
  ('rainbow_valley', 'Rainbow Valley', '무지개 계곡', 'Welcome hub where new pets arrive',
   '["arrival", "first_exploration", "meeting_guide"]'::jsonb),
  ('eternity_forest', 'Eternity Forest', '영원의 숲', 'Social commons for play and interaction',
   '["play", "npc_interaction", "friendship"]'::jsonb),
  ('memory_village', 'Memory Village', '추억 마을', 'Personal space with familiar comforts',
   '["reflection", "guardian_thought", "daily_life"]'::jsonb),
  ('peaceful_sanctuary', 'Peaceful Sanctuary', '안식의 성소', 'Serene area for rest and peace',
   '["meditation", "milestone", "zone_change"]'::jsonb)
ON CONFLICT (zone_key) DO NOTHING;

-- =====================================================
-- 6. ADMIN USERS TABLE (MODULE_09)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY REFERENCES public.users(id),
  role TEXT CHECK (role IN ('super_admin', 'moderator')) NOT NULL,
  granted_at TIMESTAMP DEFAULT NOW(),
  granted_by UUID REFERENCES public.admin_users(id)
);

-- =====================================================
-- 7. ADMIN CONFIGS TABLE (MODULE_09)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.admin_configs (
  id SERIAL PRIMARY KEY,
  config_type TEXT NOT NULL,  -- 'worldview', 'npc', 'checklist'
  config_data JSONB NOT NULL,
  version TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES public.admin_users(id)
);

CREATE INDEX IF NOT EXISTS idx_admin_configs_type ON public.admin_configs(config_type, is_active);

-- =====================================================
-- 8. LETTER WORKFLOW LOG TABLE (MODULE_05)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.letter_workflow_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  letter_id UUID REFERENCES public.letters(id) ON DELETE CASCADE,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  changed_by TEXT,  -- 'system', 'admin', 'cron'
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_log_letter ON public.letter_workflow_log(letter_id);

-- =====================================================
-- 9. LLM USAGE LOG TABLE (MODULE_09 Analytics)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.llm_usage_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id),
  pet_id UUID REFERENCES public.pets(id),
  task_type TEXT NOT NULL,  -- 'persona', 'letter', 'event', 'qa'
  model_used TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd DECIMAL(10, 6),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_llm_usage_user ON public.llm_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_llm_usage_task ON public.llm_usage_log(task_type);

-- =====================================================
-- 10. UPDATE letters TABLE - extend status options (MODULE_05)
-- =====================================================
ALTER TABLE public.letters
  DROP CONSTRAINT IF EXISTS letters_status_check;
ALTER TABLE public.letters
  ADD CONSTRAINT letters_status_check
  CHECK (status IN ('draft', 'sent', 'arrived_tothereon', 'delivered',
                     'writing_reply', 'pending_review', 'approved', 'read'));

-- Add missing columns to letters
ALTER TABLE public.letters ADD COLUMN IF NOT EXISTS subject TEXT;
ALTER TABLE public.letters ADD COLUMN IF NOT EXISTS photos TEXT[];
ALTER TABLE public.letters ADD COLUMN IF NOT EXISTS font_style TEXT DEFAULT 'sans-serif';
ALTER TABLE public.letters ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP;
ALTER TABLE public.letters ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP;
ALTER TABLE public.letters ADD COLUMN IF NOT EXISTS current_tothereon_day INTEGER;
ALTER TABLE public.letters ADD COLUMN IF NOT EXISTS model_used TEXT;
ALTER TABLE public.letters ADD COLUMN IF NOT EXISTS generation_cost_usd DECIMAL(10, 4);
ALTER TABLE public.letters ADD COLUMN IF NOT EXISTS regeneration_count INTEGER DEFAULT 0;

-- =====================================================
-- 11. RLS POLICIES for new tables
-- =====================================================
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tothereon_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tothereon_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.letter_workflow_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_usage_log ENABLE ROW LEVEL SECURITY;

-- Users can view own subscription
CREATE POLICY "Users can view own subscription" ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can view own payment history
CREATE POLICY "Users can view own payments" ON public.payment_history
  FOR SELECT USING (auth.uid() = user_id);

-- Users can view timeline for their pets
CREATE POLICY "Users can view own timeline" ON public.tothereon_timeline
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.pets WHERE pets.id = tothereon_timeline.pet_id AND pets.user_id = auth.uid()
  ));

-- Zones are public read
CREATE POLICY "Anyone can view zones" ON public.tothereon_zones
  FOR SELECT USING (true);

-- Admin only policies
CREATE POLICY "Admins can view admin_users" ON public.admin_users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view configs" ON public.admin_configs
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.admin_users WHERE id = auth.uid()
  ));

-- Letter workflow log - viewable by letter owner
CREATE POLICY "Users can view own letter logs" ON public.letter_workflow_log
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.letters WHERE letters.id = letter_workflow_log.letter_id AND letters.user_id = auth.uid()
  ));

-- LLM usage - admin only
CREATE POLICY "Admins can view llm usage" ON public.llm_usage_log
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.admin_users WHERE id = auth.uid()
  ));

-- =====================================================
-- 12. FUNCTION: increment_letters_sent (MODULE_10 quota)
-- =====================================================
CREATE OR REPLACE FUNCTION increment_letters_sent(p_user_id UUID, p_month TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE letter_quota
  SET letters_sent = letters_sent + 1,
      updated_at = NOW()
  WHERE user_id = p_user_id
    AND month = p_month;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 13. TRIGGERS for new tables
-- =====================================================
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
