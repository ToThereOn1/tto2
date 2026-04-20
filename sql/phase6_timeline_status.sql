-- Phase 6: Integrated Timeline - Pet Status Feed

-- 1. Create pet_statuses table
CREATE TABLE IF NOT EXISTS pet_statuses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pet_id      UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL CHECK (event_type IN ('daily_life', 'thought', 'activity', 'sleep', 'weather')),
  title       TEXT, -- Short summary
  description TEXT, -- Full content
  zone        TEXT, -- Where this happened
  image_url   TEXT, -- Optional image
  metadata    JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add RLS policies
ALTER TABLE pet_statuses ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own pets' statuses
CREATE POLICY "Users can view own pet statuses"
  ON pet_statuses FOR SELECT
  USING (
    exists (
      select 1 from pets
      where pets.id = pet_statuses.pet_id
      and pets.user_id = auth.uid()
    )
  );

-- Allow system to insert statuses (service role)
-- User cannot insert statuses directly usually, strictly via backend logic.
