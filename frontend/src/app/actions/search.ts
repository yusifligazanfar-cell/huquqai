"use server"

import fs from 'fs'
import path from 'path'
import { analyzeQuery } from '@/lib/legal-rag/analyzer'
import { hybridSearchAsync, type RagSearchMode } from '@/lib/legal-rag/search'
import {
  searchSqliteDocuments,
  isSqliteCorpusAvailable,
  getSqliteDocumentById,
} from '@/lib/legal-rag/corpus_sqlite'
import { searchSupabaseDocuments } from '@/lib/legal-rag/supabase_search'
import {
  fetchRemoteDocSearch,
  fetchRemoteDocumentById,
  isRemoteRagConfigured,
} from '@/lib/legal-rag/remote_backend'

export type SearchMode = RagSearchMode

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  source: string;
  score: number;
  documentId?: string;
  sourceUrl?: string;
  articleNumber?: string;
  semanticScore?: number;
  modeUsed?: SearchMode;
  elapsedMs?: number;
}

let cachedCatalog: Array<{ id: string; title: string; file: string }> | null = null;

function getEqanunCatalog() {
  if (cachedCatalog) return cachedCatalog;
  try {
    const catalogPath = path.join(process.cwd(), 'src/data/eqanun_catalog.json');
    if (fs.existsSync(catalogPath)) {
      const data = fs.readFileSync(catalogPath, 'utf-8');
      cachedCatalog = JSON.parse(data);
      return cachedCatalog || [];
    }
  } catch (e) {
    console.error("Failed to load eqanun_catalog.json:", e);
  }
  return [];
}

async function searchPrimary56kCorpus(query: string): Promise<SearchResult[]> {
  const mergedFullResults: SearchResult[] = [];
  const seenIds = new Set<string>();

  const hasLocalSqlite = isSqliteCorpusAvailable();
  const [supaDocs, sqliteDocs] = await Promise.all([
    searchSupabaseDocuments(query, 15).catch(() => []),
    hasLocalSqlite
      ? Promise.resolve(searchSqliteDocuments(query, 25))
      : isRemoteRagConfigured()
      ? fetchRemoteDocSearch(query, 25).catch(() => [])
      : Promise.resolve([]),
  ]);

  for (const sd of supaDocs) {
    if (seenIds.has(sd.documentId)) continue;
    seenIds.add(sd.documentId);
    mergedFullResults.push({
      id: `supabase-doc-${sd.documentId}`,
      title: sd.articleNumber
        ? `${sd.title} — Maddə ${sd.articleNumber}`
        : sd.title,
      content: `${sd.snippet}\n\nRəsmi keçid: ${sd.sourceUrl}`,
      source: `e-Qanun / Supabase (ID: ${sd.documentId})`,
      score: Math.round(sd.score + 400),
    });
  }

  for (const sq of sqliteDocs) {
    const idKey = `doc-${sq.documentId}-${sq.articleNumber || "main"}`;
    if (seenIds.has(idKey) || seenIds.has(sq.documentId)) continue;
    seenIds.add(sq.documentId);
    mergedFullResults.push({
      id: `eqanun-sqlite-${sq.documentId}-${sq.articleNumber || "0"}`,
      title: sq.articleNumber
        ? `${sq.title} — Maddə ${sq.articleNumber}`
        : sq.title,
      content: `${sq.snippet}${sq.isRepealed ? " [Qüvvədən düşüb]" : ""}`,
      source: `e-Qanun 56,983 Baza (ID: ${sq.documentId})`,
      score: Math.round(sq.score + 300),
      documentId: sq.documentId,
      sourceUrl: sq.sourceUrl,
      articleNumber: sq.articleNumber || undefined,
    });
  }

  return mergedFullResults.sort((a, b) => b.score - a.score);
}

