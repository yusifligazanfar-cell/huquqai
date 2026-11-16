import { StructuredChunk, QueryAnalysis } from './types';
import { loadAndParseKnowledgeBase } from './parser';
import { normalizeAz } from './analyzer';
import { findLawByQuery, findCandidateLawsByQuery, LAW_REGISTRY } from './registry';
import { LEGAL_CONCEPTS } from './thesaurus';
import { getDocumentTextFromCorpus } from '../services/eqanun_corpus_loader';
import {
  searchSqliteCorpus,
  isSqliteCorpusAvailable,
  extractArticleNumbersAz,
  mapDocIdToLawId,
  cleanArticleHeading,
  getSqliteDocumentById,
} from './corpus_sqlite';
import { searchSupabaseHybrid } from './supabase_search';
import {
  fetchRagBackend,
  fetchRemoteDocumentById,
  fetchRemoteLexicalSearch,
  isRemoteRagConfigured,
} from './remote_backend';
import fs from 'fs';
import path from 'path';

let catalogCache: Array<{ id: string; title: string; file: string }> | null = null;
let kbNormalizedCache: Array<{
  chunk: StructuredChunk;
  chunkLower: string;
  chunkNorm: string;
  titleNorm: string;
  isCoreLaw: boolean;
  isArxkom: boolean;
}> | null = null;

function getNormalizedKbChunks() {
  if (kbNormalizedCache) return kbNormalizedCache;
  const allChunks = loadAndParseKnowledgeBase();
  kbNormalizedCache = allChunks.map((chunk) => ({
    chunk,
    chunkLower: chunk.content.toLowerCase(),
    chunkNorm: normalizeAz(chunk.content),
    titleNorm: normalizeAz(chunk.articleTitle),
    isCoreLaw:
      chunk.sourceFile.startsWith("eqanun_mega_") ||
      chunk.sourceFile.startsWith("e_qanun_469") ||
      chunk.sourceFile.includes("897") ||
      chunk.lawId === "istehlakci",
    isArxkom: chunk.sourceFile.startsWith("arxkom_"),
  }));
  return kbNormalizedCache;
}

function countOccurrencesCapped(haystack: string, needle: string, maxCount: number = 5): number {
  if (!needle) return 0;
  let count = 0;
  let pos = 0;
  while (count < maxCount) {
    const idx = haystack.indexOf(needle, pos);
    if (idx === -1) break;
    count++;
    pos = idx + needle.length;
  }
  return count;
}

function loadCatalog(): Array<{ id: string; title: string; file: string }> {
  if (catalogCache) return catalogCache;
  try {
    const catalogPath = path.join(process.cwd(), 'src/data/eqanun_catalog.json');
    if (fs.existsSync(catalogPath)) {
      catalogCache = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
      return catalogCache || [];
    }
  } catch (e) {
    console.error('Failed to load eqanun catalog in search:', e);
  }
  return [];
}

function resolveFallbackLawByPhrase(qNorm: string): ReturnType<typeof findLawByQuery> {
  if (qNorm.includes("inzibati xeta")) {
    return LAW_REGISTRY["inzibati_xetalar"];
  }
  if (/\bedv\b/.test(qNorm) || qNorm.includes("elave deyer vergisi")) {
    return LAW_REGISTRY["vergi"];
  }
  if (
    qNorm.includes("istehlakci") ||
    qNorm.includes("lazimi keyfiyyetli") ||
    qNorm.includes("zemanet muddeti") ||
    qNorm.includes("qusurli mal") ||
    qNorm.includes("malin temiri")
  ) {
    return LAW_REGISTRY["istehlakci"];
  }
  if (
    qNorm.includes("cinayeti") ||
    qNorm.includes("cinayet mecellesi") ||
    qNorm.includes("aldatma ve ya etibardan") ||
    qNorm.includes("ogurluq")
  ) {
    return LAW_REGISTRY["cinayet"];
  }
  if (qNorm.includes("sehersalma ve tikinti") || qNorm.includes("tikinti fealiyyetine dair icaze")) {
    return LAW_REGISTRY["sehersalma"];
  }
  if (qNorm.includes("piyadalarin yol hereketi qaydalari")) {
    return LAW_REGISTRY["yol_hereketi"];
  }
  if (qNorm.includes("mehkeme mudafiesi huququ")) {
    return LAW_REGISTRY["konstitusiya"];
  }
  if (
    !qNorm.includes("pensiya") &&
    (qNorm.includes("isden") ||
      qNorm.includes("emek muqavilesi") ||
      qNorm.includes("esassiz cixaril") ||
      qNorm.includes("qanunsuz cixaril") ||
      qNorm.includes("ise berpa"))
  ) {
    return LAW_REGISTRY["emek"];
  }
  if (
    !qNorm.includes("rusum") &&
    !qNorm.includes("reyestr") &&
    (qNorm.includes("bosanma") ||
      qNorm.includes("nikah") ||
      qNorm.includes("emlakin bolunmesi") ||
      qNorm.includes("birge mulkiyyet") ||
      qNorm.includes("aliment"))
  ) {
    return LAW_REGISTRY["aile"];
  }
  return null;
}

