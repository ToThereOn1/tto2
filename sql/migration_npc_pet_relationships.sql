-- Migration: Create npc_pet_relationships table
-- Part of NPC-Pet Relationship Persistence (Phase 2, T2.3)
-- NPC IDs are TEXT ('old_finn', 'professor_clover', etc.), pet_id is UUID FK

CREATE TABLE IF NOT EXISTS npc_pet_relationships (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    npc_id              TEXT NOT NULL,
    pet_id              UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    interaction_count   INTEGER NOT NULL DEFAULT 1,
    last_interaction_bd INTEGER NOT NULL,
    relationship_stage  TEXT NOT NULL DEFAULT 'first_meeting',
    shared_memories     JSONB NOT NULL DEFAULT '[]',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_npc_pet UNIQUE (npc_id, pet_id)
);

CREATE INDEX IF NOT EXISTS idx_npc_pet_rel_pet ON npc_pet_relationships(pet_id);
CREATE INDEX IF NOT EXISTS idx_npc_pet_rel_npc ON npc_pet_relationships(npc_id);

ALTER TABLE npc_pet_relationships ENABLE ROW LEVEL SECURITY;

-- Admin-only access (RLS policy for service role)
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'npc_pet_relationships' AND policyname = 'admin_all_npc_pet_rel') THEN
    CREATE POLICY admin_all_npc_pet_rel ON npc_pet_relationships FOR ALL USING (true) WITH CHECK (true);
END IF;
END $$;
