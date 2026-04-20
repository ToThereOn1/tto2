-- Living Universe Phase 1: World State Foundation
-- ============================================================
-- 새 테이블만 추가. 기존 테이블은 절대 수정하지 않음.
-- ============================================================

-- 1. 세계 상태 싱글톤 (전체 서버에 1개)
CREATE TABLE IF NOT EXISTS world_state (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    current_bd   INTEGER NOT NULL DEFAULT 1,
    total_pets   INTEGER NOT NULL DEFAULT 0,
    zone_distribution  JSONB NOT NULL DEFAULT '{}',
    -- {"crystal_meadow": 12, "eternity_forest": 8, "crystal_lake": 5, "sunset_hill": 3}
    active_world_events JSONB NOT NULL DEFAULT '[]',
    last_tick_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 첫 번째 행 삽입 (싱글톤)
INSERT INTO world_state (current_bd, total_pets) 
VALUES (1, 0)
ON CONFLICT DO NOTHING;

-- 2. Pet 위치 추적 (어느 구역에 살고 있는지)
CREATE TABLE IF NOT EXISTS pet_locations (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pet_id      UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
    zone_id     TEXT NOT NULL,   -- 'crystal_meadow', 'eternity_forest', etc.
    location_id TEXT,            -- zone 내 세부 위치 ID
    entered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_pet_location UNIQUE (pet_id)
);

-- 기존 pet들의 위치를 과거 날짜 기반으로 자동 초기화
-- (passed_date 기준으로 현재 Beyond Day 계산 → zone 배정)
-- 이 부분은 WorldStateService가 초기 실행 시 처리함

CREATE INDEX IF NOT EXISTS idx_pet_locations_zone ON pet_locations(zone_id);
CREATE INDEX IF NOT EXISTS idx_pet_locations_pet  ON pet_locations(pet_id);

-- 3. 세계 이벤트 영구 기록 로그
CREATE TABLE IF NOT EXISTS world_event_log (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bd_day        INTEGER NOT NULL,
    event_type    TEXT NOT NULL,
    -- 'pet_daily_event'|'pet_interaction'|'npc_event'|'world_event'
    zone_id       TEXT NOT NULL,
    location_id   TEXT,
    participants  JSONB NOT NULL DEFAULT '[]',
    -- [{"pet_id": "...", "pet_name": "Luna"}, ...]
    npc_involved  TEXT,
    description   TEXT NOT NULL,     -- full event text
    first_sentence TEXT,             -- 소문 전파용 요약
    impact        JSONB NOT NULL DEFAULT '{}',
    -- {"witness_notified": true, "rumor_spread": false}
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_world_event_log_day  ON world_event_log(bd_day);
CREATE INDEX IF NOT EXISTS idx_world_event_log_zone ON world_event_log(zone_id, bd_day);

-- 4. RLS 설정
ALTER TABLE world_state     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_locations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_event_log ENABLE ROW LEVEL SECURITY;

-- 유저는 자신의 pet 위치만 볼 수 있음
CREATE POLICY "Users can view own pet locations"
    ON pet_locations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM pets
            WHERE pets.id = pet_locations.pet_id
            AND pets.user_id = auth.uid()
        )
    );

-- world_state와 world_event_log는 모든 인증 유저가 조회 가능 (공유 세계)
CREATE POLICY "Authenticated read world_state"
    ON world_state FOR SELECT
    TO authenticated USING (true);

CREATE POLICY "Authenticated read world_event_log"
    ON world_event_log FOR SELECT
    TO authenticated USING (true);