function collectTargetFrameworkIds(
  matchedLaw: ReturnType<typeof findLawByQuery>,
  possibleLaws: string[] | undefined,
  matchingConcepts: typeof LEGAL_CONCEPTS
): string[] {
  const targetIds: string[] = [];
  const pushId = (id?: string | number) => {
    if (id === undefined || id === null) return;
    const s = String(id).trim();
    if (s && !targetIds.includes(s)) targetIds.push(s);
  };

  if (matchedLaw?.frameworkId) pushId(matchedLaw.frameworkId);

  const registryValues = Object.values(LAW_REGISTRY);
  for (const dl of possibleLaws || []) {
    const reg =
      LAW_REGISTRY[dl] ||
      registryValues.find((r) => r.id === dl || r.name === dl || r.shortName === dl);
    if (reg) pushId(reg.frameworkId);
  }

  for (const c of matchingConcepts) {
    if (c.primaryDocId) pushId(c.primaryDocId);
    const reg = LAW_REGISTRY[c.primaryLawId];
    if (reg) pushId(reg.frameworkId);
  }

  return targetIds;
}

export function hybridSearch(
  analysis: QueryAnalysis,
  maxResults: number = 15,
  extraExpandedQueries: string[] = []
): StructuredChunk[] {
  const qNorm = analysis.normalizedQuery;
  const lawMatch = findCandidateLawsByQuery(qNorm);
  let matchedLaw = lawMatch.primary;
  let lawConfidence = lawMatch.confidence;
  if (!matchedLaw) {
    matchedLaw = resolveFallbackLawByPhrase(qNorm);
    if (matchedLaw) lawConfidence = 'strong';
  }

  // Identify matching concepts
  const matchingConcepts = LEGAL_CONCEPTS.filter(c => 
    c.triggerPhrases.some(phrase => {
      const np = normalizeAz(phrase);
      if (qNorm.includes(np)) return true;
      const phraseWords = np.split(' ').filter(w => w.length > 3);
      return phraseWords.length >= 2 && phraseWords.every(w => qNorm.includes(w));
    })
  );

  const priorityArticles = new Set<string>();
  const forbiddenPhrases = new Set<string>();

  matchingConcepts.forEach(c => {
    c.priorityArticles.forEach(a => priorityArticles.add(a));
    if (c.forbiddenPhrases) {
      c.forbiddenPhrases.forEach(f => forbiddenPhrases.add(normalizeAz(f)));
    }
  });

  // 1. Primary Universal Search Across ALL 56,983 Complete e-Qanun Documents (SQLite FTS5 + Dynamic Title Discovery)
  if (isSqliteCorpusAvailable()) {
    try {
      const targetFrameworkIds = collectTargetFrameworkIds(
        matchedLaw,
        analysis.possibleLaws,
        matchingConcepts
      );
      const effectiveConfidence =
        matchingConcepts.length > 0 && lawConfidence === 'weak'
          ? 'strong'
          : analysis.isFollowUp && (analysis.possibleLaws?.length ?? 0) > 0 && lawConfidence === 'none'
          ? 'strong'
          : lawConfidence;
      const followUpTerms = analysis.followUpContextTerms ?? [];
      const effectiveQueryNorm =
        analysis.isFollowUp && followUpTerms.length > 0
          ? `${qNorm} ${followUpTerms.slice(0, 4).join(' ')}`
          : qNorm;
      const extractedArts = extractArticleNumbersAz(qNorm);
      const explicitArticles = analysis.targetArticleNum
        ? Array.from(new Set([String(analysis.targetArticleNum), ...extractedArts]))
        : extractedArts;
      const followUpArticles = analysis.isFollowUp ? analysis.followUpPriorityArticles ?? [] : [];
      const mergedPriorityArticles = Array.from(
        new Set([...Array.from(priorityArticles), ...followUpArticles])
      );
      const conceptPriorityArticles = explicitArticles.length > 0 ? [] : mergedPriorityArticles;

      const sqliteChunks = searchSqliteCorpus({
        query: effectiveQueryNorm,
        expandedQueries: [
          ...matchingConcepts.flatMap((c) => c.expandedTerms),
          ...followUpTerms,
          ...extraExpandedQueries,
        ],
        targetFrameworkIds,
        targetLawConfidence: effectiveConfidence,
        articleNumbers: explicitArticles,
        priorityArticles: conceptPriorityArticles,
        forbiddenPhrases: Array.from(forbiddenPhrases),
        limit: Math.max(maxResults, 16),
      });

      if (sqliteChunks.length > 0) {
        return sqliteChunks.slice(0, maxResults);
      }
    } catch (e) {
      console.error("Error in universal 56,983 SQLite corpus search:", e);
    }
  }

  // 2. Fallback to legacy Knowledge Base only if SQLite is unavailable or yielded 0 results
  const normalizedKb = getNormalizedKbChunks();
  let scoredChunks: StructuredChunk[] = [];
  const cleanKeywords = analysis.keywords
    .map((w) => normalizeAz(w))
    .filter((w) => w.length > 1);

  for (const item of normalizedKb) {
    const { chunk, chunkLower, chunkNorm, titleNorm, isCoreLaw, isArxkom } = item;
    let score = 0;

    if (isCoreLaw) score += 50;
    if (isArxkom) score -= 200;

    // Filter forbidden phrases
    for (const forbidden of forbiddenPhrases) {
      if (chunkNorm.includes(forbidden) || titleNorm.includes(forbidden)) {
        score -= 250;
      }
    }

    // 1. Explicit Article Matching
    if (analysis.targetArticleNum) {
      if (
        chunk.articleNumber === analysis.targetArticleNum ||
        chunkLower.startsWith(`maddə ${analysis.targetArticleNum}.`) ||
        chunkLower.startsWith(`maddə ${analysis.targetArticleNum} `) ||
        chunkLower.startsWith(`${analysis.targetArticleNum}.`)
      ) {
        score += 5000;
        if (matchedLaw && (chunk.lawId === matchedLaw.id || chunk.lawName.includes(matchedLaw.name))) {
          score += 3000;
        }
      }
    }

    // 2. Domain & Law Matching Boost
    if (matchedLaw && (chunk.lawId === matchedLaw.id || chunk.lawName.includes(matchedLaw.name) || chunk.sourceFile.toLowerCase().includes(matchedLaw.id))) {
      score += 400;
    }

    // 3. Title Matching Boost
    for (const word of cleanKeywords) {
      if (word.length > 2 && titleNorm.includes(word)) {
        score += 50;
      }
    }

    // 4. Content Term Frequency (zero-allocation indexOf scan)
    for (const word of cleanKeywords) {
      const cappedOccurrences = countOccurrencesCapped(chunkNorm, word, 5);
      if (cappedOccurrences > 0) {
        score += cappedOccurrences * 6;
        if (chunkNorm.includes(` ${word} `) || chunkNorm.includes(` ${word}.`)) {
          score += 15;
        }
      }
    }

    // Specific exact phrases
    if (qNorm.includes("oz erizesi") && chunk.articleNumber === "69") score += 1200;
    if (qNorm.includes("77-ci madde") && chunk.articleNumber === "77") score += 5000;
    if (qNorm.includes("avtomobil") && qNorm.includes("basqasina") && chunk.articleNumber === "573") score += 1500;
    if (qNorm.includes("aldatma") && qNorm.includes("etibardan") && chunk.articleNumber === "178" && chunk.lawId === "cinayet") score += 2000;
    if (qNorm.includes("gizli olaraq talama") && chunk.articleNumber === "177" && chunk.lawId === "cinayet") score += 2000;
    if (qNorm.includes("ofert") && qNorm.includes("aksept") && chunk.articleNumber === "408") score += 1500;
    if (qNorm.includes("tikinti fealiyyetine dair icaze") && chunk.articleNumber === "75") score += 1500;
    if (qNorm.includes("piyada") && chunk.articleNumber === "40") score += 1500;
    if (qNorm.includes("mehkeme mudafiesi") && chunk.articleNumber === "60") score += 2000;

    // Length normalization
    const lengthPenalty = chunk.content.length / 500;
    score = score / Math.sqrt(Math.max(1, lengthPenalty));

    // 5. Concept priority boost
    if (matchingConcepts.some(c => c.primaryLawId === chunk.lawId)) {
      if (priorityArticles.has(chunk.articleNumber)) {
        score += 900;
      }
    }

    if (score > 0) {
      scoredChunks.push({ ...chunk, score });
    }
  }

  // 3. Fallback Catalog Scan (only when SQLite did not already handle the query)
  try {
    const catalog = loadCatalog();
    const meaningfulKeywords = analysis.keywords
      .map(w => normalizeAz(w))
      .filter(w => w.length > 3 && !['azerbaycan', 'respublikasi', 'haqqinda', 'qanunu', 'maddesi', 'qaydalari'].includes(w));

    if (catalog.length > 0 && meaningfulKeywords.length > 0) {
      const topMatchingDocs: Array<{ doc: { id: string; title: string; file: string }; score: number }> = [];

      for (const catDoc of catalog) {
        const titleNorm = normalizeAz(catDoc.title);
        let matchScore = 0;

        for (const kw of meaningfulKeywords) {
          if (titleNorm.includes(kw)) {
            matchScore += 40;
          }
        }

        if (qNorm.length > 8 && titleNorm.includes(qNorm)) {
          matchScore += 300;
        }

        if (matchScore >= 80) {
          topMatchingDocs.push({ doc: catDoc, score: matchScore });
        }
      }

      topMatchingDocs.sort((a, b) => b.score - a.score);
      const candidates = topMatchingDocs.slice(0, 3);

      for (const cand of candidates) {
        const text = getDocumentTextFromCorpus(cand.doc.id);
        if (text) {
          scoredChunks.push({
            sourceId: `eqanun_corpus_${cand.doc.id}`,
            lawId: `eqanun_${cand.doc.id}`,
            lawName: cand.doc.title,
            articleNumber: cand.doc.id,
            articleTitle: `${cand.doc.title} (Akt № ${cand.doc.id})`,
            content: text.substring(0, 3000),
            sourceFile: cand.doc.file,
            sourceUrl: `https://www.e-qanun.ai/results/${cand.doc.id}`,
            score: 750 + cand.score
          });
        }
      }
    }
  } catch (e) {
    console.error("Error in universal 56,983 corpus search:", e);
  }

  scoredChunks.sort((a, b) => (b.score || 0) - (a.score || 0));
  return scoredChunks.slice(0, maxResults);
}

