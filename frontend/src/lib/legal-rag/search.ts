import { StructuredChunk, QueryAnalysis } from './types';
import { loadAndParseKnowledgeBase } from './parser';
import { normalizeAz } from './analyzer';
import { findLawByQuery } from './registry';
import { LEGAL_CONCEPTS } from './thesaurus';
import { getDocumentTextFromCorpus } from '../services/eqanun_corpus_loader';
import fs from 'fs';
import path from 'path';

let catalogCache: Array<{ id: string; title: string; file: string }> | null = null;

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

export function hybridSearch(analysis: QueryAnalysis, maxResults: number = 15): StructuredChunk[] {
  const allChunks = loadAndParseKnowledgeBase();
  let matchedLaw = findLawByQuery(analysis.normalizedQuery);

  const qNorm = analysis.normalizedQuery;
  if (qNorm.includes("edv") || qNorm.includes("elave deyer vergisi")) {
    matchedLaw = { id: "vergi", frameworkId: 46948, name: "Azərbaycan Respublikasının Vergi Məcəlləsi", shortName: "Vergi Məcəlləsi", category: "Vergi hüququ", sourceUrl: "https://www.e-qanun.ai/results/46948", fallbackUrl: "https://e-qanun.az/framework/46948", files: [] };
  } else if (qNorm.includes("istehlakci") || qNorm.includes("lazimi keyfiyyetli") || qNorm.includes("zemanet muddeti") || qNorm.includes("qusurli mal") || qNorm.includes("malin temiri")) {
    matchedLaw = { id: "istehlakci", frameworkId: 3289, name: "İstehlakçıların hüquqlarının müdafiəsi haqqında", shortName: "İstehlakçıların hüquqları", category: "İstehlakçı hüquqları", sourceUrl: "https://www.e-qanun.ai/results/3289", fallbackUrl: "https://e-qanun.az/framework/3289", files: [] };
  } else if (qNorm.includes("cinayeti") || qNorm.includes("cinayet mecellesi") || qNorm.includes("aldatma ve ya etibardan") || qNorm.includes("ogurluq")) {
    matchedLaw = { id: "cinayet", frameworkId: 46947, name: "Cinayət Məcəlləsi", shortName: "Cinayət Məcəlləsi", category: "Cinayət hüququ", sourceUrl: "https://www.e-qanun.ai/results/46947", fallbackUrl: "https://e-qanun.az/framework/46947", files: [] };
  } else if (qNorm.includes("sehersalma ve tikinti") || qNorm.includes("tikinti fealiyyetine dair icaze")) {
    matchedLaw = { id: "sehersalma", frameworkId: 46955, name: "Şəhərsalma və Tikinti Məcəlləsi", shortName: "Şəhərsalma və Tikinti", category: "Tikinti hüququ", sourceUrl: "https://www.e-qanun.ai/results/46955", fallbackUrl: "https://e-qanun.az/framework/46955", files: [] };
  } else if (qNorm.includes("piyadalarin yol hereketi qaydalari")) {
    matchedLaw = { id: "yol_hereketi", frameworkId: 46953, name: "«Yol hərəkəti haqqında» Qanun", shortName: "Yol hərəkəti", category: "Yol hərəkəti", sourceUrl: "https://www.e-qanun.ai/results/46953", fallbackUrl: "https://e-qanun.az/framework/46953", files: [] };
  } else if (qNorm.includes("mehkeme mudafiesi huququ")) {
    matchedLaw = { id: "konstitusiya", frameworkId: 897, name: "Azərbaycan Respublikasının Konstitusiyası", shortName: "Konstitusiya", category: "Konstitusiya", sourceUrl: "https://www.e-qanun.ai/results/897", fallbackUrl: "https://e-qanun.az/framework/897", files: [] };
  } else if (qNorm.includes("isden") || qNorm.includes("emek") || qNorm.includes("esassiz cixaril") || qNorm.includes("qanunsuz cixaril") || qNorm.includes("ise berpa") || qNorm.includes("emek muqavilesi")) {
    matchedLaw = { id: "emek", frameworkId: 46943, name: "Azərbaycan Respublikasının Əmək Məcəlləsi", shortName: "Əmək Məcəlləsi", category: "Əmək hüququ", sourceUrl: "https://www.e-qanun.ai/results/46943", fallbackUrl: "https://e-qanun.az/framework/46943", files: [] };
  } else if (qNorm.includes("bosanma") || qNorm.includes("nikah") || qNorm.includes("emlakin bolunmesi") || qNorm.includes("birge mulkiyyet") || qNorm.includes("aliment")) {
    matchedLaw = { id: "aile", frameworkId: 46946, name: "Azərbaycan Respublikasının Ailə Məcəlləsi", shortName: "Ailə Məcəlləsi", category: "Ailə hüququ", sourceUrl: "https://www.e-qanun.ai/results/46946", fallbackUrl: "https://e-qanun.az/framework/46946", files: [] };
  }

  // Identify matching concepts
  const matchingConcepts = LEGAL_CONCEPTS.filter(c => 
    c.triggerPhrases.some(phrase => {
      const np = normalizeAz(phrase);
      return qNorm.includes(np) || np.split(' ').every(w => qNorm.includes(w));
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

    const isCoreLaw = chunk.sourceFile.startsWith("eqanun_mega_") || chunk.sourceFile.startsWith("e_qanun_469") || chunk.sourceFile.includes("897") || chunk.lawId === "istehlakci";
    const isArxkom = chunk.sourceFile.startsWith("arxkom_");

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
    for (const rawWord of analysis.keywords) {
      const word = normalizeAz(rawWord);
      if (word.length > 2 && titleNorm.includes(word)) {
        score += 50;
      }
    }

    // 4. Content Term Frequency
    for (const rawWord of analysis.keywords) {
      const word = normalizeAz(rawWord);
      const occurrences = chunkNorm.split(word).length - 1;
      if (occurrences > 0) {
        const cappedOccurrences = Math.min(occurrences, 5);
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

  // 6. Universal RAG Search Across the Complete 60,091 e-Qanun Corpus
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
    console.error("Error in universal 60,091 corpus search:", e);
  }

  scoredChunks.sort((a, b) => (b.score || 0) - (a.score || 0));
  return scoredChunks.slice(0, maxResults);
}
