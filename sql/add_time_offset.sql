
-- Add time_offset_hours to pets table for Time Warp feature
ALTER TABLE pets 
ADD COLUMN IF NOT EXISTS time_offset_hours INTEGER DEFAULT 0;

-- Comment
COMMENT ON COLUMN pets.time_offset_hours IS 'Offset in hours to simulate time passing for this pet (Admin Feature)';