export type RagSearchMode = "hybrid" | "semantic" | "lexical";

export interface HybridSearchOptions {
  mode?: RagSearchMode;
  semanticWeight?: number;
  timeoutMs?: number;
  extraExpandedTerms?: string[];
}

interface SemanticApiRow {
  chunk_id?: number;
  document_id?: string | number;
  chunk_index?: number;
  article_number?: string;
  article_title?: string;
  content?: string;
  title?: string;
  source_url?: string;
  file_name?: string;
  semantic_score?: number;
}

interface SemanticSearchApiResponse {
  results?: SemanticApiRow[];
  latency_ms?: number;
}

interface RerankApiResponse {
  scores?: Array<{ id: string; semantic_score: number }>;
  latency_ms?: number;
}

async function fetchSemanticBackend<T>(
  endpoint: string,
  payload: unknown,
  timeoutMs: number
): Promise<T | null> {
  return fetchRagBackend<T>(endpoint, {
    method: "POST",
    body: payload,
    timeoutMs,
  });
}

function semanticRowToChunk(row: SemanticApiRow): StructuredChunk {
  const docId = String(row.document_id ?? "");
  const artNum = String(row.article_number ?? "").trim();
  const title = String(row.title ?? `e-Qanun Sənədi № ${docId}`);
  const cleanHeading = cleanArticleHeading(String(row.article_title ?? ""));
  const artLabel = artNum ? `Maddə ${artNum}` : "Mətn";
  const fullArticleTitle = cleanHeading
    ? `${title} — ${artLabel} (${cleanHeading})`
    : `${title} — ${artLabel}`;
  const lawId = mapDocIdToLawId(docId);
  const semScore = Number(row.semantic_score ?? 0);

  return {
    sourceId: `sqlite_${docId}_a${artNum || "0"}_c${Number(row.chunk_index ?? 0)}`,
    lawId,
    lawName: title,
    articleNumber: artNum,
    articleTitle: fullArticleTitle,
    content: String(row.content ?? ""),
    sourceFile: String(row.file_name ?? `eqanun_doc_${docId}`),
    sourceUrl: String(row.source_url ?? `https://www.e-qanun.ai/results/${docId}`),
    score: Math.round(semScore * 1000),
    chunkId: row.chunk_id ? Number(row.chunk_id) : undefined,
    documentId: docId,
    semanticScore: semScore,
  };
}

