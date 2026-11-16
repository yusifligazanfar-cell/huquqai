import type { SqliteDocSearchResult, SqliteSearchOptions } from "./corpus_sqlite";
import type { StructuredChunk } from "./types";

export interface RemoteDocumentResult {
  documentId: string;
  title: string;
  sourceUrl: string;
  docType: string;
  isRepealed: number;
  content: string;
}

export function getRagBackendUrl(): string {
  const url =
    process.env.LEXAZ_RAG_BACKEND_URL ||
    process.env.RAG_BACKEND_URL ||
    (process.env.VERCEL ? "https://huquqai-rag.huquqai-rag.workers.dev" : "http://127.0.0.1:8000");
  return url.trim().replace(/\/$/, "");
}

export function isRemoteRagConfigured(): boolean {
  const explicit = (
    process.env.LEXAZ_RAG_BACKEND_URL ||
    process.env.RAG_BACKEND_URL ||
    (process.env.VERCEL ? "https://huquqai-rag.huquqai-rag.workers.dev" : "")
  ).trim();
  return explicit.length > 0;
}

export async function fetchRagBackend<T>(
  endpoint: string,
  options?: {
    method?: "GET" | "POST";
    body?: unknown;
    timeoutMs?: number;
  }
): Promise<T | null> {
  const method = options?.method ?? "POST";
  const timeoutMs = options?.timeoutMs ?? (isRemoteRagConfigured() ? 6500 : 1800);
  const headers: Record<string, string> = {};
  if (method === "POST") {
    headers["Content-Type"] = "application/json";
  }
  const secret = (process.env.LEXAZ_RAG_BACKEND_SECRET || "").trim();
  if (secret) {
    headers["x-rag-secret"] = secret;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${getRagBackendUrl()}${endpoint}`, {
      method,
      headers,
      body: method === "POST" ? JSON.stringify(options?.body ?? {}) : undefined,
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchRemoteLexicalSearch(
  options: SqliteSearchOptions,
  timeoutMs?: number
): Promise<StructuredChunk[]> {
  if (!options.query?.trim()) return [];
  const res = await fetchRagBackend<{ chunks?: StructuredChunk[] }>("/rag/lexical", {
    method: "POST",
    timeoutMs,
    body: {
      query: options.query,
      expanded_queries: options.expandedQueries ?? [],
      target_framework_ids: options.targetFrameworkIds ?? [],
      target_law_confidence: options.targetLawConfidence ?? "explicit",
      article_numbers: options.articleNumbers ?? [],
      priority_articles: options.priorityArticles ?? [],
      forbidden_phrases: options.forbiddenPhrases ?? [],
      limit: options.limit ?? 20,
    },
  });
  return Array.isArray(res?.chunks) ? res.chunks : [];
}

export async function fetchRemoteDocSearch(
  query: string,
  limit: number = 25,
  timeoutMs?: number
): Promise<SqliteDocSearchResult[]> {
  if (!query?.trim()) return [];
  const res = await fetchRagBackend<{ results?: SqliteDocSearchResult[] }>(
    "/rag/doc-search",
    {
      method: "POST",
      timeoutMs,
      body: { query, limit },
    }
  );
  return Array.isArray(res?.results) ? res.results : [];
}

export async function fetchRemoteDocumentById(
  docId: string,
  articleNumber?: string,
  timeoutMs?: number
): Promise<RemoteDocumentResult | null> {
  const cleanId = String(docId || "").replace(/\D/g, "");
  if (!cleanId) return null;
  const qs = articleNumber
    ? `?article_number=${encodeURIComponent(articleNumber)}`
    : "";
  return fetchRagBackend<RemoteDocumentResult>(
    `/rag/document/${encodeURIComponent(cleanId)}${qs}`,
    { method: "GET", timeoutMs }
  );
}

export async function fetchRemoteDocumentByTitle(
  titleQuery: string,
  articleNumber?: string,
  timeoutMs?: number
): Promise<{
  documentId: string;
  title: string;
  sourceUrl: string;
  content: string;
} | null> {
  if (!titleQuery?.trim()) return null;
  const params = new URLSearchParams({ title: titleQuery.trim() });
  if (articleNumber?.trim()) {
    params.set("article_number", articleNumber.trim());
  }
  return fetchRagBackend<{
    documentId: string;
    title: string;
    sourceUrl: string;
    content: string;
  }>(`/rag/document-by-title?${params.toString()}`, {
    method: "GET",
    timeoutMs,
  });
}
