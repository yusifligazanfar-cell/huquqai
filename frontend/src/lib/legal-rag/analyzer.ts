import { QueryAnalysis } from './types';
import { findLawByQuery, LAW_REGISTRY } from './registry';
import { LEGAL_CONCEPTS, LegalConcept } from './thesaurus';

export function normalizeAz(text: string): string {
  if (!text) return "";
  return text
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/ı/g, 'i')
    .replace(/Ə/g, 'e')
    .replace(/ə/g, 'e')
    .replace(/Ö/g, 'o')
    .replace(/ö/g, 'o')
    .replace(/Ü/g, 'u')
    .replace(/ü/g, 'u')
    .replace(/Ğ/g, 'g')
    .replace(/ğ/g, 'g')
    .replace(/Ş/g, 's')
    .replace(/ş/g, 's')
    .replace(/Ç/g, 'c')
    .replace(/ç/g, 'c')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function analyzeQuery(query: string, history?: { role: string; content: string }[]): QueryAnalysis {
  const norm = normalizeAz(query);
  const cleanQuery = query.toLowerCase().replace(/[?,()\[\]{}!]/g, ' ');

  // 1. Detect Explicit Article and Part Reference
  let targetArticleNum: string | null = null;
  let targetPart: string | null = null;

  const explicitArtMatch = cleanQuery.match(/(?:madd[eə]\s*)(\d+(?:\.\d+)*)/i);
  if (explicitArtMatch) {
    targetArticleNum = explicitArtMatch[1];
  } else {
    // Only match beginning number if NOT a 4-digit year like 2026-cı il
    const prefixArtMatch = cleanQuery.match(/^(\d+)(?:\-c[iıuü]|\-cu|\-cü|\-cı|\.)\s*(?!il\b|ild[eə]\b)/i);
    if (prefixArtMatch) {
      const num = parseInt(prefixArtMatch[1], 10);
      if (num < 1900 || num > 2100) {
        targetArticleNum = prefixArtMatch[1];
      }
    }
  }

  const partMatch = cleanQuery.match(/(?:bənd|bend|hissə|hisse|yarımbənd)\s*([a-zçşəğıöü\d\.]+)/i) || cleanQuery.match(/(\d+)\s*([a-zçşəğıöü])\s*bənd/i);
  if (partMatch) {
    targetPart = partMatch[1] || partMatch[2];
  }

  // 2. Identify Legal Domain and Matching Concepts from Thesaurus
  let legalDomain = "Ümumi hüquq";
  const possibleLawsSet = new Set<string>();
  const expandedKeywords = new Set<string>();
  const priorityArticlesSet = new Set<string>();

  // Direct Law Match
  const matchedLaw = findLawByQuery(norm);
  if (matchedLaw) {
    legalDomain = matchedLaw.category;
    possibleLawsSet.add(matchedLaw.name);
  }

  // Concept & Thesaurus Expansion
  for (const concept of LEGAL_CONCEPTS) {
    const isTriggered = concept.triggerPhrases.some(phrase => {
      const normPhrase = normalizeAz(phrase);
      if (norm.includes(normPhrase)) return true;
      const phraseWords = normPhrase.split(' ').filter(w => w.length > 3);
      return phraseWords.length >= 2 && phraseWords.every(w => norm.includes(w));
    });

    if (isTriggered) {
      legalDomain = concept.domain;
      const regLaw = LAW_REGISTRY[concept.primaryLawId];
      if (regLaw) possibleLawsSet.add(regLaw.name);

      concept.expandedTerms.forEach(t => {
        normalizeAz(t).split(/\s+/).forEach(w => {
          if (w.length > 2) expandedKeywords.add(w);
        });
      });

      concept.priorityArticles.forEach(art => priorityArticlesSet.add(art));
    }
  }

  // 3. Extract Raw Query Words
  const stopWords = new Set([
    've', 'ile', 'ucun', 'olan', 'bu', 'ki', 'ise', 'uzre', 'haqqinda', 
    'nedir', 'nece', 'kim', 'ne', 'vaxtdir', 'vaxt', 'edir', 'edilir', 'var', 
    'mecburidirmi', 'olarmi', 'olar', 'olmaz', 'etraflı', 'etrafli', 'melumat', 'vere', 
    'bilersiniz', 'zehmet', 'olmasa', 'ede', 'bilerem', 'isteyirem', 'gore',
    'bagli', 'dair', 'kimi', 'yaxud', 'veya', 'de', 'da', 'bes', 'indi', 'yaxsi'
  ]);

  const rawWords = norm
    .split(/[\s\.\,\;\:\!\?]+/)
    .map(w => w.replace(/\.+$/, ''))
    .filter(w => w.length > 2 && !stopWords.has(w));

  rawWords.forEach(w => expandedKeywords.add(w));

  // Contextualization from history if short query
  if (rawWords.length <= 3 && history && history.length > 0) {
    const lastUser = [...history].reverse().find(m => m.role === 'user');
    if (lastUser) {
      const prevWords = normalizeAz(lastUser.content)
        .split(/[\s\.\,\;\:\!\?]+/)
        .map(w => w.replace(/\.+$/, ''))
        .filter(w => w.length > 3 && !stopWords.has(w));
      prevWords.slice(0, 4).forEach(w => expandedKeywords.add(w));
    }
  }

  const entities: string[] = [];
  const words = norm.split(/\s+/);
  if (words.some(w => ["isegoturen", "isci", "emek"].includes(w))) entities.push("İşçi - İşəgötürən");
  if (words.some(w => ["alici", "satici"].includes(w))) entities.push("Alıcı - Satıcı");
  if (words.some(w => ["er", "arvad", "usaq", "aliment"].includes(w))) entities.push("Ər - Arvad - Uşaq");
  if (words.some(w => ["surucu", "piyada", "avtomobil", "masin"].includes(w))) entities.push("Nəqliyyat - Sürücü");
  if (words.some(w => ["qonsu", "qonsular"].includes(w))) entities.push("Qonşular arası münasibət");
  if (words.some(w => ["siqaret", "tutun", "zibil", "cerime", "polisi", "protokol"].includes(w))) entities.push("Vətəndaş - İnzibati Məsuliyyət");


  return {
    normalizedQuery: norm,
    legalDomain,
    intent: targetArticleNum ? `Maddə ${targetArticleNum} təhlili` : `${legalDomain} üzrə hüquqi təhlil`,
    entities,
    keywords: Array.from(expandedKeywords),
    possibleLaws: Array.from(possibleLawsSet),
    targetArticleNum,
    targetPart
  };
}
