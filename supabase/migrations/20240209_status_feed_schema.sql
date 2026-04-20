-- =====================================================
-- Module 08: Emotional Status Feed - Schema Update
-- Run this in Supabase SQL Editor
-- =====================================================

-- Add new columns to pet_status_events for emotional feed
ALTER TABLE pet_status_events 
ADD COLUMN IF NOT EXISTS mood TEXT,           -- 감정 상태 (longing, joyful, peaceful, playful, nostalgic)
ADD COLUMN IF NOT EXISTS image_url TEXT,      -- 추후 이미지용
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';  -- 페르소나 키워드 저장

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_pet_status_events_mood ON pet_status_events(mood);

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'pet_status_events';
