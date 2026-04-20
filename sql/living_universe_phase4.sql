-- Living Universe Phase 4: NPC Persistent State
-- ============================================================

CREATE TABLE IF NOT EXISTS npc_state (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    npc_id            TEXT NOT NULL UNIQUE,   -- matches worldview-constants NPC id
    npc_name          TEXT NOT NULL,
    current_zone      TEXT NOT NULL,
    current_location  TEXT,
    mood              TEXT NOT NULL DEFAULT 'neutral',
    current_activity  TEXT,
    interaction_log   JSONB NOT NULL DEFAULT '[]',
    -- [{"bd_day": 5, "pet_id": "...", "pet_name": "Luna", "summary": "played together"}]
    personality_state JSONB NOT NULL DEFAULT '{}',
    schedule          JSONB NOT NULL DEFAULT '{}',
    -- {"morning": "crystal_meadow", "afternoon": "central_plaza", "evening": "sunset_hill"}
    last_updated      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- NPC 기본 데이터 삽입 (worldview-constants의 EVENT_NPCS 기준)
INSERT INTO npc_state (npc_id, npc_name, current_zone, schedule) VALUES
  ('happy',    'Happy',    'crystal_meadow',  '{"morning":"crystal_meadow","afternoon":"central_plaza","evening":"crystal_lake"}'),
  ('choco',    'Choco',    'eternity_forest', '{"morning":"eternity_forest","afternoon":"eternity_forest","evening":"crystal_lake"}'),
  ('tory',     'Tory',     'crystal_meadow',  '{"morning":"crystal_meadow","afternoon":"eternity_forest","evening":"sunset_hill"}'),
  ('cloud',    'Cloud',    'crystal_lake',    '{"morning":"eternity_forest","afternoon":"crystal_lake","evening":"sunset_hill"}'),
  ('lightning','Lightning','crystal_meadow',  '{"morning":"crystal_meadow","afternoon":"central_plaza","evening":"crystal_meadow"}'),
  ('star',     'Star',     'sunset_hill',     '{"morning":"crystal_lake","afternoon":"sunset_hill","evening":"sunset_hill"}'),
  ('mong',     'Mong',     'crystal_lake',    '{"morning":"crystal_lake","afternoon":"crystal_lake","evening":"eternity_forest"}'),
  ('ruby',     'Ruby',     'central_plaza',   '{"morning":"central_plaza","afternoon":"sunset_hill","evening":"central_plaza"}'),
  ('wind',     'Wind',     'sunset_hill',     '{"morning":"eternity_forest","afternoon":"sunset_hill","evening":"crystal_meadow"}'),
  ('bokshil',  'Bokshil',  'crystal_meadow',  '{"morning":"crystal_meadow","afternoon":"crystal_lake","evening":"crystal_meadow"}')
ON CONFLICT (npc_id) DO NOTHING;

ALTER TABLE npc_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read npc_state"
    ON npc_state FOR SELECT
    TO authenticated USING (true);
