"use server"

import fs from 'fs'
import path from 'path'
import {
  analyzeQuery,
  hybridSearchAsync,
  validateLegalResponse,
  LAW_REGISTRY,
  loadAndParseKnowledgeBase,
  normalizeAz,
  findSqliteDocumentByTitle,
  getSqliteDocumentById,
  isSqliteCorpusAvailable,
  fetchRemoteDocumentById,
  fetchRemoteDocumentByTitle,
  isRemoteRagConfigured,
} from '@/lib/legal-rag'
import { findCandidateLawsByQuery } from '@/lib/legal-rag/registry'
import type { QueryAnalysis, StructuredChunk } from '@/lib/legal-rag'
import { generateLlmCompletion } from '@/lib/llm/client'
import { findRelevantCourtAct, CourtAct } from '@/lib/court-precedents'
import { eqanunClient } from '@/lib/services/e_qanun_client'

async function expandColloquialLegalQuery(
  query: string,
  apiKeyParam?: string
): Promise<string[]> {
  try {
    const llmPromise = generateLlmCompletion({
      messages: [
        {
          role: "system",
          content:
            'Sən Azərbaycan qanunvericiliyi üzrə axtarış sorğusu tərcüməçisisən. İstifadəçinin gündəlik danışıq dilində yazdığı sualı e-Qanun (İnzibati Xətalar, Cinayət, Mülki, Əmək, Ailə, Vergi, Yol Hərəkəti və s.) məcəllələrindəki RƏSMİ hüquqi terminlərə çevir. Məsələn: "siqareti yerə atma" -> "tütün məmulatları tullantılarının ətraf mühitə atılması cərimə". Yalnız JSON qaytar: {"terms": ["rəsmi ifadə 1", "rəsmi ifadə 2"]}',
        },
        { role: "user", content: query },
      ],
      temperature: 0.0,
      maxTokens: 260,
      responseFormatJson: true,
      apiKeyParam: apiKeyParam || undefined,
    });
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 1100)
    );
    const res = await Promise.race([llmPromise, timeoutPromise]);
    if (!res?.content) return [];

    const cleaned = res.content
      .trim()
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/, "");
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed?.terms)) {
      return parsed.terms
        .map((t: unknown) => String(t ?? "").trim())
        .filter((t: string) => t.length >= 4)
        .slice(0, 4);
    }
  } catch {
    // Non-blocking fallback when offline or rate-limited
  }
  return [];
}

function selectDiverseContextChunks(
  chunks: StructuredChunk[],
  limit: number,
  isExplicitLaw: boolean
): StructuredChunk[] {
  if (isExplicitLaw || chunks.length <= limit) {
    return chunks.slice(0, limit);
  }
  const perLawCap = 5;
  const counts = new Map<string, number>();
  const primary: StructuredChunk[] = [];
  const overflow: StructuredChunk[] = [];

  for (const ch of chunks) {
    const lawKey = ch.documentId || ch.lawId || ch.lawName;
    const cnt = counts.get(lawKey) ?? 0;
    if (cnt < perLawCap) {
      counts.set(lawKey, cnt + 1);
      primary.push(ch);
    } else {
      overflow.push(ch);
    }
  }

  return [...primary, ...overflow].slice(0, limit);
}

