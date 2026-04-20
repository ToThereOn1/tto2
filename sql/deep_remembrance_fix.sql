-- =====================================================
-- Fix for Deep Remembrance Schema (Dynamic SQL Version)
-- Adds missing columns and indexes safely
-- =====================================================

DO $$
BEGIN
    -- 1. Add columns to deep_remembrance_responses if they don't exist
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

    -- 2. Create the index dynamically (to avoid parse-time errors)
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_drr_completed') THEN
        EXECUTE 'CREATE INDEX idx_drr_completed ON deep_remembrance_responses(completed_at) WHERE completed_at IS NOT NULL';
    END IF;
END $$;

-- 3. Ensure pet_personas table exists
CREATE TABLE IF NOT EXISTS pet_personas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL UNIQUE REFERENCES pets(id) ON DELETE CASCADE,
    response_id UUID REFERENCES deep_remembrance_responses(id),
    dimensional_scores JSONB NOT NULL DEFAULT '{}',
    narrative_data JSONB NOT NULL DEFAULT '{}',
    persona_profile JSONB NOT NULL DEFAULT '{}',
    quality_score INTEGER NOT NULL DEFAULT 0,
    detail_richness INTEGER,
    emotional_authenticity INTEGER,
    behavioral_consistency INTEGER,
    narrative_depth INTEGER,
    generation_model TEXT NOT NULL DEFAULT 'claude-sonnet-4-20250514',
    generation_timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Re-apply RLS policies
DO $$
BEGIN
    -- Enable RLS
    EXECUTE 'ALTER TABLE deep_remembrance_responses ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE pet_personas ENABLE ROW LEVEL SECURITY';

    -- Deep Remembrance Policies
    DROP POLICY IF EXISTS "Users can view own responses" ON deep_remembrance_responses;
    EXECUTE 'CREATE POLICY "Users can view own responses" ON deep_remembrance_responses FOR SELECT USING (auth.uid() = user_id)';

    DROP POLICY IF EXISTS "Users can insert own responses" ON deep_remembrance_responses;
    EXECUTE 'CREATE POLICY "Users can insert own responses" ON deep_remembrance_responses FOR INSERT WITH CHECK (auth.uid() = user_id)';

    DROP POLICY IF EXISTS "Users can update own responses" ON deep_remembrance_responses;
    EXECUTE 'CREATE POLICY "Users can update own responses" ON deep_remembrance_responses FOR UPDATE USING (auth.uid() = user_id)';

    -- Pet Personas Policies
    DROP POLICY IF EXISTS "Users can view own pet personas" ON pet_personas;
    EXECUTE 'CREATE POLICY "Users can view own pet personas" ON pet_personas FOR SELECT USING (EXISTS (SELECT 1 FROM pets WHERE pets.id = pet_personas.pet_id AND pets.user_id = auth.uid()))';

    DROP POLICY IF EXISTS "Users can insert own pet personas" ON pet_personas;
    EXECUTE 'CREATE POLICY "Users can insert own pet personas" ON pet_personas FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM pets WHERE pets.id = pet_personas.pet_id AND pets.user_id = auth.uid()))';

    DROP POLICY IF EXISTS "Users can update own pet personas" ON pet_personas;
    EXECUTE 'CREATE POLICY "Users can update own pet personas" ON pet_personas FOR UPDATE USING (EXISTS (SELECT 1 FROM pets WHERE pets.id = pet_personas.pet_id AND pets.user_id = auth.uid()))';
END $$;
