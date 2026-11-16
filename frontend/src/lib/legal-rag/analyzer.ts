import { QueryAnalysis } from './types';
import { findCandidateLawsByQuery, LAW_REGISTRY } from './registry';
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

  // Direct / Topic-Scored Law Candidates
  const lawMatch = findCandidateLawsByQuery(norm);
  if (lawMatch.primary) {
    legalDomain = lawMatch.primary.category;
  }
  for (const cl of lawMatch.candidates) {
    possibleLawsSet.add(cl.name);
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
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 2 && !stopWords.has(w));

  rawWords.forEach(w => expandedKeywords.add(w));

  // Smart Follow-Up Detection: ONLY inherit previous turn context when query is anaphoric ("bəs...", "təkrar...", "bunun...")
  // and NOT an independent new topic like "Pensiya yaşı neçədir?" or "Boşanma necə olur?"
  const hasIndependentSubject =
    lawMatch.confidence === 'explicit' ||
    lawMatch.confidence === 'strong' ||
    priorityArticlesSet.size > 0 ||
    targetArticleNum !== null;
  const anaphoricRegex =
    /\b(bes|bunun|buna|bunu|bunda|bundan|bunlar|bunlara|onun|ona|onu|onda|ondan|onlar|hemin|tekrar|ikinci|novbeti|daha sonra|basqa|elave|hara sikayet|hara muraciet|ne etmeli)\b/;
  const isFollowUp =
    Boolean(history && history.length > 0) &&
    !hasIndependentSubject &&
    (anaphoricRegex.test(norm) || rawWords.length <= 2);

  const followUpContextTerms: string[] = [];
  const followUpPriorityArticles: string[] = [];
  if (isFollowUp && history && history.length > 0) {
    const prevUsers = history.filter((m) => m.role === 'user').slice(-2);
    const lastAssistant = [...history].reverse().find((m) => m.role === 'assistant');

    // Recover the legal domain/code and statutory concepts discussed in the immediately preceding turn
    for (const pu of [...prevUsers].reverse()) {
      const puNorm = normalizeAz(pu.content);
      const puLaw = findCandidateLawsByQuery(puNorm);
      if (puLaw.primary) {
        if (legalDomain === 'Ümumi hüquq') legalDomain = puLaw.primary.category;
        for (const c of puLaw.candidates) possibleLawsSet.add(c.name);
      }
      for (const concept of LEGAL_CONCEPTS) {
        const matched = concept.triggerPhrases.some((phrase) => {
          const np = normalizeAz(phrase);
          if (puNorm.includes(np)) return true;
          const pw = np.split(' ').filter((w) => w.length > 3);
          return pw.length >= 2 && pw.every((w) => puNorm.includes(w));
        });
        if (matched) {
          if (legalDomain === 'Ümumi hüquq') legalDomain = concept.domain;
          const regLaw = LAW_REGISTRY[concept.primaryLawId];
          if (regLaw) possibleLawsSet.add(regLaw.name);
          for (const et of concept.expandedTerms.slice(0, 2)) {
            if (!followUpContextTerms.includes(et)) followUpContextTerms.push(et);
          }
          for (const pa of concept.priorityArticles.slice(0, 3)) {
            if (!followUpPriorityArticles.includes(pa)) followUpPriorityArticles.push(pa);
          }
        }
      }
      const prevMetaSkip = new Set([
        'ceza', 'cezasi', 'cerime', 'cerimesi', 'cinayet', 'cinayeti', 'cinayetinin',
        'qeder', 'qederdir', 'madde', 'hansi', 'nece',
      ]);
      const prevTokens = puNorm
        .replace(/[^a-z0-9\s]+/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length >= 4 && !stopWords.has(w) && !prevMetaSkip.has(w));
      for (const pt of prevTokens.slice(0, 5)) {
        expandedKeywords.add(pt);
        if (!followUpContextTerms.includes(pt)) followUpContextTerms.push(pt);
      }
      if (puLaw.primary) break;
    }

    if (lastAssistant?.content) {
      const assistantHead = lastAssistant.content.slice(0, 2200);
      const aNorm = normalizeAz(assistantHead);
      const aLaw = findCandidateLawsByQuery(aNorm);
      if (aLaw.primary) {
        if (legalDomain === 'Ümumi hüquq') legalDomain = aLaw.primary.category;
        possibleLawsSet.add(aLaw.primary.name);
      }
      const artMatches = assistantHead.matchAll(/Madd[eə]\s*(\d+(?:[.\-]\d+)*)/gi);
      for (const m of artMatches) {
        const baseArt = m[1].split(/[.\-]/)[0];
        if (baseArt && !followUpPriorityArticles.includes(baseArt)) {
          followUpPriorityArticles.push(baseArt);
        }
        if (followUpPriorityArticles.length >= 4) break;
      }
    }
  }

  const entities: string[] = [];
  const words = norm.split(/\s+/);
  if (words.some(w => ["isegoturen", "isci", "emek"].includes(w))) entities.push("İşçi - İşəgötürən");
  if (words.some(w => ["alici", "satici"].includes(w))) entities.push("Alıcı - Satıcı");
  if (words.some(w => ["er", "arvad", "usaq", "aliment"].includes(w))) entities.push("Ər - Arvad - Uşaq");
  if (words.some(w => ["surucu", "piyada", "avtomobil", "masin"].includes(w))) entities.push("Nəqliyyat - Sürücü");
  if (words.some(w => ["qonsu", "qonsular"].includes(w))) entities.push("Qonşular arası münasibət");
  if (words.some(w => ["vergi", "beyanname", "dvx", "voen", "edv"].includes(w))) entities.push("Vergi Ödəyicisi - Vergi Orqanı");
  else if (words.some(w => ["siqaret", "tutun", "zibil", "cerime", "polisi", "protokol"].includes(w))) entities.push("Vətəndaş - İnzibati Məsuliyyət");


  return {
    normalizedQuery: norm,
    legalDomain,
    intent: targetArticleNum ? `Maddə ${targetArticleNum} təhlili` : `${legalDomain} üzrə hüquqi təhlil`,
    entities,
    keywords: Array.from(expandedKeywords),
    possibleLaws: Array.from(possibleLawsSet),
    targetArticleNum,
    targetPart,
    isFollowUp,
    followUpContextTerms,
    followUpPriorityArticles,
  };
}
