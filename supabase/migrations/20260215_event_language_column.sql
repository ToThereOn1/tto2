-- Add event_language column to pet_status_events table
ALTER TABLE pet_status_events 
ADD COLUMN IF NOT EXISTS event_language VARCHAR(50) DEFAULT 'English';

-- Comment on column
COMMENT ON COLUMN pet_status_events.event_language IS 'Language used for the generated event content (e.g., English, Korean, Japanese)';
