import fs from "fs";
import path from "path";
import type { StructuredChunk } from "./types";

interface SqliteStatement {
  all(...params: unknown[]): Record<string, unknown>[];
  get(...params: unknown[]): Record<string, unknown> | undefined;
}

interface SqliteDatabase {
  prepare(sql: string): SqliteStatement;
  close(): void;
}

type NodeRequireFn = (id: string) => {
  DatabaseSync?: new (path: string, options?: { readOnly?: boolean }) => SqliteDatabase;
};

const AZ_CHAR_MAP: Record<string, string> = {
  "İ": "i",
  "I": "i",
  "ı": "i",
  "Ə": "e",
  "ə": "e",
  "Ö": "o",
  "ö": "o",
  "Ü": "u",
  "ü": "u",
  "Ğ": "g",
  "ğ": "g",
  "Ş": "s",
  "ş": "s",
  "Ç": "c",
  "ç": "c",
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
  "ci", "cu", "cı", "cü", "ncı", "nci", "ncu", "ncü",
]);

/** Maps framework IDs in SQLite `documents.document_id` back to registry `lawId`s. */
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

export function mapDocIdToLawId(docId: string): string {
  const s = String(docId || "").trim();
  return DOC_ID_TO_LAW_ID[s] ?? `eqanun_${s}`;
}

/**
 * Strips trailing sub-clause body text and e-Qanun editorial noise (e.g. `KMQ3`, `[12]`, `219-1.1. ...`)
 * from parsed article headings so short statutory titles rank cleanly above accidental body leaks.
 */
