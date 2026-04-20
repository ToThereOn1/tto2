-- Causal Chain Engine: Add narrative continuity columns to pet_status_events
-- These columns allow each day's feed post to carry forward its narrative summary
-- and unresolved thread to the next day's LLM context.

ALTER TABLE pet_status_events
  ADD COLUMN IF NOT EXISTS narrative_summary TEXT,
  ADD COLUMN IF NOT EXISTS unresolved_thread TEXT;

COMMENT ON COLUMN pet_status_events.narrative_summary IS
  '1-sentence summary of what actually happened in this event (LLM-extracted via SUMMARY: directive). Max ~200 chars. Used as context for next day''s prompt.';

COMMENT ON COLUMN pet_status_events.unresolved_thread IS
  'The specific unresolved mystery/hook/open question from this event (last sentence). Max ~150 chars. Becomes tomorrow''s narrative starting point.';
