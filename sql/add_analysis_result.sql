
-- Add analysis_result column to letters if missing
ALTER TABLE letters
ADD COLUMN IF NOT EXISTS analysis_result JSONB;
