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
