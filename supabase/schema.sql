-- =====================================================
-- ToThereOn DATABASE SCHEMA v1.0
-- Run this in Supabase SQL Editor
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. USERS TABLE (extends Supabase auth.users)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'basic', 'premium')),
  subscription_start_date TIMESTAMP,
  max_pets_allowed INTEGER DEFAULT 2,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 2. PETS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  birth_date DATE,
  passed_date DATE NOT NULL,
  species TEXT NOT NULL CHECK (species IN ('dog', 'cat', 'rabbit', 'bird', 'hamster', 'other')),
  breed TEXT,
  weight_kg DECIMAL,
  gender TEXT CHECK (gender IN ('male', 'female')),
  photos TEXT[],  -- Array of Supabase Storage URLs
  relationship TEXT,  -- e.g., "mom", "dad", "friend", "sister", "brother"
  persona_generated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pets_user_id ON public.pets(user_id);

-- =====================================================
-- 3. SURVEY QUESTIONS TABLE (Admin editable)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.survey_questions (
  id SERIAL PRIMARY KEY,
  question_key TEXT UNIQUE NOT NULL,  -- e.g., "Q01", "Q02"
  section TEXT NOT NULL,
  input_type TEXT NOT NULL CHECK (input_type IN ('single_choice', 'multiple_choice', 'short_text', 'long_text', 'slider')),
  question_en TEXT NOT NULL,
  question_kr TEXT,
  choices_en TEXT[],
  choices_kr TEXT[],
  placeholder_en TEXT,
  placeholder_kr TEXT,
  help_text_en TEXT,
  help_text_kr TEXT,
  display_order INTEGER NOT NULL,
  scoring_dimension TEXT,  -- e.g., "social_energy", "curiosity_drive"
  scoring_map JSONB,  -- Maps choices to scores
  is_required BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 4. DEEP REMEMBRANCE RESPONSES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.deep_remembrance_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pet_id UUID UNIQUE REFERENCES public.pets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  responses JSONB NOT NULL DEFAULT '{}',
  current_question_index INTEGER DEFAULT 0,
  total_questions INTEGER DEFAULT 25,
  completion_percentage INTEGER DEFAULT 0,
  started_at TIMESTAMP DEFAULT NOW(),
  last_saved_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  time_spent_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_responses_pet_id ON public.deep_remembrance_responses(pet_id);
CREATE INDEX idx_responses_completion ON public.deep_remembrance_responses(completed_at);

-- =====================================================
-- 5. PET PERSONAS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pet_personas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pet_id UUID UNIQUE REFERENCES public.pets(id) ON DELETE CASCADE,
  response_id UUID REFERENCES public.deep_remembrance_responses(id),
  dimensional_scores JSONB NOT NULL,
  narrative_data JSONB NOT NULL,
  persona_profile JSONB NOT NULL,
  quality_score INTEGER NOT NULL CHECK (quality_score >= 0 AND quality_score <= 100),
  detail_richness INTEGER,
  emotional_authenticity INTEGER,
  behavioral_consistency INTEGER,
  narrative_depth INTEGER,
  generation_model TEXT DEFAULT 'claude-3-5-sonnet',
  generation_timestamp TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_personas_quality ON public.pet_personas(quality_score);

-- =====================================================
-- 6. NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('welcome', 'letter_status', 'new_event', 'subscription', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read);

-- =====================================================
-- 7. NOTIFICATION SETTINGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.notification_settings (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  email_letter_updates BOOLEAN DEFAULT TRUE,
  email_pet_events BOOLEAN DEFAULT TRUE,
  email_marketing BOOLEAN DEFAULT FALSE,
  in_app_sounds BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 8. PET STATUS EVENTS TABLE (Time Engine / Feed)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.pet_status_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE,
  tothereon_day INTEGER NOT NULL DEFAULT 0,
  event_type TEXT NOT NULL,
  event_title TEXT NOT NULL,
  event_description TEXT,
  zone TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_pet_status_events_pet ON public.pet_status_events(pet_id, tothereon_day);

-- =====================================================
-- 9. LETTERS TABLE (Mailbox System)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.letters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'pet')),
  content TEXT NOT NULL,
  status TEXT DEFAULT 'delivered',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_letters_pet ON public.letters(pet_id);
CREATE INDEX idx_letters_user ON public.letters(user_id);

-- =====================================================
-- 10. ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deep_remembrance_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.letters ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Pets policies
CREATE POLICY "Users can view own pets" ON public.pets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pets" ON public.pets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pets" ON public.pets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pets" ON public.pets FOR DELETE USING (auth.uid() = user_id);

-- Deep Remembrance responses policies
CREATE POLICY "Users can view own responses" ON public.deep_remembrance_responses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own responses" ON public.deep_remembrance_responses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own responses" ON public.deep_remembrance_responses FOR UPDATE USING (auth.uid() = user_id);

-- Pet personas policies
CREATE POLICY "Users can view own personas" ON public.pet_personas FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_personas.pet_id AND pets.user_id = auth.uid()));

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Notification settings policies
CREATE POLICY "Users can view own settings" ON public.notification_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON public.notification_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON public.notification_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Pet status events policies
CREATE POLICY "Users can view events for their pets" ON public.pet_status_events FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_status_events.pet_id AND pets.user_id = auth.uid()));
CREATE POLICY "Users can insert events for their pets" ON public.pet_status_events FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.pets WHERE pets.id = pet_status_events.pet_id AND pets.user_id = auth.uid()));

-- Letters policies
CREATE POLICY "Users can view letters for their pets" ON public.letters FOR SELECT 
  USING (auth.uid() = user_id);
CREATE POLICY "Users can insert letters" ON public.letters FOR INSERT 
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.pets WHERE pets.id = letters.pet_id AND pets.user_id = auth.uid()));

-- Survey questions are public read
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active questions" ON public.survey_questions FOR SELECT USING (is_active = true);

-- =====================================================
-- 9. TRIGGERS FOR AUTO-UPDATING updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pets_updated_at BEFORE UPDATE ON public.pets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_personas_updated_at BEFORE UPDATE ON public.pet_personas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 10. FUNCTION: Create user profile on auth signup
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create user profile
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
