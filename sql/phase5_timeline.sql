-- Phase 5: Time Engine - Pet Timeline Tracking

-- 1. Create pet_timelines table
CREATE TABLE IF NOT EXISTS pet_timelines (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pet_id              UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  current_day         INTEGER NOT NULL DEFAULT 1,
  current_zone        TEXT NOT NULL DEFAULT 'Rainbow Bridge Gate',
  last_calculated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_pet_timeline UNIQUE (pet_id)
);

-- 2. Add RLS policies
ALTER TABLE pet_timelines ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own pets' timelines
CREATE POLICY "Users can view own pet timelines"
  ON pet_timelines FOR SELECT
  USING (
    exists (
      select 1 from pets
      where pets.id = pet_timelines.pet_id
      and pets.user_id = auth.uid()
    )
  );

-- Allow system/service_role to manage timelines (usually via server-side code)
-- Note: Service role bypasses RLS, but if using client SDK with user token, this policy is needed for updates if logic is client-side.
-- However, timeline updates should seemingly happen server-side (cron or API). 
-- We'll add a policy for user updates just in case, or rely on service role for critical updates.
