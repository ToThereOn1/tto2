-- 1. pgvector 익스텐션 활성화
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. 장기 기억 테이블
CREATE TABLE IF NOT EXISTS pet_memories (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pet_id       UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  source_type  TEXT NOT NULL CHECK (source_type IN ('letter_sent', 'letter_received', 'survey_memory', 'event')),
  content      TEXT NOT NULL,          -- 원문 (편지 내용, 설문 답변 등)
  summary      TEXT,                   -- 요약본 (프롬프트 토큰 절약용)
  embedding    vector(1536),           -- OpenAI text-embedding-3-small 기준
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 벡터 유사도 검색 인덱스 (코사인 유사도)
-- Note: 'lists' parameter depends on table size. 100 is good start.
CREATE INDEX IF NOT EXISTS pet_memories_embedding_idx
  ON pet_memories
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 4. RAG 검색 함수 (Top-K 유사 기억 반환)
CREATE OR REPLACE FUNCTION search_pet_memories(
  p_pet_id    UUID,
  query_vec   vector(1536),
  match_count INT DEFAULT 3
)
RETURNS TABLE (
  id          UUID,
  content     TEXT,
  summary     TEXT,
  source_type TEXT,
  similarity  FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    pm.id,
    pm.content,
    pm.summary,
    pm.source_type,
    1 - (pm.embedding <=> query_vec) AS similarity
  FROM pet_memories pm
  WHERE pm.pet_id = p_pet_id
  ORDER BY pm.embedding <=> query_vec
  LIMIT match_count;
END;
$$;
