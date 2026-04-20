
-- Phase 8-3: Dynamic Forms Schema

-- 1. Pet Registration Schema
CREATE TABLE IF NOT EXISTS pet_registration_schema (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_name  TEXT NOT NULL UNIQUE, -- e.g., 'name', 'species', 'birth_date'
  label_kr    TEXT NOT NULL,
  label_en    TEXT NOT NULL,
  field_type  TEXT NOT NULL CHECK (field_type IN ('text', 'textarea', 'date', 'select', 'file', 'number')),
  is_required BOOLEAN DEFAULT FALSE,
  options     JSONB DEFAULT '[]'::jsonb, -- For select type: [{label: 'Dog', value: 'dog'}]
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE pet_registration_schema ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active schema" ON pet_registration_schema
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Admins full access pet_schema" ON pet_registration_schema
  FOR ALL TO authenticated
  USING (is_admin());


-- 2. Survey Questions
CREATE TABLE IF NOT EXISTS survey_questions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text_kr TEXT NOT NULL,
  question_text_en TEXT NOT NULL,
  type             TEXT NOT NULL CHECK (type IN ('text', 'choice', 'scale', 'yesno')),
  options          JSONB DEFAULT '[]'::jsonb, -- [{label: 'Yes', value: 'yes', score: 5}]
  category         TEXT DEFAULT 'general',
  order_index      INTEGER NOT NULL DEFAULT 0,
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active questions" ON survey_questions
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Admins full access survey_questions" ON survey_questions
  FOR ALL TO authenticated
  USING (is_admin());

-- Seed Initial Data for Pet Schema (Basic Fields)
INSERT INTO pet_registration_schema (field_name, label_kr, label_en, field_type, is_required, order_index)
VALUES 
('name', '이름', 'Name', 'text', true, 10),
('species', '종', 'Species', 'select', true, 20),
('breed', '품종', 'Breed', 'text', false, 30),
('passed_date', '떠난 날', 'Date of Passing', 'date', true, 40),
('image', '사진', 'Photo', 'file', true, 50)
ON CONFLICT (field_name) DO NOTHING;

-- Seed Initial Data for Survey (Sample)
INSERT INTO survey_questions (question_text_kr, question_text_en, type, category, order_index)
VALUES 
('아이는 평소에 어떤 성격이었나요?', 'What was your pet''s personality like?', 'choice', 'personality', 10),
('가장 기억에 남는 추억은 무엇인가요?', 'What is your most memorable moment?', 'text', 'memory', 20)
ON CONFLICT DO NOTHING;
