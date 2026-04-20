-- ================================================================
-- LIVING UNIVERSE: Full Database Migration
-- ToThereOn — 독립 시뮬레이션 → 살아있는 공유 세계
-- ================================================================
-- 실행 방법: Supabase SQL Editor에 전체 복붙 후 Run 클릭
-- 기존 테이블은 절대 건드리지 않음 (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
-- ================================================================



-- ================================================================
-- [PHASE 1] World State Foundation
-- 테이블: world_state, pet_locations, world_event_log
-- ================================================================

-- 1-A. 세계 상태 싱글톤 (전체 서버에 1개)
CREATE TABLE IF NOT EXISTS world_state (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    current_bd          INTEGER NOT NULL DEFAULT 1,
    total_pets          INTEGER NOT NULL DEFAULT 0,
    zone_distribution   JSONB NOT NULL DEFAULT '{}',
    active_world_events JSONB NOT NULL DEFAULT '[]',
    last_tick_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 첫 번째 행 삽입 (싱글톤 초기값)
INSERT INTO world_state (current_bd, total_pets)
VALUES (1, 0)
ON CONFLICT DO NOTHING;

-- 1-B. Pet 위치 추적
CREATE TABLE IF NOT EXISTS pet_locations (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pet_id      UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    zone_id     TEXT NOT NULL,
    location_id TEXT,
    entered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_pet_location UNIQUE (pet_id)
);

CREATE INDEX IF NOT EXISTS idx_pet_locations_zone ON pet_locations(zone_id);
CREATE INDEX IF NOT EXISTS idx_pet_locations_pet  ON pet_locations(pet_id);

-- 1-C. 세계 이벤트 영구 기록 로그
CREATE TABLE IF NOT EXISTS world_event_log (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bd_day         INTEGER NOT NULL,
    event_type     TEXT NOT NULL,
    zone_id        TEXT NOT NULL,
    location_id    TEXT,
    participants   JSONB NOT NULL DEFAULT '[]',
    npc_involved   TEXT,
    description    TEXT NOT NULL,
    first_sentence TEXT,
    impact         JSONB NOT NULL DEFAULT '{}',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_world_event_log_day  ON world_event_log(bd_day);
CREATE INDEX IF NOT EXISTS idx_world_event_log_zone ON world_event_log(zone_id, bd_day);

-- 1-D. RLS
ALTER TABLE world_state     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_locations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_event_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pet locations"
    ON pet_locations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM pets
            WHERE pets.id = pet_locations.pet_id
              AND pets.user_id = auth.uid()
        )
    );

CREATE POLICY "Authenticated read world_state"
    ON world_state FOR SELECT
    TO authenticated USING (true);

CREATE POLICY "Authenticated read world_event_log"
    ON world_event_log FOR SELECT
    TO authenticated USING (true);



-- ================================================================
-- [PHASE 2] Pet Relationships (관계 그래프)
-- 테이블: pet_relationships
-- ================================================================

CREATE TABLE IF NOT EXISTS pet_relationships (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pet_a_id            UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    pet_b_id            UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    relationship_type   TEXT NOT NULL DEFAULT 'acquaintance',
    first_met_bd        INTEGER NOT NULL,
    interaction_count   INTEGER NOT NULL DEFAULT 1,
    last_interaction_bd INTEGER,
    shared_memories     JSONB NOT NULL DEFAULT '[]',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_pet_pair  UNIQUE (pet_a_id, pet_b_id),
    CONSTRAINT no_self_relation CHECK (pet_a_id != pet_b_id)
);

CREATE INDEX IF NOT EXISTS idx_pet_rel_a ON pet_relationships(pet_a_id);
CREATE INDEX IF NOT EXISTS idx_pet_rel_b ON pet_relationships(pet_b_id);

ALTER TABLE pet_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own pet relationships"
    ON pet_relationships FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM pets
            WHERE pets.id = pet_relationships.pet_a_id
              AND pets.user_id = auth.uid()
        )
    );



-- ================================================================
-- [PHASE 4] NPC Persistent State (NPC 유상태 관리)
-- 테이블: npc_state
-- ================================================================

