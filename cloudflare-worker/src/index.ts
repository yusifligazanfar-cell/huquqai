export interface Env {
  ASSETS: Fetcher;
  AI: Ai;
  VECTORIZE: VectorizeIndex;
  LEXAZ_RAG_BACKEND_SECRET?: string;
}

interface ContentEntry {
  d: string;
  a: string;
  at: string;
  txt: string;
}

interface DocMeta {
  t: string;
  dt: string;
  r: number;
  pb: number;
  u: string;
  bs: number[];
}

type PostingTuple = [string, string, number, number, number]; // [docId, artNum, bucketId, baseScore, flags]
type TitleTuple = [string, number, number]; // [docId, titleScore, isAmend]
type ArtMapEntry = [number, string, string?]; // [bucketId, artTitle, parentArtNum?]

const INDEX_BUCKETS = 2048;
const TITLE_BUCKETS = 512;
const META_BUCKETS = 256;

const AZ_CHAR_MAP: Record<string, string> = {
  İ: "i", I: "i", ı: "i",
  Ə: "e", ə: "e",
  Ö: "o", ö: "o",
  Ü: "u", ü: "u",
  Ğ: "g", ğ: "g",
  Ş: "s", ş: "s",
  Ç: "c", ç: "c",
};

const AZ_STOP_WORDS = new Set([
  "ve", "bu", "o", "ki", "da", "de", "ne", "ya", "hem", "her", "bir",
  "ile", "ucun", "olan", "ola", "ise", "uzre", "gore", "kimi", "bele",
  "daha", "cox", "az", "en", "hec", "var", "yox", "oz", "su", "uc",
  "hansi", "nece", "niye", "nedir", "neler", "kim", "kime", "harada",
  "barade", "barede", "haqqinda", "edilir", "olunur", "lazimdir", "mumkundur",
  "deyir", "edir", "olur", "verilir", "hansilar", "hansilardir", "necedir",
  "madde", "maddesi", "maddesinde", "maddesine", "maddeden", "maddede",
  "qanun", "qanunu", "qanunun", "qanunda", "qanuna", "qanunla",
  "mecelle", "mecellesi", "mecellesinin", "mecellesinde", "mecelleden",
  "azerbaycan", "respublikasi", "respublikasinin",
  "ci", "cu", "ncı", "nci", "ncu", "ncü",
]);

const GENERIC_META = new Set([
  "ceza", "cezasi", "cezasini", "cerime", "cerimesi", "cinayet", "cinayeti", "cinayetinin",
  "xeta", "xetasi", "xetasinin", "huquq", "huququ", "huququnun", "qayda", "qaydasi",
  "qaydalari", "muddet", "muddeti", "miqdar", "miqdari", "mebleg", "meblegi",
  "sert", "serti", "sertleri", "qeder", "qederdir", "hallar", "hallarda", "esas", "esaslari",
]);

const DOC_ID_TO_LAW_ID: Record<string, string> = {
  "897": "konstitusiya",
  "46940": "su",
  "46941": "mese",
  "46942": "torpaq",
  "46943": "emek",
  "46944": "mulki",
  "46945": "mulki_prosessual",
  "46946": "aile",
  "46947": "cinayet",
  "46948": "vergi",
  "46950": "cinayet_prosessual",
  "46951": "cezalarin_icrasi",
  "46952": "ticaret_gemiciliyi",
  "46953": "secki",
  "46955": "menzil",
  "46956": "inzibati_prosessual",
  "46957": "gomruk",
  "46958": "sehersalma",
  "46959": "miqrasiya",
  "46960": "inzibati_xetalar",
  "3423": "yol_hereketi",
  "9479": "istehlakci",
  "3933": "mehkimeler",
  "18343": "tehsil",
  "2937": "polis",
  "257": "vekil",
  "107": "notariat",
  "5825": "banklar",
};

const SUFFIXES = [
  "larinin", "lerinin", "larindan", "lerinden", "larina", "lerine",
  "sindan", "sinden", "sinin", "ilmasi", "ilmesi", "ulmasi", "ulmesi",
  "masina", "mesine", "lari", "leri", "lardan", "lerden",
  "inin", "unun", "ndan", "nden",
  "sini", "sunu", "sina", "sine",
  "liyi", "lugu", "luyu",
  "liq", "lik", "luq", "luk",
  "ici", "ucu",
  "siz", "suz",
  "dir", "dur", "mis", "maq", "mek",
  "dan", "den", "nin", "nun", "da", "de",
  "si", "su", "ni", "nu", "ya", "ye", "ca", "ce",
  "li", "lu", "la", "le", "ma", "me", "i", "u", "a", "e",
];

function normalizeAzSearch(text: string): string {
  if (!text) return "";
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    out += AZ_CHAR_MAP[ch] ?? ch;
  }
  return out.toLowerCase().replace(/\s+/g, " ").trim();
}

function fnv1a32(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

function stemAzToken(tok: string): string {
  if (/^\d+$/.test(tok)) return tok;
  let stem = tok;
  for (let pass = 0; pass < 2; pass++) {
    let stripped = false;
    for (const suf of SUFFIXES) {
      const minRoot = suf === "maq" || suf === "mek" ? 3 : 4;
      if (stem.length - suf.length >= minRoot && stem.endsWith(suf)) {
        stem = stem.slice(0, stem.length - suf.length);
        stripped = true;
        break;
      }
    }
    if (!stripped) break;
  }
  return stem;
}

function tokenizeAzForFts(text: string): string[] {
  const norm = normalizeAzSearch(text)
    .replace(/(\d+(?:\.\d+)*)\s*[-–]?\s*(?:nc[iu]|c[iu]|uncu|inci)\b/g, "$1")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (!norm) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tok of norm.split(" ")) {
    const isNum = /^\d+$/.test(tok);
    if (!isNum && tok.length < 3) continue;
    if (AZ_STOP_WORDS.has(tok) || seen.has(tok)) continue;
    seen.add(tok);
    out.push(tok);
  }
  return out;
}

