-- Living Universe Defense: Privacy & Processing State
-- ============================================================
-- Fix 3: Privacy opt-out 컬럼 추가
-- Fix 1: Chunk 처리를 위한 상태 플래그 추가
-- ============================================================

-- Fix 3: pets 테이블에 allow_world_interaction 추가
ALTER TABLE pets
    ADD COLUMN IF NOT EXISTS allow_world_interaction BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN pets.allow_world_interaction IS
    '다른 반려동물과의 세계 내 상호작용 허용 여부. false이면 NPC하고만 상호작용.';

-- Fix 1: Chunk 처리를 위한 per-BD 처리 상태 추적
-- 매일 몇 번째 chunk까지 처리했는지 기록 (CRON이 죽어도 이어서 처리 가능)
CREATE TABLE IF NOT EXISTS world_processing_state (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bd_day          INTEGER NOT NULL,
    processed_pet_ids JSONB NOT NULL DEFAULT '[]',    -- 오늘 이미 처리된 pet_id 배열
    chunk_index     INTEGER NOT NULL DEFAULT 0,
    total_pets      INTEGER NOT NULL DEFAULT 0,
    completed       BOOLEAN NOT NULL DEFAULT FALSE,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_bd_processing UNIQUE (bd_day)
);

COMMENT ON TABLE world_processing_state IS
    'CRON Timeout 방어: BD Day별 chunk 처리 상태. CRON이 중단돼도 이어서 처리.';

ALTER TABLE world_processing_state ENABLE ROW LEVEL SECURITY;
-- 서비스롤만 접근
