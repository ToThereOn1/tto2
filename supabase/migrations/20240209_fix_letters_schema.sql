-- =====================================================
-- ToThereOn Database Schema Fix Migration
-- Run this in Supabase SQL Editor to sync schema
-- =====================================================

-- 1. Add missing updated_at column to letters table
ALTER TABLE public.letters 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 2. Create trigger to auto-update updated_at on letters
DROP TRIGGER IF EXISTS update_letters_updated_at ON public.letters;
CREATE TRIGGER update_letters_updated_at 
  BEFORE UPDATE ON public.letters
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Verify letters table structure
-- Run this to confirm columns:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'letters';

-- 4. Update existing letters to have updated_at value
UPDATE public.letters 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- 5. Check RPC function exists (if not, create it)
CREATE OR REPLACE FUNCTION simulate_time_passage_for_letters()
RETURNS void AS $$
BEGIN
  UPDATE letters
  SET 
    created_at = created_at - INTERVAL '1 day',
    updated_at = NOW()
  WHERE status IN ('sent', 'arrived_tothereon', 'delivered', 'writing_reply');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION simulate_time_passage_for_letters() TO authenticated;
