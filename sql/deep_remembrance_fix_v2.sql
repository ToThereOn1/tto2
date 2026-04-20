-- =====================================================
-- Fix V2 for Deep Remembrance Schema
-- Adds missing current_question_index column
-- =====================================================

DO $$
BEGIN
    -- Add current_question_index if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deep_remembrance_responses' AND column_name = 'current_question_index') THEN
        ALTER TABLE deep_remembrance_responses ADD COLUMN current_question_index INTEGER DEFAULT 0;
    END IF;

    -- Reload schema cache in Supabase (notify PostgREST)
    NOTIFY pgrst, 'reload config';
END $$;
