
-- Add missing response_id column to pet_personas
ALTER TABLE pet_personas
ADD COLUMN IF NOT EXISTS response_id UUID REFERENCES deep_remembrance_responses(id);
