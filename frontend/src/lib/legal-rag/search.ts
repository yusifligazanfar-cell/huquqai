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

    // 2. Priority Concept Articles Boost (e.g. Labor termination -> 70, 77, 72)
    if (matchingConcepts.some(c => c.primaryLawId === chunk.lawId)) {
      if (priorityArticles.has(chunk.articleNumber)) {
        score += 250;
      }
    }

    // 3. Domain & Law Matching Boost
    if (matchedLaw && (chunk.lawId === matchedLaw.id || chunk.lawName.includes(matchedLaw.name))) {
      score += 70;
    }

    // 4. Title Matching Boost (Higher weight if keywords appear in article title)
    for (const rawWord of analysis.keywords) {
      const word = normalizeAz(rawWord);
      if (titleNorm.includes(word)) {
        score += 35;
      }
    }

    // 5. Keyword Term Frequency Scoring in content
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

    // Length normalization
    const lengthPenalty = chunk.content.length / 500;
    score = score / Math.sqrt(Math.max(1, lengthPenalty));

    if (score > 0) {
      scoredChunks.push({ ...chunk, score });
    }
  }

  // Sort by score descending
  scoredChunks.sort((a, b) => (b.score || 0) - (a.score || 0));

  const top = scoredChunks.slice(0, maxResults);

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

  return top;
}
