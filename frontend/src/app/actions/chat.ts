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
  fetchRemoteShortSummary,
  fetchRemoteRagAnswer,
  isRemoteRagConfigured,
} from '@/lib/legal-rag'
import { findCandidateLawsByQuery } from '@/lib/legal-rag/registry'
import type { QueryAnalysis, StructuredChunk } from '@/lib/legal-rag'
import { generateLlmCompletion } from '@/lib/llm/client'
import { eqanunClient } from '@/lib/services/e_qanun_client'

async function expandColloquialLegalQuery(
  query: string,
  apiKeyParam?: string
): Promise<string[]> {
  const sysPrompt =
    'Sən Azərbaycan qanunvericiliyi üzrə axtarış sorğusu tərcüməçisisən. İstifadəçinin gündəlik danışıq dilində yazdığı sualı e-Qanun məcəllələri və qanunlarındakı RƏSMİ hüquqi terminlərə çevir. Yalnız JSON qaytar: {"terms": ["rəsmi ifadə 1", "rəsmi ifadə 2"]}';
  try {
    const llmPromise = generateLlmCompletion({
      messages: [
        { role: "system", content: sysPrompt },
        { role: "user", content: query },
      ],
      temperature: 0.0,
      maxTokens: 200,
      responseFormatJson: true,
      timeoutMs: 2500,
      apiKeyParam: apiKeyParam || undefined,
    });
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), 2600)
    );
    const llmRes = await Promise.race([llmPromise, timeoutPromise]);
    const rawContent = llmRes?.content || "";
    if (!rawContent) return [];

    const braceStart = rawContent.indexOf("{");
    const braceEnd = rawContent.lastIndexOf("}");
    const res = {
      content: braceStart >= 0 && braceEnd > braceStart ? rawContent.slice(braceStart, braceEnd + 1) : rawContent,
    };

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

function sanitizeStatutoryExcerpt(text: string): string {
  return text
    .replace(/\u2011|\u2010|\u2212/g, '-')
    .replace(/\bgörəyüz\b/gi, 'görə yüz')
    .replace(/\bgündənüçay\b/gi, 'gündən üç ay')
    .replace(
      /(?:\s+\d+(?:\.\d+)*(?:-\d+)?\.)?\s*\n?Maddə\s+\d+(?:-\d+)?\.[^\n]*?\b\d+(?:\.\d+)*(?:-\d+)?\n(?![0-9]+\.)[^\n]*(?:\n(?!\d+(?:\.\d+)*(?:-\d+)?\.\s)[a-zəöüğışç\d][^\n]*)?(?=\s+\d+(?:\.\d+)*(?:-\d+)?\.)/gi,
      '\n'
    );
}

