
-- 1. Backfill 'direction' for existing letters
-- If a letter doesn't have a direction, assume it's 'user_to_pet' (since that was the only type before)
UPDATE letters 
SET direction = 'user_to_pet' 
WHERE direction IS NULL;

-- 2. Verify Admin Access
-- Ensure the current user is in admin_users.
-- Since we can't easily get "current user" in a raw SQL script without context,
-- we will just make the policy more permissive for testing OR ask user to insert their ID.

-- ALTERNATELY: Allow 'service_role' or specific UUIDs if known.
-- But for now, let's fix the data first. 

-- 3. Verify 'sender_type'
UPDATE letters
SET sender_type = 'user'
WHERE sender_type IS NULL;
