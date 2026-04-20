-- Comprehensive Fix for Letters Table Schema
-- This script Re-Creates the table to ensure all columns exist correctly.

-- 1. Reset Table (Drop if exists to fix schema mismatch)
DROP TABLE IF EXISTS letters CASCADE;

-- 2. Create Table correctly
CREATE TABLE letters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- The human owner
    sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'pet')),
    content TEXT NOT NULL,
    status TEXT DEFAULT 'delivered',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 3. Enable RLS
ALTER TABLE letters ENABLE ROW LEVEL SECURITY;

-- 4. Policies

-- Allow owner to insert (send/save letters)
CREATE POLICY "Users can insert letters for their pets"
ON letters FOR INSERT
WITH CHECK (
    auth.uid() = user_id AND 
    EXISTS (SELECT 1 FROM pets WHERE id = pet_id AND user_id = auth.uid())
);

-- Allow owner to view letters
CREATE POLICY "Users can view letters for their pets"
ON letters FOR SELECT
USING (
    auth.uid() = user_id
);

-- Grant access to authenticated users
GRANT ALL ON letters TO authenticated;
GRANT ALL ON letters TO service_role;
