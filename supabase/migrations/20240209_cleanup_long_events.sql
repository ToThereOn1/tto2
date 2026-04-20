-- =====================================================
-- Cleanup: Remove incorrectly long events (letter bodies)
-- Run this in Supabase SQL Editor
-- =====================================================

-- View what will be deleted (preview first)
SELECT id, pet_id, event_type, LENGTH(event_description) as length, 
       LEFT(event_description, 50) as preview
FROM pet_status_events 
WHERE LENGTH(event_description) > 300;

-- Delete long text events (letter bodies copied by mistake)
DELETE FROM pet_status_events 
WHERE LENGTH(event_description) > 300;

-- Verify cleanup
SELECT COUNT(*) as remaining_events, 
       AVG(LENGTH(event_description)) as avg_length
FROM pet_status_events;
