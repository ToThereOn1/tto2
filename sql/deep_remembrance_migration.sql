-- =====================================================
-- Phase 3-C: Deep Remembrance & Persona Engine
-- Migration SQL for Supabase
-- =====================================================

-- 1. Deep Remembrance Responses Table
-- Stores survey answers, progress, and auto-save state
CREATE TABLE IF NOT EXISTS deep_remembrance_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    responses JSONB NOT NULL DEFAULT '{}',
    current_question_index INTEGER NOT NULL DEFAULT 0,
    total_questions INTEGER NOT NULL DEFAULT 25,
    completion_percentage INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_saved_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    time_spent_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- One survey per pet
    CONSTRAINT unique_pet_response UNIQUE (pet_id)
);

-- 2. Pet Personas Table
-- Stores generated AI persona profile and quality metrics
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

-- =====================================================
-- Indexes
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_drr_pet_id ON deep_remembrance_responses(pet_id);
CREATE INDEX IF NOT EXISTS idx_drr_user_id ON deep_remembrance_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_drr_completed ON deep_remembrance_responses(completed_at) WHERE completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_personas_pet_id ON pet_personas(pet_id);
CREATE INDEX IF NOT EXISTS idx_personas_quality ON pet_personas(quality_score);

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================

-- Enable RLS
ALTER TABLE deep_remembrance_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_personas ENABLE ROW LEVEL SECURITY;

-- Deep Remembrance Responses: Users can manage their own responses
CREATE POLICY "Users can view own responses"
    ON deep_remembrance_responses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own responses"
    ON deep_remembrance_responses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own responses"
    ON deep_remembrance_responses FOR UPDATE
    USING (auth.uid() = user_id);

-- Pet Personas: Users can view personas for their pets
CREATE POLICY "Users can view own pet personas"
    ON pet_personas FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM pets
            WHERE pets.id = pet_personas.pet_id
            AND pets.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own pet personas"
    ON pet_personas FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM pets
            WHERE pets.id = pet_personas.pet_id
            AND pets.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own pet personas"
    ON pet_personas FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM pets
            WHERE pets.id = pet_personas.pet_id
            AND pets.user_id = auth.uid()
        )
    );

-- =====================================================
-- Updated_at trigger for pet_personas
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Only create trigger if not exists (safe to re-run)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_pet_personas_updated_at'
    ) THEN
        CREATE TRIGGER update_pet_personas_updated_at
            BEFORE UPDATE ON pet_personas
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
