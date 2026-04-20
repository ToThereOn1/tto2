-- =====================================================
-- Full Fix for Deep Remembrance Schema
-- Safely adds missing columns to existing tables
-- =====================================================

DO $$
BEGIN
    -- 1. Fix 'deep_remembrance_responses' table
    
    -- Add completed_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deep_remembrance_responses' AND column_name = 'completed_at') THEN
        ALTER TABLE deep_remembrance_responses ADD COLUMN completed_at TIMESTAMPTZ;
    END IF;

    -- Add last_saved_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deep_remembrance_responses' AND column_name = 'last_saved_at') THEN
        ALTER TABLE deep_remembrance_responses ADD COLUMN last_saved_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- Add time_spent_seconds
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deep_remembrance_responses' AND column_name = 'time_spent_seconds') THEN
        ALTER TABLE deep_remembrance_responses ADD COLUMN time_spent_seconds INTEGER DEFAULT 0;
    END IF;

    -- Add total_questions
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deep_remembrance_responses' AND column_name = 'total_questions') THEN
        ALTER TABLE deep_remembrance_responses ADD COLUMN total_questions INTEGER NOT NULL DEFAULT 25;
    END IF;
    
    -- Add completion_percentage
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deep_remembrance_responses' AND column_name = 'completion_percentage') THEN
        ALTER TABLE deep_remembrance_responses ADD COLUMN completion_percentage INTEGER NOT NULL DEFAULT 0;
    END IF;

    -- Add responses
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deep_remembrance_responses' AND column_name = 'responses') THEN
        ALTER TABLE deep_remembrance_responses ADD COLUMN responses JSONB NOT NULL DEFAULT '{}';
    END IF;

    -- Add current_question_index
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deep_remembrance_responses' AND column_name = 'current_question_index') THEN
        ALTER TABLE deep_remembrance_responses ADD COLUMN current_question_index INTEGER NOT NULL DEFAULT 0;
    END IF;


    -- 2. Fix 'pet_personas' table
    -- This addresses the "column 'quality_score' does not exist" error
    
    -- Add quality_score
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pet_personas' AND column_name = 'quality_score') THEN
        ALTER TABLE pet_personas ADD COLUMN quality_score INTEGER NOT NULL DEFAULT 0;
    END IF;

    -- Add detail_richness
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pet_personas' AND column_name = 'detail_richness') THEN
        ALTER TABLE pet_personas ADD COLUMN detail_richness INTEGER;
    END IF;

    -- Add emotional_authenticity
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pet_personas' AND column_name = 'emotional_authenticity') THEN
        ALTER TABLE pet_personas ADD COLUMN emotional_authenticity INTEGER;
    END IF;

    -- Add behavioral_consistency
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pet_personas' AND column_name = 'behavioral_consistency') THEN
        ALTER TABLE pet_personas ADD COLUMN behavioral_consistency INTEGER;
    END IF;

    -- Add narrative_depth
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pet_personas' AND column_name = 'narrative_depth') THEN
        ALTER TABLE pet_personas ADD COLUMN narrative_depth INTEGER;
    END IF;

    -- Add generation_model
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pet_personas' AND column_name = 'generation_model') THEN
        ALTER TABLE pet_personas ADD COLUMN generation_model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514';
    END IF;

    -- Add generation_timestamp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pet_personas' AND column_name = 'generation_timestamp') THEN
        ALTER TABLE pet_personas ADD COLUMN generation_timestamp TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- 3. Safely Create Indexes
    -- idx_drr_completed
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_drr_completed') THEN
        CREATE INDEX idx_drr_completed ON deep_remembrance_responses(completed_at) WHERE completed_at IS NOT NULL;
    END IF;

    -- idx_personas_quality
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_personas_quality') THEN
        CREATE INDEX idx_personas_quality ON pet_personas(quality_score);
    END IF;

    -- Notify PostgREST to reload schema
    NOTIFY pgrst, 'reload config';

END $$;
