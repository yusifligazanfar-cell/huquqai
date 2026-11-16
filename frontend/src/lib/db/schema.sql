-- ============================================================
-- HuquqAI Azerbaijani Legal RAG Database Schema (PostgreSQL + pgvector)
-- Supports ~60,019 e-qanun documents, articles, chunks, BM25 & semantic search
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Legal Documents Table
CREATE TABLE IF NOT EXISTS legal_documents (
    id BIGSERIAL PRIMARY KEY,
    document_id VARCHAR(64) UNIQUE NOT NULL,
    title TEXT NOT NULL,
    act_number VARCHAR(128),
    act_type VARCHAR(64),
    adoption_date DATE,
    effective_date DATE,
    status VARCHAR(32) DEFAULT 'in_force',
    source_url TEXT,
    content_hash VARCHAR(64),
    raw_html TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_legal_documents_document_id ON legal_documents(document_id);
CREATE INDEX IF NOT EXISTS idx_legal_documents_doc_id ON legal_documents(document_id);
CREATE INDEX IF NOT EXISTS idx_legal_documents_title_trgm ON legal_documents USING gin (title gin_trgm_ops);

-- 2. Legal Articles Table (Exact Legal Structure: Maddə, Hissə, Bənd)
CREATE TABLE IF NOT EXISTS legal_articles (
    id BIGSERIAL PRIMARY KEY,
    document_id VARCHAR(64) NOT NULL REFERENCES legal_documents(document_id) ON DELETE CASCADE,
    article_number VARCHAR(64) NOT NULL,
    article_title TEXT,
    chapter_number VARCHAR(64),
    chapter_title TEXT,
    part_number VARCHAR(32),
    item_number VARCHAR(32),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legal_articles_doc_art ON legal_articles(document_id, article_number);
CREATE INDEX IF NOT EXISTS idx_legal_articles_art_num ON legal_articles(article_number);
CREATE INDEX IF NOT EXISTS idx_legal_articles_content_trgm ON legal_articles USING gin (content gin_trgm_ops);

-- 3. Legal Chunks Table (Hybrid Search: Dense Vector + Full Text Search TSVECTOR)
CREATE TABLE IF NOT EXISTS legal_chunks (
    id BIGSERIAL PRIMARY KEY,
    article_id BIGINT REFERENCES legal_articles(id) ON DELETE CASCADE,
    document_id VARCHAR(64) NOT NULL,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),
    tsv tsvector GENERATED ALWAYS AS (to_tsvector('simple', content)) STORED,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_legal_chunks_doc ON legal_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_legal_chunks_tsv ON legal_chunks USING gin (tsv);
CREATE INDEX IF NOT EXISTS idx_legal_chunks_embedding ON legal_chunks USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- 4. Ingestion Jobs Table
CREATE TABLE IF NOT EXISTS ingestion_jobs (
    id BIGSERIAL PRIMARY KEY,
    job_id VARCHAR(64) UNIQUE NOT NULL,
    total_docs INT DEFAULT 60019,
    processed_docs INT DEFAULT 0,
    successful_docs INT DEFAULT 0,
    failed_docs INT DEFAULT 0,
    status VARCHAR(32) DEFAULT 'pending',
    last_checkpoint_id VARCHAR(64),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 5. Ingestion Errors Table
CREATE TABLE IF NOT EXISTS ingestion_errors (
    id BIGSERIAL PRIMARY KEY,
    job_id VARCHAR(64) NOT NULL,
    document_id VARCHAR(64) NOT NULL,
    error_message TEXT NOT NULL,
    retry_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingestion_errors_job ON ingestion_errors(job_id);

-- 6. Retrieval Logs Table
CREATE TABLE IF NOT EXISTS retrieval_logs (
    id BIGSERIAL PRIMARY KEY,
    query TEXT NOT NULL,
    normalized_query TEXT,
    retrieval_mode VARCHAR(32),
    retrieved_chunk_count INT,
    latency_ms INT,
    model_response TEXT,
    hallucination_check_status VARCHAR(32),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Stored Procedure for Dense Vector Match
CREATE OR REPLACE FUNCTION match_legal_chunks (
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id bigint,
  document_id varchar,
  article_id bigint,
  content text,
  similarity float,
  metadata jsonb
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    legal_chunks.id,
    legal_chunks.document_id,
    legal_chunks.article_id,
    legal_chunks.content,
    1 - (legal_chunks.embedding <=> query_embedding) AS similarity,
    legal_chunks.metadata
  FROM legal_chunks
  WHERE 1 - (legal_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY legal_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 8. Full 56,983-Document Hybrid (pgvector + Normalized Azerbaijani FTS) Upgrade
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS title_norm TEXT;
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS doc_type TEXT DEFAULT 'qanun';
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS is_repealed BOOLEAN DEFAULT FALSE;
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS priority_boost DOUBLE PRECISION DEFAULT 0;
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS article_count INT DEFAULT 0;
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS char_length INT DEFAULT 0;
ALTER TABLE legal_documents ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE legal_chunks ADD COLUMN IF NOT EXISTS chunk_index INT DEFAULT 0;
ALTER TABLE legal_chunks ADD COLUMN IF NOT EXISTS article_number TEXT DEFAULT '';
ALTER TABLE legal_chunks ADD COLUMN IF NOT EXISTS article_title TEXT DEFAULT '';
ALTER TABLE legal_chunks ADD COLUMN IF NOT EXISTS content_norm TEXT;
ALTER TABLE legal_chunks ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE legal_chunks ADD COLUMN IF NOT EXISTS tsv_norm tsvector;
ALTER TABLE legal_chunks ADD COLUMN IF NOT EXISTS embedding_384 vector(384);

CREATE UNIQUE INDEX IF NOT EXISTS uq_legal_documents_document_id ON legal_documents(document_id);
CREATE INDEX IF NOT EXISTS idx_legal_documents_doc_id ON legal_documents(document_id);
CREATE INDEX IF NOT EXISTS idx_legal_chunks_tsv_norm ON legal_chunks USING gin (tsv_norm);
CREATE INDEX IF NOT EXISTS idx_legal_chunks_doc_art ON legal_chunks(document_id, article_number);
CREATE INDEX IF NOT EXISTS idx_legal_chunks_embedding_384 ON legal_chunks USING hnsw (embedding_384 vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE OR REPLACE FUNCTION hybrid_search_legal_chunks (
  query_text TEXT,
  query_norm TEXT,
  query_embedding vector(1536) DEFAULT NULL,
  query_embedding_384 vector(384) DEFAULT NULL,
  match_count INT DEFAULT 15,
  filter_doc_id TEXT DEFAULT NULL,
  filter_article_number TEXT DEFAULT NULL
)
RETURNS TABLE (
  id BIGINT,
  document_id VARCHAR,
  law_title TEXT,
  article_number TEXT,
  article_title TEXT,
  content TEXT,
  source_url TEXT,
  doc_type TEXT,
  is_repealed BOOLEAN,
  score DOUBLE PRECISION
)
LANGUAGE plpgsql
AS $$
DECLARE
  ts_q tsquery;
BEGIN
  ts_q := COALESCE(
    websearch_to_tsquery('simple', NULLIF(trim(query_norm), '')),
    plainto_tsquery('simple', COALESCE(NULLIF(trim(query_norm), ''), query_text))
  );

  RETURN QUERY
  WITH fts_hits AS (
    SELECT
      lc.id,
      ROW_NUMBER() OVER (
        ORDER BY
          (ts_rank_cd(COALESCE(lc.tsv_norm, lc.tsv), ts_q) * (CASE WHEN COALESCE(ld.is_repealed, FALSE) THEN 0.3 ELSE 1.0 END))
          + (COALESCE(ld.priority_boost, 0) * 0.002) DESC
      ) AS fts_rank,
      ts_rank_cd(COALESCE(lc.tsv_norm, lc.tsv), ts_q)::double precision AS fts_raw
    FROM legal_chunks lc
    JOIN legal_documents ld ON ld.document_id = lc.document_id
    WHERE (filter_doc_id IS NULL OR lc.document_id = filter_doc_id)
      AND (filter_article_number IS NULL OR lc.article_number = filter_article_number OR lc.article_number LIKE filter_article_number || '.%')
      AND (COALESCE(lc.tsv_norm, lc.tsv) @@ ts_q OR filter_article_number IS NOT NULL)
    LIMIT GREATEST(match_count * 4, 40)
  ),
  vec_hits AS (
    SELECT
      lc.id,
      ROW_NUMBER() OVER (
        ORDER BY
          CASE
            WHEN query_embedding_384 IS NOT NULL AND lc.embedding_384 IS NOT NULL THEN (lc.embedding_384 <=> query_embedding_384)
            WHEN query_embedding IS NOT NULL AND lc.embedding IS NOT NULL THEN (lc.embedding <=> query_embedding)
            ELSE 1.0
          END ASC
      ) AS vec_rank
    FROM legal_chunks lc
    WHERE (query_embedding_384 IS NOT NULL AND lc.embedding_384 IS NOT NULL)
       OR (query_embedding IS NOT NULL AND lc.embedding IS NOT NULL)
      AND (filter_doc_id IS NULL OR lc.document_id = filter_doc_id)
    LIMIT GREATEST(match_count * 4, 40)
  ),
  combined AS (
    SELECT
      COALESCE(f.id, v.id) AS chunk_id,
      (
        COALESCE(1.0 / (50.0 + f.fts_rank), 0.0)
        + COALESCE(1.0 / (50.0 + v.vec_rank), 0.0)
      )::double precision AS rrf
    FROM fts_hits f
    FULL OUTER JOIN vec_hits v ON f.id = v.id
  )
  SELECT
    lc.id,
    lc.document_id,
    COALESCE(ld.title::text, 'e-Qanun Sənədi № ' || lc.document_id::text) AS law_title,
    COALESCE(lc.article_number, '') AS article_number,
    COALESCE(lc.article_title, '') AS article_title,
    lc.content,
    COALESCE(lc.source_url, ld.source_url, 'https://www.e-qanun.ai/results/' || lc.document_id) AS source_url,
    COALESCE(ld.doc_type, 'qanun') AS doc_type,
    COALESCE(ld.is_repealed, FALSE) AS is_repealed,
    (
      c.rrf
      + (COALESCE(ld.priority_boost, 0) * 0.00025)
      + CASE WHEN filter_article_number IS NOT NULL AND lc.article_number = filter_article_number THEN 0.05 ELSE 0.0 END
      - CASE WHEN COALESCE(ld.is_repealed, FALSE) THEN 0.04 ELSE 0.0 END
    )::double precision AS score
  FROM combined c
  JOIN legal_chunks lc ON lc.id = c.chunk_id
  JOIN legal_documents ld ON ld.document_id = lc.document_id
  ORDER BY score DESC
  LIMIT match_count;
END;
$$;
