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

export async function fetchRemoteShortSummary(
  query: string,
  excerpts: Array<{ law: string; article: string; text: string }>,
  timeoutMs: number = 11000
): Promise<string | null> {
  if (!query?.trim() || excerpts.length === 0) return null;
  const res = await fetchRagBackend<{ summary?: string | null }>(
    "/rag/summarize-short",
    {
      method: "POST",
      timeoutMs,
      body: { query: query.trim(), excerpts: excerpts.slice(0, 5) },
    }
  );
  return typeof res?.summary === "string" && res.summary.trim().length > 0
    ? res.summary.trim()
    : null;
}

export async function fetchRemoteGenerateDocument(
  systemPrompt: string,
  userPrompt: string,
  maxTokens = 2800,
  timeoutMs = 28000,
  responseFormatJson = false
): Promise<string | null> {
  if (!isRemoteRagConfigured()) return null;
  const baseUrl = getRagBackendUrl().replace(/\/+$/, "");
  if (!baseUrl) return null;
  const secret = (process.env.LEXAZ_RAG_BACKEND_SECRET || "").trim();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(secret ? { Authorization: `Bearer ${secret}`, "x-rag-secret": secret } : {}),
  };

  try {
    const res = await fetch(`${baseUrl}/rag/generate-document`, {
      method: "POST",
      headers,
      body: JSON.stringify({ systemPrompt, userPrompt, maxTokens, responseFormatJson }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { content?: string };
    return typeof data?.content === "string" && data.content.trim() ? data.content.trim() : null;
  } catch (err) {
    console.warn("[remote_backend] /rag/generate-document failed:", err);
    return null;
  }
}

export async function fetchRemoteRagAnswer(
  messages: Array<{ role: string; content: string }>,
  options?: { maxTokens?: number; temperature?: number; timeoutMs?: number }
): Promise<string | null> {
  if (!isRemoteRagConfigured()) return null;
  const baseUrl = getRagBackendUrl().replace(/\/+$/, "");
  if (!baseUrl) return null;
  const secret = (process.env.LEXAZ_RAG_BACKEND_SECRET || "").trim();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(secret ? { Authorization: `Bearer ${secret}`, "x-rag-secret": secret } : {}),
  };

  const systemMsg = messages.find((m) => m.role === "system")?.content || "";
  const nonSys = messages.filter((m) => m.role !== "system");
  const lastUser = nonSys.length > 0 ? nonSys[nonSys.length - 1] : null;
  if (!lastUser?.content?.trim()) return null;
  const history = nonSys.slice(0, -1).slice(-4);

  try {
    const res = await fetch(`${baseUrl}/rag/answer`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        systemPrompt: systemMsg,
        userPrompt: lastUser.content,
        history,
        maxTokens: options?.maxTokens ?? 3600,
        temperature: options?.temperature ?? 0.05,
      }),
      signal: AbortSignal.timeout(options?.timeoutMs ?? 24000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { content?: string };
    return typeof data?.content === "string" && data.content.trim() ? data.content.trim() : null;
  } catch (err) {
    console.warn("[remote_backend] /rag/answer failed:", err);
    return null;
  }
}

export async function fetchRemoteJudicialSearch(
  options: {
    query: string;
    expandedQueries?: string[];
    matchedLaws?: string[];
    matchedArticles?: string[];
    matchedPairs?: Array<{ law: string; article: string }>;
    limit?: number;
  },
  timeoutMs = 5500
): Promise<StructuredChunk[]> {
  if (!options.query?.trim() || !isRemoteRagConfigured()) return [];
  const res = await fetchRagBackend<{ chunks?: StructuredChunk[] }>("/rag/judicial", {
    method: "POST",
    timeoutMs,
    body: {
      query: options.query,
      expanded_queries: options.expandedQueries ?? [],
      matched_laws: options.matchedLaws ?? [],
      matched_articles: options.matchedArticles ?? [],
      matched_pairs: options.matchedPairs ?? [],
      limit: options.limit ?? 2,
    },
  });
  return Array.isArray(res?.chunks) ? res.chunks : [];
}

export interface RemoteQueryRewriteResult {
  is_follow_up: boolean;
  standalone_query: string;
  same_case_laws: string[];
  topic_summary: string;
}

export async function fetchRemoteQueryRewrite(
  query: string,
  history: Array<{ role: string; content: string }>,
  timeoutMs = 4500
): Promise<RemoteQueryRewriteResult | null> {
  if (!query?.trim() || !history || history.length === 0 || !isRemoteRagConfigured()) return null;
  const res = await fetchRagBackend<RemoteQueryRewriteResult>("/rag/rewrite-query", {
    method: "POST",
    timeoutMs,
    body: {
      query: query.trim(),
      history: history.slice(-6),
    },
  });
  if (!res || typeof res.standalone_query !== "string") return null;
  return res;
}

export interface RemoteAuditVerifyResult {
  passed: boolean;
  insufficient_sources: boolean;
  repealed_misuse: boolean;
  issues: string[];
}

export async function fetchRemoteVerifyAnswer(
  options: {
    query: string;
    context: string;
    draftAnswer: string;
  },
  timeoutMs = 8500
): Promise<RemoteAuditVerifyResult | null> {
  if (!options.query?.trim() || !options.context?.trim() || !options.draftAnswer?.trim() || !isRemoteRagConfigured()) {
    return null;
  }
  const res = await fetchRagBackend<RemoteAuditVerifyResult>("/rag/verify", {
    method: "POST",
    timeoutMs,
    body: {
      query: options.query,
      context: options.context,
      draft_answer: options.draftAnswer,
    },
  });
  if (!res || typeof res.passed !== "boolean") return null;
  return res;
}