/**
 * Async Multi-Backend Hybrid Search modelled on e-qanun.ai:
 * 1) Stage-1 Recall: Local 56,983-doc SQLite FTS5 BM25 + Curated Knowledge Base
 * 2) Stage-1 Dense Semantic Recall: FastAPI SBERT (`paraphrase-multilingual-MiniLM-L12-v2`) across 43k+ statutory embeddings
 * 3) Stage-1 Cloud Hybrid: Supabase PostgreSQL `pgvector` + FTS (when synced)
 * 4) Stage-2 Reranking & Fusion: Dense semantic cross-scoring (`/rag/rerank`) + Reciprocal Rank Fusion + weighted `semanticWeight`
 */
export async function hybridSearchAsync(
  analysis: QueryAnalysis,
  maxResults: number = 15,
  rawQuery?: string,
  options?: HybridSearchOptions
): Promise<StructuredChunk[]> {
  const mode: RagSearchMode = options?.mode ?? "hybrid";
  const useRemoteBackend = !isSqliteCorpusAvailable() && isRemoteRagConfigured();
  const queryText = (rawQuery || analysis.normalizedQuery).trim();
  const timeoutMs = options?.timeoutMs ?? (isRemoteRagConfigured() ? 6500 : 1800);
  const extraTerms = (options?.extraExpandedTerms ?? []).filter((t) => t && t.trim().length >= 3);
  const requestedWeight = options?.semanticWeight ?? (mode === "semantic" ? 0.85 : 0.26);
  const semanticWeight = Math.max(0, Math.min(1, requestedWeight));
  const stage1Limit = Math.max(maxResults * 3, 45);

  const matchingConcepts = LEGAL_CONCEPTS.filter((c) =>
    c.triggerPhrases.some((phrase) => {
      const np = normalizeAz(phrase);
      if (analysis.normalizedQuery.includes(np)) return true;
      const pw = np.split(" ").filter((w) => w.length > 3);
      return pw.length >= 2 && pw.every((w) => analysis.normalizedQuery.includes(w));
    })
  );
  const lawMatch = findCandidateLawsByQuery(analysis.normalizedQuery);
  const fallbackLaw = lawMatch.primary ? null : resolveFallbackLawByPhrase(analysis.normalizedQuery);
  const matchedLaw = lawMatch.primary || fallbackLaw;
  const lawConfidence =
    matchingConcepts.length > 0 && lawMatch.confidence === "weak"
      ? "strong"
      : lawMatch.primary
      ? lawMatch.confidence
      : fallbackLaw
      ? "strong"
      : "none";
  const targetFrameworkIds = collectTargetFrameworkIds(
    matchedLaw,
    analysis.possibleLaws,
    matchingConcepts
  );
  const extractedArts = extractArticleNumbersAz(analysis.normalizedQuery);
  const explicitArticles = analysis.targetArticleNum
    ? Array.from(new Set([String(analysis.targetArticleNum), ...extractedArts]))
    : extractedArts;

  const followUpTerms = analysis.isFollowUp ? analysis.followUpContextTerms ?? [] : [];
  const followUpPriorityArts = analysis.isFollowUp ? analysis.followUpPriorityArticles ?? [] : [];
  const expandedQueries = Array.from(
    new Set([
      ...matchingConcepts.flatMap((c) => c.expandedTerms),
      ...extraTerms,
      ...followUpTerms,
    ])
  );
  const priorityArticles = Array.from(
    new Set([
      ...followUpPriorityArts,
      ...matchingConcepts.flatMap((c) => c.priorityArticles),
    ])
  );
  const forbiddenPhrases = matchingConcepts.flatMap((c) => c.forbiddenPhrases || []);
  const effectiveLawConf =
    lawConfidence === "none" && analysis.isFollowUp && targetFrameworkIds.length > 0
      ? "strong"
      : lawConfidence;

  const lexicalOpts = {
    query: queryText,
    expandedQueries,
    targetFrameworkIds,
    targetLawConfidence: effectiveLawConf as "explicit" | "strong" | "weak" | "none",
    articleNumbers: explicitArticles,
    priorityArticles,
    forbiddenPhrases,
    limit: mode === "lexical" ? maxResults : stage1Limit,
  };

  if (mode === "lexical") {
    if (useRemoteBackend) {
      const remoteOnly = await fetchRemoteLexicalSearch(lexicalOpts, timeoutMs);
      if (remoteOnly.length > 0) return remoteOnly.slice(0, maxResults);
    }
    return hybridSearch(analysis, maxResults);
  }

  const localKbChunks = hybridSearch(analysis, stage1Limit, extraTerms);

  const semanticQuery =
    followUpTerms.length > 0
      ? `${followUpTerms.slice(0, 4).join(" ")} — ${queryText}`
      : queryText;
  const semanticExpandedQuery =
    extraTerms.length > 0 ? `${semanticQuery} ${extraTerms.slice(0, 3).join(" ")}`.slice(0, 400) : "";

  const [globalSemRes, scopedSemRes, expandedSemRes, remoteLexChunks, supabaseChunks] = await Promise.all([
    semanticQuery
      ? fetchSemanticBackend<SemanticSearchApiResponse>(
          "/rag/semantic",
          { query: semanticQuery, top_k: 30, target_doc_ids: null },
          timeoutMs
        )
      : Promise.resolve(null),
    semanticQuery &&
    targetFrameworkIds.length > 0 &&
    (effectiveLawConf === "explicit" || effectiveLawConf === "strong")
      ? fetchSemanticBackend<SemanticSearchApiResponse>(
          "/rag/semantic",
          { query: semanticQuery, top_k: 25, target_doc_ids: targetFrameworkIds },
          timeoutMs
        )
      : Promise.resolve(null),
    semanticExpandedQuery
      ? fetchSemanticBackend<SemanticSearchApiResponse>(
          "/rag/semantic",
          { query: semanticExpandedQuery, top_k: 20, target_doc_ids: null },
          timeoutMs
        )
      : Promise.resolve(null),
    useRemoteBackend
      ? fetchRemoteLexicalSearch(lexicalOpts, timeoutMs)
      : Promise.resolve([] as StructuredChunk[]),
    searchSupabaseHybrid({
      query: queryText,
      expandedQueries: [...matchingConcepts.flatMap((c) => c.expandedTerms), ...extraTerms],
      targetFrameworkIds,
      articleNumbers: explicitArticles,
      limit: maxResults,
    }).catch(() => [] as StructuredChunk[]),
  ]);

  const localChunks =
    remoteLexChunks.length > 0 ? [...remoteLexChunks, ...localKbChunks] : localKbChunks;

  const globalSemChunks = (globalSemRes?.results ?? []).map(semanticRowToChunk);
  const scopedSemChunks = (scopedSemRes?.results ?? []).map(semanticRowToChunk);
  const expandedSemChunks = (expandedSemRes?.results ?? []).map(semanticRowToChunk);

  if (globalSemChunks.length === 0 && scopedSemChunks.length === 0 && expandedSemChunks.length === 0) {
    if (supabaseChunks.length === 0) {
      return localChunks.slice(0, maxResults);
    }
    const fused = new Map<string, { chunk: StructuredChunk; rrf: number }>();
    const addFallbackList = (list: StructuredChunk[], weight: number) => {
      list.forEach((ch, idx) => {
        const key = `${ch.lawId}::${ch.articleNumber || ch.sourceId}`;
        const contrib = weight / (30 + idx + 1);
        const prev = fused.get(key);
        if (prev) {
          prev.rrf += contrib;
          if (ch.content.length > prev.chunk.content.length) {
            prev.chunk = { ...ch, score: Math.max(prev.chunk.score || 0, ch.score || 0) };
          }
        } else {
          fused.set(key, { chunk: ch, rrf: contrib });
        }
      });
    };
    addFallbackList(localChunks, 1.05);
    addFallbackList(supabaseChunks, 1.0);
    return Array.from(fused.values())
      .sort((a, b) => b.rrf - a.rrf)
      .map((x) => ({ ...x.chunk, score: Math.round(x.rrf * 10000) }))
      .slice(0, maxResults);
  }

  interface CandidateAcc {
    key: string;
    chunk: StructuredChunk;
    lexRank: number;
    lexScore: number;
    globalSemRank: number;
    scopedSemRank: number;
    supaRank: number;
    rawSemScore: number;
  }

  const candidates = new Map<string, CandidateAcc>();
  const getKey = (ch: StructuredChunk) =>
    ch.articleNumber ? `${ch.lawId}::${ch.articleNumber}` : ch.sourceId;

  localChunks.forEach((ch, idx) => {
    const key = getKey(ch);
    const existing = candidates.get(key);
    if (!existing) {
      candidates.set(key, {
        key,
        chunk: ch,
        lexRank: idx,
        lexScore: ch.score ?? 0,
        globalSemRank: -1,
        scopedSemRank: -1,
        supaRank: -1,
        rawSemScore: ch.semanticScore ?? 0,
      });
    } else if ((ch.score ?? 0) > existing.lexScore) {
      existing.lexScore = ch.score ?? 0;
    }
  });

  const mergeSemanticList = (list: StructuredChunk[], isScoped: boolean) => {
    list.forEach((ch, idx) => {
      const key = getKey(ch);
      const existing = candidates.get(key);
      const sem = ch.semanticScore ?? 0;
      if (!existing) {
        candidates.set(key, {
          key,
          chunk: ch,
          lexRank: -1,
          lexScore: 0,
          globalSemRank: isScoped ? -1 : idx,
          scopedSemRank: isScoped ? idx : -1,
          supaRank: -1,
          rawSemScore: sem,
        });
      } else {
        if (isScoped && (existing.scopedSemRank === -1 || idx < existing.scopedSemRank)) {
          existing.scopedSemRank = idx;
        }
        if (!isScoped && (existing.globalSemRank === -1 || idx < existing.globalSemRank)) {
          existing.globalSemRank = idx;
        }
        if (sem > existing.rawSemScore) {
          existing.rawSemScore = sem;
        }
        if (!existing.chunk.chunkId && ch.chunkId) {
          existing.chunk = { ...existing.chunk, chunkId: ch.chunkId, documentId: ch.documentId };
        }
      }
    });
  };

  mergeSemanticList(globalSemChunks, false);
  mergeSemanticList(scopedSemChunks, true);
  mergeSemanticList(expandedSemChunks, false);

  supabaseChunks.forEach((ch, idx) => {
    const key = getKey(ch);
    const existing = candidates.get(key);
    if (!existing) {
      candidates.set(key, {
        key,
        chunk: ch,
        lexRank: -1,
        lexScore: 0,
        globalSemRank: -1,
        scopedSemRank: -1,
        supaRank: idx,
        rawSemScore: ch.semanticScore ?? 0,
      });
    } else if (existing.supaRank === -1 || idx < existing.supaRank) {
      existing.supaRank = idx;
    }
  });

  // Rerank all candidates (including non-cached doc_types like qerar/beynelxalq and SQL-only hits)
  const rerankBatch = Array.from(candidates.values()).slice(0, 85);
  const needsRerank = rerankBatch.filter((c) => c.rawSemScore <= 0);
  if (needsRerank.length > 0 && semanticQuery) {
    const rerankRes = await fetchSemanticBackend<RerankApiResponse>(
      "/rag/rerank",
      {
        query: semanticQuery,
        candidates: rerankBatch.map((c) => ({
          id: c.key,
          chunk_id: c.chunk.chunkId ?? null,
          title: `${c.chunk.lawName} ${c.chunk.articleTitle}`,
          text: `${c.chunk.articleTitle}\n${c.chunk.content.slice(0, 1200)}`,
        })),
      },
      timeoutMs
    );
    if (rerankRes?.scores) {
      for (const sc of rerankRes.scores) {
        const entry = candidates.get(String(sc.id));
        if (entry && sc.semantic_score > entry.rawSemScore) {
          entry.rawSemScore = sc.semantic_score;
        }
      }
    }
  }

  let maxLex = 1;
  for (const c of candidates.values()) {
    if (c.lexScore > maxLex) maxLex = c.lexScore;
  }

  const effWeight =
    mode === "hybrid" && explicitArticles.length > 0
      ? Math.min(semanticWeight, 0.16)
      : semanticWeight;

  const scoredPool: StructuredChunk[] = [];
  for (const c of candidates.values()) {
    const lexNorm = c.lexScore > 0 ? Math.min(1, c.lexScore / maxLex) : 0;
    // Calibrated linear scaling without min-max noise amplification
    const semNorm =
      c.rawSemScore > 0
        ? Math.max(0, Math.min(1, (c.rawSemScore - 0.25) / 0.60))
        : 0;

    const rrfLex = c.lexRank >= 0 ? 1 / (25 + c.lexRank + 1) : 0;
    const rrfSem = Math.max(
      c.globalSemRank >= 0 ? 1 / (25 + c.globalSemRank + 1) : 0,
      c.scopedSemRank >= 0 ? 1 / (25 + c.scopedSemRank + 1) : 0
    );
    const rrfSupa = c.supaRank >= 0 ? 0.85 / (25 + c.supaRank + 1) : 0;

    const docId =
      c.chunk.documentId ||
      LAW_REGISTRY[c.chunk.lawId]?.frameworkId?.toString() ||
      c.chunk.sourceUrl.match(/\/results\/(\d+)/)?.[1] ||
      "";
    const domainScale =
      mode === "semantic"
        ? 0.35
        : effectiveLawConf === "weak"
        ? 0.30
        : effectiveLawConf === "none"
        ? 0.50
        : 1.0;
    let domainPrior = 0;
    if (targetFrameworkIds[0] && docId === targetFrameworkIds[0]) {
      domainPrior = 0.14 * domainScale;
    } else if (docId && targetFrameworkIds.includes(docId)) {
      domainPrior = 0.08 * domainScale;
    }

    let artAlignBoost = 0;
    const artNum = c.chunk.articleNumber;
    const followUpArts = analysis.isFollowUp ? analysis.followUpPriorityArticles ?? [] : [];
    if (artNum && explicitArticles.length > 0) {
      if (explicitArticles.includes(artNum)) {
        artAlignBoost = 0.36;
      } else if (
        explicitArticles.some(
          (a) => artNum.startsWith(`${a}.`) || (a.includes(".") && artNum === a.split(".")[0])
        )
      ) {
        artAlignBoost = 0.28;
      }
    } else if (artNum && followUpArts.length > 0 && targetFrameworkIds.includes(docId)) {
      const idx = followUpArts.indexOf(artNum);
      if (idx !== -1) {
        artAlignBoost = Math.max(0.14, 0.26 - idx * 0.04);
      } else if (followUpArts.some((a) => artNum.startsWith(`${a}.`))) {
        artAlignBoost = 0.16;
      }
    }

    const weighted = (1 - effWeight) * lexNorm + effWeight * semNorm;
    const rrfFused = ((1 - effWeight) * rrfLex + effWeight * rrfSem + rrfSupa) * 14;
    const finalScore = weighted * 0.65 + rrfFused * 0.35 + domainPrior + artAlignBoost;

    scoredPool.push({
      ...c.chunk,
      documentId: docId || c.chunk.documentId,
      score: Math.round(finalScore * 1000),
      semanticScore: Number(c.rawSemScore.toFixed(4)),
    });
  }

  scoredPool.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const topFinal = scoredPool.slice(0, maxResults);

  // Enlarge short semantic-only chunks with full article text from local SQLite or remote RAG backend
  const localSqliteReady = isSqliteCorpusAvailable();
  const remoteReady = !localSqliteReady && isRemoteRagConfigured();
  if (localSqliteReady) {
    for (const ch of topFinal) {
      if (ch.content.length < 700 && ch.documentId && ch.articleNumber) {
        const enlarged = getSqliteDocumentById(ch.documentId, ch.articleNumber);
        if (enlarged?.content && enlarged.content.length > ch.content.length) {
          ch.content = enlarged.content.slice(0, 2600);
        }
      }
    }
  } else if (remoteReady) {
    await Promise.all(
      topFinal
        .filter((ch) => ch.content.length < 700 && ch.documentId && ch.articleNumber)
        .map(async (ch) => {
          const enlarged = await fetchRemoteDocumentById(ch.documentId!, ch.articleNumber!, timeoutMs);
          if (enlarged?.content && enlarged.content.length > ch.content.length) {
            ch.content = enlarged.content.slice(0, 2600);
          }
        })
    );
  }

  return topFinal;
}