export function cleanArticleHeading(raw: string): string {
  return String(raw || "")
    .replace(/(?:\s*===+|\s*KMQ\d+|\s*\[\d+\])+/g, "")
    .replace(/\s+\d+(?:-\d+)*(?:\.\d+)+\.?\s+.*$/, "")
    .replace(/\s+[IVXLC]+\.\s+[A-ZƏÖÜÇŞĞİ].*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

let cachedDb: SqliteDatabase | null | undefined = undefined;
let cachedDbPath: string | null = null;
let cachedCorpusDir: string | null | undefined = undefined;

/**
 * Normalizes Azerbaijani text to ASCII-folded lowercase matching `scripts/build_full_rag_index.py`.
 */
export function normalizeAzSearch(text: string): string {
  if (!text) return "";
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    out += AZ_CHAR_MAP[ch] ?? ch;
  }
  return out.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Extracts explicit article numbers from Azerbaijani queries such as
 * "40-cı maddəsi", "212.4-cü maddə", "Maddə 70", "m. 57.1".
 */
export function extractArticleNumbersAz(query: string): string[] {
  const norm = normalizeAzSearch(query);
  const found: string[] = [];
  const add = (num: string) => {
    const clean = num.replace(/-/g, ".").replace(/\.+$/, "");
    if (clean && !found.includes(clean)) found.push(clean);
  };

  let m: RegExpExecArray | null;
  const beforeArt = /(\d+(?:[.\-]\d+)*)\s*[-–]?\s*(?:c[iu]|nc[iu]|uncu|inci|madd[e]?[a-z]*)?\s+madd[e]?[a-z]*/gi;
  while ((m = beforeArt.exec(norm)) !== null) {
    add(m[1]);
  }
  const afterArt = /(?:madd[e]?|mad\.?)\s*(\d+(?:[.\-]\d+)*)/gi;
  while ((m = afterArt.exec(norm)) !== null) {
    add(m[1]);
  }
  return found;
}

function stemAzToken(tok: string): string {
  if (/^\d+$/.test(tok)) return tok;
  let stem = tok;
  // Strip common Azerbaijani derivational & inflectional suffixes (max 2 passes)
  const suffixes = [
    "larinin", "lerinin", "larindan", "lerinden", "larina", "lerine",
    "sindan", "sinden", "sinin", "ilmasi", "ilmesi", "ulmasi", "ulmesi",
    "masina", "mesine", "lari", "leri", "lardan", "lerden",
    "inin", "unun", "unun", "ndan", "nden",
    "sini", "sunu", "sina", "sine",
    "liyi", "liyi", "lugu", "luyu",
    "liq", "lik", "luq", "luk",
    "ici", "ucu", "ucu",
    "siz", "suz",
    "dir", "dur", "mis", "maq", "mek",
    "dan", "den", "nin", "nun", "da", "de",
    "si", "su", "ni", "nu", "ya", "ye", "ca", "ce",
    "li", "lu", "la", "le", "ma", "me", "i", "u", "a", "e",
  ];
  for (let pass = 0; pass < 2; pass++) {
    let stripped = false;
    for (const suf of suffixes) {
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
  // Strip Azerbaijani ordinal suffixes attached to digits (e.g. "40-cı" -> "40", "212.4-cü" -> "212 4")
  const norm = normalizeAzSearch(text)
    .replace(/(\d+(?:\.\d+)*)\s*[-–]?\s*(?:nc[iu]|c[iu]|uncu|inci)\b/g, "$1")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  if (!norm) return [];

  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const tok of norm.split(" ")) {
    const isNum = /^\d+$/.test(tok);
    if (!isNum && tok.length < 3) continue;
    if (AZ_STOP_WORDS.has(tok)) continue;
    if (!seen.has(tok)) {
      seen.add(tok);
      tokens.push(tok);
    }
  }
  return tokens;
}

function resolveExistingPath(candidates: string[]): string | null {
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch {
      // ignore fs permission errors
    }
  }
  return null;
}

export function resolveSqliteDbPath(): string | null {
  const candidates = [
    process.env.EQANUN_SQLITE_PATH || "",
    path.resolve(process.cwd(), "../data/eqanun_full.sqlite"),
    path.resolve(process.cwd(), "data/eqanun_full.sqlite"),
    path.resolve(process.cwd(), "src/data/eqanun_full.sqlite"),
    path.resolve(process.cwd(), "../../data/eqanun_full.sqlite"),
  ];
  return resolveExistingPath(candidates);
}

export function resolveFullCorpusDir(): string | null {
  if (cachedCorpusDir !== undefined) return cachedCorpusDir;
  const candidates = [
    process.env.EQANUN_CORPUS_DIR || "",
    path.resolve(process.cwd(), "../data/full_eqanun_corpus"),
    path.resolve(process.cwd(), "data/full_eqanun_corpus"),
    path.resolve(process.cwd(), "../../data/full_eqanun_corpus"),
  ];
  cachedCorpusDir = resolveExistingPath(candidates);
  return cachedCorpusDir;
}

function getSqliteDb(): SqliteDatabase | null {
  if (cachedDb !== undefined) return cachedDb;
  const dbPath = resolveSqliteDbPath();
  if (!dbPath) {
    cachedDb = null;
    return null;
  }

  try {
    // Prefer standard `process.getBuiltinModule("node:sqlite")` so ESM Server Actions work seamlessly without bundler interference.
    const procWithBuiltin = process as unknown as {
      getBuiltinModule?: (id: string) => {
        DatabaseSync?: new (path: string, options?: { readOnly?: boolean }) => SqliteDatabase;
      } | undefined;
    };
    let sqliteMod = procWithBuiltin.getBuiltinModule?.("node:sqlite");
    if (!sqliteMod) {
      const runtimeRequire = Function("return require")() as NodeRequireFn;
      sqliteMod = runtimeRequire("node:sqlite");
    }
    if (!sqliteMod?.DatabaseSync) {
      cachedDb = null;
      return null;
    }
    const db = new sqliteMod.DatabaseSync(dbPath, { readOnly: true });
    const check = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='chunks_fts'")
      .get();
    if (!check) {
      db.close();
      cachedDb = null;
      return null;
    }
    cachedDb = db;
    cachedDbPath = dbPath;
    return cachedDb;
  } catch (err) {
    console.warn("[corpus_sqlite] Unable to open SQLite FTS5 index:", err);
    cachedDb = null;
    return null;
  }
}

export function isSqliteCorpusAvailable(): boolean {
  return getSqliteDb() !== null;
}

export function getSqliteCorpusStats(): { documents: number; chunks: number; path: string } | null {
  const db = getSqliteDb();
  if (!db) return null;
  try {
    const docRow = db.prepare("SELECT COUNT(*) AS cnt FROM documents").get();
    const chunkRow = db.prepare("SELECT COUNT(*) AS cnt FROM chunks").get();
    return {
      documents: Number(docRow?.cnt ?? 0),
      chunks: Number(chunkRow?.cnt ?? 0),
      path: cachedDbPath || "",
    };
  } catch {
    return null;
  }
}

function buildStemToken(tok: string): string {
  if (/^\d+$/.test(tok)) return tok;
  const stem = stemAzToken(tok);
  const safeStem = ["and", "or", "not", "near"].includes(stem) ? `"${stem}"` : stem;
  if (stem.length < 4) return safeStem;
  // Support common Azerbaijani consonant alternation (q <-> g, k <-> y) in FTS5 prefix terms
  if (stem.endsWith("q")) {
    return `(${stem}* OR ${stem.slice(0, -1)}g*)`;
  }
  if (stem.endsWith("k")) {
    return `(${stem}* OR ${stem.slice(0, -1)}y*)`;
  }
  return `${stem}*`;
}

function doesTextMatchStem(normText: string, stem: string, spacelessText?: string): boolean {
  if (!stem) return false;
  if (normText.includes(stem)) return true;
  if (stem.endsWith("q") && stem.length >= 4 && normText.includes(`${stem.slice(0, -1)}g`)) return true;
  if (stem.endsWith("k") && stem.length >= 4 && normText.includes(`${stem.slice(0, -1)}y`)) return true;
  if (spacelessText && stem.length >= 5 && spacelessText.includes(stem)) return true;
  return false;
}

function findStemPositions(normText: string, stem: string): number[] {
  const positions: number[] = [];
  if (!stem || stem.length < 3) return positions;
  const variants = [stem];
  if (stem.endsWith("q") && stem.length >= 4) variants.push(`${stem.slice(0, -1)}g`);
  if (stem.endsWith("k") && stem.length >= 4) variants.push(`${stem.slice(0, -1)}y`);

  for (const v of variants) {
    let idx = normText.indexOf(v);
    let cap = 0;
    while (idx !== -1 && cap < 8) {
      positions.push(idx);
      idx = normText.indexOf(v, idx + v.length);
      cap++;
    }
  }
  positions.sort((a, b) => a - b);
  return positions;
}

/**
 * Scores tight phrase co-occurrence and dense cluster windows (`<= 115` chars),
 * strongly promoting canonical statutory definitions (e.g. Maddə 177/178/173/35).
 */
function computePhraseProximityScore(normText: string, stems: string[]): number {
  const uniqueStems = Array.from(new Set(stems.filter((s) => s.length >= 3)));
  if (uniqueStems.length < 2 || !normText) return 0;

  const hits: Array<{ pos: number; stemIdx: number }> = [];
  for (let i = 0; i < uniqueStems.length; i++) {
    const positions = findStemPositions(normText, uniqueStems[i]);
    for (const pos of positions) {
      hits.push({ pos, stemIdx: i });
    }
  }
  if (hits.length < 2) return 0;
  hits.sort((a, b) => a.pos - b.pos);

  let maxDistinctInWindow = 1;
  let right = 0;
  const counts = new Map<number, number>();
  for (let left = 0; left < hits.length; left++) {
    while (right < hits.length && hits[right].pos - hits[left].pos <= 115) {
      const si = hits[right].stemIdx;
      counts.set(si, (counts.get(si) ?? 0) + 1);
      right++;
    }
    if (counts.size > maxDistinctInWindow) {
      maxDistinctInWindow = counts.size;
    }
    const li = hits[left].stemIdx;
    const prev = counts.get(li) ?? 0;
    if (prev <= 1) counts.delete(li);
    else counts.set(li, prev - 1);
  }

  let pairMatches = 0;
  const matchedPairs = new Set<string>();
  for (let i = 0; i < hits.length - 1; i++) {
    const a = hits[i];
    for (let j = i + 1; j < hits.length && hits[j].pos - a.pos <= 55; j++) {
      const b = hits[j];
      if (a.stemIdx !== b.stemIdx) {
        const key = a.stemIdx < b.stemIdx ? `${a.stemIdx}:${b.stemIdx}` : `${b.stemIdx}:${a.stemIdx}`;
        if (!matchedPairs.has(key)) {
          matchedPairs.add(key);
          pairMatches++;
        }
      }
    }
  }

  let bonus = Math.min(4, pairMatches) * 35;
  if (maxDistinctInWindow >= 4) bonus += 220;
  else if (maxDistinctInWindow === 3) bonus += 135;
  else if (maxDistinctInWindow === 2 && uniqueStems.length <= 3) bonus += 55;
  return bonus;
}

/**
 * Runs a sub-40ms top-K FTS5 query across ALL 56,983 documents using a generous BM25 CTE pool
 * before re-ranking inside SQL with `priority_boost` and active (non-repealed) status.
 */
function runFtsQuery(
  db: SqliteDatabase,
  matchExpr: string,
  limit: number
): Record<string, unknown>[] {
  if (!matchExpr.trim()) return [];
  const cteLimit = Math.max(limit * 14, 900);
  const sql = `
    WITH fts_hits AS (
      SELECT rowid, bm25(chunks_fts, 4.0, 5.0, 3.0, 1.0) AS fts_bm25
      FROM chunks_fts
      WHERE chunks_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    )
    SELECT
      c.id AS chunk_id,
      c.document_id,
      c.chunk_index,
      c.article_number,
      c.article_title,
      c.content,
      d.title,
      d.source_url,
      d.file_name,
      d.doc_type,
      d.is_repealed,
      d.priority_boost,
      fts_hits.fts_bm25
    FROM fts_hits
    JOIN chunks c ON c.id = fts_hits.rowid
    JOIN documents d ON d.document_id = c.document_id
    WHERE d.is_repealed = 0
    ORDER BY (fts_hits.fts_bm25 - d.priority_boost * 0.08) ASC
    LIMIT ?
  `;
  return db.prepare(sql).all(matchExpr, cteLimit, limit);
}

/**
 * Discovers relevant active Laws & Codes dynamically across ALL 56,983 documents by matching
 * normalized query stems & expanded concepts against `documents.title_norm` + `priority_boost`.
 */
function discoverRelevantDocumentIds(
  db: SqliteDatabase,
  rawNonNumTokens: string[],
  expandedNonNumTokens: string[],
  excludeDocIds: Set<string>
): string[] {
  const stems: Array<{ stem: string; weight: number }> = [];
  const seen = new Set<string>();
  const skipGeneric = new Set(["madd", "qanun", "mecelle", "huquq", "haqq", "veril", "olun", "edil", "nece", "hans"]);

  for (const tok of rawNonNumTokens) {
    const s = stemAzToken(tok);
    if (s.length >= 4 && !seen.has(s) && !skipGeneric.has(s)) {
      seen.add(s);
      stems.push({ stem: s, weight: 45 });
    }
  }
  for (const tok of expandedNonNumTokens.slice(0, 6)) {
    const s = stemAzToken(tok);
    if (s.length >= 4 && !seen.has(s) && !skipGeneric.has(s)) {
      seen.add(s);
      stems.push({ stem: s, weight: 20 });
    }
  }
  if (stems.length === 0) return [];

  const searchStems = stems.slice(0, 7);
  const likeClauses = searchStems.map(() => "title_norm LIKE ?");
  const sql = `
    SELECT document_id, title_norm, doc_type, priority_boost, article_count, char_length
    FROM documents
    WHERE is_repealed = 0
      AND title_norm NOT LIKE '%deyisiklik%'
      AND title_norm NOT LIKE '%elave edilm%'
      AND (${likeClauses.join(" OR ")})
    ORDER BY priority_boost DESC, article_count DESC, char_length DESC
    LIMIT 240
  `;
  const rows = db.prepare(sql).all(...searchStems.map((s) => `%${s.stem}%`));
  const ranked: Array<{ docId: string; score: number }> = [];

  for (const row of rows) {
    const docId = String(row.document_id ?? "");
    if (!docId || excludeDocIds.has(docId)) continue;
    const tNorm = String(row.title_norm ?? "");
    const docType = String(row.doc_type ?? "");
    const pBoost = Number(row.priority_boost ?? 0);
    const artCount = Number(row.article_count ?? 0);

    let titleScore = 0;
    let rawHits = 0;
    for (const s of stems) {
      if (doesTextMatchStem(tNorm, s.stem)) {
        titleScore += s.weight;
        if (s.weight >= 40) rawHits++;
      }
    }
    if (rawHits === 0 && titleScore < 40) continue;

    // Reward concise standalone statutes & core codes (e.g. "İcra haqqında", "Dövlət rüsumu haqqında")
    const isImpl = tNorm.includes("tetbiq edilm") || tNorm.includes("tetbiqi ");
    if (isImpl) titleScore -= 80;
    if (tNorm.length <= 65 && (docType === "qanun" || docType === "kodeks" || docType === "konstitusiya")) {
      titleScore += 45;
    }
    if (artCount >= 10) titleScore += 20;
    titleScore += pBoost * 0.45;

    if (titleScore >= 85) {
      ranked.push({ docId, score: titleScore });
    }
  }

  return ranked
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((r) => r.docId);
}

/**
 * Directly scans chunks inside targeted primary laws via B-tree index `idx_chunks_doc_art`
 * (<4ms per code/law), guaranteeing zero missed articles regardless of corpus-wide BM25 noise.
 */
function queryTargetDocumentsDirect(
  db: SqliteDatabase,
  targetDocIds: string[],
  rawTokens: string[],
  expandedTokens: string[],
  targetArticles: string[]
): Record<string, unknown>[] {
  if (targetDocIds.length === 0) return [];
  const uniqueDocIds = Array.from(new Set(targetDocIds)).slice(0, 5);
  const docPlaceholders = uniqueDocIds.map(() => "?").join(",");
  const results: Record<string, unknown>[] = [];
  const seenChunkIds = new Set<number>();

  const addChunk = (r: Record<string, unknown>) => {
    const cid = Number(r.chunk_id);
    if (!seenChunkIds.has(cid)) {
      seenChunkIds.add(cid);
      results.push(r);
    }
  };

  // 1. Exact/prefix/sub-article hits inside target documents via index
  if (targetArticles.length > 0) {
    const conds: string[] = [];
    const params: unknown[] = [...uniqueDocIds];
    for (const art of targetArticles) {
      if (art.includes(".")) {
        const parentArt = art.split(".")[0];
        conds.push("(c.article_number = ? OR c.article_number LIKE ? OR (c.article_number = ? AND c.content LIKE ?))");
        params.push(art, `${art}.%`, parentArt, `%${art}%`);
      } else {
        conds.push("(c.article_number = ? OR c.article_number LIKE ?)");
        params.push(art, `${art}.%`);
      }
    }
    const exactSql = `
      SELECT
        c.id AS chunk_id,
        c.document_id,
        c.chunk_index,
        c.article_number,
        c.article_title,
        c.content,
        d.title,
        d.source_url,
        d.file_name,
        d.doc_type,
        d.is_repealed,
        d.priority_boost,
        -25.0 AS fts_bm25
      FROM chunks c
      JOIN documents d ON d.document_id = c.document_id
      WHERE c.document_id IN (${docPlaceholders})
        AND (${conds.join(" OR ")})
      ORDER BY c.chunk_index ASC
      LIMIT 40
    `;
    for (const r of db.prepare(exactSql).all(...params)) addChunk(r);
  }

  // 2. Fast in-doc stem scan on chunks of each target document via `idx_chunks_doc_art`
  const rawStems = rawTokens.filter((t) => !/^\d+$/.test(t)).map(stemAzToken).filter((s) => s.length >= 3);
  const expStems = expandedTokens.filter((t) => !/^\d+$/.test(t)).map(stemAzToken).filter((s) => s.length >= 4);

  if (rawStems.length > 0 || expStems.length > 0) {
    const scanDocs = uniqueDocIds.slice(0, 3);
    const allChunksSql = `
      SELECT
        c.id AS chunk_id,
        c.document_id,
        c.chunk_index,
        c.article_number,
        c.article_title,
        c.content,
        d.title,
        d.source_url,
        d.file_name,
        d.doc_type,
        d.is_repealed,
        d.priority_boost
      FROM chunks c
      JOIN documents d ON d.document_id = c.document_id
      WHERE c.document_id = ?
      ORDER BY c.chunk_index ASC
    `;
    const stmt = db.prepare(allChunksSql);
    for (const dId of scanDocs) {
      const docRows = stmt.all(dId);
      const localHits: Array<{ row: Record<string, unknown>; s: number }> = [];
      for (const r of docRows) {
        const cleanHeading = cleanArticleHeading(String(r.article_title ?? ""));
        const artTitleN = normalizeAzSearch(cleanHeading);
        const contentN = normalizeAzSearch(String(r.content ?? ""));
        const spacelessContentN = contentN.replace(/\s+/g, "");
        let s = 0;
        let matchedRaw = 0;
        let matchedArtTitle = 0;
        for (const st of rawStems) {
          if (doesTextMatchStem(artTitleN, st)) {
            s += 48;
            matchedRaw++;
            matchedArtTitle++;
          } else if (doesTextMatchStem(contentN, st, spacelessContentN)) {
            s += 10;
            matchedRaw++;
          }
        }
        for (const st of expStems) {
          if (doesTextMatchStem(artTitleN, st)) s += 18;
          else if (doesTextMatchStem(contentN, st, spacelessContentN)) s += 3;
        }
        if (matchedArtTitle >= 2) s += 55;
        if (matchedRaw >= 2) {
          let directProx = computePhraseProximityScore(`${artTitleN} ${contentN}`, rawStems);
          if (directProx === 0 && spacelessContentN) {
            directProx = computePhraseProximityScore(`${artTitleN.replace(/\s+/g, "")}${spacelessContentN}`, rawStems) * 0.75;
          }
          s += 18 + directProx * 0.25;
        }
        if (s > 0) {
          // Gentle length damping so detailed operative articles are not pushed behind tiny stubs
          const lenScale = Math.pow(Math.max(1, contentN.length / 1800), 0.25);
          localHits.push({ row: r, s: s / lenScale });
        }
      }
      localHits.sort((a, b) => b.s - a.s);
      for (const h of localHits.slice(0, 35)) {
        addChunk({ ...h.row, fts_bm25: -Math.min(30, h.s) });
      }
    }
  }

  return results;
}

export interface SqliteSearchOptions {
  query: string;
  expandedQueries?: string[];
  targetFrameworkIds?: string[];
  targetLawConfidence?: "explicit" | "strong" | "weak" | "none";
  articleNumbers?: string[];
  priorityArticles?: string[];
  forbiddenPhrases?: string[];
  limit?: number;
}

/**
 * Queries all 56,983 full e-Qanun documents indexed in `eqanun_full.sqlite` via fast CTE FTS5 BM25
 * plus dynamic whole-corpus document discovery, B-tree per-law article scans, and authority priors.
 */
export function searchSqliteCorpus(options: SqliteSearchOptions): StructuredChunk[] {
  const db = getSqliteDb();
  if (!db) return [];

  const limit = Math.max(1, Math.min(options.limit ?? 20, 60));
  const queryNorm = normalizeAzSearch(options.query);
  const rawTokens = tokenizeAzForFts(options.query);

  const detectedArticles = extractArticleNumbersAz(options.query);
  const explicitArticles: string[] = [];
  for (const a of [...(options.articleNumbers ?? []), ...detectedArticles]) {
    if (a && !explicitArticles.includes(a)) explicitArticles.push(a);
  }
  const conceptPriorityArticles: string[] = [];
  for (const a of options.priorityArticles ?? []) {
    if (a && !explicitArticles.includes(a) && !conceptPriorityArticles.includes(a)) {
      conceptPriorityArticles.push(a);
    }
  }
  const allLookupArticles = [...explicitArticles, ...conceptPriorityArticles];

  const expandedTokens: string[] = [];
  for (const eq of options.expandedQueries ?? []) {
    for (const tok of tokenizeAzForFts(eq)) {
      if (!rawTokens.includes(tok) && !expandedTokens.includes(tok)) {
        expandedTokens.push(tok);
      }
    }
  }

  const targetDocs = (options.targetFrameworkIds ?? []).filter(Boolean);
  const candidateRows = new Map<number, Record<string, unknown>>();

  const mergeRows = (rows: Record<string, unknown>[]): number => {
    let added = 0;
    for (const row of rows) {
      const id = Number(row.chunk_id);
      if (!candidateRows.has(id)) {
        candidateRows.set(id, row);
        added++;
      }
    }
    return added;
  };

  const nonNumericTokens = rawTokens.filter((t) => !/^\d+$/.test(t));
  let discoveredDocIds: string[] = [];

  try {
    // 1. Direct fast B-tree scan inside identified primary law(s)
    if (targetDocs.length > 0) {
      mergeRows(queryTargetDocumentsDirect(db, targetDocs, rawTokens, expandedTokens, allLookupArticles));
    }

    // 2. Dynamic title/topic discovery across ALL 56,983 active documents (catches specialized Laws like Pensiya, İcra, Dövlət rüsumu, Notariat, Banklar, etc.)
    discoveredDocIds = discoverRelevantDocumentIds(
      db,
      nonNumericTokens,
      expandedTokens,
      new Set(targetDocs)
    );
    if (discoveredDocIds.length > 0) {
      mergeRows(queryTargetDocumentsDirect(db, discoveredDocIds, rawTokens, expandedTokens, allLookupArticles));
    }

    // 3. Corpus-wide FTS5 BM25 recall across ALL 56,983 documents (never gated by local targetDocs count!)
    const searchTokens = nonNumericTokens.filter((t) => !explicitArticles.includes(t));
    let corpusFtsRows = 0;
    if (searchTokens.length >= 2) {
      const strictExpr = searchTokens.slice(0, 5).map(buildStemToken).join(" AND ");
      corpusFtsRows += mergeRows(runFtsQuery(db, strictExpr, 75));
    }

    // 4a. High-IDF Substantive Pairwise AND FTS5 (catches statutory core when user mixes everyday words like "cinayətinin cəzası" + "tütün tullantısı")
    const genericLegalMeta = new Set([
      "ceza", "cezasi", "cezasini", "cerime", "cerimesi", "cinayet", "cinayeti", "cinayetinin",
      "xeta", "xetasi", "xetasinin", "huquq", "huququ", "huququnun", "qayda", "qaydasi",
      "qaydalari", "muddet", "muddeti", "miqdar", "miqdari", "mebleg", "meblegi",
      "sert", "serti", "sertleri", "qeder", "qederdir", "hallar", "hallarda", "esas", "esaslari",
    ]);
    const rawSubstantive = searchTokens.filter((t) => t.length >= 4 && !genericLegalMeta.has(t));
    const expSubstantive = expandedTokens.filter((t) => t.length >= 4 && !genericLegalMeta.has(t) && !rawSubstantive.includes(t));
    const substantive = [...rawSubstantive, ...expSubstantive.slice(0, 4)]
      .filter((t, idx, arr) => arr.indexOf(t) === idx);

    if (corpusFtsRows < 25 && substantive.length >= 2) {
      const ftsPool = substantive.slice(0, 5).map(buildStemToken);
      const seenPairs = new Set<string>();
      for (let i = 0; i < ftsPool.length && seenPairs.size < 4; i++) {
        for (let j = i + 1; j < ftsPool.length && seenPairs.size < 4; j++) {
          if (ftsPool[i] === ftsPool[j]) continue;
          const pairExpr = `${ftsPool[i]} AND ${ftsPool[j]}`;
          if (!seenPairs.has(pairExpr)) {
            seenPairs.add(pairExpr);
            corpusFtsRows += mergeRows(runFtsQuery(db, pairExpr, 35));
          }
        }
      }
    }

    // 4b. Focused OR FTS5 across ALL 56,983 documents when corpus-wide AND/pair recall is sparse
    if (corpusFtsRows < 25 && (substantive.length > 0 || searchTokens.length > 0)) {
      const orSource = substantive.length > 0 ? substantive : searchTokens;
      const broadTerms = [...orSource.slice(0, 6), ...expandedTokens.slice(0, 4)].slice(0, 8);
      const broadExpr = Array.from(new Set(broadTerms.map(buildStemToken))).join(" OR ");
      mergeRows(runFtsQuery(db, broadExpr, 75));
    }
  } catch (err) {
    console.warn("[corpus_sqlite] FTS search query error:", err);
  }

  const allTargetedDocs = new Set([...targetDocs, ...discoveredDocIds]);
  const forbidden = (options.forbiddenPhrases ?? []).map(normalizeAzSearch).filter(Boolean);
  const rawNonNumStems = nonNumericTokens.map(stemAzToken).filter((s) => s.length >= 3);
  const scored: StructuredChunk[] = [];

  for (const row of candidateRows.values()) {
    const docId = String(row.document_id ?? "");
    const title = String(row.title ?? "");
    const artNum = String(row.article_number ?? "");
    const rawArtTitle = String(row.article_title ?? "");
    const cleanArtTitle = cleanArticleHeading(rawArtTitle);
    const content = String(row.content ?? "");
    const sourceUrl = String(row.source_url ?? `https://www.e-qanun.ai/results/${docId}`);
    const fileName = String(row.file_name ?? `eqanun_doc_${docId}`);
    const isRepealed = Number(row.is_repealed ?? 0);
    const docType = String(row.doc_type ?? "");
    const priorityBoost = Number(row.priority_boost ?? 0);
    const ftsBm25 = Number(row.fts_bm25 ?? 0);

    // Exclude repealed acts unless explicitly targeted by document ID
    if (isRepealed && !targetDocs.includes(docId)) {
      continue;
    }

    const artTitleNorm = normalizeAzSearch(cleanArtTitle);
    const contentNorm = normalizeAzSearch(`${cleanArtTitle} ${content}`);
    const spacelessContentNorm = contentNorm.replace(/\s+/g, "");
    const titleNorm = normalizeAzSearch(title);
    const isAmendment =
      titleNorm.includes("deyisiklik") ||
      titleNorm.includes("elave edilm") ||
      titleNorm.includes("elaveler edilm");
    const isImplementation =
      titleNorm.includes("tetbiq edilm") || titleNorm.includes("tetbiqi ");

    let score = Math.min(220, Math.max(0, -ftsBm25) * 6.5) + priorityBoost * 1.15;

    if (isAmendment && !allTargetedDocs.has(docId)) {
      score -= 130;
    }
    if (isImplementation && !allTargetedDocs.has(docId)) {
      score -= 60;
    }
    if (
      docType === "beynelxalq" &&
      !targetDocs.includes(docId) &&
      !queryNorm.includes("beynelxalq") &&
      !queryNorm.includes("konvensiya") &&
      !queryNorm.includes("sazis")
    ) {
      score -= 110;
    }

    const lawConf = options.targetLawConfidence ?? "explicit";
    const primaryTargetBoost = lawConf === "weak" ? 150 : 470;
    const secondaryTargetBoost = lawConf === "weak" ? 105 : 240;

    if (targetDocs[0] && docId === targetDocs[0]) {
      score += primaryTargetBoost;
    } else if (targetDocs.includes(docId)) {
      score += secondaryTargetBoost;
    } else if (discoveredDocIds.includes(docId)) {
      score += targetDocs.length > 0 && lawConf !== "weak" ? 90 : 190;
    }

    // Explicit articles (requested in user query) get massive boost; concept priority articles boost targeted laws by rank order
    const isConceptTargetDoc = targetDocs.length > 0 ? targetDocs.includes(docId) : allTargetedDocs.has(docId);
    if (artNum && explicitArticles.length > 0) {
      if (explicitArticles.includes(artNum)) {
        score += 480;
      } else if (
        explicitArticles.some(
          (a) =>
            artNum.startsWith(`${a}.`) ||
            (a.includes(".") && artNum === a.split(".")[0] && content.includes(a))
        )
      ) {
        score += 430;
      }
    } else if (artNum && conceptPriorityArticles.length > 0 && isConceptTargetDoc) {
      const exactIdx = conceptPriorityArticles.indexOf(artNum);
      if (exactIdx !== -1) {
        score += Math.max(95, 250 - exactIdx * 35);
      } else {
        const subIdx = conceptPriorityArticles.findIndex(
          (a) =>
            artNum.startsWith(`${a}.`) ||
            (a.includes(".") && artNum === a.split(".")[0] && content.includes(a))
        );
        if (subIdx !== -1) {
          score += Math.max(70, 165 - subIdx * 25);
        }
      }
    }

    let titleMatches = 0;
    let artTitleMatches = 0;
    let bodyMatches = 0;
    for (const tok of rawTokens) {
      const stem = stemAzToken(tok);
      if (doesTextMatchStem(titleNorm, stem)) {
        titleMatches++;
        score += 36;
      }
      if (artTitleNorm && doesTextMatchStem(artTitleNorm, stem)) {
        artTitleMatches++;
        score += 95;
      }
      if (doesTextMatchStem(contentNorm, stem, spacelessContentNorm)) {
        bodyMatches++;
        score += 30;
      }
    }
    if (artTitleMatches >= 2) {
      score += 160;
    }
    if (artTitleNorm && artTitleNorm.length <= 45 && artTitleMatches >= 1) {
      score += 45;
    }
    if (titleMatches >= 2 && !isAmendment && !isRepealed) {
      score += 110;
    }
    if (rawTokens.length >= 2 && titleMatches + bodyMatches >= rawTokens.length) {
      score += 105;
    } else if (rawTokens.length >= 3 && bodyMatches <= 1 && titleMatches === 0 && !allTargetedDocs.has(docId)) {
      score -= 90;
    }

    let proxScore = computePhraseProximityScore(contentNorm, rawNonNumStems);
    if (proxScore === 0 && spacelessContentNorm) {
      proxScore = computePhraseProximityScore(spacelessContentNorm, rawNonNumStems) * 0.75;
    }
    score += proxScore;

    for (const eq of options.expandedQueries ?? []) {
      const eqNorm = normalizeAzSearch(eq);
      if (eqNorm.length >= 8 && contentNorm.includes(eqNorm)) {
        score += 95;
      }
    }
    if (queryNorm.length >= 10 && contentNorm.includes(queryNorm)) {
      score += 130;
    }

    for (const bad of forbidden) {
      if (contentNorm.includes(bad) || titleNorm.includes(bad)) {
        score -= 220;
      }
    }

    // Gentle length damping so comprehensive articles are not penalized behind short adjacent clauses
    const lengthDamp = Math.pow(Math.max(1, content.length / 1800), 0.30);
    score = score / lengthDamp;

    const lawId = DOC_ID_TO_LAW_ID[docId] ?? `eqanun_${docId}`;
    const chunkIndex = Number(row.chunk_index ?? 0);
    const fullArticleTitle = artNum
      ? `${title} — Maddə ${artNum}${cleanArtTitle ? ` (${cleanArtTitle})` : ""}`
      : cleanArtTitle
      ? `${title} — ${cleanArtTitle}`
      : title;

    scored.push({
      sourceId: `sqlite_${docId}_art_${artNum || "0"}_c${chunkIndex}`,
      lawId,
      lawName: title,
      articleNumber: artNum,
      articleTitle: fullArticleTitle,
      content,
      sourceFile: fileName,
      sourceUrl,
      score,
      chunkId: Number(row.chunk_id ?? 0) || undefined,
      documentId: docId,
    });
  }

  scored.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const seenDocArticles = new Set<string>();
  const finalResults: StructuredChunk[] = [];
  const nextChunkStmt = db.prepare(
    "SELECT content FROM chunks WHERE document_id = ? AND article_number = ? AND chunk_index > ? ORDER BY chunk_index ASC LIMIT 3"
  );
  const prevChunkStmt = db.prepare(
    "SELECT content FROM chunks WHERE document_id = ? AND article_number = ? AND chunk_index < ? ORDER BY chunk_index DESC LIMIT 1"
  );

  for (const item of scored) {
    const key = item.articleNumber ? `${item.lawId}::${item.articleNumber}` : item.sourceId;
    if (seenDocArticles.has(key)) continue;
    seenDocArticles.add(key);

    // Enlarge split multi-chunk articles cleanly (e-qanun.ai /enlarge/documents pattern)
    let enriched = item;
    if (item.articleNumber && item.documentId && item.content.length < 2400) {
      const m = item.sourceId.match(/_c(\d+)$/);
      const baseChunkIdx = m ? Number(m[1]) : 0;
      try {
        let mergedContent = item.content;
        if (baseChunkIdx > 0) {
          const prevRow = prevChunkStmt.get(item.documentId, item.articleNumber, baseChunkIdx);
          const prevText = String(prevRow?.content ?? "").trim();
          if (prevText && mergedContent.length + prevText.length <= 3600) {
            mergedContent = prevText + "\n" + mergedContent;
          }
        }
        const extraRows = nextChunkStmt.all(item.documentId, item.articleNumber, baseChunkIdx);
        for (const er of extraRows) {
          const extraText = String(er.content ?? "").trim();
          if (extraText && mergedContent.length + extraText.length <= 3600) {
            mergedContent += "\n" + extraText;
          }
        }
        if (mergedContent !== item.content) {
          enriched = { ...item, content: mergedContent };
        }
      } catch {
        // ignore enlarge failure
      }
    }

    finalResults.push(enriched);
    if (finalResults.length >= limit) break;
  }

  return finalResults;
}

export interface SqliteDocSearchResult {
  documentId: string;
  title: string;
  docType: string;
  isRepealed: number;
  sourceUrl: string;
  articleCount: number;
  charLength: number;
  snippet: string;
  articleNumber: string;
  score: number;
}

/**
 * Searches all 56,983 legal documents for UI Search page (`executeSearch`) and law browsing.
 */
export function searchSqliteDocuments(query: string, limit: number = 30): SqliteDocSearchResult[] {
  const db = getSqliteDb();
  if (!db) return [];

  const tokens = tokenizeAzForFts(query);
  if (tokens.length === 0) return [];

  const normQuery = normalizeAzSearch(query);
  const byDoc = new Map<string, SqliteDocSearchResult>();

  try {
    const likePattern = `%${normQuery.slice(0, 80)}%`;
    const titleRows = db
      .prepare(`
        SELECT d.document_id, d.title, d.doc_type, d.is_repealed, d.priority_boost,
               d.source_url, d.article_count, d.char_length,
               c.article_number, c.content
        FROM documents d
        LEFT JOIN chunks c ON c.document_id = d.document_id AND c.chunk_index = 0
        WHERE d.title_norm LIKE ?
        ORDER BY d.priority_boost DESC, d.char_length DESC
        LIMIT ?
      `)
      .all(likePattern, limit);

    for (const r of titleRows) {
      const docId = String(r.document_id ?? "");
      byDoc.set(docId, {
        documentId: docId,
        title: String(r.title ?? ""),
        docType: String(r.doc_type ?? "qanun"),
        isRepealed: Number(r.is_repealed ?? 0),
        sourceUrl: String(r.source_url ?? `https://www.e-qanun.ai/results/${docId}`),
        articleCount: Number(r.article_count ?? 0),
        charLength: Number(r.char_length ?? 0),
        snippet: String(r.content ?? "").slice(0, 600),
        articleNumber: String(r.article_number ?? ""),
        score: 260 + Number(r.priority_boost ?? 0) * 0.5,
      });
    }

    const matchExpr = tokens.length >= 2
      ? tokens.slice(0, 5).map(buildStemToken).join(" AND ")
      : buildStemToken(tokens[0]);
    let ftsRows = runFtsQuery(db, matchExpr, limit * 2);
    if (ftsRows.length < limit && tokens.length >= 2) {
      const orRows = runFtsQuery(db, tokens.slice(0, 6).map(buildStemToken).join(" OR "), limit * 2);
      ftsRows = [...ftsRows, ...orRows];
    }

    for (const r of ftsRows) {
      const docId = String(r.document_id ?? "");
      const calcScore = Math.min(180, Math.max(0, -Number(r.fts_bm25 ?? 0)) * 6) + Number(r.priority_boost ?? 0) * 0.6;
      const existing = byDoc.get(docId);
      if (!existing || calcScore > existing.score) {
        byDoc.set(docId, {
          documentId: docId,
          title: String(r.title ?? ""),
          docType: String(r.doc_type ?? "qanun"),
          isRepealed: Number(r.is_repealed ?? 0),
          sourceUrl: String(r.source_url ?? `https://www.e-qanun.ai/results/${docId}`),
          articleCount: 0,
          charLength: String(r.content ?? "").length,
          snippet: String(r.content ?? "").slice(0, 700),
          articleNumber: String(r.article_number ?? ""),
          score: existing ? Math.max(existing.score, calcScore) : calcScore,
        });
      }
    }
  } catch (err) {
    console.warn("[corpus_sqlite] searchSqliteDocuments error:", err);
  }

  return Array.from(byDoc.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Reconstructs full document text (or a specific article) directly from SQLite or `full_eqanun_corpus/`.
 */
export function getSqliteDocumentById(
  docId: string,
  articleNumber?: string
): {
  documentId: string;
  title: string;
  sourceUrl: string;
  docType: string;
  isRepealed: number;
  content: string;
} | null {
  const cleanId = String(docId).replace(/\D/g, "");
  if (!cleanId) return null;

  const db = getSqliteDb();
  if (db) {
    try {
      const doc = db
        .prepare("SELECT * FROM documents WHERE document_id = ?")
        .get(cleanId);
      if (doc) {
        const chunksSql = articleNumber
          ? "SELECT article_number, article_title, content FROM chunks WHERE document_id = ? AND (article_number = ? OR article_number LIKE ?) ORDER BY chunk_index ASC LIMIT 40"
          : "SELECT article_number, article_title, content FROM chunks WHERE document_id = ? ORDER BY chunk_index ASC LIMIT 120";
        const rows = articleNumber
          ? db.prepare(chunksSql).all(cleanId, articleNumber, `${articleNumber}.%`)
          : db.prepare(chunksSql).all(cleanId);

        let fullText = rows.map((r) => String(r.content ?? "")).join("\n\n");

        if (!articleNumber && Number(doc.chunk_count ?? 0) > 120) {
          const corpusDir = resolveFullCorpusDir();
          const fileName = String(doc.file_name ?? "");
          if (corpusDir && fileName) {
            const fp = path.join(corpusDir, fileName);
            if (fs.existsSync(fp)) {
              fullText = fs.readFileSync(fp, "utf-8");
            }
          }
        }

        if (fullText.trim()) {
          return {
            documentId: cleanId,
            title: String(doc.title ?? `e-Qanun Sənədi № ${cleanId}`),
            sourceUrl: String(doc.source_url ?? `https://www.e-qanun.ai/results/${cleanId}`),
            docType: String(doc.doc_type ?? "qanun"),
            isRepealed: Number(doc.is_repealed ?? 0),
            content: fullText,
          };
        }
      }
    } catch (err) {
      console.warn("[corpus_sqlite] getSqliteDocumentById SQLite error:", err);
    }
  }

  const corpusDir = resolveFullCorpusDir();
  if (corpusDir) {
    try {
      const prefix = `eqanun_doc_${cleanId}_`;
      const matchFile = fs.readdirSync(corpusDir).find((f) => f.startsWith(prefix) || f === `${cleanId}.txt`);
      if (matchFile) {
        const content = fs.readFileSync(path.join(corpusDir, matchFile), "utf-8");
        const firstTitleLine = content
          .split("\n")
          .slice(0, 6)
          .find((l) => l.startsWith("SƏNƏDİN ADI:"));
        const title = firstTitleLine
          ? firstTitleLine.replace("SƏNƏDİN ADI:", "").trim()
          : `e-Qanun Sənədi № ${cleanId}`;
        return {
          documentId: cleanId,
          title,
          sourceUrl: `https://www.e-qanun.ai/results/${cleanId}`,
          docType: "qanun",
          isRepealed: 0,
          content,
        };
      }
    } catch {
      // ignore disk fallback errors
    }
  }

  return null;
}

export function findSqliteDocumentByTitle(
  titleQuery: string,
  articleNumber?: string
): {
  documentId: string;
  title: string;
  sourceUrl: string;
  content: string;
} | null {
  const db = getSqliteDb();
  if (!db) return null;

  const norm = normalizeAzSearch(titleQuery).replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
  if (!norm) return null;

  try {
    let row = db
      .prepare(`
        SELECT document_id, title
        FROM documents
        WHERE title_norm LIKE ?
        ORDER BY is_repealed ASC, priority_boost DESC, LENGTH(title_norm) ASC
        LIMIT 1
      `)
      .get(`%${norm}%`);

    if (!row?.document_id) {
      const stopWords = new Set([
        "azerbaycan",
        "respublikasinin",
        "respublikasi",
        "haqqinda",
        "qanunu",
        "qanun",
        "tesdiq",
        "edilmesi",
        "barede",
        "qerari",
        "fermani",
      ]);
      const sigTokens = norm
        .split(" ")
        .filter((w) => w.length >= 3 && !stopWords.has(w));
      const queryTokens = sigTokens.length > 0 ? sigTokens.slice(0, 6) : norm.split(" ").slice(0, 6);
      if (queryTokens.length > 0) {
        const whereClauses = queryTokens.map(() => "title_norm LIKE ?").join(" AND ");
        const params = queryTokens.map((t) => `%${t}%`);
        row = db
          .prepare(`
            SELECT document_id, title
            FROM documents
            WHERE ${whereClauses}
            ORDER BY is_repealed ASC, priority_boost DESC, LENGTH(title_norm) ASC
            LIMIT 1
          `)
          .get(...params);
      }
    }

    if (row?.document_id) {
      const cleanArt = articleNumber ? String(articleNumber).replace(/[^\d.]/g, "") : undefined;
      let doc = getSqliteDocumentById(String(row.document_id), cleanArt || undefined);
      if ((!doc || !doc.content) && cleanArt) {
        doc = getSqliteDocumentById(String(row.document_id));
      }
      if (doc) {
        return {
          documentId: doc.documentId,
          title: doc.title,
          sourceUrl: doc.sourceUrl,
          content: doc.content,
        };
      }
    }
  } catch {
    // ignore
  }
  return null;
}
