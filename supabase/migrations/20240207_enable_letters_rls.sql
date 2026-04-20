-- Enable RLS logic (Safe to run multiple times)
ALTER TABLE letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE deep_remembrance_responses ENABLE ROW LEVEL SECURITY;

-- 1. Letters Table Policies
DROP POLICY IF EXISTS "Allow authenticated users to send letters" ON letters;
CREATE POLICY "Allow authenticated users to send letters"
ON letters FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow users to read letters for their pets" ON letters;
CREATE POLICY "Allow users to read letters for their pets"
ON letters FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM pets
    WHERE pets.id = letters.pet_id
    AND pets.user_id = auth.uid()
  )
);

-- 2. Pet Status Events Policies
DROP POLICY IF EXISTS "Allow users to insert events for their pets" ON pet_status_events;
CREATE POLICY "Allow users to insert events for their pets"
ON pet_status_events FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM pets
    WHERE pets.id = pet_status_events.pet_id
    AND pets.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Allow users to read events for their pets" ON pet_status_events;
CREATE POLICY "Allow users to read events for their pets"
ON pet_status_events FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM pets
    WHERE pets.id = pet_status_events.pet_id
    AND pets.user_id = auth.uid()
  )
);

-- 3. Pet Personas Policies
DROP POLICY IF EXISTS "Allow users to read their pet's persona" ON pet_personas;
CREATE POLICY "Allow users to read their pet's persona"
ON pet_personas FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM pets
    WHERE pets.id = pet_personas.pet_id
    AND pets.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Allow users to create persona" ON pet_personas;
CREATE POLICY "Allow users to create persona"
ON pet_personas FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM pets
    WHERE pets.id = pet_personas.pet_id
    AND pets.user_id = auth.uid()
  )
);

-- 4. Deep Remembrance Responses Policies
DROP POLICY IF EXISTS "Allow users to submit responses" ON deep_remembrance_responses;
CREATE POLICY "Allow users to submit responses"
ON deep_remembrance_responses FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM pets
    WHERE pets.id = deep_remembrance_responses.pet_id
    AND pets.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Allow users to read their responses" ON deep_remembrance_responses;
CREATE POLICY "Allow users to read their responses"
ON deep_remembrance_responses FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM pets
    WHERE pets.id = deep_remembrance_responses.pet_id
    AND pets.user_id = auth.uid()
  )
);
