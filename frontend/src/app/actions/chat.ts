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
  fetchRemoteJudicialSearch,
  fetchRemoteQueryRewrite,
  fetchRemoteVerifyAnswer,
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
    .slice(-6);

  return clean.map((h) => {
    if (h.role === "user") {
      return { role: "user" as const, content: h.content.slice(0, 450) };
    }
    // Preserve prior assistant topic + cited laws/articles + concise short answer for seamless multi-turn case continuity
    const shortMatch = h.content.match(/##\s*Qısa cavab\s*\n([\s\S]*?)(?:\n##|$)/i);
    const body = (shortMatch ? shortMatch[1] : h.content)
      .replace(/https?:\/\/\S+/g, "")
      .replace(/[#*`]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 480);
    return { role: "assistant" as const, content: `[Əvvəlki cavab xülasəsi]: ${body}` };
  });
}

function buildInsufficientSourceResponse(query: string, reason?: string) {
  const detail = reason
    ? `\n\n**Yoxlama qeydi:** ${reason}`
    : "";
  return {
    content:
      `## Hüquqi sual\n${query}\n\n` +
      `## Mənbə təsdiqlənmədi — Dəqiq normativ əsas tapılmadı\n` +
      `HuquqAI hüquqi dəqiqlik prinsipinə əsasən rəsmi qanunvericilik bazasında təsdiqlənməyən maddə, cərimə və ya qaydanı **uydurmur**.\n\n` +
      `Hazırkı qanunvericilik bazasında bu konkret suala birbaşa tətbiq olunan qüvvədə olan normativ akt və ya maddə təsdiqlənmədi.${detail}\n\n` +
      `## Nə edə bilərik?\n` +
      `- Əgər konkret qanunun, Nazirlər Kabineti qərarının, təlimatın və ya maddənin adını bilirsinizsə, yazın — dərhal həmin normativ akt üzrə yoxlayaq.\n` +
      `- Rəsmi **e-qanun.az** keçidini (məs., \`https://e-qanun.az/framework/...\`) və ya aktın nömrəsini göndərin — birbaşa rəsmi mətn əsasında cavablandıraq.\n` +
      `- Sualı bir qədər daha konkret hüquqi situasiya ilə ifadə edin (məs., hansı sahə: əmək, ailə, vergi, yol hərəkəti, mülki və s.).`,
    citations: [],
    legal_basis: [],
    sources: [],
    confidence: 0.0,
    citation_valid: false,
    needs_review: true,
    audit_verified: true,
    follow_ups: [],
    precedent: null,
  };
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
    .replace(/\u00AD/g, '')
    .replace(/\u2011|\u2010|\u2212/g, '-')
    .replace(/\bgörəyüz\b/gi, 'görə yüz')
    .replace(/\bgündənüçay\b/gi, 'gündən üç ay')
    .replace(
      /(\d+(?:\.\d+)+)\.\s*\[QÜVVƏDƏN DÜŞÜB\s*\/\s*LƏĞV EDİLİB\]\s*(?=[a-zəöüğışç])/gi,
      '($1-cü bənd ləğv edilib) — '
    )
    .replace(
      /(?:\s+\d+(?:\.\d+)*(?:-\d+)?\.)?\s*\n?Maddə\s+\d+(?:-\d+)?\.[^\n]*?\b\d+(?:\.\d+)*(?:-\d+)?\n(?![0-9]+\.)[^\n]*(?:\n(?!\d+(?:\.\d+)*(?:-\d+)?\.\s)[a-zəöüğışç\d][^\n]*)?(?=\s+\d+(?:\.\d+)*(?:-\d+)?\.)/gi,
      '\n'
    )
    .replace(/([^\n])\s+(\d{1,4}(?:-\d+)?(?:\.\d{1,2})+(?:-\d+)?\.)\s+/g, '$1\n$2 ');
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

    // 0. MULTI-TURN CONVERSATIONAL & LONG-KAZUS QUERY CONTEXTUALIZER (seamlessly carries case context & distills long case studies!)
    let effectiveSearchQuery = query;
    let activeCaseContext = "";
    let rewrittenLaws: string[] = [];
    const shouldDistillOrContextualize =
      ((history && history.length > 0) || query.length > 220) && isRemoteRagConfigured();
    if (shouldDistillOrContextualize) {
      const rewrite = await fetchRemoteQueryRewrite(query, history, 4800);
      if (rewrite?.is_follow_up && rewrite.standalone_query && rewrite.standalone_query.length >= 6) {
        effectiveSearchQuery = rewrite.standalone_query;
        activeCaseContext = rewrite.topic_summary || rewrite.standalone_query;
        rewrittenLaws = rewrite.same_case_laws || [];
      }
    }

    // For long multi-paragraph case studies ("kazus"), extract the clean trailing question for "## Hüquqi sual"
    const suallarMatch = query.match(/(?:^|\n)\s*suallar?\s*:\s*([\s\S]+)$/i);
    const displayQuestion =
      query.length > 240
        ? (suallarMatch?.[1]?.replace(/\s+/g, " ").trim() || activeCaseContext || `${query.slice(0, 220).trim()}...`)
        : query;

    // 1. QUERY ANALYSIS (uses contextualized standalone query so follow-ups retrieve exact statutes!)
    const queryAnalysis = analyzeQuery(effectiveSearchQuery, history);
    for (const rl of rewrittenLaws) {
      const regEntry = LAW_REGISTRY[rl];
      if (regEntry && !queryAnalysis.possibleLaws.includes(regEntry.name)) {
        queryAnalysis.possibleLaws.push(regEntry.name);
      }
    }
    const lawMatch = findCandidateLawsByQuery(queryAnalysis.normalizedQuery);

    // 2. MULTI-STAGE HYBRID RETRIEVAL & RERANKING (56,983-doc SQLite + SBERT Semantic + RRF)
    let retrievedChunks = await hybridSearchAsync(queryAnalysis, 18, effectiveSearchQuery, {
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
      llmExpandedTerms = await expandColloquialLegalQuery(effectiveSearchQuery, passedKey || undefined);
      if (llmExpandedTerms.length > 0) {
        retrievedChunks = await hybridSearchAsync(queryAnalysis, 18, effectiveSearchQuery, {
          mode: "hybrid",
          extraExpandedTerms: llmExpandedTerms,
        });
      }
    }

    // Check if query contains an explicit e-qanun link or prefixed document ID (never mistake article numbers like "70-ci maddə" for doc IDs)
    const urlIdMatch = query.match(/(?:results\/|document_id=|framework\/|(?:akt|sənəd|sened|qanun)\s*(?:№|no\.?|id)?\s*[:#№]?\s*)(\d{1,6})/i);
    const targetDocId = urlIdMatch ? urlIdMatch[1] : null;

    if (targetDocId) {
      const localDoc = isSqliteCorpusAvailable()
        ? getSqliteDocumentById(targetDocId)
        : isRemoteRagConfigured()
        ? await fetchRemoteDocumentById(targetDocId, undefined, 5000)
        : null;
      if (localDoc?.content) {
        retrievedChunks.unshift({
          sourceId: `eqanun_doc_${targetDocId}`,
          lawId: `eqanun_${targetDocId}`,
          lawName: localDoc.title,
          articleNumber: "",
          articleTitle: `${localDoc.title} (Akt № ${targetDocId})`,
          content: localDoc.content.substring(0, 10000),
          sourceFile: `eqanun_doc_${targetDocId}`,
          sourceUrl: localDoc.sourceUrl || `https://www.e-qanun.ai/results/${targetDocId}`,
          score: 20000,
          documentId: targetDocId,
        });
      } else {
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
    }

    if (retrievedChunks.length === 0) {
      return buildInsufficientSourceResponse(query);
    }

    // 2c. PARALLEL BINDING JUDICIAL PRACTICE (Ali Məhkəmə Plenumu / Konstitusiya Məhkəməsi) + COMPANION PROCEDURAL RECALL
    const topPrimaryScore = retrievedChunks[0]?.score ?? 0;
    const highRelTop = retrievedChunks
      .slice(0, 8)
      .filter((c, idx) => idx < 3 || topPrimaryScore < 500 || (c.score ?? 0) >= topPrimaryScore * 0.62);
    const topLawIds = Array.from(new Set(highRelTop.map((c) => c.lawId).filter(Boolean))).slice(0, 4);
    const topArtNums = Array.from(new Set(highRelTop.map((c) => c.articleNumber).filter(Boolean))).slice(0, 6);
    const topPairs = highRelTop
      .filter((c) => c.lawId && c.articleNumber)
      .map((c) => ({ law: c.lawId, article: c.articleNumber }))
      .slice(0, 8);
    const qNorm = queryAnalysis.normalizedQuery;
    const rawQNorm = normalizeAz(query);
    const combinedQNorm = `${qNorm} ${rawQNorm}`;
    const isFamilyOrLaborDispute =
      (topLawIds.includes("aile") || topLawIds.includes("emek")) &&
      /(bosan|bolun|emlak|aliment|esassiz|qanunsuz|sikayet|mubahis|mehkem|cixaril|berpa|valideyn|usaq)/i.test(qNorm);
    const isDivorcePropertyQuery =
      topLawIds.includes("aile") && /(emlak|mulkiyyet|bolun|bosan)/i.test(qNorm);
    const isCriminalEmbezzlementOrOfficialKazus =
      (topLawIds.includes("cinayet") || rewrittenLaws.includes("cinayet") || /(menimse|israf|cinayet terkib|huquqi tovsif|saxta xidmet muqavile|vezife selahiyyet)/i.test(combinedQNorm)) &&
      /(menimse|israf|cinayet terkib|huquqi tovsif|saxta|vezife|direktor|hesab-faktura)/i.test(combinedQNorm);
    const hasMediationChunk = retrievedChunks.slice(0, 8).some((c) => c.documentId === "41828" || c.lawName.toLowerCase().includes("mediasiya"));
    const hasAile34 = retrievedChunks.slice(0, 8).some((c) => c.lawId === "aile" && (c.articleNumber === "34" || c.articleNumber.startsWith("34.")));
    const hasCmArt = (art: string) =>
      retrievedChunks.slice(0, 6).some((c) => c.lawId === "cinayet" && (c.articleNumber === art || c.articleNumber.startsWith(`${art}.`)));

    const fetchCompanionArticle = async (
      docId: string,
      artNum: string,
      lawId: string
    ): Promise<StructuredChunk | null> => {
      try {
        const doc = isSqliteCorpusAvailable()
          ? getSqliteDocumentById(docId, artNum)
          : isRemoteRagConfigured()
          ? await fetchRemoteDocumentById(docId, artNum, 4500)
          : null;
        if (!doc?.content) return null;
        const body = doc.content.slice(0, 3600);
        return {
          sourceId: `companion_${docId}_art_${artNum}`,
          lawId,
          lawName: doc.title,
          articleNumber: artNum,
          articleTitle: `${doc.title} — Maddə ${artNum}`,
          content: body,
          sourceFile: `eqanun_doc_${docId}`,
          sourceUrl: doc.sourceUrl || `https://www.e-qanun.ai/results/${docId}`,
          score: 940,
          documentId: docId,
        };
      } catch {
        return null;
      }
    };

    const [judicialChunks, mediationChunk, aile34Chunk, cm179Chunk, cm177NoteChunk, cm178Chunk, cm308Chunk, cm313Chunk] = await Promise.all([
      isRemoteRagConfigured()
        ? fetchRemoteJudicialSearch(
            {
              query: effectiveSearchQuery,
              expandedQueries: [...(queryAnalysis.keywords || []), ...llmExpandedTerms],
              matchedLaws: isCriminalEmbezzlementOrOfficialKazus ? Array.from(new Set(["cinayet", ...topLawIds])) : topLawIds,
              matchedArticles: topArtNums,
              matchedPairs: topPairs,
              limit: 2,
            },
            5000
          )
        : Promise.resolve([] as StructuredChunk[]),
      isFamilyOrLaborDispute && !hasMediationChunk
        ? fetchCompanionArticle("41828", "28", "eqanun_41828")
        : Promise.resolve(null),
      isDivorcePropertyQuery && !hasAile34
        ? fetchCompanionArticle("46946", "34", "aile")
        : Promise.resolve(null),
      isCriminalEmbezzlementOrOfficialKazus
        ? fetchCompanionArticle("46947", "179", "cinayet")
        : Promise.resolve(null),
      isCriminalEmbezzlementOrOfficialKazus
        ? fetchCompanionArticle("46947", "177", "cinayet")
        : Promise.resolve(null),
      isCriminalEmbezzlementOrOfficialKazus
        ? fetchCompanionArticle("46947", "178", "cinayet")
        : Promise.resolve(null),
      isCriminalEmbezzlementOrOfficialKazus
        ? fetchCompanionArticle("46947", "308", "cinayet")
        : Promise.resolve(null),
      isCriminalEmbezzlementOrOfficialKazus
        ? fetchCompanionArticle("46947", "313", "cinayet")
        : Promise.resolve(null),
    ]);

    const cmCompanionChunks = [cm179Chunk, cm177NoteChunk, cm178Chunk, cm308Chunk, cm313Chunk].filter(
      (c): c is StructuredChunk => Boolean(c)
    );
    const companionKeys = new Set(cmCompanionChunks.map((c) => `${c.lawId}::${c.articleNumber}`));
    const dedupedRetrievedChunks =
      cmCompanionChunks.length > 0
        ? retrievedChunks.filter((c) => !companionKeys.has(`${c.lawId}::${c.articleNumber}`))
        : retrievedChunks;
    const supplementalChunks: StructuredChunk[] = [
      ...cmCompanionChunks,
      ...(aile34Chunk ? [aile34Chunk] : []),
      ...(mediationChunk ? [mediationChunk] : []),
      ...judicialChunks,
    ];
    const allRetrievedChunks = [...cmCompanionChunks, ...dedupedRetrievedChunks, ...(aile34Chunk ? [aile34Chunk] : []), ...(mediationChunk ? [mediationChunk] : []), ...judicialChunks];

    // 3. COMPOSE STRICT GROUND-TRUTH CONTEXT FOR LLM (Core statutory articles + companion procedural norm + binding Supreme/Constitutional Court rulings)
    const primaryScore = Math.max(dedupedRetrievedChunks[0]?.score ?? 0, cmCompanionChunks[0]?.score ?? 0);
    const relevantRetrieved =
      primaryScore >= 500
        ? dedupedRetrievedChunks.filter((c, idx) => idx < 3 || (c.score ?? 0) >= primaryScore * 0.62)
        : dedupedRetrievedChunks;
    const baseStatutory = selectDiverseContextChunks(
      relevantRetrieved.length >= 3 ? relevantRetrieved : dedupedRetrievedChunks,
      cmCompanionChunks.length > 0 ? 3 : aile34Chunk ? 5 : 6,
      lawMatch.confidence === "explicit"
    );
    const contextChunks: StructuredChunk[] = [
      ...cmCompanionChunks,
      ...baseStatutory,
      ...(aile34Chunk ? [aile34Chunk] : []),
      ...(mediationChunk ? [mediationChunk] : []),
      ...judicialChunks.slice(0, 2),
    ];
    const contextStems = buildSearchStems(effectiveSearchQuery, queryAnalysis, llmExpandedTerms);
    const extractFocusedExcerpt = (rawContent: string, maxLen: number): string => {
      const cleaned = sanitizeStatutoryExcerpt(rawContent);
      if (cleaned.length <= maxLen) return cleaned;
      const lines = cleaned.split("\n");
      let bestOffset = 0;
      let bestScore = -1;
      let cursor = 0;
      for (const line of lines) {
        const norm = normalizeAz(line);
        let sc = 0;
        for (const s of contextStems) {
          if (norm.includes(s.norm)) sc += s.weight * 2;
          else if (s.stem.length >= 5 && norm.includes(s.stem)) sc += s.weight;
        }
        if (sc > bestScore) {
          bestScore = sc;
          bestOffset = cursor;
        }
        cursor += line.length + 1;
      }
      if (bestOffset > maxLen * 0.55) {
        const leadLen = Math.min(720, Math.floor(maxLen * 0.35));
        const lead = cleaned.slice(0, leadLen);
        const start = Math.max(leadLen, bestOffset - 220);
        return `${lead}\n...\n${cleaned.slice(start, start + maxLen - leadLen - 6)}`;
      }
      return cleaned.slice(0, maxLen);
    };

    const contextText = contextChunks
      .map((c, i) => {
        const isJud = c.lawId.startsWith("judicial_");
        const isCompanion = c.sourceId.startsWith("companion_");
        const cleanBody = isJud
          ? sanitizeStatutoryExcerpt(c.content).slice(0, 3800)
          : isCompanion
          ? sanitizeStatutoryExcerpt(c.content).slice(0, 3500)
          : extractFocusedExcerpt(c.content, i < 4 ? 2300 : 1500);
        return `[MƏNBƏ ${i + 1}: ${c.articleTitle}] (Rəsmi URL: ${c.sourceUrl})\n${cleanBody}`;
      })
      .join("\n\n---\n\n")
      .slice(0, 20000);

    const hasJudicialInContext = judicialChunks.length > 0;

    // 4. UNIFIED HUQUQAI × E-QANUN.AI CLOSED-WORLD PROMPT (zero hardcoded fine/article examples -> zero cross-question bleed!)
    const systemPrompt = `Sən HuquqAI — Azərbaycan Respublikasının qüvvədə olan qanunvericiliyinə, Ali Məhkəmə Plenumunun və Konstitusiya Məhkəməsinin rəsmi qərarlarına (e-qanun.az / e-qanun.ai rəsmi bazasına) əsaslanan peşəkar hüquqi təhlil sistemisən.

MÜTLƏQ VƏ DƏYİŞMƏZ QAYDALAR (ZERO HALLUCINATION):
1. QAPALI MƏNBƏ PRİNSİPİ: Cavabında YALNIZ aşağıdakı [MƏNBƏ 1..N] mətnlərində SÖZBƏSÖZ mövcud olan qanun adlarını, maddə və bənd nömrələrini, Ali Məhkəmə/Konstitusiya Məhkəməsi mövqelərini, cərimə məbləğlərini, faizləri, müddətləri və prosessual tələbləri (məsələn, ilkin mediasiya sessiyası, notariat forması və s.) yaz.
2. UYDURMA QADAĞASI VƏ MƏNBƏ YOXDURSA DÜRÜST İMTİNA:
   - Öz yaddaşından HEÇ VAXT maddə nömrəsi, bölmə nömrəsi, məhkəmə qərarı, cərimə məbləği və ya müddət uydurma!
   - Əgər aşağıdakı [MƏNBƏ 1..N] mətnləri istifadəçinin konkret sualını ÜMUMİYYƏTLƏ tənzimləmirsə (tamam başqa sahəyə aid sənədlərdirsə və ya konkret normativ akt bazada yoxdursa), UYDURMA — JSON-da "insufficient_sources": true və "missing_reason": "..." qaytar!
3. QÜVVƏDƏN DÜŞMÜŞ (ÜZƏRİNDƏN XƏTT ÇƏKİLMİŞ) QAYDALAR:
   - Mənbə mətnində "[QÜVVƏDƏN DÜŞÜB" və ya "LƏĞV EDİLİB]" və ya "(...-cü bənd ləğv edilib)" işarəsi olan hər hansı maddə/bənd ARTİQ QÜVVƏDƏ DEYİL!
   - Qanun maddəsinin ləğv edilmiş və ya dəyişdirilmiş bəndlərini ƏSLA qüvvədə olan norma kimi təqdim etmə! Əgər istifadəçi məhz həmin ləğv edilmiş bənd barədə soruşursa, onun qüvvədən düşdüyünü (ləğv edildiyini) açıq bildir.
4. HÜQUQİ NORMANIN YOXLANILMASI VƏ TÖVSİF QAYDASI (9 MÜTLƏQ STANDART):
   - (4.1) CƏRİMƏ MƏBLƏĞİ İLƏ MİQDAR HƏDDİNİ QARIŞDIRMA: Cinayət Məcəlləsinin maddələrindəki cəza olaraq nəzərdə tutulan cərimə məbləğlərini (məs., 179.1-dəki 1000–2000 manat cərimə cəzasını və ya 308.1-dəki 2000–4000 manat cəriməni) cinayətin miqdar hədləri (vurulan ziyanın / talanan əmlakın miqdarı: xeyli, külli, xüsusilə külli miqdar) ilə ƏSLA qarışdırma! Ağırlaşdırıcı bənddə (məs., 179.3.2-də) yalnız azadlıqdan məhrum etmə cəzası nəzərdə tutulubsa, sadə tərkibin (179.1-in) cərimə sanksiyasını həmin ağırlaşdırıcı bəndin cəzası kimi yazma.
   - (4.2) MİQDAR KATEQORİYASI YALNIZ QEYD HİSSƏSİNƏ ƏSASƏN: Cinayətin miqdar kateqoriyasını yalnız maddənin "Qeyd:" hissəsinə və qüvvədə olan qanun redaksiyasına əsasən müəyyən et (məs., CM 177 Qeyd 2: 5.000–50.000 manat = "xeyli miqdar"; 50.000–500.000 manat = "külli miqdar"; 500.000 manatdan yuxarı = "xüsusilə külli miqdar". Odur ki, 450.000 manat "külli miqdar"dır -> 179.3.2).
   - (4.3) DİSPOZİSİYA, AĞIRLAŞDIRICI ƏLAMƏTLƏR VƏ SANKSİYA: Hər bir maddənin (a) dispozisiyasını, (b) ağırlaşdırıcı (tövsifedici) əlamətlərini və (c) sanksiyasını ayrı-ayrılıqda təhlil et. Hər bənd nömrəsi özündən SONRAKI cümləyə aiddir. Sual ümumi / ilk hal barədədirsə, əvvəlcə əsas bəndi yaz; ağırlaşdırıcı/təkrar bəndləri ayrıca fərqləndir.
   - (4.4) TƏQSİRSİZLİK PREZUMPSİYASI VƏ ŞƏRTİ TÖVSİF: Cinayət tərkibinin bütün elementləri (obyekt, obyektiv cəhət, xüsusi subyekt, subyektiv cəhət — birbaşa qəsd və tamah məqsədi) sübut edilmədən şəxsin cinayət törətdiyi barədə qəti hökm/nəticə çıxarma ("törətmişdir" əvəzinə "bu hallar sübuta yetirilərsə, əməldə ... tərkibinin əlamətləri yarana bilər" kimi hüquqi-şərti tövsif ver).
   - (4.5) ALTERNATİV CİNAYƏT TƏRKİBLƏRİNİN MÜQAYİSƏSİ: Kazus təhlilində eyni faktlara uyğun ola biləcək alternativ cinayət tərkiblərini (məs., CM 179 Mənimsəmə/israf etmə vs. CM 178 Dələduzluq vs. CM 308 Vəzifə səlahiyyətlərindən sui-istifadə vs. CM 313 Vəzifə saxtakarlığı) müqayisə et və onların fərqləndirici əlamətlərini (əmlakın şəxsə əvvəlcədən qulluq mövqeyinə görə etibar edilib-edilməməsi, əvəzsiz talama niyyəti vs. kommersiya/səlahiyyət sui-istifadəsi, rəsmi sənədə bilə-bilə yalan məlumat daxiletmə və CM 308 Qeyd 3–4 üzrə MMC rəhbərinin vəzifəli şəxs statusu) göstər.
   - (4.6) NƏTİCƏ–MADDƏ–SANKSİYA UYĞUNLUĞU: Hüquqi nəticə ilə istinad edilən maddənin məzmunu və sanksiyası arasında ziddiyyət yaranmasına yol vermə (məs., "külli miqdar" deyib 179.4-ə istinad etmə; külli miqdar 179.3.2-dir və sanksiyası 5–10 il azadlıqdan məhrum etmədir).
   - (4.7) FAKTLAR KİFAYƏT ETMƏDİKDƏ ƏLAVƏ MƏLUMAT TƏLƏBİ: Faktlar qəti tövsif üçün kifayət etmədikdə bunu açıq bildir və hansı əlavə məlumatların/sübutların (məs., nizamnamə üzrə direktorun səlahiyyət həddi, təsisçilərin ümumi yığıncaq qərarı, xidmətlərin faktiki icra edilib-edilməməsi, qarşı şirkətlə əlbirlik və vəsaitin sonrakı taleyi) araşdırılmalı olduğunu göstər.
   - (4.8) YEKUN YOXLAMA: Cavabın sonunda ("## Vacib məqamlar" bölməsində) istinad edilən maddə nömrələrini, miqdar hədlərini və sanksiyaları ayrıca yoxlayıb dəqiq sadala.
   - (4.9) MƏNA DƏQİQLİYİ VƏ İSTİSNALAR: Əsas qayda ilə yanaşı kontekstdəki BÜTÜN mühüm istisnaları (şəxsi/ayrıca əmlak, müddətin başlanma anı, sazişin forması, ilkin mediasiya sessiyası, təkrar törətmə və s.) mütləq əhatə et! "lazımi keyfiyyətli" = qüsursuz/sağlam maldır — əsla tərsinə çevirmə! Bitişik yazılmış məbləğ və ya müddət sözlərini düzgün oxu.
5. SƏTİRDAXİLİ İSTİNADLAR VƏ MADDƏ YAZILIŞI (E-QANUN.AI STANDARTI):
   - Sətirdaxili [N] istinadını YALNIZ həmin faktın götürüldüyü [MƏNBƏ N]-in DƏQİQ nömrəsinə uyğun yaz (bölmə nömrəsi ilə qarışdırma; mətn içində "(mənbə 6)" deyil, birbaşa [6] yaz!).
   - Ali Məhkəmə / Konstitusiya Məhkəməsi qərarlarından YALNIZ məhkəmənin öz rəsmi mövqeyini ("Plenum qeyd edir", "QƏRARA ALDI", "hesab edir") yaz — müraciət edənin/şikayətçinin iddiasını məhkəmənin mövqeyi kimi təqdim etmə! Qərarların tarixini, nömrəsini və bəndini YALNIZ [MƏNBƏ] mətnində sözbəsöz olan kimi yaz, əsla olmayan bölmə nömrəsi uydurma. Kontekstdə suala uyğun məhkəmə qərarı yoxdursa, "## Ali Məhkəmə..." bölməsini ÜMUMİYYƏTLƏ YAZMA.
   - Maddə və bənd nömrələrini rəsmi yazılışla ("Maddə 330", "Maddə 54 (I hissə)", nöqtə ilə "36.9") yaz — əsla "330-0" və ya "54-I" yazma, təsdiq/inkar mənasını əsla təhrif etmə.
   - Yalnız suala birbaşa aid olan əsas normativ maddələri və (kontekstdə varsa) Ali Məhkəmə/Konstitusiya Məhkəməsi qərarlarını seç, eyni maddəni təkrarlama.
6. DİL, TAMLIQ VƏ DAVAM SUALLARI:
   - Saf və səlis hüquqi Azərbaycan dilində yaz (ingilis və ya kiril hərfləri işlətmə). Heç bir cümlə və ya bölmə yarımçıq qalmasın.
   - "## Mənbələr" və ya URL siyahısı YAZMA (sistem aşağıda rəsmi mənbə kartları kimi göstərir).
   - "follow_ups" massivində istifadəçinin eyni məsələ ilə bağlı növbəti addımda verə biləcəyi 3 qısa, praktik davam sualı təklif et (məs., istisnalar, müddət, prosedur, borc/təkrar hal barədə).
   - İstifadəçi "ərizə yaz / hazırla" deyirsə, boş şablon yazma — əvvəlcə yalnız 1-ci addımı (iddiaçının ad, soyad, ata adı, ünvan, FİN) soruş.

YALNIZ ETİBARLI JSON OBYEKTİ QAYTAR (əlavə izah olmadan):
{
  "insufficient_sources": false,
  "missing_reason": "",
  "cavab": "## Hüquqi sual\n[sual]\n\n## Qısa cavab\n[3-5 tam, axıcı cümlədən ibarət ətraflı yekun abzas — əsas qayda, dəqiq məbləğ/müddət, müddətin başlanma anı, istisnalar və prosessual şərtlər, sətirdaxili [1] [2] istinadları ilə.]\n- [Normativ akt] — Maddə [X]: [əsas qayda/məbləğ/müddət].\n- [Normativ akt] — Maddə [Y]: [istisna / prosessual şərt / əlavə norma].\n\n## Hüquqi əsaslar\n\n### 1. [Normativ akt] — Maddə [X]\n[normanın dəqiq məzmunu, şərtləri və tətbiqi]\n\n### 2. [Normativ akt] — Maddə [Y]\n[normanın dəqiq məzmunu, istisnaları və tətbiqi]${hasJudicialInContext ? "\n\n## Ali Məhkəmə və Konstitusiya Məhkəməsinin mövqeyi\n[Kontekstdəki Ali Məhkəmə Plenumu / Konstitusiya Məhkəməsi qərarının konkret hüquqi mövqeyi: iddia müddətinin başlanması, saziş/notariat forması, mediasiya və məhkəmə tətbiqi qaydaları, [N] istinadı ilə.]" : ""}\n\n## Praktik izah və hüquqi risklər\n[3-5 tam cümlə — vətəndaşın atmalı olduğu konkret addımlar, ilkin prosessual şərtlər, sübutlar, istisnalar və diqqət edilməli hüquqi risklər.]\n\n## Vacib məqamlar\n- [Müddət və hesablanma başlanğıcı]\n- [İstisna və ya məhdudiyyət]\n- [Prosessual tələb / sübut / risk]",
  "maddeler": ["Azərbaycan Respublikasının [Normativ akt] — Maddə [X]"],
  "legal_basis": [
    {"law_name": "[Normativ aktın rəsmi adı]", "article_number": "[Maddə nömrəsi və ya məhkəmə qərarı üçün boş string]", "article_title": "[Maddənin və ya qərarın rəsmi başlığı]", "claim": "[Bu normanın tətbiq edildiyi hüquqi nəticə]"}
  ],
  "follow_ups": ["[Eyni məsələ ilə bağlı qısa davam sualı 1]", "[Davam sualı 2]", "[Davam sualı 3]"]
}`;

    const caseBanner = activeCaseContext
      ? `\nAKTİV SÖHBƏT MÖVZUSU (DAVAM SUALI): ${activeCaseContext}\n(İstifadəçinin aşağıdakı yeni sualını bu işin davamı kimi, amma YALNIZ [KONTEX] mənbələrinə əsaslanaraq cavablandır.)\n`
      : "";

    const userPrompt = `KONTEX (Qanunvericilik Mətnləri):
${contextText}
${caseBanner}
ÇOXTURLU SÖHBƏT VƏ KAZUS QAYDASI:
- Əgər istifadəçi uzun hüquqi kazus (situasiya + sual) təqdim edibsə, "## Hüquqi sual" başlığı altında yalnız əsas sualı ("${displayQuestion}") yaz, kazusdakı BÜTÜN faktları (məbləği, qulluq mövqeyini, saxta müqavilə/hesab-fakturaları, müdafiə arqumentlərini və s.) [KONTEX] maddələrinə (xüsusən Qeyd hissələrindəki məbləğ hədlərinə və vəzifəli şəxs anlayışına) əsasən dərindən təhlil et.
- Əgər yeni hüquqi mövzudursa, əvvəlki suallardakı köhnə maddə və məcəllələri UNUT və YALNIZ bu [KONTEX] mənbələrinə əsaslan.

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
          if (
            obj &&
            typeof obj === "object" &&
            (typeof obj.cavab === "string" || typeof obj.answer === "string" || obj.insufficient_sources === true)
          ) {
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
      maxTokens = 4500
    ): Promise<string> => {
      try {
        const llmRes = await generateLlmCompletion({
          messages: msgs,
          temperature: 0.05,
          maxTokens,
          timeoutMs: 22000,
          responseFormatJson: true,
          apiKeyParam: passedKey || undefined,
        });
        if (llmRes?.content?.trim()) return llmRes.content;
      } catch (primaryErr: any) {
        console.warn("[chat.ts] Primary LLM provider failed, checking edge fallback:", primaryErr?.message);
      }

      if (!passedKey && isRemoteRagConfigured()) {
        const edgeAnswer = await fetchRemoteRagAnswer(msgs, {
          maxTokens: Math.min(maxTokens, 4500),
          temperature: 0.05,
          timeoutMs: 24000,
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
      const rawContent = await invokePrimaryLlm(baseMessages, 4500);
      parsedJson = parseRawLlmJson(rawContent);
    } catch (llmErr: any) {
      usedLlmFallback = true;
      console.error("[chat.ts] LLM synthesis failed, falling back to statutory extracts:", llmErr?.message);
      parsedJson = await buildStatutoryFallbackResponse(
        query,
        allRetrievedChunks,
        queryAnalysis,
        llmExpandedTerms
      );
    }

    // 6. HONEST ABSTENTION + 2-STAGE ZERO-HALLUCINATION BACKEND AUDIT GATE (BEFORE RETURNING TO USER!)
    const hasStrongStatutoryGrounding =
      primaryScore >= 580 ||
      lawMatch.confidence === "explicit" ||
      lawMatch.confidence === "strong" ||
      Boolean(queryAnalysis.targetArticleNum);

    const hasDraftCavab =
      typeof (parsedJson?.cavab ?? parsedJson?.answer) === "string" &&
      String(parsedJson?.cavab ?? parsedJson?.answer).trim().length >= 40;

    if (!usedLlmFallback && parsedJson?.insufficient_sources === true && (!hasStrongStatutoryGrounding || !hasDraftCavab)) {
      return buildInsufficientSourceResponse(
        query,
        typeof parsedJson.missing_reason === "string" ? parsedJson.missing_reason : undefined
      );
    }

    let validated = validateLegalResponse(parsedJson, allRetrievedChunks, contextChunks);
    let auditVerified = false;
    let followUps: string[] = Array.isArray(parsedJson?.follow_ups)
      ? parsedJson.follow_ups
          .map((x: unknown) => String(x || "").trim())
          .filter((s: string) => s.length >= 8 && s.length <= 140)
          .slice(0, 3)
      : [];

    // Tier 2 Independent Backend Legal Auditor (checks fabricated articles/sections, wrong sub-clause fines, flipped polarity, repealed misuse, insufficient sources)
    const auditIssues: string[] = [];
    if (validated.ungrounded_articles && validated.ungrounded_articles.length > 0) {
      auditIssues.push(
        `[MƏNBƏ 1..N] mətnlərində olmayan uydurma maddə/bölmə nömrələri istifadə edilib: ${validated.ungrounded_articles.join(", ")}`
      );
    }

    if (!usedLlmFallback && isRemoteRagConfigured()) {
      const audit = await fetchRemoteVerifyAnswer(
        {
          query: effectiveSearchQuery,
          context: contextText,
          draftAnswer: validated.answer,
        },
        8500
      );
      if (audit) {
        if (audit.insufficient_sources && !hasStrongStatutoryGrounding) {
          return buildInsufficientSourceResponse(
            query,
            audit.issues[0] || "Tapılan mənbələr bu konkret suala birbaşa normativ cavab vermir."
          );
        }
        if (audit.passed && auditIssues.length === 0) {
          auditVerified = true;
        } else {
          if (audit.repealed_misuse) {
            auditIssues.push("Qüvvədən düşmüş ([QÜVVƏDƏN DÜŞÜB]) norma qüvvədə olan qayda kimi təqdim edilib!");
          }
          for (const iss of audit.issues || []) {
            if (iss && !auditIssues.includes(iss)) auditIssues.push(iss);
          }
        }
      }
    }

    if (!usedLlmFallback && auditIssues.length > 0) {
      const issueBullets = auditIssues.map((x, idx) => `${idx + 1}. ${x}`).join("\n");
      console.warn(`[chat.ts] Backend Legal Auditor flagged ${auditIssues.length} issue(s); running targeted repair pass...`);
      try {
        const correctiveRaw = await invokePrimaryLlm(
          [
            ...baseMessages,
            {
              role: "assistant",
              content: JSON.stringify({
                cavab: validated.answer,
                maddeler: validated.maddeler,
                legal_basis: validated.legal_basis,
                follow_ups: followUps,
              }),
            },
            {
              role: "user",
              content: `Yuxarıdakı qaralama cavabında müstəqil hüquqi audit bu nöqsanları aşkar etdi:\n${issueBullets}\n\nTƏLƏB:\n1. "## Hüquqi sual" başlığının altında YALNIZ istifadəçinin əsl sualını olduğu kimi saxla: "${displayQuestion}" (əsla bu təlimatı sual kimi yazma!).\n2. Qeyd olunan nöqsanları [MƏNBƏ 1..N] mətninə tam uyğun düzəlt, "insufficient_sources": false saxla və tam, kəsilməmiş JSON qaytar.`,
            },
          ],
          4500
        );
        const correctedJson = parseRawLlmJson(correctiveRaw);
        if (correctedJson?.insufficient_sources === true && !hasStrongStatutoryGrounding) {
          return buildInsufficientSourceResponse(
            displayQuestion,
            typeof correctedJson.missing_reason === "string" ? correctedJson.missing_reason : undefined
          );
        }
        if (typeof correctedJson?.cavab === "string" && correctedJson.cavab.trim().length >= 120) {
          // Ensure "## Hüquqi sual" always displays the user's real question, never the audit instruction
          correctedJson.cavab = correctedJson.cavab.replace(
            /^(\s*##\s*Hüquqi sual\s*\n)[^\n]+/i,
            `$1${displayQuestion}`
          );
          const revalidated = validateLegalResponse(correctedJson, allRetrievedChunks, contextChunks);
          if (
            (revalidated.ungrounded_articles?.length ?? 0) <= (validated.ungrounded_articles?.length ?? 0) &&
            revalidated.answer.length >= 120
          ) {
            validated = revalidated;
            auditVerified = (revalidated.ungrounded_articles?.length ?? 0) === 0;
            if (Array.isArray(correctedJson?.follow_ups) && correctedJson.follow_ups.length > 0) {
              followUps = correctedJson.follow_ups
                .map((x: unknown) => String(x || "").trim())
                .filter((s: string) => s.length >= 8 && s.length <= 140)
                .slice(0, 3);
            }
          }
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
      audit_verified: auditVerified && validated.citation_valid,
      follow_ups: followUps,
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
