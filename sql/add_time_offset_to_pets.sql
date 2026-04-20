-- Add time_offset_hours column to pets table
ALTER TABLE pets 
ADD COLUMN IF NOT EXISTS time_offset_hours INTEGER DEFAULT 0;

-- Comment on column
COMMENT ON COLUMN pets.time_offset_hours IS 'Offset in hours to simulate time passing for this pet (Admin Feature)';
