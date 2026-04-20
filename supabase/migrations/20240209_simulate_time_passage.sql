-- Migration: Add time simulation function for admin testing
-- This function ages all active letters by 24 hours each time it's called
-- SECURITY DEFINER: Bypasses RLS to allow admin to update all users' letters

DROP FUNCTION IF EXISTS simulate_time_passage_for_letters();

CREATE OR REPLACE FUNCTION simulate_time_passage_for_letters()
RETURNS void AS $$
BEGIN
  -- Age all in-progress letters by 24 hours
  -- This allows testing the status workflow without waiting real time
  -- RLS is bypassed via SECURITY DEFINER to allow admin access to all letters
  -- NOTE: Using created_at as the time reference (sent_at column does not exist)
  UPDATE letters
  SET 
    created_at = created_at - INTERVAL '1 day',
    updated_at = NOW()
  WHERE status IN ('sent', 'arrived_tothereon', 'delivered', 'writing_reply');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (admin check happens in API)
GRANT EXECUTE ON FUNCTION simulate_time_passage_for_letters() TO authenticated;

COMMENT ON FUNCTION simulate_time_passage_for_letters() IS 
'Admin function to simulate time passage for letter status workflow testing. 
Each call ages all active letters by 24 hours. SECURITY DEFINER bypasses RLS.';