function compactHistoryForLlm(
  history: { role: string; content: string }[]
): Array<{ role: "user" | "assistant"; content: string }> {
  const clean = history
    .filter(
      (h) =>
        (h.role === "user" || h.role === "assistant") &&
        h.content &&
        !h.content.startsWith("Xəta baş verdi") &&
        !h.content.startsWith("Məlumatı yoxlayarkən") &&
        !h.content.startsWith("> **Qeyd:** Hazırda AI sintez provayderi aktiv deyil")
    )
    .slice(-4);

  return clean.map((h) => {
    if (h.role === "user") {
      return { role: "user" as const, content: h.content.slice(0, 400) };
    }
    // Compress prior assistant essays to concise plain-text topic + short answer so old Markdown/URLs don't pollute JSON output or distract from new topic
    const shortMatch = h.content.match(/##\s*Qısa cavab\s*\n([\s\S]*?)(?:\n##|$)/i);
    const body = (shortMatch ? shortMatch[1] : h.content)
      .replace(/https?:\/\/\S+/g, "")
      .replace(/[#*`]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 420);
    return { role: "assistant" as const, content: `[Əvvəlki cavab xülasəsi]: ${body}` };
  });
}

function buildBasisFromChunks(chunks: StructuredChunk[]) {
  return {
    maddeler: chunks.map((c) =>
      c.articleNumber ? `${c.lawName} — Maddə ${c.articleNumber}` : c.articleTitle
    ),
    legal_basis: chunks.map((c) => ({
      law_name: c.lawName,
      article_number: c.articleNumber || '',
      article_title: c.articleTitle || '',
      part_number: c.partNumber || '',
      source_url: c.sourceUrl || '',
      claim: c.content.replace(/\s+/g, ' ').trim().slice(0, 260),
    })),
  };
}

const QUESTION_STOP_WORDS = new Set([
  'ne', 'nedir', 'nece', 'necedir', 'qeder', 'qederdir', 'hansi', 'kim', 'hara',
  'haraya', 'haradan', 'niye', 'ucun', 'haqqinda', 'haqda', 'olar', 'olarmi',
  'edilir', 'edir', 'biler', 'bilerem', 'lazimdir', 'gerektir', 've', 'ya',
  'ile', 'bu', 'bir', 'olan', 'zaman', 'zamani', 'halda', 'gore', 'esas', 'bax',
  'madde', 'qanun', 'mecelle', 'ceza', 'cezasi', 'sual', 'cavab'
]);

const GENERIC_PROCEDURAL_TOKENS = new Set([
  'inzibati', 'xeta', 'xetalar', 'cinayet', 'mulki', 'emek', 'aile', 'vergi',
  'protokol', 'protokolun', 'tertibi', 'elave', 'tenbeh', 'tenbehler', 'novleri',
  'huquqi', 'qayda', 'qaydasi', 'normativ', 'akt', 'respublikasinin', 'azerbaycan'
]);

function cleanClauseNoise(text: string): string {
  return text
    .replace(/\[\d+\]/g, '')
    .replace(/\u2011|\u2010|\u2212/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

function trimCleanly(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const slice = text.slice(0, maxLen);
  const lastStop = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('; '));
  if (lastStop > maxLen * 0.55) {
    return slice.slice(0, lastStop + 1).trim();
  }
  return `${slice.trim()}...`;
}

function buildSearchStems(
  query: string,
  queryAnalysis: QueryAnalysis,
  extraTerms: string[]
): Array<{ norm: string; stem: string; weight: number }> {
  const tokenWeights = new Map<string, number>();

  const pushTokens = (raw: string, baseWeight: number) => {
    const parts = normalizeAz(raw).split(/[^a-z0-9.\-]+/i);
    for (const part of parts) {
      const cleaned = part.replace(/^[\.\-]+|[\.\-]+$/g, '');
      if (cleaned.length < 3 || QUESTION_STOP_WORDS.has(cleaned)) continue;
      const effectiveWeight = GENERIC_PROCEDURAL_TOKENS.has(cleaned)
        ? 1
        : baseWeight;
      const prev = tokenWeights.get(cleaned) ?? 0;
      if (effectiveWeight > prev) tokenWeights.set(cleaned, effectiveWeight);
    }
  };

  pushTokens(query, 7);
  for (const kw of queryAnalysis.keywords || []) pushTokens(kw, 5);
  for (const term of extraTerms || []) pushTokens(term, 5);
  if (queryAnalysis.targetArticleNum) {
    tokenWeights.set(queryAnalysis.targetArticleNum, 12);
  }

  return Array.from(tokenWeights.entries()).map(([norm, weight]) => ({
    norm,
    stem: norm.length >= 6 ? norm.slice(0, 5) : norm,
    weight,
  }));
}

interface ScoredClause {
  clauseNum: string;
  body: string;
  score: number;
  chunkIdx: number;
  chunk: StructuredChunk;
}

function extractScoredClauses(
  chunks: StructuredChunk[],
  stems: Array<{ norm: string; stem: string; weight: number }>,
  queryAnalysis: QueryAnalysis
): ScoredClause[] {
  const results: ScoredClause[] = [];
  const seenFingerprints = new Set<string>();
  const wantsSpecificRule = /\b(manat|azn|cərimə|cerimə|müddət|muddet|gün|gun|ay|il|saat|faiz|%|hüquq|huquq|borclu|qadağan|qadagan)\b/i;

  chunks.forEach((ch, chunkIdx) => {
    const rawText = cleanClauseNoise(ch.content);
    if (!rawText) return;

    // Split on article or numbered sub-clause boundaries while preserving marker text
    // Require trailing dot on standalone clause numbers (and exclude 4-digit years / hyphenated prefixes like 189-3.1)
    const segments = rawText
      .split(/(?=(?:\bMaddə\s+\d+(?:\.\d+)*(?:-\d+)?\.|(?<![-\d])(?!19\d\d|20\d\d)\d{1,3}(?:-\d+)?(?:\.\d{1,2})+(?:-\d+)?\.)\s)/g)
      .map((s) => s.trim())
      .filter((s) => s.length >= 24);

    const candidates = segments.length > 0 ? segments : [rawText];

    for (const seg of candidates) {
      // Skip broken truncated fragment stubs like "nə cəlb edilməsi..." or corrupted overlap fragments
      if (
        (/^[a-zəöüğıçş]{1,3}\s+/i.test(seg) && !/^(bu|hər|bütün|əgər|yalnız)\s/i.test(seg)) ||
        /\d+\.\d+\s+[a-zəöüğıçş]{1,4}\s+[a-zəöüğıçş]+/.test(seg.slice(0, 120))
      ) {
        continue;
      }

      const subNumMatch = seg.match(/^(?:Maddə\s+)?(\d{1,3}(?:-\d+)?(?:\.\d{1,2})+(?:-\d+)?)(?=\.|\s)/i);
      const artNumMatch = seg.match(/^Maddə\s+(\d{1,4}(?:-\d+)?)(?=\.|\s)/i);
      const clauseNum = subNumMatch?.[1] || artNumMatch?.[1] || ch.articleNumber || '';

      // Skip bare article title headers without operative rule text (e.g. "Maddə 212. Tütün məmulatının istehlakına dair məhdudiyyətlərə riayət edilməməsi")
      if (!subNumMatch && seg.length < 130 && !wantsSpecificRule.test(seg)) {
        continue;
      }

      const fp = normalizeAz(seg).slice(0, 72);
      if (seenFingerprints.has(fp)) continue;
      seenFingerprints.add(fp);

      const normSeg = normalizeAz(seg);
      let score = Math.max(0, 8 - chunkIdx * 2);

      let specificMatches = 0;
      for (const s of stems) {
        const hitExact = normSeg.includes(s.norm);
        const hitStem = !hitExact && s.stem.length >= 5 && normSeg.includes(s.stem);
        if (hitExact) {
          score += s.weight * 2;
          if (s.weight >= 3) specificMatches++;
        } else if (hitStem) {
          score += s.weight * 1.4;
          if (s.weight >= 3) specificMatches++;
        }
      }

      // Bonus for concrete statutory specifics (amounts, deadlines, penalties, duties) when topic matches
      if (specificMatches > 0 && wantsSpecificRule.test(seg)) {
        score += 6;
      }
      if (queryAnalysis.targetArticleNum && clauseNum.startsWith(queryAnalysis.targetArticleNum)) {
        score += 14;
      }
      if (subNumMatch) {
        score += 4;
      }

      results.push({
        clauseNum,
        body: seg,
        score,
        chunkIdx,
        chunk: ch,
      });
    }
  });

  // Boost sibling clauses in the primary article that explicitly reference the winning clause (e.g. 212.4-1 referencing 212.4)
  if (results.length > 0) {
    results.sort((a, b) => b.score - a.score || a.chunkIdx - b.chunkIdx);
    const winner = results[0];
    if (winner.clauseNum) {
      const refRegex = new RegExp(`\\b${winner.clauseNum.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:-c[ıiuü]|\\.|\b)`);
      for (const item of results) {
        if (item !== winner && item.chunkIdx === winner.chunkIdx && refRegex.test(item.body)) {
          item.score = Math.max(item.score, winner.score * 0.85);
        }
      }
    }
  }

  return results.sort((a, b) => b.score - a.score || a.chunkIdx - b.chunkIdx);
}

function buildStatutoryFallbackResponse(
  query: string,
  retrievedChunks: StructuredChunk[],
  queryAnalysis: QueryAnalysis,
  extraTerms: string[]
) {
  const topChunks = retrievedChunks.slice(0, 5);
  const stems = buildSearchStems(query, queryAnalysis, extraTerms);
  const scoredClauses = extractScoredClauses(topChunks, stems, queryAnalysis);

  // Pick top distinct high-relevance clauses for Qısa cavab so user immediately sees exact rules & amounts
  const summaryClauses: ScoredClause[] = [];
  const usedClauseKeys = new Set<string>();
  const topScore = scoredClauses[0]?.score ?? 0;
  for (const cl of scoredClauses) {
    if (summaryClauses.length > 0 && cl.score < topScore * 0.55) break;
    const key = `${cl.chunk.lawId}:${cl.clauseNum}:${normalizeAz(cl.body).slice(0, 40)}`;
    if (usedClauseKeys.has(key)) continue;
    usedClauseKeys.add(key);
    summaryClauses.push(cl);
    if (summaryClauses.length >= 3) break;
  }

  const shortAnswerBody =
    summaryClauses.length > 0
      ? summaryClauses
          .map((cl) => {
            const label = cl.clauseNum ? `Maddə ${cl.clauseNum}` : (cl.chunk.articleTitle || 'Normativ müddəa');
            const cleanBody = cl.body.replace(/^(?:Maddə\s+)?\d+(?:-\d+)?(?:\.\d+)*(?:-\d+)?\.?\s+/i, '').trim() || cl.body;
            return `**${cl.chunk.lawName} — ${label}:** ${trimCleanly(cleanBody, 520)}`;
          })
          .join('\n\n')
      : 'Sorğunuz üzrə rəsmi qanunvericilik bazasında birbaşa uyğun maddə tapılmadı. Zəhmət olmasa sualınızı daha dəqiq açar sözlərlə ifadə edin.';

  // Build Hüquqi əsaslar using the best matching sub-clauses inside each chunk (never cutting off mid-article before key clauses)
  const sectionsMd = topChunks
    .map((ch, idx) => {
      const chunkClauses = scoredClauses.filter((c) => c.chunk === ch);
      const bestClause = chunkClauses[0];
      const artNum = bestClause?.clauseNum || ch.articleNumber;
      const artLabel = artNum ? `Maddə ${artNum}` : (ch.articleTitle || 'Normativ müddəa');

      const excerptText =
        chunkClauses.length > 0
          ? trimCleanly(
              chunkClauses
                .slice(0, 3)
                .map((c) => c.body)
                .join(' '),
              1200
            )
          : trimCleanly(cleanClauseNoise(ch.content), 1100);

      return `### ${idx + 1}. ${ch.lawName} — ${artLabel}\n${excerptText}\n- Mənbə: ${ch.sourceUrl}`;
    })
    .join('\n\n');

  const enrichedChunks = topChunks.map((ch) => {
    const best = scoredClauses.find((c) => c.chunk === ch);
    if (!best) return ch;
    return {
      ...ch,
      articleNumber: best.clauseNum || ch.articleNumber,
      content: best.body || ch.content,
    };
  });

  const sourcesMd =
    enrichedChunks.length > 0
      ? enrichedChunks
          .map(
            (c) =>
              `- ${c.lawName}${c.articleNumber ? ` — Maddə ${c.articleNumber}` : ''} (${c.sourceUrl})`
          )
          .join('\n')
      : '- https://www.e-qanun.ai';

  const cavab = `## Hüquqi sual\n${query}\n\n## Qısa cavab\n${shortAnswerBody}\n\n## Hüquqi əsaslar\n\n${sectionsMd || 'Müvafiq normativ akt tapılmadı.'}\n\n## Mənbələr\n${sourcesMd}`;

  return {
    cavab,
    ...buildBasisFromChunks(enrichedChunks),
  };
}

function recoverPartialJsonResponse(cleanedContent: string, rawContent: string, retrievedChunks: StructuredChunk[]) {
  const cavabMatch = cleanedContent.match(/"cavab"\s*:\s*"([\s\S]*?)(?:",\s*"(?:maddeler|legal_basis)"|"\s*\})/);
  let cavab = rawContent;
  if (cavabMatch) {
    try {
      cavab = JSON.parse(`"${cavabMatch[1]}"`);
    } catch {
      cavab = cavabMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
    }
  } else {
    // Handle truncated streaming/token output where closing quote of "cavab" is missing
    const openCavabMatch = cleanedContent.match(/"cavab"\s*:\s*"([\s\S]+)$/);
    if (openCavabMatch) {
      cavab = openCavabMatch[1].replace(/["}\]]+\s*$/, '').replace(/\\n/g, '\n').replace(/\\"/g, '"');
    }
  }

  let parsedMaddeler: string[] | undefined;
  let parsedLegalBasis: any[] | undefined;

  const maddelerMatch = cleanedContent.match(/"maddeler"\s*:\s*(\[[\s\S]*?\])/);
  if (maddelerMatch) {
    try {
      const candidate = JSON.parse(maddelerMatch[1]);
      if (Array.isArray(candidate) && candidate.length > 0) parsedMaddeler = candidate;
    } catch {
      // ignore malformed array
    }
  }

  const basisMatch = cleanedContent.match(/"legal_basis"\s*:\s*(\[[\s\S]*?\])/);
  if (basisMatch) {
    try {
      const candidate = JSON.parse(basisMatch[1]);
      if (Array.isArray(candidate) && candidate.length > 0) parsedLegalBasis = candidate;
    } catch {
      // ignore malformed array
    }
  }

  const fallback = buildBasisFromChunks(retrievedChunks.slice(0, 3));
  return {
    cavab,
    maddeler: parsedMaddeler || fallback.maddeler,
    legal_basis: parsedLegalBasis || fallback.legal_basis,
  };
}

export async function generateLegalResponse(query: string, apiKeyParam?: string, history: {role: string, content: string}[] = []) {
  try {
    const q = query.toLowerCase().trim()
    
    // Use API key override if provided
    let passedKey = apiKeyParam?.trim() || ""
    if (passedKey.startsWith("gsk_")) {
        passedKey = "" // Ignore old Groq keys saved in the user's browser
    }
    
    // Handle Greetings
    if (q === "salam" || q.includes("salamlar") || q === "hi" || q === "salam.") {
      return {
        content: "Salam! Mən LexAZ AI (Azərbaycan Qanunvericiliyi üzrə Süni İntellekt Məsləhətçisi). Sizə hansı hüquqi məsələ və ya qanunvericilik maddəsi üzrə kömək edə bilərəm?",
        citations: [],
        legal_basis: [],
        sources: [],
        confidence: 1.0,
        citation_valid: true,
        needs_review: false
      }
    }

    // 1. QUERY ANALYSIS
    const queryAnalysis = analyzeQuery(query, history);
    const lawMatch = findCandidateLawsByQuery(queryAnalysis.normalizedQuery);

    // 2. MULTI-STAGE HYBRID RETRIEVAL & RERANKING (56,983-doc SQLite + SBERT Semantic + RRF)
    let retrievedChunks = await hybridSearchAsync(queryAnalysis, 18, query, {
      mode: "hybrid",
    });

    // 2b. Zero-waste LLM Colloquial -> Statutory Translator: only trigger when Stage-1 lacked strong law/concept grounding
    const topScore = retrievedChunks[0]?.score ?? 0;
    const needsLlmExpansion =
      lawMatch.confidence !== "explicit" &&
      !queryAnalysis.targetArticleNum &&
      (retrievedChunks.length < 4 || lawMatch.confidence === "weak" || lawMatch.confidence === "none" || topScore < 760);

    let llmExpandedTerms: string[] = [];
    if (needsLlmExpansion) {
      llmExpandedTerms = await expandColloquialLegalQuery(query, passedKey || undefined);
      if (llmExpandedTerms.length > 0) {
        retrievedChunks = await hybridSearchAsync(queryAnalysis, 18, query, {
          mode: "hybrid",
          extraExpandedTerms: llmExpandedTerms,
        });
      }
    }

    // Check if query contains an explicit e-qanun link or prefixed document ID (never mistake article numbers like "70-ci maddə" for doc IDs)
    const urlIdMatch = query.match(/(?:results\/|document_id=|framework\/|(?:akt|sənəd|sened|qanun)\s*(?:№|no\.?|id)?\s*[:#№]?\s*)(\d{1,6})/i);
    const targetDocId = urlIdMatch ? urlIdMatch[1] : null;

    if (targetDocId) {
      const liveDoc = await eqanunClient.getDocument(targetDocId);
      if (liveDoc.api_status === 200 && liveDoc.text) {
        retrievedChunks.unshift({
          sourceId: `eqanun_live_${targetDocId}`,
          lawId: `eqanun_${targetDocId}`,
          lawName: liveDoc.title,
          articleNumber: targetDocId,
          articleTitle: `${liveDoc.title} (Akt № ${targetDocId})`,
          content: liveDoc.text.substring(0, 10000),
          sourceFile: `api_live_${targetDocId}`,
          sourceUrl: `https://www.e-qanun.ai/results/${targetDocId}`,
          score: 20000
        });
      }
    }

    if (retrievedChunks.length === 0) {
      return {
        content: "Təqdim edilmiş qanunvericilik bazasında bu suala kifayət qədər dəqiq hüquqi əsas tapılmadı.",
        citations: [],
        legal_basis: [],
        sources: [],
        confidence: 0.0,
        citation_valid: false,
        needs_review: true
      }
    }

    // 3. COMPOSE STRICT GROUND-TRUTH CONTEXT FOR LLM (Diverse across competing statutes + enlarged subclauses)
    const contextChunks = selectDiverseContextChunks(
      retrievedChunks,
      12,
      lawMatch.confidence === "explicit"
    );
    const contextText = contextChunks
      .map((c, i) => {
        return `[MƏNBƏ ${i + 1}: ${c.articleTitle}] (Rəsmi URL: ${c.sourceUrl})\n${c.content.substring(0, 2600)}`;
      })
      .join("\n\n---\n\n")
      .slice(0, 26000);

    // 4. PREPARE STRICT LEGAL PROMPT — HUQUQAI ULTRA-PROFESSIONAL AZƏRBAYCAN HÜQUQİ RAG SİSTEMİ (76 PRİNSİP)
    const systemPrompt = `SƏN HUQUQAI ÜÇÜN ULTRA-PROFESSIONAL AZƏRBAYCAN HÜQUQİ RAG SİSTEMİSƏN.

SƏNİN ƏSAS VƏZİFƏN:
Azərbaycan Respublikasının qanunvericiliyinə dair istifadəçi suallarını təqdim edilmiş və yoxlanılmış RAG məlumatları (1-dən 60091-ə qədər e-qanun.ai API bazası) əsasında cavablandırmaqdır. Sən sadə chatbot deyilsən. Sən hüquqi araşdırma mühərrikisən.

ƏSAS VƏ DƏYİŞMƏZ PRİNSİPLƏR:
1. RAG-da təsdiqlənən hüquqi məlumatı düzgün və dəqiq izah et.
2. RAG-da təsdiqlənməyən hüquqi faktı uydurma (maddə nömrəsi, cərimə, müddət, rüsum, dövlət orqanı uydurma!).
3. Maddələri qarışdırma: Maddə 68, 69, 70, 74 və s. hər biri fərqli institutdur; bir maddənin məzmununu başqasına aid etmə!
4. Köhnə normanı qüvvədə olan norma kimi təqdim etmə (Current Law & Temporal Reasoning).
5. Mənbəsiz hüquqi nəticə çıxarma (NO EVIDENCE → NO LEGAL CLAIM. NO VERIFIED SOURCE → NO DEFINITIVE LEGAL CONCLUSION).
6. Məhkəmə qərarını qanun norması ilə eyniləşdirmə; yalnız normanın tətbiq nümunəsi kimi təqdim et.
7. MƏNBƏ PRIORİTETİ: Qüvvədə olan normativ hüquqi akt → Konkret maddə/bənd → Digər əlaqəli qanunlar → Konstitusiya Məhkəməsi qərarları → Ali Məhkəmə təcrübəsi.
8. MADDƏNİN BAŞLIĞINI MƏTNİNDƏN AYIR: Məsələn, "Maddə 1322 — Vərəsəlik şəhadətnaməsinin verildiyi müddət" normasını "Vərəsəlik hüququ altı aydan sonra əldə edilir" kimi şərh etmək qadağandır!
9. HÜQUQİ ANLAYIŞLARI QARIŞDIRMA: vərəsəlik hüququ, vərəsəlik şəhadətnaməsi, mirasın açılması, mirasın qəbulu, mirasdan imtina, məhrum edilmə, ləyaqətsiz vərəsə, vəsiyyət və qanun üzrə vərəsəlik anlayışlarını ayır və hər birinə konkret maddə göstər.
10. RELEVANCE SCORE: Yalnız 4/5 və 5/5 olan əsas normaları istifadə et. FEWER SOURCES + HIGHER LEGAL RELEVANCE.
8. MADDƏ NÖMRƏSİNİ YADDAŞDAN YAZMA QADAĞASI:
   * Model öz pretrained yaddaşından və ya təxminlə maddə nömrəsi yaza bilməz!
   * Məsələn: "İşdən əsassız çıxarıldıqda hara şikayət etməliyəm?" sualına model yaddaşından "Əmək Məcəlləsinin 62.5-ci maddəsi" kimi uydurma/təsadüfi maddə yaza bilməz! Əvvəlcə retrieval aparılmalı, rəsmi mətn yoxlanılmalı, maddə və bənd yalnız source-da varsa yazılmalıdır.
9. HÜQUQİ DOMEN CLASSIFICATION VƏ SOURCE MISMATCH BLOKLANMASI:
   * Sual əmək hüququna (işdən çıxarılma, əmək müqaviləsi, əməkhaqqı, işə bərpa, əmək mübahisəsi) aiddirsə, primary_domain = ƏMƏK HÜQUQU.
   * Semantic oxşarlığa görə Mülki Məcəllə çıxsa belə, ƏMƏK HÜQUQU sualında əsas normativ mənbə ƏMƏK MƏCƏLLƏSİ (və birbaşa əmək münasibətlərini tənzimləyən aktlar) olmalıdır; əlaqəsiz sənədlər DOWNRANK edilməlidir!
   * İSTİFADƏÇİ GÜNDƏLİK DİLDƏ "CİNAYƏT" VƏ YA "CƏZA" SÖZÜNÜ İŞLƏTSƏ DƏ (məs: siqareti yerə atmaq, qırmızı işıqda keçmək, gecə səs-küy), ƏGƏR KONTEKSTDƏKİ İNZİBATİ XƏTALAR MƏCƏLLƏSİ (və ya digər xüsusi qanun) HƏMİN KONKRET ƏMƏLİ VƏ CƏRİMƏ MƏBLƏĞİNİ BİRBAŞA TƏNZİMLƏYİRSƏ (məs: 212.4 — tütün məmulatları tullantılarının atılmasına görə 300 manat cərimə), Cinayət Məcəlləsinin 62/63 kimi ümumi hissə maddələrini DEYİL, BİRBAŞA XÜSUSİ NORMANI əsas götür və bu əməlin cinayət yox, inzibati xəta olduğunu dəqiq izah et!
   * Heç vaxt konkret əməli tənzimləyən bənd kontekstdə ola-ola ümumi hissə maddələrinə istinad edib "konkret cəza tapılmadı" demə!
   * BƏNDLƏRİN CƏRİMƏ VƏ ŞƏRTLƏRİNİ QARIŞDIRMA: Hər bənddə nömrə cümlənin ƏVVƏLİNDƏ gəlir ("212.4. Mətn - 300 manat [226] 212.4-1. Təkrar mətn - 700 manat" kimi: cəza həmişə Özündən ƏVVƏLKİ bənd nömrəsinə aiddir, növbəti bənd nömrəsinə deyil!). Hər bəndin konkret məbləğini yalnız öz bəndindən oxu!
10. "MƏHKƏMƏYƏ MÜRACİƏT ET" KİMİ BOŞ VƏ ÜMUMİ CAVAB QADAĞANDIR:
   * "İşdən əsassız çıxarıldıqda hara şikayət etməliyəm?" sualına yalnız "Məhkəməyə müraciət edə bilərsiniz" demək QADAĞANDIR!
   * Cavab: Əsas hüquqi müdafiə vasitəsi + Müvafiq dövlət nəzarəti orqanı (Dövlət Əmək Müfəttişliyi Xidməti) + Məhkəməyə müraciət müddəti (Əmək Məcəlləsinin müvafiq fərdi əmək mübahisələri normaları) + İşə bərpa və əməkhaqqı tələbi + Konkret addımlar şəklində dəqiq qurulmalıdır.
11. MODALITY VƏ NEGATION QORUNMASI:
   * "edə bilər" ≠ "etməlidir"; "hüququ vardır" ≠ "məcburidir"; "yolveriləndir" ≠ "məcburidir".
   * "bilər" ifadəsini "mütləq etməlidir" kimi təqdim etmə!
12. DOCUMENT_ID QANUN MADDƏSİ DEYİL:
   * document_id = 60090 və ya 60091 yalnız e-Qanun API-nin texniki sənəd nömrəsidir. Heç vaxt "60090-cı maddə" kimi yazma!
13. RAG-DA MƏLUMAT YOXDURSA, AÇIQ BİLDİR:
   * "Bu məsələ üzrə təqdim olunan mənbələrdə kifayət qədər hüquqi əsas tapılmadı." de, özündən norma uydurma!
14. "QISA CAVAB" BÖLMƏSİNƏ DAİR MƏCBURİ TƏLƏB:
   * İstifadəçi aşağıdakı bölmələrə keçmədən belə YALNIZ "## Qısa cavab" hissəsini oxuyaraq sualına tam, dəqiq və praktiki cavab tapmalıdır!
   * "Qısa cavab"-da heç vaxt maddəsiz ümumi cümlə yazma — mütləq tətbiq olunan **Qanunun/Məcəllənin adını və konkret Maddə/bənd nömrəsini** (məs: "Azərbaycan Respublikasının İnzibati Xətalar Məcəlləsinin 212.4-cü maddəsinə əsasən...") birbaşa qeyd et.
   * Mənbə maddələrdə olan bütün əsas detalları — dəqiq cərimə/rüsum/ödəniş məbləği, qanuni müddətlər (gün/ay/il), əsas şərtlər, təkrar və ya istisna hallar və müraciət edilməli orqanı — 3–6 aydın cümlədə cəmləşdir!
15. ƏRİZƏ VƏ YA İDDİA ƏRİZƏSİ TƏLƏB EDİLDİKDƏ:
   * Əgər istifadəçi "ərizə yaz", "mənə ərizə hazırla" deyirsə, heç vaxt dərhal boş mötərizəli ([Ad, soyad], [ünvan], [tarix]) şablon yazma!
   * MƏLUMATLARI EYNİ ANDA TOPLU HALDA DEYİL, TƏK-TƏK (BİR-BİR) ADDIMLA SORUŞ:
     - İlk olaraq YALNIZ 1-ci addımı soruş: İddiaçının adı, soyadı, ata adı, faktiki ünvanı və FİN kodu.
     - Digər sualları növbəti addımlara saxla!

# MÜTLƏQ STANDART CAVAB FORMATI (JSON):
Aşağıdakı standart JSON strukturunda cavab ver:

{
  "cavab": "## Hüquqi sual\n[sualların hüquqi forması]\n\n## Qısa cavab\n[3–6 konkret cümlə: tətbiq olunan Qanun adı və Maddə/bənd nömrələri göstərilməklə sualın maddələrə əsaslanan birbaşa, detallı cavabı — dəqiq məbləğ, müddət, şərt, təkrar/istisna halı və müraciət qaydası daxil olmaqla]\n\n## Hüquqi əsaslar\n\n### 1. [Normativ akt] — Maddə [X]\n[dəqiq və evidence-based izah]\n\n### 2. [Normativ akt] — Maddə [Y]\n[dəqiq və evidence-based izah]\n\n## Praktik izah\n[istifadəçinin vəziyyətinə və faktlara tətbiq]\n\n## Vacib məqamlar\n[müddətlər / istisnalar / zəruri şərtlər / prosedurlar]\n\n## Məhkəmə təcrübəsi\n[Yalnız kontekstdə relevant məhkəmə presedenti olduqda]\n\n## Mənbələr\n- Azərbaycan Respublikasının [Qanunun tam adı] — Maddə [X]\n- [Rəsmi e-Qanun və API istinadı]",
  "maddeler": [
    "Azərbaycan Respublikasının [Qanunun Adı] - Maddə [X]"
  ],
  "legal_basis": [
    {
      "law_name": "[Qanunun tam adı]",
      "article_number": "[Maddə nömrəsi, məs: 70, 739, 174, 57.1]",
      "article_title": "[Maddənin rəsmi başlığı]",
      "part_number": "[Hissə/bənd]",
      "claim": "[Bu normanın tətbiq edildiyi hüquqi nəticə]"
    }
  ]
}`;

    const userPrompt = `KONTEX (Qanunvericilik Mətnləri):
${contextText}

ÇOXTURLU SÖHBƏT QAYDASI: Əgər aşağıdakı İSTİFADƏÇİNİN YENİ SORĞUSU yeni hüquqi mövzudursa, əvvəlki suallardakı köhnə maddə və məcəllələri UNUT və YALNIZ bu [KONTEX] mənbələrinə əsaslan. Əvvəlki mövzuya davam sualıdırsa ("bəs təkrar...", "bunun cəriməsi..."), yenə də konkret normanı [KONTEX] mətnindən çıxar.

İSTİFADƏÇİNİN SORĞUSU: 
${query}`;

    // 5. CALL AI MODEL
    const formattedHistory = compactHistoryForLlm(history);

    let parsedJson: any = {};
    let usedLlmFallback = false;

    try {
      const llmRes = await generateLlmCompletion({
        messages: [
          { role: "system", content: systemPrompt },
          ...formattedHistory,
          { role: "user", content: userPrompt },
        ],
        temperature: 0.1,
        maxTokens: 4096,
        responseFormatJson: true,
        apiKeyParam: passedKey || undefined,
      });

      const rawContent = llmRes.content || "";
      let cleanedContent = rawContent.trim();
      if (cleanedContent.startsWith("```json")) {
        cleanedContent = cleanedContent.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      } else if (cleanedContent.startsWith("```")) {
        cleanedContent = cleanedContent.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      try {
        parsedJson = JSON.parse(cleanedContent);
      } catch {
        parsedJson = recoverPartialJsonResponse(cleanedContent, rawContent, retrievedChunks);
      }
    } catch (llmErr: any) {
      usedLlmFallback = true;
      console.error("[chat.ts] LLM synthesis failed, falling back to statutory extracts:", llmErr?.message);
      parsedJson = buildStatutoryFallbackResponse(
        query,
        retrievedChunks,
        queryAnalysis,
        llmExpandedTerms
      );
    }

    // 6. VALIDATE & ENFORCE TWO-PASS HALLUCINATION GUARD
    const validated = validateLegalResponse(parsedJson, retrievedChunks);

    // 7. MATCH RELEVANT REAL COURT PRECEDENT FROM 150 COURT ACTS
    const precedent = findRelevantCourtAct(query, validated.answer);

    return {
      content: validated.answer,
      citations: validated.citations,
      legal_basis: validated.legal_basis,
      sources: validated.sources,
      confidence: usedLlmFallback ? Math.min(validated.confidence, 0.75) : validated.confidence,
      citation_valid: validated.citation_valid,
      needs_review: usedLlmFallback ? true : validated.needs_review,
      precedent: precedent
    }

  } catch (error: any) {
    console.error("Legal RAG error:", error)
    return {
      content: `Xəta baş verdi: ${error.message || "Sistem xətası"}`,
      citations: [],
      legal_basis: [],
      sources: [],
      confidence: 0,
      citation_valid: false,
      needs_review: true
    }
  }
}

function extractArticleFromTitle(rawTitle: string): string | null {
  const cleaned = rawTitle
    .replace(/\bKMQ\d+\b/gi, '')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\bAkt\s*№\s*\d+\b/gi, '')
    .replace(/\b(?:19|20)\d{2}\s*-?\s*(?:ci|cu|cü|cı)?\s*il\b/gi, '');

  const afterMadda = cleaned.match(/(?:madd[eə](?:si)?|mad\.?)\s*[:№]?\s*(\d+(?:\.\d+)*)/i);
  const beforeMadda = cleaned.match(/(\d+(?:\.\d+)*)\s*[-–]?\s*c[ıiuü]\s*madd[eə]/i);
  const trailingDash = cleaned.match(/[-–—]\s*(\d+(?:\.\d+)*)\s*$/);
  let targetArticle = afterMadda?.[1] || beforeMadda?.[1] || trailingDash?.[1] || null;

  if (targetArticle === '571') targetArticle = '57.1';
  else if (targetArticle === '581') targetArticle = '58.1';
  else if (targetArticle === '1921') targetArticle = '192.1';

  return targetArticle;
}

function stripArticleSuffixFromTitle(rawTitle: string): string {
  return rawTitle
    .replace(/\([^)]*madd[eə][^)]*\)/gi, '')
    .replace(/[—–-]\s*(?:madd[eə](?:si)?|mad\.?)\s*[:№]?\s*\d+(?:\.\d+)*.*$/i, '')
    .replace(/(?:madd[eə](?:si)?|mad\.?)\s*[:№]?\s*\d+(?:\.\d+)*.*$/i, '')
    .replace(/\(\s*Akt\s*№\s*\d+\s*\)/gi, '')
    .replace(/\bKMQ\d+\b/gi, '')
    .replace(/={2,}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function getDocumentByTitle(targetTitle: string) {
  try {
    const isTruncated = targetTitle.endsWith("...");
    const cleanTargetTitle = isTruncated ? targetTitle.slice(0, -3).trim() : targetTitle.trim();
    const nTarget = normalizeAz(cleanTargetTitle);
    const targetArticle = extractArticleFromTitle(cleanTargetTitle);
    const baseArtNum = targetArticle ? targetArticle.split('.')[0] : "";
    const lawPrefix = stripArticleSuffixFromTitle(cleanTargetTitle);

    const explicitIdMatch =
      cleanTargetTitle.match(/results\/(\d{1,7})/i) ||
      cleanTargetTitle.match(/framework\/(\d{1,7})/i) ||
      cleanTargetTitle.match(/(?:Akt\s*№|ID:?|eqanun_(?:corpus_)?|e_qanun_)\s*(\d{1,7})/i);

    const matchedReg = Object.values(LAW_REGISTRY).find((l) => {
      const ln = normalizeAz(l.name);
      const ls = normalizeAz(l.shortName);
      return nTarget.includes(ls) || nTarget.includes(ln);
    });

    const candidateDocId =
      explicitIdMatch?.[1] ||
      (matchedReg?.frameworkId ? String(matchedReg.frameworkId) : null);

    // 1. Primary Universal Resolution Across ALL 56,983 Complete e-Qanun Documents (local SQLite or remote RAG backend)
    const resolveDoc = async (docId: string, art?: string) => {
      if (isSqliteCorpusAvailable()) return getSqliteDocumentById(docId, art);
      if (isRemoteRagConfigured()) return fetchRemoteDocumentById(docId, art);
      return null;
    };
    const resolveByTitle = async (prefix: string, art?: string) => {
      if (isSqliteCorpusAvailable()) return findSqliteDocumentByTitle(prefix, art);
      if (isRemoteRagConfigured()) return fetchRemoteDocumentByTitle(prefix, art);
      return null;
    };

    if (isSqliteCorpusAvailable() || isRemoteRagConfigured()) {
      if (candidateDocId) {
        let sqliteDoc = await resolveDoc(
          candidateDocId,
          targetArticle && targetArticle !== candidateDocId ? targetArticle : undefined
        );
        if ((!sqliteDoc || !sqliteDoc.content) && targetArticle) {
          sqliteDoc = await resolveDoc(candidateDocId);
        }
        if (sqliteDoc && sqliteDoc.content) {
          return {
            title: cleanTargetTitle,
            content: sqliteDoc.content.slice(0, 20000),
            lawName: sqliteDoc.title,
            articleNumber: targetArticle || candidateDocId,
            sourceUrl: sqliteDoc.sourceUrl,
          };
        }
      }

      if (lawPrefix.length >= 4) {
        const byTitle = await resolveByTitle(lawPrefix, targetArticle || undefined);
        if (byTitle && byTitle.content) {
          return {
            title: cleanTargetTitle,
            content: byTitle.content.slice(0, 20000),
            lawName: byTitle.title,
            articleNumber: targetArticle || byTitle.documentId,
            sourceUrl: byTitle.sourceUrl,
          };
        }
      }
    }

    // 2. Live e-Qanun fetch if explicit document ID wasn't in SQLite
    if (explicitIdMatch?.[1]) {
      const docRes = await eqanunClient.getDocument(explicitIdMatch[1]);
      if (docRes.api_status === 200 && docRes.text) {
        return {
          title: docRes.title || cleanTargetTitle,
          content: docRes.text,
          lawName: docRes.title,
          articleNumber: targetArticle || explicitIdMatch[1],
          sourceUrl: docRes.source_url,
        };
      }
    }

    // 3. Fallback to legacy Knowledge Base only when SQLite did not match
    if (targetArticle) {
      try {
        const kbPath = path.join(process.cwd(), 'src/data/knowledge_base');
        if (fs.existsSync(kbPath)) {
          const files = fs.readdirSync(kbPath).filter(f => f.endsWith('.txt'));
          const tLow = cleanTargetTitle.toLowerCase();

          let matchedFiles = files.filter(f => {
            if (matchedReg?.files.some(mf => f.includes(mf) || mf.includes(f))) return true;
            if (tLow.includes('mülki') && !tLow.includes('prosessual')) return f.includes('46944');
            if (tLow.includes('vergi')) return f.includes('46948');
            if (tLow.includes('əmək') && !tLow.includes('pensiya')) return f.includes('46943') || f.includes('46942_Əmək');
            if (tLow.includes('cinayət') && !tLow.includes('prosessual')) return f.includes('46947');
            if (tLow.includes('inzibati xəta') || tLow.includes('ixm')) return f.includes('46960');
            if (tLow.includes('inzibati prosessual')) return f.includes('46956') || f.includes('46951');
            if (tLow.includes('yol hərəkət')) return f.includes('3423');
            if (tLow.includes('istehlak')) return f.includes('istehlak') || f.includes('9479');
            if (tLow.includes('məhkəmə')) return f.includes('3933');
            if (tLow.includes('şəhərsalma') || tLow.includes('tikinti')) return f.includes('46958');
            if (tLow.includes('ailə')) return f.includes('46946');
            if (tLow.includes('konstitusiya')) return f.includes('897');
            return false;
          });

          if (matchedFiles.length === 0) {
            matchedFiles = files.filter(f => f.startsWith('eqanun_mega_') || f.startsWith('e_qanun_'));
          }

          const artCandidates = [targetArticle, baseArtNum].filter(Boolean);
          for (const artStr of artCandidates) {
            const prefixes = [
              '=== Maddə ' + artStr + '.',
              '=== Maddə ' + artStr + ' ',
              '=== Maddə ' + artStr + '===',
              'Maddə ' + artStr + '.',
              'Maddə ' + artStr + ' ',
              'Maddə ' + artStr + '–',
              'Maddə ' + artStr + '-'
            ];

            for (const file of matchedFiles) {
              const fileContent = fs.readFileSync(path.join(kbPath, file), 'utf-8');
              let startIdx = -1;
              for (const p of prefixes) {
                const idx = fileContent.indexOf(p);
                if (idx !== -1) {
                  startIdx = idx;
                  break;
                }
              }

              if (startIdx !== -1) {
                const searchStart = startIdx + 20;
                const nextMatch = fileContent.substring(searchStart).match(/(?:===\s*)?Madd[eə]\s+\d+/i);
                const nextIndex = (nextMatch && typeof nextMatch.index === 'number') ? nextMatch.index : -1;
                const endIdx = nextIndex !== -1 ? (searchStart + nextIndex) : (startIdx + 12000);
                const raw = fileContent.substring(startIdx, endIdx);
                const clean = raw
                  .replace(/===[^=\n\r]*===/g, '')
                  .replace(/\bKMQ\d+\b/gi, '')
                  .replace(/\[\d+\]/g, '')
                  .replace(/\u00a0/g, ' ')
                  .replace(/^[ \t]+$/gm, '')
                  .replace(/\n{3,}/g, '\n\n')
                  .trim();

                if (clean && clean.length > 50) {
                  return {
                    title: cleanTargetTitle,
                    content: clean,
                    lawName: matchedReg?.name || lawPrefix || cleanTargetTitle,
                    articleNumber: targetArticle,
                    sourceUrl: matchedReg?.sourceUrl || 'https://www.e-qanun.ai',
                  };
                }
              }
            }
          }
        }
      } catch (err) {
        console.error("Error in high-fidelity article extraction:", err);
      }
    }

    const allChunks = loadAndParseKnowledgeBase();
    if (allChunks && allChunks.length > 0) {
      let match = allChunks.find(c => {
        const nTitle = normalizeAz(c.articleTitle);
        const isTitleMatch = isTruncated
          ? nTitle.startsWith(nTarget) || nTitle.includes(nTarget)
          : nTitle === nTarget || nTitle.includes(nTarget);

        const isArticleMatch = targetArticle ? (c.articleNumber === targetArticle || c.articleNumber === baseArtNum) : true;
        return isTitleMatch && isArticleMatch;
      });

      if (!match && targetArticle && matchedReg) {
        match = allChunks.find(c =>
          c.lawId === matchedReg.id &&
          (c.articleNumber === targetArticle || c.articleNumber === baseArtNum)
        );
      }

      if (match) {
        return {
          title: match.articleTitle,
          content: match.content,
          lawName: match.lawName,
          articleNumber: match.articleNumber,
          sourceUrl: match.sourceUrl,
        };
      }
    }

    return null;
  } catch (err) {
    console.error("Error in getDocumentByTitle:", err);
    return null;
  }
}