function extractArticleNumbersAz(query: string): string[] {
  const norm = normalizeAzSearch(query);
  const found: string[] = [];
  const add = (num: string) => {
    const clean = num.replace(/-/g, ".").replace(/\.+$/, "");
    if (clean && !found.includes(clean)) found.push(clean);
  };
  let m: RegExpExecArray | null;
  const beforeArt = /(\d+(?:[.\-]\d+)*)\s*[-–]?\s*(?:c[iu]|nc[iu]|uncu|inci|madd[e]?[a-z]*)?\s+madd[e]?[a-z]*/gi;
  while ((m = beforeArt.exec(norm)) !== null) add(m[1]);
  const afterArt = /(?:madd[e]?|mad\.?)\s*(\d+(?:[.\-]\d+)*)/gi;
  while ((m = afterArt.exec(norm)) !== null) add(m[1]);
  return found;
}

function stemVariants(stem: string): string[] {
  const vars = [stem];
  if (stem.length >= 4 && stem.endsWith("q")) vars.push(`${stem.slice(0, -1)}g`);
  if (stem.length >= 4 && stem.endsWith("k")) vars.push(`${stem.slice(0, -1)}y`);
  return vars;
}

function doesTextMatchStem(normText: string, stem: string): boolean {
  for (const v of stemVariants(stem)) {
    if (normText.includes(v)) return true;
  }
  return false;
}

function computeProximityScore(normText: string, stems: string[]): number {
  const unique = Array.from(new Set(stems.filter((s) => s.length >= 3)));
  if (unique.length < 2 || !normText) return 0;

  const hits: Array<{ pos: number; si: number }> = [];
  for (let i = 0; i < unique.length; i++) {
    for (const v of stemVariants(unique[i])) {
      let idx = normText.indexOf(v);
      let cap = 0;
      while (idx !== -1 && cap < 6) {
        hits.push({ pos: idx, si: i });
        idx = normText.indexOf(v, idx + v.length);
        cap++;
      }
    }
  }
  if (hits.length < 2) return 0;
  hits.sort((a, b) => a.pos - b.pos);

  let maxDistinct = 1;
  let right = 0;
  const counts = new Map<number, number>();
  for (let left = 0; left < hits.length; left++) {
    while (right < hits.length && hits[right].pos - hits[left].pos <= 115) {
      const si = hits[right].si;
      counts.set(si, (counts.get(si) ?? 0) + 1);
      right++;
    }
    if (counts.size > maxDistinct) maxDistinct = counts.size;
    const li = hits[left].si;
    const prev = counts.get(li) ?? 0;
    if (prev <= 1) counts.delete(li);
    else counts.set(li, prev - 1);
  }

  let pairMatches = 0;
  const seenPairs = new Set<string>();
  for (let i = 0; i < hits.length - 1; i++) {
    const a = hits[i];
    for (let j = i + 1; j < hits.length && hits[j].pos - a.pos <= 55; j++) {
      const b = hits[j];
      if (a.si !== b.si) {
        const key = a.si < b.si ? `${a.si}:${b.si}` : `${b.si}:${a.si}`;
        if (!seenPairs.has(key)) {
          seenPairs.add(key);
          pairMatches++;
        }
      }
    }
  }

  let bonus = Math.min(4, pairMatches) * 35;
  if (maxDistinct >= 4) bonus += 220;
  else if (maxDistinct === 3) bonus += 135;
  else if (maxDistinct === 2 && unique.length <= 3) bonus += 55;
  return bonus;
}

class RequestAssetCache {
  private cache = new Map<string, Promise<unknown>>();
  constructor(private env: Env) {}

  getJson<T>(path: string): Promise<T | null> {
    let p = this.cache.get(path);
    if (!p) {
      p = this.env.ASSETS.fetch(new Request(`https://assets.local${path}`))
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null);
      this.cache.set(path, p);
    }
    return p as Promise<T | null>;
  }

  getDocMeta(docId: string): Promise<DocMeta | null> {
    const b = /^\d+$/.test(docId)
      ? Number(docId) % META_BUCKETS
      : fnv1a32(docId) % META_BUCKETS;
    return this.getJson<Record<string, DocMeta>>(`/m/${b}.json`).then(
      (shard) => shard?.[docId] ?? null
    );
  }
}

