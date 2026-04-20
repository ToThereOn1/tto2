-- ============================================================
-- Deep Remembrance v2.0 Migration
-- 실행 위치: Supabase SQL Editor
-- ============================================================

-- 1. survey_questions 테이블에 새 컬럼 추가
-- (이미 존재하면 무시)
ALTER TABLE survey_questions
ADD COLUMN IF NOT EXISTS allow_multiple BOOLEAN DEFAULT false;

ALTER TABLE survey_questions
ADD COLUMN IF NOT EXISTS has_other_option BOOLEAN DEFAULT true;

ALTER TABLE survey_questions
ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '[]'::jsonb;

ALTER TABLE survey_questions
ADD COLUMN IF NOT EXISTS question_text_kr TEXT;

ALTER TABLE survey_questions
ADD COLUMN IF NOT EXISTS question_text_en TEXT;

ALTER TABLE survey_questions
ADD COLUMN IF NOT EXISTS help_text_kr TEXT;

ALTER TABLE survey_questions
ADD COLUMN IF NOT EXISTS help_text_en TEXT;

ALTER TABLE survey_questions
ADD COLUMN IF NOT EXISTS question_key VARCHAR(10);

-- 2. pet_personas 테이블에 새 컬럼 추가
ALTER TABLE pet_personas
ADD COLUMN IF NOT EXISTS persona_analysis JSONB;

ALTER TABLE pet_personas
ADD COLUMN IF NOT EXISTS system_prompt TEXT;

ALTER TABLE pet_personas
ADD COLUMN IF NOT EXISTS confidence_score INTEGER;

ALTER TABLE pet_personas
ADD COLUMN IF NOT EXISTS data_quality VARCHAR(10);

ALTER TABLE pet_personas
ADD COLUMN IF NOT EXISTS analysis_version VARCHAR(10) DEFAULT '2.0';

ALTER TABLE pet_personas
ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMPTZ DEFAULT NOW();

-- 3. survey_questions에 복수 선택 가능 질문 표시
-- Q05, Q10, Q11, Q12, Q14
UPDATE survey_questions
SET allow_multiple = true
WHERE question_key IN ('Q05', 'Q10', 'Q11', 'Q12', 'Q14');

-- 4. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_pet_personas_pet_id ON pet_personas(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_personas_analysis_version ON pet_personas(analysis_version);
CREATE INDEX IF NOT EXISTS idx_survey_questions_question_key ON survey_questions(question_key);

-- ============================================================
-- 완료 확인
-- ============================================================
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'pet_personas';
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'survey_questions';