function cleanClauseNoise(text: string): string {
  return sanitizeStatutoryExcerpt(text)
    .replace(/\[\d+\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function finishFullSentences(text: string, preferredMaxLen: number, hardMaxLen = 1750): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return '';

  // Keep full text up to preferredMaxLen (or up to hardMaxLen if a single statutory clause runs long)
  if (clean.length <= hardMaxLen) {
    if (clean.length <= preferredMaxLen) {
      return /[.!?…]$/.test(clean) ? clean : `${clean.replace(/[;,:]+$/, '')}.`;
    }
    // Check if there is a real sentence boundary after preferredMaxLen * 0.72 up to hardMaxLen
    const afterTarget = clean.slice(0, hardMaxLen);
    const re = /[.!?](?=\s+[\p{Lu}0-9"“]|$)/gu;
    let bestCut = -1;
    let m: RegExpExecArray | null;
    while ((m = re.exec(afterTarget)) !== null) {
      if (m.index + 1 >= preferredMaxLen * 0.72) {
        bestCut = m.index + 1;
        if (bestCut >= preferredMaxLen) break;
      } else {
        bestCut = m.index + 1;
      }
    }
    if (bestCut > 0) {
      return clean.slice(0, bestCut).trim();
    }
    return /[.!?]$/.test(clean) ? clean : `${clean.replace(/[;,:]+$/, '')}.`;
  }

  // Over hardMaxLen: stop cleanly at the last true sentence boundary (never mid-clause or at `;`)
  const window = clean.slice(0, hardMaxLen);
  const re = /[.!?](?=\s+[\p{Lu}0-9"“]|$)/gu;
  let lastSentenceEnd = -1;
  let m: RegExpExecArray | null;
  while ((m = re.exec(window)) !== null) {
    lastSentenceEnd = m.index + 1;
  }
  if (lastSentenceEnd >= 120) {
    return window.slice(0, lastSentenceEnd).trim();
  }
  const lastSpace = window.lastIndexOf(' ');
  const fallbackCut = lastSpace > 120 ? window.slice(0, lastSpace) : window;
  return `${fallbackCut.replace(/[;,:.\s]+$/, '')}.`;
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
      let cleanSeg = seg;
      // Drop sliding-window splice fragments like "Maddə 6. Title də başqa hal..."
      const spliceMatch = cleanSeg.match(/^Maddə\s+\d+(?:-\d+)?(?:\.\d+)*\.\s+([\s\S]+)$/);
      if (spliceMatch) {
        const afterArticleDot = spliceMatch[1];
        const hasLowercaseSplice = /^[^\p{Ll}.?!]*\p{Lu}[^.?!]{2,80}?\s+(?:və ya|yaxud|də|da|ilə|üzrə|görə|əsasən|nəzərdə|haqqında|\p{Ll}{1,4}\s+\p{Ll}{2,})\b/u.test(afterArticleDot);
        if (hasLowercaseSplice) {
          const nextSentenceIdx = afterArticleDot.search(/\.\s+(?:\d+\.\s+)?\p{Lu}/u);
          if (nextSentenceIdx > 0) {
            cleanSeg = afterArticleDot.slice(nextSentenceIdx + 1).trim();
          } else {
            continue;
          }
        }
      }

      // Skip broken truncated fragment stubs like "nə cəlb edilməsi..." or corrupted overlap fragments
      if (
        cleanSeg.length < 24 ||
        (/^\p{Ll}{1,3}\s+/u.test(cleanSeg) && !/^(bu|hər|bütün|əgər|yalnız)\s/i.test(cleanSeg)) ||
        /\d+\.\d+\s+\p{Ll}{1,4}\s+\p{Ll}+/u.test(cleanSeg.slice(0, 120))
      ) {
        continue;
      }

      const explicitSubMatch = cleanSeg.match(/^Maddə\s+(\d{1,4}(?:-\d+)?(?:\.\d+)*)(?=\.|\s)/i);
      const subNumMatch = cleanSeg.match(/^(?:Maddə\s+)?(\d{1,3}(?:-\d+)?(?:\.\d{1,2})+(?:-\d+)?)(?=\.|\s)/i);
      const artNumMatch = cleanSeg.match(/^Maddə\s+(\d{1,4}(?:-\d+)?)(?=\.|\s)/i);
      const chunkBase = (ch.articleNumber || '').split(/[.\-]/)[0];
      const bareSubOk =
        subNumMatch?.[1] &&
        (explicitSubMatch ||
          !chunkBase ||
          subNumMatch[1] === ch.articleNumber ||
          subNumMatch[1].startsWith(`${chunkBase}.`) ||
          subNumMatch[1].startsWith(`${chunkBase}-`));
      const clauseNum = explicitSubMatch?.[1] || (bareSubOk ? subNumMatch![1] : '') || artNumMatch?.[1] || ch.articleNumber || '';

      // Skip bare article title headers without operative rule text (e.g. "Maddə 212. Tütün məmulatının istehlakına dair məhdudiyyətlərə riayət edilməməsi")
      if (!subNumMatch && cleanSeg.length < 130 && !wantsSpecificRule.test(cleanSeg)) {
        continue;
      }

      const fp = normalizeAz(cleanSeg).slice(0, 72);
      if (seenFingerprints.has(fp)) continue;
      seenFingerprints.add(fp);

      const normSeg = normalizeAz(cleanSeg);
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
      if (specificMatches > 0 && wantsSpecificRule.test(cleanSeg)) {
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
        body: cleanSeg,
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

async function buildStatutoryFallbackResponse(
  query: string,
  retrievedChunks: StructuredChunk[],
  queryAnalysis: QueryAnalysis,
  extraTerms: string[]
) {
  const topChunks = retrievedChunks.slice(0, 5);
  const stems = buildSearchStems(query, queryAnalysis, extraTerms);
  const scoredClauses = extractScoredClauses(topChunks, stems, queryAnalysis);

  const summaryClauses: ScoredClause[] = [];
  const usedClauseKeys = new Set<string>();
  const topScore = scoredClauses[0]?.score ?? 0;
  for (const cl of scoredClauses) {
    if (summaryClauses.length > 0 && cl.score < topScore * 0.4) break;
    const key = cl.clauseNum
      ? `${cl.chunk.lawId}:${cl.clauseNum}`
      : `${cl.chunk.lawId}:${normalizeAz(cl.body).slice(0, 48)}`;
    if (usedClauseKeys.has(key)) continue;
    usedClauseKeys.add(key);
    summaryClauses.push(cl);
    if (summaryClauses.length >= 5) break;
  }

  const formatLawTitle = (name: string) => {
    const clean = name.trim();
    if (/haqqında$/i.test(clean) && !/qanun/i.test(clean)) return `${clean} Qanun`;
    return clean;
  };

  let shortAnswerBody = '';

  // Primary free edge AI synthesis for Qısa cavab when Vercel primary LLM is unavailable (e.g. huquqai.az fallback)
  if (summaryClauses.length > 0 && isRemoteRagConfigured()) {
    const aiExcerpts = summaryClauses.map((cl) => ({
      law: formatLawTitle(cl.chunk.lawName),
      article: cl.clauseNum || cl.chunk.articleNumber || '',
      text: cl.body,
    }));
    const aiShort = await fetchRemoteShortSummary(query, aiExcerpts, 11000);
    if (aiShort) {
      shortAnswerBody = aiShort;
    }
  }

  // Deterministic clean fallback if edge AI summary was unavailable or offline
  if (!shortAnswerBody) {
    if (summaryClauses.length > 0) {
      const lead = `Sualınızla bağlı tətbiq olunan normativ qaydalara əsasən hüquq və öhdəlikləriniz aşağıdakı kimi müəyyən edilir. Konkret müddət, məbləğ və sübut tələbləri qanunun müvafiq maddələri ilə tənzimlənir.`;
      const bullets = summaryClauses.slice(0, 3).map((cl) => {
        const label = cl.clauseNum ? `Maddə ${cl.clauseNum}` : (cl.chunk.articleTitle || 'Normativ müddəa');
        let cleanBody = cl.body
          .replace(/^(?:Maddə\s+)?\d+(?:-\d+)?(?:\.\d+)*(?:-\d+)?\.?\s+/i, '')
          .trim() || cl.body;
        const inlinePointStart = cleanBody.match(/^[^.?!]{4,120}?\s+(1\.\s+\p{Lu}[\s\S]+)$/u);
        if (inlinePointStart) {
          cleanBody = inlinePointStart[1].replace(/^1\.\s+/, '').trim();
        }
        return `- ${formatLawTitle(cl.chunk.lawName)} (${label}): ${finishFullSentences(cleanBody, 240, 420)}`;
      });
      shortAnswerBody = `${lead}\n${bullets.join('\n')}`;
    } else {
      shortAnswerBody =
        'Sorğunuz üzrə rəsmi qanunvericilik bazasında birbaşa uyğun maddə tapılmadı. Zəhmət olmasa sualınızı daha dəqiq açar sözlərlə ifadə edin.';
    }
  }

  // Build Hüquqi əsaslar using complete sentences around the best matching sub-clauses (no duplicate URL lists inside body)
  const sectionsMd = topChunks
    .map((ch, idx) => {
      const chunkClauses = scoredClauses.filter((c) => c.chunk === ch);
      const bestClause = chunkClauses[0];
      const artNum = bestClause?.clauseNum || ch.articleNumber;
      const artLabel = artNum ? `Maddə ${artNum}` : (ch.articleTitle || 'Normativ müddəa');

      const excerptText =
        chunkClauses.length > 0
          ? finishFullSentences(
              chunkClauses
                .slice(0, 3)
                .map((c) => c.body)
                .join(' '),
              1250,
              1800
            )
          : finishFullSentences(cleanClauseNoise(ch.content), 1150, 1700);

      return `### ${idx + 1}. ${ch.lawName} — ${artLabel}\n${excerptText}`;
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

  const cavab = `## Hüquqi sual\n${query}\n\n## Qısa cavab\n${shortAnswerBody}\n\n## Hüquqi əsaslar\n\n${sectionsMd || 'Müvafiq normativ akt tapılmadı.'}`;

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
      cavab = openCavabMatch[1].replace(/["}\]]+\s*$/, '').replace(/\\n/g, '\n').replace(/\\"/g, '"').trim();
      if (cavab && !/[.!?]$/.test(cavab)) {
        const lastPeriod = Math.max(cavab.lastIndexOf('. '), cavab.lastIndexOf('.\n'));
        if (lastPeriod > cavab.length * 0.4) {
          cavab = cavab.slice(0, lastPeriod + 1).trim();
        }
      }
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
      queryAnalysis.possibleLaws.length === 0 &&
      lawMatch.confidence !== "explicit" &&
      lawMatch.confidence !== "strong" &&
      !queryAnalysis.targetArticleNum &&
      (retrievedChunks.length < 4 || lawMatch.confidence === "weak" || lawMatch.confidence === "none" || topScore < 650);

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

    // 3. COMPOSE STRICT GROUND-TRUTH CONTEXT FOR LLM (Diverse top reranked statutes across all in-force Codes & Laws)
    const contextChunks = selectDiverseContextChunks(
      retrievedChunks,
      6,
      lawMatch.confidence === "explicit"
    );
    const contextText = contextChunks
      .map((c, i) => {
        const sliceLen = i < 2 ? 2600 : 1250;
        const cleanBody = sanitizeStatutoryExcerpt(c.content).substring(0, sliceLen);
        return `[MƏNBƏ ${i + 1}: ${c.articleTitle}] (Rəsmi URL: ${c.sourceUrl})\n${cleanBody}`;
      })
      .join("\n\n---\n\n")
      .slice(0, 10500);

    // 4. ZERO-EXAMPLE, STRICT CLOSED-WORLD LEGAL PROMPT (e-qanun.ai precision — zero hardcoded statute/fine examples to prevent cross-question bleed!)
    const systemPrompt = `Sən HuquqAI — Azərbaycan Respublikasının qüvvədə olan qanunvericiliyinə (e-qanun.ai rəsmi mətnlərinə) əsaslanan dəqiq hüquqi araşdırma sistemisən.

MÜTLƏQ VƏ DƏYİŞMƏZ QAYDALAR (ZERO HALLUCINATION):
1. QAPALI MƏNBƏ PRİNSİPİ: Cavabında YALNIZ aşağıdakı [MƏNBƏ 1..N] mətnlərində SÖZBƏSÖZ mövcud olan qanun adlarını, maddə və bənd nömrələrini, cərimə məbləğlərini, faizləri, gün/ay/il müddətlərini və dövlət orqanlarını yaz.
2. UYDURMA QADAĞASI: Öz yaddaşından HEÇ VAXT maddə nömrəsi, cərimə məbləği, müddət və ya sanksiya uydurma! Əgər [MƏNBƏ 1..N] mətnlərində konkret cərimə/sanksiya maddəsi YOXDURSA, bunu açıq yaz ("Təqdim olunan mənbələrdə bunun cərimə məbləği göstərilməyib"), əsla başqa maddə və ya məbləğ uydurma!
3. BƏNDLƏRİ VƏ ŞƏRTLƏRİ DƏQİQ OXU:
   - Hər bənd nömrəsi özündən SONRAKI cümləyə aiddir, əvvəlki cümləyə deyil.
   - Hər normanın dəqiq şərtini və tətbiq dairəsini saxla (məs: "lazımi keyfiyyətli" = qüsursuz/sağlam maldır, bunu əsla "lazımi keyfiyyətli olmayan" kimi çevirmə; xüsusi kateqoriya/vəzifəli şəxs/təkrar törətmə bəndlərini ümumi qayda ilə qarışdırma!).
   - Əgər həm əsas qanun (qayda/vəzifə), həm də sanksiya məcəlləsi (cərimə/məsuliyyət) kontekstdə varsa, İKİSİNİ DƏ dəqiq əlaqələndirib göstər — cərimə/məsuliyyət məbləğini elə ilk cümlədə qeyd et.
   - Bitişik yazılmış məbləğ və ya müddət sözlərini düzgün oxu (məs., "görə yüz manat" = 100 manat); məbləğ mətndə varsa əsla "göstərilməyib" yazma.
4. MADDƏ NÖMRƏLƏRİNİN YAZILIŞI:
   - Maddə və bənd nömrələrini rəsmi yazılışla nöqtə ilə yaz (yalnız rəsmi aktda defisli olan bəndlərdə defisi saxla).
   - Yalnız suala birbaşa aid olan 1–4 ən uyğun maddəyə istinad et; əlaqəsiz maddələri əlavə etmə və eyni maddəni təkrarlama.
5. DİL VƏ FORMAT:
   - Saf və səlis Azərbaycan dilində yaz (ingilis və ya kiril hərfləri işlətmə). Hər cümlə nöqtə ilə tam bitsin.
   - "## Qısa cavab": əvvəlcə 1–2 aydın, birbaşa yekun cümlə (konkret hüquqi nəticə + məbləğ/müddət/orqan), dərhal sonra hər biri yeni sətirdə ("\n- ") 2–4 qısa bənd.
   - "## Mənbələr" və ya URL siyahısı YAZMA (sistem kart kimi göstərir).
   - İstifadəçi "ərizə yaz / hazırla" deyirsə, boş şablon yazma — əvvəlcə yalnız 1-ci addımı (iddiaçının ad, soyad, ata adı, ünvan, FİN) soruş.

YALNIZ ETİBARLI JSON OBYEKTİ QAYTAR (əlavə izah olmadan):
{
  "cavab": "## Hüquqi sual\n[sual]\n\n## Qısa cavab\n[1-2 aydın yekun cümlə — konkret nəticə və məbləğ/müddət.]\n- [Qanun/Məcəllə] — Maddə [X]-ə əsasən, [konkret qayda/məbləğ].\n- [Qanun/Məcəllə] — Maddə [Y]-ə görə, [müddət/şərt/orqan].\n\n## Hüquqi əsaslar\n\n### 1. [Normativ akt] — Maddə [X]\n[normanın dəqiq məzmunu və izahı]\n\n### 2. [Normativ akt] — Maddə [Y]\n[normanın dəqiq məzmunu və izahı]\n\n## Praktik izah\n[vəziyyətə tətbiq və izah]\n\n## Vacib məqamlar\n- [müddət / şərt / istisna]",
  "maddeler": ["Azərbaycan Respublikasının [Normativ akt] — Maddə [X]"],
  "legal_basis": [
    {"law_name": "[Normativ aktın rəsmi adı]", "article_number": "[Maddə nömrəsi]", "article_title": "[Maddənin başlığı]", "claim": "[Bu normanın tətbiq edildiyi nəticə]"}
  ]
}`;

    const userPrompt = `KONTEX (Qanunvericilik Mətnləri):
${contextText}

ÇOXTURLU SÖHBƏT QAYDASI: Əgər aşağıdakı İSTİFADƏÇİNİN YENİ SORĞUSU yeni hüquqi mövzudursa, əvvəlki suallardakı köhnə maddə və məcəllələri UNUT və YALNIZ bu [KONTEX] mənbələrinə əsaslan. Əvvəlki mövzuya davam sualıdırsa ("bəs təkrar...", "bunun cəriməsi..."), yenə də konkret normanı [KONTEX] mətnindən çıxar.

İSTİFADƏÇİNİN SORĞUSU: 
${query}`;

    // 5. CALL AI MODEL (prefer Cloudflare Workers AI full-RAG synthesis in production when no user override key is passed)
    const formattedHistory = compactHistoryForLlm(history);

    let parsedJson: any = {};
    let usedLlmFallback = false;

    const sanitizeJsonControlChars = (src: string): string => {
      let out = "";
      let inString = false;
      let escaped = false;
      for (let i = 0; i < src.length; i++) {
        const ch = src[i];
        if (escaped) {
          out += ch;
          escaped = false;
          continue;
        }
        if (ch === "\\" && inString) {
          out += ch;
          escaped = true;
          continue;
        }
        if (ch === '"') {
          inString = !inString;
          out += ch;
          continue;
        }
        if (inString) {
          if (ch === "\n") {
            out += "\\n";
            continue;
          }
          if (ch === "\r") {
            out += "\\r";
            continue;
          }
          if (ch === "\t") {
            out += "\\t";
            continue;
          }
        }
        out += ch;
      }
      return out;
    };

    const parseRawLlmJson = (rawContent: string) => {
      let cleanedContent = rawContent.trim();
      const fenceMatch = cleanedContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (fenceMatch) {
        cleanedContent = fenceMatch[1].trim();
      }
      const firstBrace = cleanedContent.indexOf("{");
      const lastBrace = cleanedContent.lastIndexOf("}");
      if (firstBrace >= 0 && lastBrace > firstBrace) {
        cleanedContent = cleanedContent.slice(firstBrace, lastBrace + 1);
      }
      for (const candidate of [cleanedContent, sanitizeJsonControlChars(cleanedContent)]) {
        try {
          const obj = JSON.parse(candidate);
          if (obj && typeof obj === "object" && (typeof obj.cavab === "string" || typeof obj.answer === "string")) {
            return obj;
          }
        } catch {
          // Try sanitized pass or partial recovery below
        }
      }
      return recoverPartialJsonResponse(cleanedContent, rawContent, retrievedChunks);
    };

    const invokePrimaryLlm = async (
      msgs: Array<{ role: "system" | "user" | "assistant"; content: string }>,
      maxTokens = 2600
    ): Promise<string> => {
      try {
        const llmRes = await generateLlmCompletion({
          messages: msgs,
          temperature: 0.05,
          maxTokens,
          timeoutMs: 18000,
          responseFormatJson: true,
          apiKeyParam: passedKey || undefined,
        });
        if (llmRes?.content?.trim()) return llmRes.content;
      } catch (primaryErr: any) {
        console.warn("[chat.ts] Primary LLM provider failed, checking edge fallback:", primaryErr?.message);
      }

      if (!passedKey && isRemoteRagConfigured()) {
        const edgeAnswer = await fetchRemoteRagAnswer(msgs, {
          maxTokens: Math.min(maxTokens, 2200),
          temperature: 0.05,
          timeoutMs: 18000,
        });
        if (edgeAnswer?.trim()) return edgeAnswer;
      }
      throw new Error("All LLM synthesis providers failed");
    };

    const baseMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: systemPrompt },
      ...formattedHistory,
      { role: "user", content: userPrompt },
    ];

    try {
      const rawContent = await invokePrimaryLlm(baseMessages, 2600);
      parsedJson = parseRawLlmJson(rawContent);
    } catch (llmErr: any) {
      usedLlmFallback = true;
      console.error("[chat.ts] LLM synthesis failed, falling back to statutory extracts:", llmErr?.message);
      parsedJson = await buildStatutoryFallbackResponse(
        query,
        retrievedChunks,
        queryAnalysis,
        llmExpandedTerms
      );
    }

    // 6. VALIDATE & ENFORCE ZERO-HALLUCINATION CITATION AUDIT (+ 1-PASS SELF-CORRECTION IF ANY ARTICLE WAS FABRICATED)
    let validated = validateLegalResponse(parsedJson, retrievedChunks);

    if (!usedLlmFallback && validated.ungrounded_articles && validated.ungrounded_articles.length > 0) {
      const banned = validated.ungrounded_articles.join(", ");
      console.warn(`[chat.ts] Hallucinated article(s) detected (${banned}); running strict grounded rewrite...`);
      try {
        const correctiveRaw = await invokePrimaryLlm(
          [
            ...baseMessages,
            {
              role: "user",
              content: `KRİTİK XƏTA: Əvvəlki cavabında [MƏNBƏ 1..N] daxilində OLMAYAN bu maddə nömrələrini uydurdun: ${banned}. Həmin uydurma maddələri və onların cərimələrini TAMAMİLƏ SİL! Cavabı YALNIZ [MƏNBƏ 1..N] mətnlərində mövcud olan maddələrə əsasən yenidən etibarlı JSON formatında yaz.`,
            },
          ],
          2400
        );
        const correctedJson = parseRawLlmJson(correctiveRaw);
        const revalidated = validateLegalResponse(correctedJson, retrievedChunks);
        if (
          (revalidated.ungrounded_articles?.length ?? 0) < validated.ungrounded_articles.length ||
          revalidated.citation_valid
        ) {
          validated = revalidated;
        }
      } catch (retryErr: any) {
        console.warn("[chat.ts] Self-correction pass failed; keeping deterministically purged answer:", retryErr?.message);
      }
    }

    return {
      content: validated.answer,
      citations: validated.citations,
      legal_basis: validated.legal_basis,
      sources: validated.sources,
      confidence: usedLlmFallback ? Math.min(validated.confidence, 0.75) : validated.confidence,
      citation_valid: validated.citation_valid,
      needs_review: usedLlmFallback ? true : validated.needs_review,
      precedent: null
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