function jsonResp(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function checkSecret(req: Request, env: Env): boolean {
  const expected = (env.LEXAZ_RAG_BACKEND_SECRET || "").trim();
  if (!expected) return true;
  const got = (req.headers.get("x-rag-secret") || "").trim();
  if (got.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= got.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

function formatArticleTitle(docTitle: string, artNum: string, artTitle: string): string {
  if (artNum) return `${docTitle} — Maddə ${artNum}${artTitle ? ` (${artTitle})` : ""}`;
  if (artTitle) return `${docTitle} — ${artTitle}`;
  return docTitle;
}

async function handleLexical(body: Record<string, unknown>, env: Env): Promise<Response> {
  const t0 = Date.now();
  const query = String(body.query || "").trim();
  if (!query) return jsonResp({ error: "Empty query" }, 400);

  const limit = Math.max(1, Math.min(Number(body.limit || 20), 40));
  const targetDocs = Array.isArray(body.target_framework_ids)
    ? body.target_framework_ids.map(String).filter(Boolean).slice(0, 5)
    : [];
  const lawConf = String(body.target_law_confidence || "explicit");
  const expandedQueries = Array.isArray(body.expanded_queries)
    ? body.expanded_queries.map(String).slice(0, 8)
    : [];
  const rawExplicitArts = Array.isArray(body.article_numbers)
    ? body.article_numbers.map(String).filter(Boolean)
    : [];
  const priorityArts = Array.isArray(body.priority_articles)
    ? body.priority_articles.map(String).filter(Boolean)
    : [];
  const forbidden = (Array.isArray(body.forbidden_phrases) ? body.forbidden_phrases : [])
    .map((p) => normalizeAzSearch(String(p)))
    .filter(Boolean);

  const queryNorm = normalizeAzSearch(query);
  const rawTokens = tokenizeAzForFts(query);
  const extractedArts = extractArticleNumbersAz(query);
  const explicitArts = Array.from(new Set([...rawExplicitArts, ...extractedArts]));
  const conceptPriorityArts = priorityArts.filter((a) => !explicitArts.includes(a));
  const lookupArts = [...explicitArts, ...conceptPriorityArts].slice(0, 8);

  const rawStems = Array.from(
    new Set(
      rawTokens
        .filter((t) => !/^\d+$/.test(t) && !explicitArts.includes(t))
        .map(stemAzToken)
        .filter((s) => s.length >= 3)
    )
  ).slice(0, 7);

  const expStems: string[] = [];
  for (const eq of expandedQueries) {
    for (const tok of tokenizeAzForFts(eq)) {
      if (/^\d+$/.test(tok)) continue;
      const st = stemAzToken(tok);
      if (st.length >= 3 && !rawStems.includes(st) && !expStems.includes(st)) {
        expStems.push(st);
      }
    }
  }
  const limitedExpStems = expStems.slice(0, 5);
  const assets = new RequestAssetCache(env);

  // 1. Determine index buckets for raw + expanded stems (with q<->g, k<->y alternations up to cap)
  const stemEntries: Array<{ stem: string; isRaw: boolean; isMeta: boolean }> = [];
  const seenStems = new Set<string>();
  const addStemGroup = (baseStems: string[], isRaw: boolean) => {
    for (const st of baseStems) {
      for (const v of stemVariants(st)) {
        if (!seenStems.has(v)) {
          seenStems.add(v);
          stemEntries.push({
            stem: v,
            isRaw,
            isMeta: GENERIC_META.has(v),
          });
        }
      }
    }
  };
  addStemGroup(rawStems, true);
  addStemGroup(limitedExpStems, false);

  const uniqueIdxBuckets = Array.from(
    new Set(stemEntries.map((s) => fnv1a32(s.stem) % INDEX_BUCKETS))
  ).slice(0, 12);

  // Title discovery buckets (top 3 substantive raw stems)
  const titleDiscoveryStems = rawStems.filter((s) => s.length >= 4 && !GENERIC_META.has(s)).slice(0, 3);
  const titleBuckets = Array.from(
    new Set(titleDiscoveryStems.map((s) => fnv1a32(s) % TITLE_BUCKETS))
  );

  // Article maps for primary target laws
  const targetMapIds = targetDocs.slice(0, 2);

  const [idxShards, titleShards, artMaps] = await Promise.all([
    Promise.all(
      uniqueIdxBuckets.map(async (b) => ({
        b,
        data: await assets.getJson<Record<string, PostingTuple[]>>(`/i/${b}.json`),
      }))
    ),
    Promise.all(
      titleBuckets.map(async (b) => ({
        b,
        data: await assets.getJson<Record<string, TitleTuple[]>>(`/t/${b}.json`),
      }))
    ),
    Promise.all(
      targetMapIds.map(async (did) => ({
        did,
        data: await assets.getJson<Record<string, ArtMapEntry>>(`/am/${did}.json`),
      }))
    ),
  ]);

  const idxMap = new Map<number, Record<string, PostingTuple[]>>();
  for (const s of idxShards) if (s.data) idxMap.set(s.b, s.data);

  const titleMap = new Map<number, Record<string, TitleTuple[]>>();
  for (const s of titleShards) if (s.data) titleMap.set(s.b, s.data);

  // Dynamic doc discovery via title index
  const docTitleScores = new Map<string, number>();
  for (const st of titleDiscoveryStems) {
    const tb = titleMap.get(fnv1a32(st) % TITLE_BUCKETS);
    const hits = tb?.[st];
    if (!hits) continue;
    for (const [did, baseTs, isAmend] of hits) {
      if (targetDocs.includes(did) || isAmend) continue;
      docTitleScores.set(did, (docTitleScores.get(did) ?? baseTs * 0.4) + 45);
    }
  }
  const discoveredDocIds = Array.from(docTitleScores.entries())
    .filter(([, sc]) => sc >= 85)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([did]) => did);

  const allTargetedDocs = new Set([...targetDocs, ...discoveredDocIds]);

  interface CandScore {
    docId: string;
    artNum: string;
    bucketId: number;
    score: number;
    matchedRaw: number;
    matchedExp: number;
    inTitle: number;
    inArtTitle: number;
    isAmend: boolean;
    isImpl: boolean;
    isTreaty: boolean;
  }

  const candidates = new Map<string, CandScore>();

  // Exact/priority article lookup inside target laws via `am/`
  for (const { did, data } of artMaps) {
    if (!data) continue;
    for (const art of lookupArts) {
      const entry = data[art];
      const matchedKeys = entry
        ? [[art, entry] as [string, ArtMapEntry]]
        : Object.entries(data).filter(([k]) => k.startsWith(`${art}.`)).slice(0, 4);
      for (const [k, [bid, , parentArt]] of matchedKeys) {
        const realArt = parentArt || k;
        const ckey = `${did}::${realArt}`;
        if (!candidates.has(ckey)) {
          candidates.set(ckey, {
            docId: did,
            artNum: realArt,
            bucketId: bid,
            score: 140,
            matchedRaw: 0,
            matchedExp: 0,
            inTitle: 0,
            inArtTitle: 0,
            isAmend: false,
            isImpl: false,
            isTreaty: false,
          });
        }
      }
    }
  }

  // Merge inverted index hits
  const matchedStemForCand = new Map<string, Set<string>>();
  for (const se of stemEntries) {
    const shard = idxMap.get(fnv1a32(se.stem) % INDEX_BUCKETS);
    const postings = shard?.[se.stem];
    if (!postings) continue;
    for (const [did, artNum, bid, baseScore, flags] of postings) {
      const ckey = `${did}::${artNum || "0"}`;
      let set = matchedStemForCand.get(ckey);
      if (!set) {
        set = new Set<string>();
        matchedStemForCand.set(ckey, set);
      }
      if (set.has(se.stem)) continue;
      set.add(se.stem);

      const inT = (flags & 1) !== 0;
      const inAt = (flags & 2) !== 0;
      const isAmend = (flags & 4) !== 0;
      const isImpl = (flags & 8) !== 0;
      const isTreaty = (flags & 16) !== 0;

      let cand = candidates.get(ckey);
      if (!cand) {
        cand = {
          docId: did,
          artNum,
          bucketId: bid,
          score: baseScore * 0.55,
          matchedRaw: 0,
          matchedExp: 0,
          inTitle: inT ? 1 : 0,
          inArtTitle: inAt ? 1 : 0,
          isAmend,
          isImpl,
          isTreaty,
        };
        candidates.set(ckey, cand);
      } else {
        cand.score += baseScore * 0.35;
      }

      if (se.isRaw) {
        cand.matchedRaw += 1;
        cand.score += se.isMeta ? 25 : 85;
        if (inAt) {
          cand.inArtTitle += 1;
          cand.score += 65;
        }
        if (inT) cand.inTitle += 1;
      } else {
        cand.matchedExp += 1;
        cand.score += 22;
      }
    }
  }

  // Apply calibrated statutory priors (global-first like e-qanun.ai; never let a topical keyword lock drown out exact matches in other Codes)
  const primaryBoost =
    lawConf === "explicit" ? 360 : lawConf === "strong" ? 65 : lawConf === "weak" ? 35 : 0;
  const secondaryBoost =
    lawConf === "explicit" ? 180 : lawConf === "strong" ? 45 : lawConf === "weak" ? 25 : 0;

  for (const c of candidates.values()) {
    if (c.isAmend && !allTargetedDocs.has(c.docId)) c.score -= 220;
    if (c.isImpl && !allTargetedDocs.has(c.docId)) c.score -= 80;
    if (
      c.isTreaty &&
      !targetDocs.includes(c.docId) &&
      !queryNorm.includes("beynelxalq") &&
      !queryNorm.includes("konvensiya") &&
      !queryNorm.includes("sazis")
    ) {
      c.score -= 110;
    }

    if (targetDocs[0] && c.docId === targetDocs[0]) c.score += primaryBoost;
    else if (targetDocs.includes(c.docId)) c.score += secondaryBoost;
    else if (discoveredDocIds.includes(c.docId)) {
      c.score += lawConf === "explicit" ? 60 : 120;
    }

    const isConceptTarget = targetDocs.length > 0 ? targetDocs.includes(c.docId) : allTargetedDocs.has(c.docId);
    if (c.artNum && explicitArts.length > 0) {
      if (explicitArts.includes(c.artNum)) c.score += 480;
      else if (explicitArts.some((a) => c.artNum.startsWith(`${a}.`))) c.score += 430;
      else if (explicitArts.some((a) => a.includes(".") && c.artNum === a.split(".")[0])) c.score += 420;
    } else if (c.artNum && conceptPriorityArts.length > 0 && isConceptTarget) {
      const idx = conceptPriorityArts.indexOf(c.artNum);
      if (idx !== -1) c.score += Math.max(95, 250 - idx * 35);
      else {
        const subIdx = conceptPriorityArts.findIndex((a) => c.artNum.startsWith(`${a}.`));
        if (subIdx !== -1) c.score += Math.max(70, 165 - subIdx * 25);
        else {
          const baseIdx = conceptPriorityArts.findIndex(
            (a) => a.includes(".") && c.artNum === a.split(".")[0]
          );
          if (baseIdx !== -1) c.score += Math.max(85, 225 - baseIdx * 30);
        }
      }
    }

    if (rawStems.length >= 2 && c.matchedRaw >= rawStems.length) c.score += 130;
    else if (rawStems.length >= 3 && c.matchedRaw <= 1 && !allTargetedDocs.has(c.docId)) c.score -= 80;
  }

  const preTop = Array.from(candidates.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.min(limit + 12, 32));

  const neededBuckets = Array.from(new Set(preTop.map((c) => c.bucketId))).slice(0, 12);
  const neededDocIds = Array.from(new Set(preTop.map((c) => c.docId))).slice(0, 12);

  const [bucketRes, metaRes] = await Promise.all([
    Promise.all(
      neededBuckets.map(async (bid) => ({
        bid,
        data: await assets.getJson<Record<string, ContentEntry>>(`/c/${bid}.json`),
      }))
    ),
    Promise.all(
      neededDocIds.map(async (did) => ({
        did,
        meta: await assets.getDocMeta(did),
      }))
    ),
  ]);

  const contentMap = new Map<number, Record<string, ContentEntry>>();
  for (const b of bucketRes) if (b.data) contentMap.set(b.bid, b.data);
  const docMetaMap = new Map<string, DocMeta>();
  for (const m of metaRes) if (m.meta) docMetaMap.set(m.did, m.meta);

  const finalScored: Array<{ chunk: Record<string, unknown>; score: number }> = [];
  for (const cand of preTop) {
    const bucket = contentMap.get(cand.bucketId);
    const entry = bucket?.[`${cand.docId}::${cand.artNum || "0"}`];
    const meta = docMetaMap.get(cand.docId);
    if (!entry || !meta) continue;

    let score = cand.score;
    const content = entry.txt;
    const contentNorm = normalizeAzSearch(`${entry.at} ${content}`);
    const titleNorm = normalizeAzSearch(meta.t);

    score += computeProximityScore(contentNorm, rawStems);
    if (queryNorm.length >= 10 && contentNorm.includes(queryNorm)) score += 130;
    for (const bad of forbidden) {
      if (contentNorm.includes(bad) || titleNorm.includes(bad)) score -= 220;
    }

    // Prefer consolidated in-force Codes and Laws over amendment laws and statistical indicator tables
    const isAmendmentTitle =
      titleNorm.includes("deyisiklikler edil") ||
      titleNorm.includes("deyisiklik edil") ||
      titleNorm.includes("elaveler edil");
    const isStatsTitle =
      titleNorm.includes("gostericileri") ||
      titleNorm.includes("statistika") ||
      titleNorm.includes("hesabat formasi");
    if (isAmendmentTitle && !queryNorm.includes("deyisiklik")) score -= 220;
    if (isStatsTitle && !queryNorm.includes("statistika") && !queryNorm.includes("gosterici")) score -= 180;
    if (meta.dt === "kodeks" && !isAmendmentTitle) score += 70;
    else if (meta.dt === "qanun" && !isAmendmentTitle && !isStatsTitle) score += 35;

    // Sub-article exact string check inside parent article text (e.g. "212.4", "327.2")
    const matchedExplicitSub = explicitArts.find(
      (a) => a.includes(".") && cand.artNum === a.split(".")[0] && content.includes(a)
    );
    const matchedPrioritySub = conceptPriorityArts.find(
      (a) => a.includes(".") && cand.artNum === a.split(".")[0] && content.includes(a)
    );
    if (matchedExplicitSub) {
      score += 430;
    } else if (matchedPrioritySub) {
      score += 180;
    }

    const focusedSub = matchedExplicitSub || matchedPrioritySub;
    let chunkContent = content;
    if (content.length > 5600) {
      if (focusedSub) {
        const subIdx = content.indexOf(focusedSub);
        if (subIdx > 2800) {
          const firstNl = content.indexOf("\n");
          const header = firstNl > 0 && firstNl < 220 ? content.slice(0, firstNl) : content.slice(0, 160);
          chunkContent = `${header}\n${content.slice(Math.max(header.length, subIdx - 220), subIdx + 5000)}`;
        } else {
          chunkContent = content.slice(0, 5600);
        }
      } else {
        chunkContent = content.slice(0, 5600);
      }
    }

    const lawId = DOC_ID_TO_LAW_ID[cand.docId] ?? `eqanun_${cand.docId}`;
    finalScored.push({
      score,
      chunk: {
        sourceId: `cf_${cand.docId}_art_${cand.artNum || "0"}`,
        lawId,
        lawName: meta.t,
        articleNumber: cand.artNum,
        articleTitle: formatArticleTitle(meta.t, cand.artNum, entry.at),
        content: chunkContent,
        sourceFile: `eqanun_doc_${cand.docId}`,
        sourceUrl: meta.u || `https://www.e-qanun.ai/results/${cand.docId}`,
        score: Math.round(score * 100) / 100,
        documentId: cand.docId,
      },
    });
  }

  finalScored.sort((a, b) => b.score - a.score);
  return jsonResp({
    chunks: finalScored.slice(0, limit).map((x) => x.chunk),
    latency_ms: Date.now() - t0,
  });
}

async function handleDocSearch(body: Record<string, unknown>, env: Env): Promise<Response> {
  const t0 = Date.now();
  const query = String(body.query || "").trim();
  if (!query) return jsonResp({ error: "Empty query" }, 400);
  const limit = Math.max(1, Math.min(Number(body.limit || 25), 35));

  const stems = Array.from(
    new Set(
      tokenizeAzForFts(query)
        .filter((t) => !/^\d+$/.test(t))
        .map(stemAzToken)
        .filter((s) => s.length >= 3)
    )
  ).slice(0, 6);
  if (stems.length === 0) return jsonResp({ results: [], latency_ms: 0 });

  const assets = new RequestAssetCache(env);
  const tBuckets = Array.from(new Set(stems.map((s) => fnv1a32(s) % TITLE_BUCKETS)));
  const iBuckets = Array.from(new Set(stems.slice(0, 4).map((s) => fnv1a32(s) % INDEX_BUCKETS)));

  const [tShards, iShards] = await Promise.all([
    Promise.all(tBuckets.map(async (b) => ({ b, d: await assets.getJson<Record<string, TitleTuple[]>>(`/t/${b}.json`) }))),
    Promise.all(iBuckets.map(async (b) => ({ b, d: await assets.getJson<Record<string, PostingTuple[]>>(`/i/${b}.json`) }))),
  ]);

  const byDoc = new Map<string, { score: number; artNum: string; bucketId?: number }>();
  for (const st of stems) {
    const ts = tShards.find((x) => x.b === fnv1a32(st) % TITLE_BUCKETS)?.d?.[st];
    if (ts) {
      for (const [did, tScore] of ts) {
        const prev = byDoc.get(did);
        byDoc.set(did, {
          score: (prev?.score ?? 180 + tScore * 0.5) + 55,
          artNum: prev?.artNum ?? "",
          bucketId: prev?.bucketId,
        });
      }
    }
    const ps = iShards.find((x) => x.b === fnv1a32(st) % INDEX_BUCKETS)?.d?.[st];
    if (ps) {
      for (const [did, artNum, bid, baseScore] of ps.slice(0, 40)) {
        const prev = byDoc.get(did);
        const s = Math.min(180, baseScore * 0.6);
        if (!prev || s > prev.score) {
          byDoc.set(did, { score: prev ? Math.max(prev.score, s) : s, artNum, bucketId: bid });
        }
      }
    }
  }

  const topDocs = Array.from(byDoc.entries())
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, Math.min(limit, 15));

  const metas = await Promise.all(
    topDocs.map(async ([did, info]) => {
      const meta = await assets.getDocMeta(did);
      const bid = info.bucketId ?? meta?.bs?.[0];
      const bucket = bid !== undefined ? await assets.getJson<Record<string, ContentEntry>>(`/c/${bid}.json`) : null;
      const entry = bucket?.[`${did}::${info.artNum || "0"}`] ?? (bucket ? Object.values(bucket).find((v) => v.d === did) : undefined);
      return { did, info, meta, entry };
    })
  );

  const results = metas
    .filter((x) => x.meta)
    .map(({ did, info, meta, entry }) => ({
      documentId: did,
      title: meta!.t,
      docType: meta!.dt,
      isRepealed: meta!.r,
      sourceUrl: meta!.u,
      articleCount: 0,
      charLength: entry?.txt.length ?? 0,
      snippet: (entry?.txt ?? meta!.t).slice(0, 700),
      articleNumber: info.artNum || entry?.a || "",
      score: Math.round(info.score),
    }));

  return jsonResp({ results, latency_ms: Date.now() - t0 });
}

async function getDocumentData(
  docId: string,
  articleNumber: string | null,
  env: Env
): Promise<Record<string, unknown> | null> {
  const cleanId = String(docId || "").replace(/\D/g, "");
  if (!cleanId) return null;
  const cleanArt = (articleNumber || "").trim() || null;
  const assets = new RequestAssetCache(env);

  const meta = await assets.getDocMeta(cleanId);
  if (!meta) return null;

  if (cleanArt) {
    const amap = await assets.getJson<Record<string, ArtMapEntry>>(`/am/${cleanId}.json`);
    if (amap) {
      let matchedKey = cleanArt;
      let hit = amap[cleanArt];
      if (!hit && cleanArt.includes(".")) {
        matchedKey = cleanArt.split(".")[0];
        hit = amap[matchedKey];
      }
      if (hit) {
        const [bid, , parentArt] = hit;
        const targetArt = parentArt || matchedKey;
        const bucket = await assets.getJson<Record<string, ContentEntry>>(`/c/${bid}.json`);
        const entry = bucket?.[`${cleanId}::${targetArt}`];
        if (entry?.txt) {
          return {
            documentId: cleanId,
            title: meta.t,
            sourceUrl: meta.u,
            docType: meta.dt,
            isRepealed: meta.r,
            content: entry.txt,
          };
        }
      }
    }
  }

  const bucketIds = (meta.bs || []).slice(0, 10);
  const buckets = await Promise.all(
    bucketIds.map((bid) => assets.getJson<Record<string, ContentEntry>>(`/c/${bid}.json`))
  );
  const parts: string[] = [];
  let totalLen = 0;
  for (const b of buckets) {
    if (!b) continue;
    for (const entry of Object.values(b)) {
      if (entry.d === cleanId && entry.txt) {
        if (cleanArt && entry.a !== cleanArt && !entry.a.startsWith(`${cleanArt}.`)) {
          continue;
        }
        parts.push(entry.txt);
        totalLen += entry.txt.length;
        if (totalLen >= 20000) break;
      }
    }
    if (totalLen >= 20000) break;
  }

  if (parts.length === 0 && cleanArt) {
    return getDocumentData(cleanId, null, env);
  }
  const content = parts.join("\n\n");
  if (!content.trim()) return null;

  return {
    documentId: cleanId,
    title: meta.t,
    sourceUrl: meta.u,
    docType: meta.dt,
    isRepealed: meta.r,
    content: content.slice(0, 20000),
  };
}

async function handleDocumentByTitle(titleQuery: string, articleNumber: string | null, env: Env): Promise<Response> {
  const norm = normalizeAzSearch(titleQuery).replace(/[^a-z0-9 ]+/g, " ").trim();
  if (!norm) return jsonResp({ error: "Empty title" }, 400);
  const stopWords = new Set([
    "azerbaycan", "respublikasinin", "respublikasi", "haqqinda",
    "qanunu", "qanun", "tesdiq", "edilmesi", "barede", "qerari", "fermani",
  ]);
  const tokens = norm.split(" ").filter((w) => w.length >= 3 && !stopWords.has(w)).slice(0, 5);
  const stems = tokens.map(stemAzToken).filter((s) => s.length >= 3);
  if (stems.length === 0) return jsonResp({ error: "Not found" }, 404);

  const assets = new RequestAssetCache(env);
  const shards = await Promise.all(
    Array.from(new Set(stems.map((s) => fnv1a32(s) % TITLE_BUCKETS))).map(async (b) => ({
      b,
      d: await assets.getJson<Record<string, TitleTuple[]>>(`/t/${b}.json`),
    }))
  );

  const scores = new Map<string, number>();
  for (const st of stems) {
    const list = shards.find((x) => x.b === fnv1a32(st) % TITLE_BUCKETS)?.d?.[st];
    if (!list) continue;
    for (const [did, ts] of list) {
      scores.set(did, (scores.get(did) ?? ts * 0.4) + 50);
    }
  }
  const best = Array.from(scores.entries()).sort((a, b) => b[1] - a[1])[0];
  if (!best) return jsonResp({ error: "Document not found" }, 404);

  const doc = await getDocumentData(best[0], articleNumber, env);
  if (!doc) return jsonResp({ error: "Document not found" }, 404);
  return jsonResp(doc);
}

async function handleSemantic(body: Record<string, unknown>, env: Env): Promise<Response> {
  const t0 = Date.now();
  const query = String(body.query || "").trim();
  if (!query) return jsonResp({ error: "Empty query" }, 400);
  const topK = Math.max(1, Math.min(Number(body.top_k || 25), 40));
  const targetDocIds = new Set(
    Array.isArray(body.target_doc_ids) ? body.target_doc_ids.map(String).filter(Boolean) : []
  );

  let qVec: number[] | undefined;
  try {
    const embRes = (await env.AI.run("@cf/baai/bge-m3", { text: [query.slice(0, 1000)] })) as {
      data?: number[][];
    };
    qVec = embRes?.data?.[0];
  } catch (err) {
    return jsonResp({ results: [], degraded: true, error: String(err), latency_ms: Date.now() - t0 });
  }
  if (!qVec) return jsonResp({ results: [], latency_ms: Date.now() - t0 });

  const vRes = await env.VECTORIZE.query(qVec, {
    topK: 45,
    returnMetadata: "all",
  });

  const ranked = (vRes.matches || [])
    .map((m) => {
      const md = (m.metadata || {}) as Record<string, string | number>;
      const did = String(md.document_id || "");
      const boost = targetDocIds.size > 0 && targetDocIds.has(did) ? 0.04 : 0;
      return { match: m, md, effScore: m.score + boost };
    })
    .sort((a, b) => b.effScore - a.effScore);

  const assets = new RequestAssetCache(env);
  const seenArt = new Set<string>();
  const picked: typeof ranked = [];
  for (const item of ranked) {
    const did = String(item.md.document_id || "");
    const art = String(item.md.article_number || "");
    const k = `${did}::${art || item.match.id}`;
    if (seenArt.has(k)) continue;
    seenArt.add(k);
    picked.push(item);
    if (picked.length >= Math.min(topK, 18)) break;
  }

  const bucketIds = Array.from(
    new Set(picked.map((p) => Number(p.md.bucket_id)).filter((n) => Number.isFinite(n)))
  ).slice(0, 14);
  const bucketMap = new Map<number, Record<string, ContentEntry>>();
  await Promise.all(
    bucketIds.map(async (bid) => {
      const d = await assets.getJson<Record<string, ContentEntry>>(`/c/${bid}.json`);
      if (d) bucketMap.set(bid, d);
    })
  );

  const results = picked.map((p) => {
    const did = String(p.md.document_id || "");
    const art = String(p.md.article_number || "");
    const bid = Number(p.md.bucket_id);
    const entry = Number.isFinite(bid) ? bucketMap.get(bid)?.[`${did}::${art || "0"}`] : undefined;
    return {
      chunk_id: Number(p.md.chunk_id || 0) || undefined,
      document_id: did,
      chunk_index: Number(p.md.chunk_index || 0),
      article_number: art,
      article_title: String(p.md.article_title || entry?.at || ""),
      content: (entry?.txt || String(p.md.snippet || "")).slice(0, 5600),
      title: String(p.md.title || `e-Qanun № ${did}`),
      source_url: String(p.md.source_url || `https://www.e-qanun.ai/results/${did}`),
      file_name: `eqanun_doc_${did}`,
      doc_type: String(p.md.doc_type || "qanun"),
      is_repealed: 0,
      priority_boost: Number(p.md.priority_boost || 0),
      semantic_score: Math.round(p.match.score * 10000) / 10000,
    };
  });

  return jsonResp({ results, latency_ms: Date.now() - t0 });
}

async function handleRerank(body: Record<string, unknown>, env: Env): Promise<Response> {
  const t0 = Date.now();
  const query = String(body.query || "").trim();
  const cands = Array.isArray(body.candidates) ? body.candidates : [];
  if (!query || cands.length === 0) return jsonResp({ scores: [], latency_ms: 0 });

  const batch = cands.slice(0, 36);
  const contexts = batch.map((c: Record<string, unknown>) => ({
    text: `${String(c.title || "")}\n${String(c.text || "")}`.slice(0, 900),
  }));

  const aiRunner = env.AI as unknown as {
    run(model: string, input: Record<string, unknown>): Promise<{ response?: Array<{ id: number; score: number }> }>;
  };
  let res: { response?: Array<{ id: number; score: number }> } | null = null;
  try {
    res = await aiRunner.run("@cf/baai/bge-reranker-base", {
      query: query.slice(0, 500),
      contexts,
    });
  } catch (err) {
    return jsonResp({ scores: [], degraded: true, error: String(err), latency_ms: Date.now() - t0 });
  }

  const scoreByIdx = new Map<number, number>();
  for (const r of res?.response || []) {
    scoreByIdx.set(Number(r.id), Number(r.score));
  }

  const out = batch.map((c: Record<string, unknown>, i: number) => ({
    id: c.id,
    semantic_score: Math.round((scoreByIdx.get(i) ?? 0) * 10000) / 10000,
  }));

  return jsonResp({ scores: out, latency_ms: Date.now() - t0 });
}

async function handleSummarizeShort(
  body: Record<string, unknown>,
  env: Env
): Promise<Response> {
  const t0 = Date.now();
  const query = String(body.query || "").trim();
  const rawExcerpts = Array.isArray(body.excerpts) ? body.excerpts : [];
  if (!query || rawExcerpts.length === 0) {
    return jsonResp({ summary: null, latency_ms: 0 });
  }

  const contextLines = rawExcerpts
    .slice(0, 6)
    .map((item: Record<string, unknown>, i: number) => {
      const law = String(item.law || "").trim();
      const article = String(item.article || "").trim();
      const text = String(item.text || "").replace(/\s+/g, " ").trim().slice(0, 1400);
      return `${i + 1}) ${law}${article ? ` — Maddə ${article}` : ""}: ${text}`;
    })
    .join("\n");

  const prompt = `Sən Azərbaycan hüquq məsləhətçisisən. Yalnız aşağıdakı rəsmi maddələrə əsaslanaraq istifadəçinin sualına sadə, aydın, faktiki və saf Azərbaycan dilində (heç bir ingilis sözü yazmadan) qısa cavab hazırla.

Sual: ${query}

Maddələr:
${contextLines}

TƏLƏBLƏR:
1. Əvvəlcə 1-2 sadə, aydın yekun cümlə yaz (istifadəçinin dərhal anlayacağı praktik nəticə, dəqiq cərimə/müddət/orqan varsa elə əvvəldə göstər).
2. Hər maddədə dəqiq rəqəmləri, cərimə məbləğlərini ("görəyüz manat" -> 100 manat), faizləri, balları və müddətləri ("gündənüçay" -> 3 ay) mətndən tam dəqiq oxuyub yaz; əgər mətndə rəqəm/müddət varsa əsla "göstərilməyib" yazma. Mətndə olmayan maddə nömrəsini və ya cəriməni əsla uydurma.
3. Yekun cümlələrdən sonra yeni sətirdə 3-4 ədəd "-" bəndi yaz (hər "-" bəndi MÜTLƏQ ayrıca yeni sətirdə başlasın): hər bənddə konkret Qanun/Məcəllə və Maddə nömrəsini, əsas məbləği/müddəti/orqanı/addımı qeyd et.
4. Heç bir başlıq ("Qısa cavab"), nömrəli siyahı və ya əlavə izah yazma. Hər cümlə nöqtə ilə tam bitsin.`;

  try {
    const aiRunner = env.AI as unknown as {
      run(
        model: string,
        input: Record<string, unknown>
      ): Promise<{ response?: string; choices?: Array<{ message?: { content?: string } }> }>;
    };
    const res = await aiRunner.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      messages: [{ role: "user", content: prompt }],
      max_tokens: 820,
      temperature: 0.05,
    });
    let text = String(
      res?.response || res?.choices?.[0]?.message?.content || ""
    )
      .replace(/^#{1,3}\s*Qısa cavab\s*/i, "")
      .replace(/([.!?»"])\s+[-–—]\s+(?=[A-ZƏÖÜĞŞÇ“"«0-9])/g, "$1\n- ")
      .trim();

    // Never truncate inside decimal article numbers like "740.5"; drop incomplete trailing bullet if output hit token cap
    if (text && !/[.!?]$/.test(text)) {
      const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
      while (lines.length > 1 && !/[.!?]$/.test(lines[lines.length - 1])) {
        lines.pop();
      }
      if (lines.length > 0 && /[.!?]$/.test(lines[lines.length - 1])) {
        text = lines.join("\n").trim();
      } else {
        const sentenceEndRe = /[.!?](?=\s+[^\d\s]|$)/g;
        let lastSentenceEnd = -1;
        let m: RegExpExecArray | null;
        while ((m = sentenceEndRe.exec(text)) !== null) {
          lastSentenceEnd = m.index + 1;
        }
        if (lastSentenceEnd > text.length * 0.4) {
          text = text.slice(0, lastSentenceEnd).trim();
        }
      }
    }

    return jsonResp({
      summary: text.length >= 40 ? text : null,
      latency_ms: Date.now() - t0,
    });
  } catch (err) {
    return jsonResp({
      summary: null,
      error: String(err),
      latency_ms: Date.now() - t0,
    });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/health" && request.method === "GET") {
      return jsonResp({
        ok: true,
        engine: "cloudflare-workers-free",
        corpus_docs: 56983,
        active_docs: 54979,
        vectorize_index: "huquqai-legal-v1",
      });
    }

    if (!checkSecret(request, env)) {
      return jsonResp({ detail: "Invalid RAG backend secret" }, 401);
    }

    if (path === "/rag/lexical" && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      return handleLexical(body, env);
    }
    if (path === "/rag/doc-search" && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      return handleDocSearch(body, env);
    }
    if (path === "/rag/semantic" && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      return handleSemantic(body, env);
    }
    if (path === "/rag/rerank" && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      return handleRerank(body, env);
    }
    if (path === "/rag/summarize-short" && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      return handleSummarizeShort(body, env);
    }
    if (path === "/rag/answer" && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      return handleRagAnswer(body, env);
    }
    if (path === "/rag/generate-document" && request.method === "POST") {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      return handleGenerateDocument(body, env);
    }
    if (path === "/rag/document-by-title" && request.method === "GET") {
      return handleDocumentByTitle(
        url.searchParams.get("title") || "",
        url.searchParams.get("article_number"),
        env
      );
    }
    if (path.startsWith("/rag/document/") && request.method === "GET") {
      const docId = decodeURIComponent(path.slice("/rag/document/".length));
      const doc = await getDocumentData(docId, url.searchParams.get("article_number"), env);
      return doc ? jsonResp(doc) : jsonResp({ detail: "Document not found" }, 404);
    }

    return jsonResp({ detail: "Not found" }, 404);
  },
};

