-- Living Universe Phase 2: Pet Relationships
-- ============================================================

-- Pet 간 관계 그래프
CREATE TABLE IF NOT EXISTS pet_relationships (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pet_a_id             UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    pet_b_id             UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    relationship_type    TEXT NOT NULL DEFAULT 'acquaintance',
    -- 'acquaintance' | 'friend' | 'close_friend' | 'best_friend'
    first_met_bd         INTEGER NOT NULL,
    interaction_count    INTEGER NOT NULL DEFAULT 1,
    last_interaction_bd  INTEGER,
    shared_memories      JSONB NOT NULL DEFAULT '[]',
    -- [{"bd_day": 3, "zone": "crystal_meadow", "summary": "played fetch together"}]
    created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_pet_pair   UNIQUE (pet_a_id, pet_b_id),
    CONSTRAINT no_self_relation  CHECK (pet_a_id != pet_b_id)
);

-- 양방향 조회를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_pet_rel_a ON pet_relationships(pet_a_id);
CREATE INDEX IF NOT EXISTS idx_pet_rel_b ON pet_relationships(pet_b_id);

ALTER TABLE pet_relationships ENABLE ROW LEVEL SECURITY;

-- 유저는 자신의 pet 관계만 조회 가능
CREATE POLICY "Users can view own pet relationships"
    ON pet_relationships FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM pets
            WHERE pets.id = pet_relationships.pet_a_id
            AND pets.user_id = auth.uid()
        )
    );