CREATE TABLE IF NOT EXISTS npc_state (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    npc_id            TEXT NOT NULL UNIQUE,
    npc_name          TEXT NOT NULL,
    current_zone      TEXT NOT NULL,
    current_location  TEXT,
    mood              TEXT NOT NULL DEFAULT 'neutral',
    current_activity  TEXT,
    interaction_log   JSONB NOT NULL DEFAULT '[]',
    personality_state JSONB NOT NULL DEFAULT '{}',
    schedule          JSONB NOT NULL DEFAULT '{}',
    last_updated      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- NPC 기본 데이터 시드 (worldview-constants의 EVENT_NPCS 기준)
INSERT INTO npc_state (npc_id, npc_name, current_zone, schedule) VALUES
  ('happy',     'Happy',     'crystal_meadow',  '{"morning":"crystal_meadow","afternoon":"central_plaza","evening":"crystal_lake"}'),
  ('choco',     'Choco',     'eternity_forest', '{"morning":"eternity_forest","afternoon":"eternity_forest","evening":"crystal_lake"}'),
  ('tory',      'Tory',      'crystal_meadow',  '{"morning":"crystal_meadow","afternoon":"eternity_forest","evening":"sunset_hill"}'),
  ('cloud',     'Cloud',     'crystal_lake',    '{"morning":"eternity_forest","afternoon":"crystal_lake","evening":"sunset_hill"}'),
  ('lightning', 'Lightning', 'crystal_meadow',  '{"morning":"crystal_meadow","afternoon":"central_plaza","evening":"crystal_meadow"}'),
  ('star',      'Star',      'sunset_hill',     '{"morning":"crystal_lake","afternoon":"sunset_hill","evening":"sunset_hill"}'),
  ('mong',      'Mong',      'crystal_lake',    '{"morning":"crystal_lake","afternoon":"crystal_lake","evening":"eternity_forest"}'),
  ('ruby',      'Ruby',      'central_plaza',   '{"morning":"central_plaza","afternoon":"sunset_hill","evening":"central_plaza"}'),
  ('wind',      'Wind',      'sunset_hill',     '{"morning":"eternity_forest","afternoon":"sunset_hill","evening":"crystal_meadow"}'),
  ('bokshil',   'Bokshil',   'crystal_meadow',  '{"morning":"crystal_meadow","afternoon":"crystal_lake","evening":"crystal_meadow"}')
ON CONFLICT (npc_id) DO NOTHING;

ALTER TABLE npc_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read npc_state"
    ON npc_state FOR SELECT
    TO authenticated USING (true);



-- ================================================================
-- [DEFENSE] Privacy & Timeout 방어벽
-- - pets.allow_world_interaction 컬럼 추가
-- - world_processing_state 테이블 (CRON 청크 처리 상태)
-- ================================================================

-- Defense Fix 3: 프라이버시 opt-out 컬럼
ALTER TABLE pets
    ADD COLUMN IF NOT EXISTS allow_world_interaction BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN pets.allow_world_interaction IS
    '다른 반려동물과의 세계 내 상호작용 허용 여부. false이면 NPC하고만 상호작용.';

-- Defense Fix 1: CRON 청크 처리 상태 추적
CREATE TABLE IF NOT EXISTS world_processing_state (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bd_day            INTEGER NOT NULL,
    processed_pet_ids JSONB NOT NULL DEFAULT '[]',
    chunk_index       INTEGER NOT NULL DEFAULT 0,
    total_pets        INTEGER NOT NULL DEFAULT 0,
    completed         BOOLEAN NOT NULL DEFAULT FALSE,
    started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_bd_processing UNIQUE (bd_day)
);

COMMENT ON TABLE world_processing_state IS
    'CRON Timeout 방어: BD Day별 chunk 처리 상태. CRON이 중단돼도 이어서 처리.';

ALTER TABLE world_processing_state ENABLE ROW LEVEL SECURITY;
-- world_processing_state는 서비스롤(service_role)만 접근 — 별도 정책 불필요



-- ================================================================
-- ✅ Migration 완료 확인 쿼리 (실행 후 아래로 검증)
-- ================================================================
SELECT
    (SELECT COUNT(*) FROM world_state)           AS world_state_rows,
    (SELECT COUNT(*) FROM pet_locations)         AS pet_locations_rows,
    (SELECT COUNT(*) FROM world_event_log)       AS world_event_log_rows,
    (SELECT COUNT(*) FROM pet_relationships)     AS pet_relationships_rows,
    (SELECT COUNT(*) FROM npc_state)             AS npc_state_rows,
    (SELECT COUNT(*) FROM world_processing_state) AS processing_state_rows;
