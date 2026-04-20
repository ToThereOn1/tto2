
-- Add metadata column to pets table to support dynamic registration fields
ALTER TABLE pets 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Comment on column
COMMENT ON COLUMN pets.metadata IS 'Stores dynamic registration fields defined in pet_registration_schema';
