-- Add visual_description column to pets table for Visual DNA System
ALTER TABLE pets 
ADD COLUMN IF NOT EXISTS visual_description TEXT;

-- Comment on column
COMMENT ON COLUMN pets.visual_description IS 'Permanent visual prompt for character consistency (Visual DNA)';
