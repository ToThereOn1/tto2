-- =============================================================
-- ToThereOn Learning Stage Migration (fixed)
-- 컬럼이 잘못된 타입으로 존재하는 경우 자동 정정
-- =============================================================

-- 1. writing_mastery_day 컬럼 타입 확인 및 정정
DO $$
BEGIN
    -- 잘못된 타입(character varying 등)이면 삭제 후 재생성
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'pets'
        AND column_name = 'writing_mastery_day'
        AND data_type NOT IN ('integer', 'smallint', 'bigint')
    ) THEN
        ALTER TABLE pets DROP COLUMN writing_mastery_day;
    END IF;
END $$;

ALTER TABLE pets
ADD COLUMN IF NOT EXISTS writing_mastery_day INTEGER DEFAULT 5;

-- 2. learning_speed 컬럼 타입 확인 및 정정
DO $$
BEGIN
    -- 잘못된 타입(character varying 등)이면 삭제 후 재생성
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'pets'
        AND column_name = 'learning_speed'
        AND data_type NOT IN ('real', 'double precision', 'numeric')
    ) THEN
        ALTER TABLE pets DROP COLUMN learning_speed;
    END IF;
END $$;

ALTER TABLE pets
ADD COLUMN IF NOT EXISTS learning_speed REAL DEFAULT 0.5;

-- 3. writing_mastery_day CHECK 제약 (3~7 정수)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_name = 'pets_writing_mastery_day_check'
    ) THEN
        ALTER TABLE pets
        ADD CONSTRAINT pets_writing_mastery_day_check
        CHECK (writing_mastery_day >= 3 AND writing_mastery_day <= 7);
    END IF;
END $$;

-- 4. learning_speed CHECK 제약 (0~1 실수) — 명시적 캐스트로 타입 충돌 방지
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints
        WHERE constraint_name = 'pets_learning_speed_check'
    ) THEN
        ALTER TABLE pets
        ADD CONSTRAINT pets_learning_speed_check
        CHECK (learning_speed >= 0::REAL AND learning_speed <= 1::REAL);
    END IF;
END $$;

-- 완료 확인
SELECT id, name, writing_mastery_day, learning_speed
FROM pets
LIMIT 5;
