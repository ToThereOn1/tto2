-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: pet_micro_events table
-- Purpose:   Template-based micro-events (no LLM cost, 6-8/day).
--            SEPARATE from pet_status_events to avoid contaminating LLM pipeline.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pet_micro_events (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id           UUID        NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    category         TEXT        NOT NULL
                                 CHECK (category IN (
                                     'atmosphere',
                                     'pet_action',
                                     'npc_sighting',
                                     'letter_echo',
                                     'world_ambient',
                                     'time_marker'
                                 )),
    template_id      TEXT        NOT NULL,
    content          TEXT        NOT NULL,
    zone             TEXT        NOT NULL,
    mood             TEXT,
    npc_involved     TEXT,
    time_of_day      TEXT        NOT NULL
                                 CHECK (time_of_day IN ('morning', 'afternoon', 'evening', 'night')),
    tothereon_day    INTEGER     NOT NULL,
    language         TEXT        NOT NULL DEFAULT 'en',
    metadata         JSONB       DEFAULT '{}',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── Indexes ─────────────────────────────────────────────────────────────────

-- Primary feed query: fetch micro-events for a pet in reverse chronological order
CREATE INDEX IF NOT EXISTS idx_micro_events_pet_created
    ON pet_micro_events(pet_id, created_at DESC);

-- Day-based queries: fetch all events for a specific ToThereOn day
CREATE INDEX IF NOT EXISTS idx_micro_events_pet_day
    ON pet_micro_events(pet_id, tothereon_day DESC);

-- Anti-repetition check: was this template used recently for this pet?
CREATE INDEX IF NOT EXISTS idx_micro_events_template
    ON pet_micro_events(pet_id, template_id, created_at DESC);

-- ─── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE pet_micro_events ENABLE ROW LEVEL SECURITY;

-- Guardians may read micro-events for their own pets (join through pets table)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can read their own pets micro events' AND tablename = 'pet_micro_events') THEN
    CREATE POLICY "Users can read their own pets micro events"
        ON pet_micro_events
        FOR SELECT
        USING (
            pet_id IN (
                SELECT id FROM pets WHERE user_id = auth.uid()
            )
        );
  END IF;
END $$;

-- All write operations are service_role only (no user-facing INSERT/UPDATE/DELETE)
-- service_role bypasses RLS by default; no explicit policy needed.
-- Explicitly block INSERT/UPDATE/DELETE for authenticated users:

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'No user insert on micro events' AND tablename = 'pet_micro_events') THEN
    CREATE POLICY "No user insert on micro events"
        ON pet_micro_events
        FOR INSERT
        WITH CHECK (false);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'No user update on micro events' AND tablename = 'pet_micro_events') THEN
    CREATE POLICY "No user update on micro events"
        ON pet_micro_events
        FOR UPDATE
        USING (false);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'No user delete on micro events' AND tablename = 'pet_micro_events') THEN
    CREATE POLICY "No user delete on micro events"
        ON pet_micro_events
        FOR DELETE
        USING (false);
  END IF;
END $$;
