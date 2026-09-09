import { StructuredChunk, QueryAnalysis } from './types';
import { loadAndParseKnowledgeBase } from './parser';
import { normalizeAz } from './analyzer';
import { findLawByQuery } from './registry';
import { LEGAL_CONCEPTS } from './thesaurus';

export function hybridSearch(analysis: QueryAnalysis, maxResults: number = 15): StructuredChunk[] {
  const allChunks = loadAndParseKnowledgeBase();
  const matchedLaw = findLawByQuery(analysis.normalizedQuery);

  // Identify matching concepts to retrieve priority articles & forbidden terms
  const matchingConcepts = LEGAL_CONCEPTS.filter(c => 
    c.triggerPhrases.some(phrase => {
      const np = normalizeAz(phrase);
      return analysis.normalizedQuery.includes(np) || np.split(' ').every(w => analysis.normalizedQuery.includes(w));
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

  let scoredChunks: StructuredChunk[] = [];

  for (const chunk of allChunks) {
    const chunkLower = chunk.content.toLowerCase();
    const chunkNorm = normalizeAz(chunkLower);
    const titleNorm = normalizeAz(chunk.articleTitle);
    let score = 0;

    const isCoreLaw = chunk.sourceFile.startsWith("eqanun_mega_") || chunk.sourceFile.startsWith("e_qanun_469") || chunk.sourceFile.includes("897");
    const isArxkom = chunk.sourceFile.startsWith("arxkom_");

    if (isCoreLaw) score += 40;
    if (isArxkom) score -= 60;

    // Filter forbidden phrases for this concept
    for (const forbidden of forbiddenPhrases) {
      if (chunkNorm.includes(forbidden) || titleNorm.includes(forbidden)) {
        score -= 150;
      }
    }

    // 1. Explicit Article Matching (if user explicitly queried "Maddə 70" or "70-ci maddə")
    if (analysis.targetArticleNum) {
      if (
        chunk.articleNumber === analysis.targetArticleNum ||
        chunkLower.startsWith(`maddə ${analysis.targetArticleNum}.`) ||
        chunkLower.startsWith(`maddə ${analysis.targetArticleNum} `) ||
        chunkLower.startsWith(`${analysis.targetArticleNum}.`)
      ) {
        score += 3000;
        if (matchedLaw && chunk.lawId === matchedLaw.id) {
          score += 2000;
        }
      }
    }

    // 2. Domain & Law Matching Boost
    if (matchedLaw && (chunk.lawId === matchedLaw.id || chunk.lawName.includes(matchedLaw.name))) {
      score += 70;
    }

    // 3. Title Matching Boost (Higher weight if keywords appear in article title)
    for (const rawWord of analysis.keywords) {
      const word = normalizeAz(rawWord);
      if (titleNorm.includes(word)) {
        score += 35;
      }
    }

    // 4. Keyword Term Frequency Scoring in content
    for (const rawWord of analysis.keywords) {
      const word = normalizeAz(rawWord);
      const occurrences = chunkNorm.split(word).length - 1;
      if (occurrences > 0) {
        const cappedOccurrences = Math.min(occurrences, 4);
        score += cappedOccurrences * 4;
        if (chunkNorm.includes(` ${word} `) || chunkNorm.includes(` ${word}.`) || chunkNorm.includes(` ${word},`)) {
          score += 12;
        }
      } else if (word.length > 5) {
        const root = word.substring(0, 5);
        if (chunkNorm.includes(root)) {
          score += 5;
        }
      }
    }

    // Length normalization for text matching
    const lengthPenalty = chunk.content.length / 500;
    score = score / Math.sqrt(Math.max(1, lengthPenalty));

    // 5. Priority Concept Articles Boost (applied post-normalization)
    if (matchingConcepts.some(c => c.primaryLawId === chunk.lawId)) {
      if (priorityArticles.has(chunk.articleNumber)) {
        score += 500;
      }
    }


    if (score > 0) {
      scoredChunks.push({ ...chunk, score });
    }
  }

  // Sort by score descending
  scoredChunks.sort((a, b) => (b.score || 0) - (a.score || 0));

  let top = scoredChunks.slice(0, maxResults);

  // If specific document ID (e.g. 60090) or special query is passed, search the 56,982 e-qanun catalog
  const numIdMatch = analysis.normalizedQuery.match(/\b\d{4,6}\b/);
  let targetId: string | null = null;
  if (numIdMatch) {
    const parsedNum = parseInt(numIdMatch[0], 10);
    // Only treat as document ID if not a recent calendar year
    if (parsedNum < 1900 || parsedNum > 2100) {
      targetId = numIdMatch[0];
    }
  }

  // 6. Search across the 56,982 e-qanun catalog for ALL relevant decrees, orders, and acts
  try {
    const fs = require('fs');
    const path = require('path');
    const catalogPath = path.join(process.cwd(), 'src/data/eqanun_catalog.json');
    if (fs.existsSync(catalogPath)) {
      const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));

      // Filter query keywords (length > 3, exclude stop words)
      const meaningfulKeywords = analysis.keywords
        .map(w => normalizeAz(w))
        .filter(w => w.length > 3 && !['azerbaycan', 'respublikasi', 'haqqinda', 'qanunu', 'maddesi'].includes(w));

      if (targetId || meaningfulKeywords.length > 0) {
        const scoredDocs: { doc: any; matchScore: number }[] = [];

        for (const catDoc of catalog) {
          if (targetId && catDoc.id === targetId) {
            scoredDocs.push({ doc: catDoc, matchScore: 10000 });
            continue;
          }

          const cTitleNorm = normalizeAz(catDoc.title);
          let matchScore = 0;

          // Check for exact phrases or multiple keyword hits
          if (analysis.normalizedQuery.length > 8 && cTitleNorm.includes(analysis.normalizedQuery)) {
            matchScore += 200;
          }

          let matchedKeywordCount = 0;
          for (const kw of meaningfulKeywords) {
            if (cTitleNorm.includes(kw)) {
              matchScore += 25;
              matchedKeywordCount++;
            }
          }

          // Bonus if multiple distinctive keywords matched
          if (matchedKeywordCount >= 2) {
            matchScore += matchedKeywordCount * 20;
          }

          // Special domain bonuses
          if (analysis.normalizedQuery.includes("minimum") && analysis.normalizedQuery.includes("emek") && (catDoc.id === "53129" || catDoc.id === "48651")) {
            matchScore += 500;
          }

          if (matchScore >= 50) {
            scoredDocs.push({ doc: catDoc, matchScore });
          }
        }

        // Sort by match score descending
        scoredDocs.sort((a, b) => b.matchScore - a.matchScore);

        // Take top 3 most relevant external acts from catalog
        const topCatalogDocs = scoredDocs.slice(0, 3);

        for (const { doc: catDoc, matchScore } of topCatalogDocs) {
          let docContent = "";
          try {
            const fileName = catDoc.file;
            const fullDir = path.resolve(process.cwd(), '../data/full_eqanun_corpus');
            const targetFile = path.resolve(fullDir, fileName);
            if (targetFile.startsWith(fullDir) && fs.existsSync(targetFile)) {
              docContent = fs.readFileSync(targetFile, 'utf-8');
            }
          } catch {
            // ignore
          }

          if (!docContent) {
            docContent = `Azərbaycan Respublikasının Qanunvericilik Aktı (ID: ${catDoc.id}).\nSənəd adı: ${catDoc.title}.\nRəsmi keçid: https://www.e-qanun.ai/results/${catDoc.id}`;
          }

          scoredChunks.push({
            sourceId: `eqanun_doc_${catDoc.id}`,
            lawId: `eqanun_${catDoc.id}`,
            lawName: catDoc.title,
            articleNumber: catDoc.id,
            articleTitle: `${catDoc.title} (Akt № ${catDoc.id})`,
            content: docContent.substring(0, 4000),
            sourceFile: catDoc.file,
            sourceUrl: `https://www.e-qanun.ai/results/${catDoc.id}`,
            score: targetId ? 10000 : Math.min(850, matchScore * 3)
          });
        }
      }
    }
  } catch (e) {
    console.error("Error matching eqanun catalog in hybridSearch:", e);
  }

  // Final re-ranking by score
  scoredChunks.sort((a, b) => (b.score || 0) - (a.score || 0));
  top = scoredChunks.slice(0, maxResults);

  // Cross-reference expansion
  if (top.length > 0 && top.length < maxResults + 2) {
    const primaryChunk = top[0];
    const crossRefMatch = primaryChunk.content.match(/(?:maddə[sində]*|maddəsinə əsasən)\s*(\d+)/i);
    if (crossRefMatch && crossRefMatch[1] !== primaryChunk.articleNumber) {
      const refArtNum = crossRefMatch[1];
      const referencedChunk = allChunks.find(c => c.lawId === primaryChunk.lawId && c.articleNumber === refArtNum);
      if (referencedChunk && !top.some(t => t.sourceId === referencedChunk.sourceId)) {
        top.push({ ...referencedChunk, score: (primaryChunk.score || 100) - 10 });
      }
    }
  }

  return top.slice(0, maxResults);
}

