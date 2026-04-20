-- Migration: Add thread_importance column to pet_status_events
-- Part of Causal Thread Decay (Phase 2, T2.1)
-- Values: 'high' | 'medium' | 'low' (default: 'medium')

ALTER TABLE pet_status_events
ADD COLUMN IF NOT EXISTS thread_importance TEXT DEFAULT 'medium';

COMMENT ON COLUMN pet_status_events.thread_importance IS 'Narrative thread importance for decay: high (carry 2 posts), medium (carry 1 post), low (natural decay)';