async function handleGenerateDocument(body: Record<string, unknown>, env: Env): Promise<Response> {
  const t0 = Date.now();
  const systemPrompt = String(body.systemPrompt || body.system_prompt || "").trim();
  const userPrompt = String(body.userPrompt || body.user_prompt || "").trim();
  if (!userPrompt) return jsonResp({ error: "Empty userPrompt" }, 400);

  const requestedTokens = Number(body.maxTokens || body.max_tokens || 2400);
  const maxTokens = Math.max(400, Math.min(Number.isFinite(requestedTokens) ? requestedTokens : 2400, 3400));
  const responseFormatJson = Boolean(body.responseFormatJson || body.response_format_json);

  try {
    const aiPayload: Record<string, unknown> = {
      messages: [
        {
          role: "system",
          content:
            systemPrompt ||
            "Sən Azərbaycan Respublikasının qanunvericiliyinə uyğun rəsmi hüquqi sənədlər hazırlayan peşəkar hüquqşünas assistantsan. Sənədi tam, rəsmi və hüquqi baxımdan səlis Azərbaycan dilində yaz.",
        },
        {
          role: "user",
          content: userPrompt.slice(0, 16000),
        },
      ],
      temperature: 0.15,
      max_tokens: maxTokens,
    };
    if (responseFormatJson) {
      aiPayload.response_format = { type: "json_object" };
    }
    const aiRes = (await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", aiPayload as any)) as {
      response?: string | Record<string, unknown>;
    };

    const rawResp = aiRes?.response;
    const content =
      typeof rawResp === "string"
        ? rawResp.trim()
        : rawResp && typeof rawResp === "object"
        ? JSON.stringify(rawResp)
        : "";
    if (!content) {
      return jsonResp({ error: "Empty AI response", content: "", latency_ms: Date.now() - t0 }, 502);
    }
    return jsonResp({ content, latency_ms: Date.now() - t0 });
  } catch (err) {
    return jsonResp(
      { error: err instanceof Error ? err.message : "AI generation failed", latency_ms: Date.now() - t0 },
      500
    );
  }
}

