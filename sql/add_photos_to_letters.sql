
-- Add photos column to letters if missing
ALTER TABLE letters
ADD COLUMN IF NOT EXISTS photos TEXT[];
