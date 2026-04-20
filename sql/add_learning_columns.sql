-- Migration: Add Learning Progression columns (v3.0)
-- Run in Supabase SQL Editor

-- pets 테이블: 학습 관련 컬럼 추가
ALTER TABLE pets
ADD COLUMN IF NOT EXISTS intelligence_score INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS learning_speed VARCHAR(20) DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS writing_mastery_day INTEGER,
ADD COLUMN IF NOT EXISTS learning_completed BOOLEAN DEFAULT FALSE;

-- pet_status_events 테이블: 이벤트 상세 컬럼 추가
ALTER TABLE pet_status_events
ADD COLUMN IF NOT EXISTS location VARCHAR(100),
ADD COLUMN IF NOT EXISTS npc_involved VARCHAR(100),
ADD COLUMN IF NOT EXISTS is_learning_event BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS learning_stage VARCHAR(50);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_events_pet_day ON pet_status_events(pet_id, tothereon_day);
CREATE INDEX IF NOT EXISTS idx_events_learning ON pet_status_events(is_learning_event) WHERE is_learning_event = TRUE;
