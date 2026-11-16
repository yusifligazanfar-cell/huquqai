import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizeAzSearch } from "./corpus_sqlite";
import type { StructuredChunk } from "./types";

let cachedClient: SupabaseClient | null | undefined = undefined;
let schemaUnavailableUntil = 0;

function getSupabaseRagClient(): SupabaseClient | null {
  if (Date.now() < schemaUnavailableUntil) return null;
  if (cachedClient !== undefined) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key || url.includes("your_") || key.includes("your_")) {
    cachedClient = null;
    return null;
  }

  cachedClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

export interface SupabaseHybridSearchOptions {
  query: string;
  expandedQueries?: string[];
  targetFrameworkIds?: string[];
  articleNumbers?: string[];
  limit?: number;
  queryEmbedding1536?: number[] | null;
  queryEmbedding384?: number[] | null;
}

interface RpcChunkRow {
  id: number | string;
  document_id: string;
  law_title: string;
  article_number: string | null;
  article_title: string | null;
  content: string;
  source_url: string | null;
  doc_type: string | null;
  is_repealed: boolean | null;
  score: number | null;
}

function l2NormalizeAndTruncate(vec: number[], dims: number): number[] {
  const sliced = vec.slice(0, dims);
  let sumSq = 0;
  for (let i = 0; i < sliced.length; i++) {
    sumSq += sliced[i] * sliced[i];
  }
  const norm = Math.sqrt(sumSq);
  if (!norm || !Number.isFinite(norm)) return sliced;
  return sliced.map((v) => v / norm);
}

async function fetchEmbeddingVector(
  url: string,
  apiKey: string,
  body: Record<string, unknown>,
  timeoutMs: number
): Promise<number[] | null> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: Array<{ embedding?: number[] }> };
    return Array.isArray(data?.data?.[0]?.embedding) ? data.data[0].embedding : null;
  } catch {
    return null;
  }
}

/**
 * Optionally generates a 1536-dim query embedding via NVIDIA Nemotron (`ENABLE_NVIDIA_EMBEDDINGS=true`,
 * Matryoshka-sliced & L2-normalized) or OpenAI (`ENABLE_OPENAI_EMBEDDINGS=true`).
 */
async function maybeComputeQueryEmbedding1536(text: string): Promise<number[] | null> {
  const input = text.slice(0, 4000);
  const nvidiaKey = (process.env.NVIDIA_API_KEY || "").trim();
  if (process.env.ENABLE_NVIDIA_EMBEDDINGS === "true" && nvidiaKey.startsWith("nvapi-")) {
    const baseUrl = (process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1").replace(/\/$/, "");
    const raw = await fetchEmbeddingVector(
      `${baseUrl}/embeddings`,
      nvidiaKey,
      {
        model: process.env.NVIDIA_EMBEDDING_MODEL || "nvidia/nemotron-3.5-embed-8b",
        input: [input],
        input_type: "query",
        encoding_format: "float",
      },
      5000
    );
    if (raw && raw.length >= 1536) {
      return l2NormalizeAndTruncate(raw, 1536);
    }
  }

  if (process.env.ENABLE_OPENAI_EMBEDDINGS !== "true") return null;
  const openAiKey = (process.env.OPENAI_API_KEY || "").trim();
  if (!openAiKey.startsWith("sk-") || openAiKey.startsWith("sk-or-")) return null;

  return fetchEmbeddingVector(
    "https://api.openai.com/v1/embeddings",
    openAiKey,
    {
      model: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
      input,
    },
    4000
  );
}

/**
 * Queries Supabase PostgreSQL `pgvector` + FTS Reciprocal Rank Fusion RPC (`hybrid_search_legal_chunks`).
 * Fails cleanly to `[]` if Supabase tables/RPC are not yet provisioned (`PGRST205` / `42883`).
 */
export async function searchSupabaseHybrid(
  options: SupabaseHybridSearchOptions
): Promise<StructuredChunk[]> {
  const client = getSupabaseRagClient();
  if (!client) return [];

  const limit = Math.max(1, Math.min(options.limit ?? 15, 40));
  const queryNorm = normalizeAzSearch(
    [options.query, ...(options.expandedQueries ?? []).slice(0, 3)].join(" ")
  );
  if (!queryNorm) return [];

  const embedding1536 =
    options.queryEmbedding1536 ?? (await maybeComputeQueryEmbedding1536(options.query));

  try {
    const filterDocId =
      options.targetFrameworkIds && options.targetFrameworkIds.length === 1
        ? options.targetFrameworkIds[0]
        : null;
    const filterArt =
      options.articleNumbers && options.articleNumbers.length === 1
        ? options.articleNumbers[0]
        : null;

    const { data, error } = await client.rpc("hybrid_search_legal_chunks", {
      query_text: options.query,
      query_norm: queryNorm,
      query_embedding: embedding1536,
      query_embedding_384: options.queryEmbedding384 ?? null,
      match_count: limit,
      filter_doc_id: filterDocId,
      filter_article_number: filterArt,
    });

    if (error) {
      const code = (error as { code?: string }).code ?? "";
      const msg = (error as { message?: string }).message ?? "";
      if (
        code === "PGRST205" ||
        code === "PGRST202" ||
        code === "42883" ||
        code === "42P01" ||
        msg.includes("Could not find the function") ||
        msg.includes("does not exist")
      ) {
        // Back off for 60s so local SQLite RAG runs without repeated 404 latency
        schemaUnavailableUntil = Date.now() + 60_000;
      }
      return [];
    }

    const rows = (Array.isArray(data) ? data : []) as RpcChunkRow[];
    return rows.map((row, idx) => {
      const docId = String(row.document_id ?? "");
      const artNum = String(row.article_number ?? "");
      return {
        sourceId: `supabase_${docId}_art_${artNum || "0"}_${row.id ?? idx}`,
        lawId: `eqanun_${docId}`,
        lawName: String(row.law_title ?? `e-Qanun Sənədi № ${docId}`),
        articleNumber: artNum,
        articleTitle: String(row.article_title ?? ""),
        content: String(row.content ?? ""),
        sourceFile: `supabase:legal_chunks:${row.id}`,
        sourceUrl:
          row.source_url || `https://www.e-qanun.ai/results/${docId}`,
        score: Number(row.score ?? 0.5) * 200,
      };
    });
  } catch {
    return [];
  }
}

export async function searchSupabaseDocuments(
  query: string,
  limit: number = 20
): Promise<
  Array<{
    documentId: string;
    title: string;
    sourceUrl: string;
    articleNumber: string;
    snippet: string;
    score: number;
  }>
> {
  const chunks = await searchSupabaseHybrid({ query, limit: limit * 2 });
  if (chunks.length === 0) return [];

  const seen = new Map<
    string,
    {
      documentId: string;
      title: string;
      sourceUrl: string;
      articleNumber: string;
      snippet: string;
      score: number;
    }
  >();

  for (const ch of chunks) {
    const docId = ch.lawId.replace(/^eqanun_/, "");
    if (!seen.has(docId) || (ch.score ?? 0) > (seen.get(docId)?.score ?? 0)) {
      seen.set(docId, {
        documentId: docId,
        title: ch.lawName,
        sourceUrl: ch.sourceUrl,
        articleNumber: ch.articleNumber,
        snippet: ch.content.slice(0, 650),
        score: ch.score ?? 100,
      });
    }
  }

  return Array.from(seen.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
