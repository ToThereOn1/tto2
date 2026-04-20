-- ===================================================
-- Deep Persona System Migration
-- Version: 3.0
-- Date: 2026-02-17
-- ===================================================

-- ===================================================
-- PART A: pets 테이블에 나이 컬럼 추가
-- ===================================================

-- Step 1: 나이 컬럼 추가
ALTER TABLE pets
ADD COLUMN IF NOT EXISTS age_at_passing NUMERIC(4,1);

-- Step 2: 기존 데이터 일괄 계산 및 채우기
-- passed_date - birth_date → 일수 반환 → 365.25로 나눠 연수로 변환
UPDATE pets
SET age_at_passing = ROUND(
    (passed_date::date - birth_date::date) / 365.25,
    1
)
WHERE birth_date IS NOT NULL
  AND passed_date IS NOT NULL
  AND age_at_passing IS NULL;

-- Step 3: 자동 계산 트리거 설정
CREATE OR REPLACE FUNCTION calculate_pet_age()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.birth_date IS NOT NULL AND NEW.passed_date IS NOT NULL THEN
        NEW.age_at_passing := ROUND(
            (NEW.passed_date::date - NEW.birth_date::date) / 365.25,
            1
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calculate_pet_age ON pets;
CREATE TRIGGER trg_calculate_pet_age
BEFORE INSERT OR UPDATE ON pets
FOR EACH ROW
EXECUTE FUNCTION calculate_pet_age();

-- ===================================================
-- PART B: 품종 특성 마스터 테이블
-- ===================================================

CREATE TABLE IF NOT EXISTS breed_characteristics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 기본 식별
    species VARCHAR(10) NOT NULL,
    breed_name_en VARCHAR(100) NOT NULL,
    breed_name_kr VARCHAR(100),
    breed_group VARCHAR(50),

    -- 수치형 특성 (1-5 척도)
    traits_numeric JSONB DEFAULT '{}'::jsonb,

    -- 성격 키워드
    temperament_keywords TEXT[],

    -- 서술형 정보
    description_en TEXT,
    description_kr TEXT,

    -- 체형 정보
    size_category VARCHAR(20),
    weight_kg_min NUMERIC(5,1),
    weight_kg_max NUMERIC(5,1),
    lifespan_min INTEGER,
    lifespan_max INTEGER,

    -- 건강 관련
    common_health_issues TEXT[],

    -- LLM 페르소나 참조용 서술
    persona_reference_text TEXT,

    -- 데이터 출처
    source_dog_api_id INTEGER,
    source_cat_api_id INTEGER,
    source_kaggle_matched BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(species, breed_name_en)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_breed_species ON breed_characteristics(species);
CREATE INDEX IF NOT EXISTS idx_breed_name_en ON breed_characteristics(breed_name_en);
CREATE INDEX IF NOT EXISTS idx_breed_size ON breed_characteristics(size_category);

-- ===================================================
-- 확인 쿼리
-- ===================================================

-- pets.age_at_passing 확인
-- SELECT name, birth_date, passed_date, age_at_passing FROM pets LIMIT 5;

-- breed_characteristics 테이블 확인
-- SELECT COUNT(*) FROM breed_characteristics;