export async function enlargeSearchDocument(
  documentId: string,
  articleNumber?: string
): Promise<{
  documentId: string;
  title: string;
  sourceUrl: string;
  content: string;
} | null> {
  if (!documentId) return null;
  const hasLocalSqlite = isSqliteCorpusAvailable();
  let doc = hasLocalSqlite
    ? getSqliteDocumentById(documentId, articleNumber || undefined)
    : null;
  if (hasLocalSqlite && (!doc || !doc.content) && articleNumber) {
    doc = getSqliteDocumentById(documentId);
  }
  if (!hasLocalSqlite && (!doc || !doc.content) && isRemoteRagConfigured()) {
    doc = await fetchRemoteDocumentById(documentId, articleNumber || undefined);
    if ((!doc || !doc.content) && articleNumber) {
      doc = await fetchRemoteDocumentById(documentId);
    }
  }
  if (!doc) return null;
  return {
    documentId: doc.documentId,
    title: doc.title,
    sourceUrl: doc.sourceUrl,
    content: doc.content.slice(0, 18000),
  };
}

export async function executeSearch(
  query: string,
  mode: SearchMode = "hybrid"
): Promise<SearchResult[]> {
  try {
    if (!query || !query.trim()) return [];
    const startedAt = Date.now();
    const cleanQuery = query.trim();

    // 1. Primary Universal Multi-Stage Hybrid Search (e-qanun.ai pattern: SQLite FTS5 + SBERT dense vectors + RRF rerank)
    if (isSqliteCorpusAvailable() || isRemoteRagConfigured()) {
      const analysis = analyzeQuery(cleanQuery);
      const [ragChunks, docTitleHits] = await Promise.all([
        hybridSearchAsync(analysis, 16, cleanQuery, { mode }),
        mode !== "semantic" ? searchPrimary56kCorpus(cleanQuery) : Promise.resolve([] as SearchResult[]),
      ]);

      const combined: SearchResult[] = [];
      const seenKeys = new Set<string>();

      for (const ch of ragChunks) {
        const docId =
          ch.documentId ||
          ch.sourceUrl.match(/\/results\/(\d+)/)?.[1] ||
          "";
        const dedupKey = docId
          ? `${docId}::${ch.articleNumber || "0"}`
          : ch.sourceId;
        if (seenKeys.has(dedupKey)) continue;
        seenKeys.add(dedupKey);

        combined.push({
          id: ch.sourceId,
          title: ch.articleTitle || `${ch.lawName}${ch.articleNumber ? ` — Maddə ${ch.articleNumber}` : ""}`,
          content: ch.content,
          source: docId ? `e-Qanun (ID: ${docId})` : ch.lawName,
          score: Math.round((ch.score ?? 0) + 1000),
          documentId: docId || undefined,
          sourceUrl: ch.sourceUrl || (docId ? `https://www.e-qanun.ai/results/${docId}` : undefined),
          articleNumber: ch.articleNumber || undefined,
          semanticScore: ch.semanticScore,
        });
      }

      for (const docHit of docTitleHits) {
        const dedupKey = docHit.documentId
          ? `${docHit.documentId}::${docHit.articleNumber || "0"}`
          : docHit.id;
        const alreadyHasDoc =
          docHit.documentId &&
          combined.some((r) => r.documentId === docHit.documentId);
        if (seenKeys.has(dedupKey) || (alreadyHasDoc && mode === "hybrid")) continue;
        seenKeys.add(dedupKey);
        combined.push(docHit);
      }

      const elapsedMs = Date.now() - startedAt;
      if (combined.length > 0) {
        return combined.slice(0, 20).map((item) => ({
          ...item,
          modeUsed: mode,
          elapsedMs,
        }));
      }
    }

    // 2. Fallback to legacy Knowledge Base only if SQLite is unavailable or yielded 0 hits
    const kbPath = path.join(process.cwd(), 'src/data/knowledge_base')
    if (!fs.existsSync(kbPath)) return []

    const files = fs.readdirSync(kbPath).filter(f => f.endsWith('.txt'))
    let allChunks = []


    for (const file of files) {
      const filePath = path.join(kbPath, file)
      const text = fs.readFileSync(filePath, 'utf-8')
      let rawSections = text.split(/\n\s*\n/)
      let mergedSections = []
      let currentSection = ""
      
      for (const sec of rawSections) {
          const t = sec.trim()
          if (!t) continue
          
          if (!currentSection) {
              currentSection = t
          } else if (/^(?:Maddə\s+\d+)/i.test(t)) {
              mergedSections.push(currentSection)
              currentSection = t
          } else {
              currentSection += "\n" + t
          }
      }
      if (currentSection) mergedSections.push(currentSection)
      
      for (let i = 0; i < mergedSections.length; i++) {
        const section = mergedSections[i]
        if (section.trim().length > 10) {
          let chunkTitle = ""
          const lines = section.trim().split('\n')
          const firstLine = lines[0]
          
          if (firstLine.length < 70) {
            chunkTitle = firstLine
          } else {
            const match = firstLine.match(/^([\d\.]+|Maddə \d+[\.\s]*)/i)
            if (match) {
              chunkTitle = match[0].trim()
            } else {
              chunkTitle = "Maddə / Qayda"
            }
          }

          let sourceName = file.replace('.txt', '')
          const codeNames: Record<string, string> = {
            "e_qanun_46943": "Əmək Məcəlləsi",
            "e_qanun_46947": "Mülki Məcəllə",
            "e_qanun_46944": "Mülki Məcəllə (I Hissə)",
            "e_qanun_46960": "İnzibati Xətalar Məcəlləsi",
            "e_qanun_46945": "Mülki Prosessual Məcəllə",
            "e_qanun_46950": "Cinayət Prosessual Məcəllə",
            "e_qanun_18343": "Təhsil haqqında qanun",
            "e_qanun_46946": "Ailə Məcəlləsi",
            "e_qanun_46948": "Vergi Məcəlləsi"
          }
          if (codeNames[sourceName]) {
            sourceName = codeNames[sourceName];
          } else if (sourceName === 'konstitusiya') {
            sourceName = 'Azərbaycan Respublikasının Konstitusiyası'
          } else if (sourceName === 'cpm_excerpt') {
            sourceName = 'Cinayət Prosessual Məcəlləsi'
          } else if (sourceName.startsWith("arxkom_")) {
            sourceName = "Arxkom: " + sourceName.replace("arxkom_", "").replace(/_/g, ' ')
          } else if (sourceName.startsWith("eqanun_mega_")) {
            const parts = sourceName.replace("eqanun_mega_", "").split("_")
            parts.shift() // remove numeric ID
            sourceName = parts.join(" ")
          } else if (sourceName.startsWith("e_qanun_")) {
            sourceName = "Qanun (No: " + sourceName.replace("e_qanun_", "") + ")"
          }

          allChunks.push({
            id: `${file}-${i}`,
            content: section.trim(),
            lines: lines, // Store lines for snippet extraction later
            source: sourceName,
            title: `${sourceName} - ${chunkTitle}`
          })
        }
      }
    }

    if (!query || query.trim() === "") return []

    // Preserve dots for numbers, remove other punctuation
    const queryClean = query.toLowerCase().replace(/[?,]/g, ' ')
    
    // Extract exact numbers like 177, 177.1, 116.0.8
    const exactNumberMatch = queryClean.match(/(?:madd[eə]\s*)?(\d+(?:\.\d+)*)/);
    const targetArticleNum = exactNumberMatch ? exactNumberMatch[1] : null;

    const stopWords = ['və', 'ilə', 'üçün', 'olan', 'bu', 'ki', 'isə', 'üzrə', 'haqqında', 'nədir', 'necə', 'kim', 'nə', 'vaxtdır', 'vaxt', 'edir', 'edilir', 'var']
    
    // Deep Search Synonyms for Keyword Expansion
    const synonyms: Record<string, string[]> = {
      "siqaret": ["tütün", "məmulatları", "elektron siqaret"],
      "zibil": ["tullantı"],
      "yerə": ["ətraf", "mühitə", "yer"],
      "atmaq": ["atılması", "atılmasına", "tullamaq"],
      "yerə atmaq": ["tullantıların atılması", "ətraf mühitə atılması", "atılmasına"],
      "siqareti yerə atmaq": ["tütün məmulatları tullantılarının ətraf mühitə atılması"],
      "maşın": ["nəqliyyat", "vasitəsi", "avtomobil", "sürücü"],
      "avariya": ["qəza", "yol-nəqliyyat", "toqquşma"],
      "söyüş": ["təhqir", "nalayiq", "şərəf", "ləyaqət"],
      "döyülmə": ["xəsarət", "döymə", "vurma", "zədə"],
      "oğurluq": ["talama", "gizli", "mənimsəmə"],
      "rüşvət": ["hörmət", "vəzifə", "səlahiyyət", "korrupsiya"],
      "işdən çıxarma": ["əmək müqaviləsinə xitam", "işdən azad"],
      "aliment": ["uşağın saxlanması"],
      "boşanma": ["nikahın pozulması", "nikaha xitam"],
      "uşaq pulu": ["müavinət", "sosial", "yardım"],
      "ölüm": ["vəfat", "öldürmə", "qəsdən"],
      "pul": ["manat", "məbləğ", "vəsait", "maliyyə"],
      "cərimə": ["tənbeh", "məsuliyyət", "cəza", "manat"],
      "müqaviləsiz": ["əmək müqaviləsi", "bağlanmadan", "rəsmiləşdirilmədən", "cəlb edilməsi", "gizli", "şifahi"],
      "işləyirəm": ["işçi", "əmək", "münasibətləri", "işəgötürən", "staj"],
      "borc": ["kredit", "faiz", "ipoteka", "pul", "ödəməmə", "zamin"],
      "xəsarət": ["istehsalatda bədbəxt hadisə", "bədən", "zərər"],
      "təzminat": ["kompensasiya", "ödəmə", "ziyanın əvəzi"],
      "haqsızlıq": ["hüququn pozulması", "qanunsuz", "əsassız"]
    }

    let rawQueryWords = queryClean
      .split(/\s+/)
      .map(w => w.replace(/\.+$/, '')) // strip trailing dots only
      .filter(w => w.length > 2 && !stopWords.includes(w))

    let expandedQueryWords = new Set<string>();
    
    for (const raw of rawQueryWords) {
        expandedQueryWords.add(raw);
    }
    
    // Check if user query matches any synonym phrases to inject legal keywords
    for (const [key, syns] of Object.entries(synonyms)) {
        if (queryClean.includes(key)) {
            syns.forEach(s => {
                s.split(/\s+/).forEach(sw => {
                    if (sw.length > 2 && !stopWords.includes(sw)) {
                        expandedQueryWords.add(sw);
                    }
                });
            });
        }
    }
    
    const queryWords = Array.from(expandedQueryWords);
    
    let scoredChunks = []
    let maxOverallScore = 0

    for (const chunk of allChunks) {
      const chunkLower = chunk.content.toLowerCase()
      let score = 0
      
      // Exact Article Match Boost (Massive Score)
      if (targetArticleNum) {
        if (
          chunkLower.startsWith(`maddə ${targetArticleNum}.`) || 
          chunkLower.startsWith(`maddə ${targetArticleNum} `) ||
          chunkLower.startsWith(`${targetArticleNum}.`) || 
          chunkLower.startsWith(`${targetArticleNum} `)
        ) {
          score += 2000
        }
      }

      // Exact prefix match (e.g. for "7.0.34. yaşayış yeri")
      if (chunkLower.startsWith(queryClean.trim())) {
        score += 1000
      }
      
      const sourceLower = chunk.source.toLowerCase()
      const titleLower = chunk.title.toLowerCase()

      for (const word of queryWords) {
        const occurrences = chunkLower.split(word).length - 1
        if (occurrences > 0) {
          const cappedOccurrences = Math.min(occurrences, 3)
          score += cappedOccurrences * 2
          
          // Use index of to avoid regex boundaries breaking on dots
          if (chunkLower.includes(` ${word} `) || chunkLower.includes(` ${word}.`) || chunkLower.includes(` ${word}-`) || chunkLower.startsWith(`${word} `)) {
            score += 8
          }
        }
        
        // Check if the user mentioned the Book/Document name (e.g. "Konstitusiya", "Cinayət")
        if (sourceLower.includes(word)) {
          score += 15  // Big boost for matching the correct book
        }
        if (titleLower.includes(word)) {
          score += 5
        }
      }

      const bigrams = []
      for (let i = 0; i < queryWords.length - 1; i++) {
        bigrams.push(queryWords[i] + " " + queryWords[i+1])
      }
      for (const bigram of bigrams) {
        if (chunkLower.includes(bigram)) {
          score += 20 
        }
      }
      
      const lengthPenalty = chunk.content.length / 500;
      score = score / Math.sqrt(Math.max(1, lengthPenalty));
      
      if (score > 0) {
        let snippet = chunk.content;
        
        if (chunk.lines && chunk.lines.length > 1) {
          const matchedLines = [];
          
          // Always add the first 3 lines for context (usually the Title and the start of the article)
          for (let i = 0; i < Math.min(3, chunk.lines.length); i++) {
             if (chunk.lines[i].trim()) {
               matchedLines.push(chunk.lines[i].trim());
             }
          }
          
          // Add any matching lines that are deep in the article
          let lastAddedIdx = 2;
          for (let i = 3; i < chunk.lines.length; i++) {
            const line = chunk.lines[i];
            const lineLower = line.toLowerCase();
            const hasMatch = (targetArticleNum && lineLower.includes(targetArticleNum)) || 
                             (queryWords.length > 0 && queryWords.some(w => lineLower.includes(w) && w !== 'maddə' && w !== 'maddəsi' && w !== 'maddəsində'));
            
            if (hasMatch && line.trim().length > 10) {
              if (i - lastAddedIdx > 1) {
                 matchedLines.push("...");
              }
              matchedLines.push(line.trim());
              lastAddedIdx = i;
            }
          }
          
          snippet = matchedLines.join('\n');
          if (snippet.length > 450) {
             snippet = snippet.substring(0, 450) + "...";
          }
        }

        // Remove lines array to save memory in the final payload
        const finalChunk = { ...chunk, content: snippet, score };
        // @ts-ignore
        delete finalChunk.lines;

        scoredChunks.push(finalChunk)
        if (score > maxOverallScore) {
          maxOverallScore = score
        }
      }
    }
    
    // Deduplicate results by title (prevents duplicate files from showing the same article twice)
    const seenTitles = new Set();
    scoredChunks = scoredChunks.filter(c => {
      const isDuplicate = seenTitles.has(c.title);
      seenTitles.add(c.title);
      return !isDuplicate;
    });

    // Strict Filtering: If we found an exact article match, filter out the noise
    if (maxOverallScore >= 1000) {
      scoredChunks = scoredChunks.filter(c => c.score >= 1000)
    } else {
      // Dynamic thresholding: exclude results that have completely irrelevant scores compared to the top result
      scoredChunks = scoredChunks.filter(c => c.score >= maxOverallScore * 0.3)
    }

    scoredChunks.sort((a, b) => b.score - a.score);

    // Merge Supabase / SQLite if reached via fallback
    const mergedFullResults = await searchPrimary56kCorpus(query);

    for (const sc of scoredChunks) {
      if (!mergedFullResults.some((m) => m.title === sc.title)) {
        mergedFullResults.push(sc);
      }
    }

    if (mergedFullResults.length > 0) {
      return mergedFullResults
        .sort((a, b) => b.score - a.score)
        .slice(0, 20);
    }

    // Legacy catalog fallback only if SQLite FTS5 index is absent
    const catalog = getEqanunCatalog();
    if (catalog.length > 0) {
      const qClean = query.trim().toLowerCase();
      const numMatch = qClean.match(/\b\d{4,6}\b/);
      const targetDocId = numMatch ? numMatch[0] : (targetArticleNum && targetArticleNum.length >= 4 ? targetArticleNum : null);

      const catalogMatches = catalog.filter(c => {
        if (targetDocId && c.id === targetDocId) return true;
        if (qClean.length > 3 && c.title.toLowerCase().includes(qClean)) return true;
        return false;
      }).slice(0, 5);

      for (const catDoc of catalogMatches) {
        const isAlreadyAdded = scoredChunks.some(s => s.id.includes(catDoc.id) || s.title.includes(catDoc.id));
        if (!isAlreadyAdded) {
          scoredChunks.unshift({
            id: `eqanun-catalog-${catDoc.id}`,
            title: `e-Qanun Sənədi № ${catDoc.id} - ${catDoc.title}`,
            content: `Azərbaycan Respublikasının Rəsmi Qanunvericilik Aktı (ID: ${catDoc.id}).\nSənəd adı: ${catDoc.title}.\nRəsmi keçid: https://www.e-qanun.ai/results/${catDoc.id}`,
            lines: [],
            source: `e-Qanun (ID: ${catDoc.id})`,
            score: 5000
          });
        }
      }
    }

    return scoredChunks.slice(0, 15);
  } catch (error) {
    console.error("Semantic search error:", error)
    return []
  }
}