async function handleRagAnswer(body: Record<string, unknown>, env: Env): Promise<Response> {
  const t0 = Date.now();
  const systemPrompt = String(body.systemPrompt || body.system_prompt || "").trim();
  const userPrompt = String(body.userPrompt || body.user_prompt || "").trim();
  if (!userPrompt) return jsonResp({ error: "Empty userPrompt" }, 400);

  const requestedTokens = Number(body.maxTokens || body.max_tokens || 2200);
  const maxTokens = Math.max(500, Math.min(Number.isFinite(requestedTokens) ? requestedTokens : 2200, 3200));
  const rawTemp = Number(body.temperature ?? 0.05);
  const temperature = Number.isFinite(rawTemp) ? Math.max(0, Math.min(rawTemp, 0.3)) : 0.05;

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    {
      role: "system",
      content: (
        systemPrompt ||
        "Sən Azərbaycan Respublikasının qanunvericiliyi üzrə rəsmi e-qanun mənbələrinə əsaslanan hüquqşünas analitikisən."
      ).slice(0, 8000),
    },
  ];

  const rawHistory = Array.isArray(body.history) ? body.history : [];
  for (const h of rawHistory.slice(-4)) {
    if (!h || typeof h !== "object") continue;
    const role = (h as Record<string, unknown>).role === "assistant" ? "assistant" : "user";
    const content = String((h as Record<string, unknown>).content || "").trim();
    if (content) {
      messages.push({ role, content: content.slice(0, 1200) });
    }
  }
  messages.push({ role: "user", content: userPrompt.slice(0, 22000) });

  try {
    const aiRes = (await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      messages,
      temperature,
      max_tokens: maxTokens,
    } as any)) as {
      response?: string | Record<string, unknown>;
      choices?: Array<{ message?: { content?: string } }>;
    };

    const rawResp = aiRes?.response ?? aiRes?.choices?.[0]?.message?.content;
    const content =
      typeof rawResp === "string"
        ? rawResp.trim()
        : rawResp && typeof rawResp === "object"
        ? JSON.stringify(rawResp)
        : "";
    if (!content) {
      return jsonResp({ error: "Empty AI answer", content: "", latency_ms: Date.now() - t0 }, 502);
    }
    return jsonResp({ content, latency_ms: Date.now() - t0 });
  } catch (err) {
    return jsonResp(
      { error: err instanceof Error ? err.message : "RAG answer failed", latency_ms: Date.now() - t0 },
      500
    );
  }
}
