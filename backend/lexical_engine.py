"""
SQLite FTS5 Lexical & Full-Document Engine mirroring `frontend/src/lib/legal-rag/corpus_sqlite.ts`
so remote serverless deployments (Vercel) get identical 56,983-document recall and full-article enlargement.
"""

from __future__ import annotations

import os
import re
import sqlite3
import time
from pathlib import Path
from typing import Any

ROOT_DIR = Path(__file__).resolve().parent.parent


def resolve_data_file(env_key: str, filename: str) -> Path:
    explicit = (os.environ.get(env_key) or "").strip()
    if explicit:
        return Path(explicit)
    candidates = [
        Path("/data") / filename,
        ROOT_DIR / "data" / filename,
        Path(__file__).resolve().parent / "data" / filename,
    ]
    for cand in candidates:
        if cand.exists():
            return cand
    return ROOT_DIR / "data" / filename


CORPUS_DB_PATH = resolve_data_file("EQANUN_SQLITE_PATH", "eqanun_full.sqlite")
FULL_CORPUS_DIR = resolve_data_file("EQANUN_CORPUS_DIR", "full_eqanun_corpus")

AZ_CHAR_MAP = str.maketrans({
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
})

AZ_STOP_WORDS = {
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
}

DOC_ID_TO_LAW_ID = {
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
}

_SUFFIXES = (
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
)

_ORDINAL_DIGIT_RE = re.compile(r"(\d+(?:\.\d+)*)\s*[-–]?\s*(?:nc[iu]|c[iu]|uncu|inci)\b")
_NON_ALNUM_RE = re.compile(r"[^a-z0-9]+")
_BEFORE_ART_RE = re.compile(
    r"(\d+(?:[.\-]\d+)*)\s*[-–]?\s*(?:c[iu]|nc[iu]|uncu|inci|madd[e]?[a-z]*)?\s+madd[e]?[a-z]*",
    re.IGNORECASE,
)
_AFTER_ART_RE = re.compile(r"(?:madd[e]?|mad\.?)\s*(\d+(?:[.\-]\d+)*)", re.IGNORECASE)
_NOISE_RE = re.compile(r"(?:\s*===+|\s*KMQ\d+|\s*\[\d+\])+")
_CLAUSE_LEAK_RE = re.compile(r"\s+\d+(?:-\d+)*(?:\.\d+)+\.?\s+.*$")
_ROMAN_LEAK_RE = re.compile(r"\s+[IVXLC]+\.\s+[A-ZƏÖÜÇŞĞİ].*$")

_GENERIC_META = {
    "ceza", "cezasi", "cezasini", "cerime", "cerimesi", "cinayet", "cinayeti", "cinayetinin",
    "xeta", "xetasi", "xetasinin", "huquq", "huququ", "huququnun", "qayda", "qaydasi",
    "qaydalari", "muddet", "muddeti", "miqdar", "miqdari", "mebleg", "meblegi",
    "sert", "serti", "sertleri", "qeder", "qederdir", "hallar", "hallarda", "esas", "esaslari",
}


def normalize_az_search(text: str) -> str:
    if not text:
        return ""
    return " ".join(text.translate(AZ_CHAR_MAP).lower().split())


def clean_article_heading(raw: str) -> str:
    s = _NOISE_RE.sub("", raw or "")
    s = _CLAUSE_LEAK_RE.sub("", s)
    s = _ROMAN_LEAK_RE.sub("", s)
    return " ".join(s.split())


def extract_article_numbers_az(query: str) -> list[str]:
    norm = normalize_az_search(query)
    found: list[str] = []

    def add(num: str) -> None:
        clean = num.replace("-", ".").rstrip(".")
        if clean and clean not in found:
            found.append(clean)

    for m in _BEFORE_ART_RE.finditer(norm):
        add(m.group(1))
    for m in _AFTER_ART_RE.finditer(norm):
        add(m.group(1))
    return found


def stem_az_token(tok: str) -> str:
    if tok.isdigit():
        return tok
    stem = tok
    for _ in range(2):
        stripped = False
        for suf in _SUFFIXES:
            min_root = 3 if suf in ("maq", "mek") else 4
            if len(stem) - len(suf) >= min_root and stem.endswith(suf):
                stem = stem[: len(stem) - len(suf)]
                stripped = True
                break
        if not stripped:
            break
    return stem


def tokenize_az_for_fts(text: str) -> list[str]:
    norm = normalize_az_search(text)
    norm = _ORDINAL_DIGIT_RE.sub(r"\1", norm)
    norm = _NON_ALNUM_RE.sub(" ", norm).strip()
    if not norm:
        return []
    seen: set[str] = set()
    tokens: list[str] = []
    for tok in norm.split():
        if not tok.isdigit() and len(tok) < 3:
            continue
        if tok in AZ_STOP_WORDS or tok in seen:
            continue
        seen.add(tok)
        tokens.append(tok)
    return tokens


def build_stem_token(tok: str) -> str:
    if tok.isdigit():
        return tok
    stem = stem_az_token(tok)
    safe = f'"{stem}"' if stem in ("and", "or", "not", "near") else stem
    if len(stem) < 4:
        return safe
    if stem.endswith("q"):
        return f"({stem}* OR {stem[:-1]}g*)"
    if stem.endswith("k"):
        return f"({stem}* OR {stem[:-1]}y*)"
    return f"{stem}*"


def does_text_match_stem(norm_text: str, stem: str, spaceless_text: str | None = None) -> bool:
    if not stem:
        return False
    if stem in norm_text:
        return True
    if len(stem) >= 4 and stem.endswith("q") and f"{stem[:-1]}g" in norm_text:
        return True
    if len(stem) >= 4 and stem.endswith("k") and f"{stem[:-1]}y" in norm_text:
        return True
    if spaceless_text and len(stem) >= 5 and stem in spaceless_text:
        return True
    return False


def _find_stem_positions(norm_text: str, stem: str) -> list[int]:
    if not stem or len(stem) < 3:
        return []
    variants = [stem]
    if len(stem) >= 4 and stem.endswith("q"):
        variants.append(f"{stem[:-1]}g")
    if len(stem) >= 4 and stem.endswith("k"):
        variants.append(f"{stem[:-1]}y")
    positions: list[int] = []
    for v in variants:
        start = 0
        for _ in range(8):
            idx = norm_text.find(v, start)
            if idx == -1:
                break
            positions.append(idx)
            start = idx + len(v)
    positions.sort()
    return positions


def compute_phrase_proximity_score(norm_text: str, stems: list[str]) -> float:
    unique_stems = list(dict.fromkeys(s for s in stems if len(s) >= 3))
    if len(unique_stems) < 2 or not norm_text:
        return 0.0

    hits: list[tuple[int, int]] = []
    for i, st in enumerate(unique_stems):
        for pos in _find_stem_positions(norm_text, st):
            hits.append((pos, i))
    if len(hits) < 2:
        return 0.0
    hits.sort(key=lambda x: x[0])

    max_distinct = 1
    right = 0
    counts: dict[int, int] = {}
    for left in range(len(hits)):
        while right < len(hits) and hits[right][0] - hits[left][0] <= 115:
            si = hits[right][1]
            counts[si] = counts.get(si, 0) + 1
            right += 1
        if len(counts) > max_distinct:
            max_distinct = len(counts)
        li = hits[left][1]
        if counts.get(li, 0) <= 1:
            counts.pop(li, None)
        else:
            counts[li] -= 1

    matched_pairs: set[tuple[int, int]] = set()
    for i in range(len(hits) - 1):
        pos_a, sa = hits[i]
        for j in range(i + 1, len(hits)):
            pos_b, sb = hits[j]
            if pos_b - pos_a > 55:
                break
            if sa != sb:
                matched_pairs.add((min(sa, sb), max(sa, sb)))

    bonus = min(4, len(matched_pairs)) * 35.0
    if max_distinct >= 4:
        bonus += 220.0
    elif max_distinct == 3:
        bonus += 135.0
    elif max_distinct == 2 and len(unique_stems) <= 3:
        bonus += 55.0
    return bonus


class EqanunLexicalEngine:
    def _open_ro(self) -> sqlite3.Connection | None:
        if not CORPUS_DB_PATH.exists():
            return None
        conn = sqlite3.connect(f"file:{CORPUS_DB_PATH}?mode=ro", uri=True, timeout=5.0)
        conn.row_factory = sqlite3.Row
        return conn

    @staticmethod
    def _run_fts_query(conn: sqlite3.Connection, match_expr: str, limit: int) -> list[dict[str, Any]]:
        if not match_expr.strip():
            return []
        cte_limit = max(limit * 14, 900)
        sql = """
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
        """
        return [dict(r) for r in conn.execute(sql, (match_expr, cte_limit, limit)).fetchall()]

    @staticmethod
    def _discover_relevant_doc_ids(
        conn: sqlite3.Connection,
        raw_non_num: list[str],
        exp_non_num: list[str],
        exclude_doc_ids: set[str],
    ) -> list[str]:
        skip_generic = {"madd", "qanun", "mecelle", "huquq", "haqq", "veril", "olun", "edil", "nece", "hans"}
        stems: list[tuple[str, int]] = []
        seen: set[str] = set()
        for tok in raw_non_num:
            s = stem_az_token(tok)
            if len(s) >= 4 and s not in seen and s not in skip_generic:
                seen.add(s)
                stems.append((s, 45))
        for tok in exp_non_num[:6]:
            s = stem_az_token(tok)
            if len(s) >= 4 and s not in seen and s not in skip_generic:
                seen.add(s)
                stems.append((s, 20))
        if not stems:
            return []

        search_stems = stems[:7]
        like_clauses = " OR ".join("title_norm LIKE ?" for _ in search_stems)
        sql = f"""
            SELECT document_id, title_norm, doc_type, priority_boost, article_count, char_length
            FROM documents
            WHERE is_repealed = 0
              AND title_norm NOT LIKE '%deyisiklik%'
              AND title_norm NOT LIKE '%elave edilm%'
              AND ({like_clauses})
            ORDER BY priority_boost DESC, article_count DESC, char_length DESC
            LIMIT 240
        """
        rows = conn.execute(sql, [f"%{s[0]}%" for s in search_stems]).fetchall()
        ranked: list[tuple[str, float]] = []
        for row in rows:
            doc_id = str(row["document_id"] or "")
            if not doc_id or doc_id in exclude_doc_ids:
                continue
            t_norm = str(row["title_norm"] or "")
            doc_type = str(row["doc_type"] or "")
            p_boost = float(row["priority_boost"] or 0.0)
            art_count = int(row["article_count"] or 0)

            title_score = 0.0
            raw_hits = 0
            for st, w in stems:
                if does_text_match_stem(t_norm, st):
                    title_score += w
                    if w >= 40:
                        raw_hits += 1
            if raw_hits == 0 and title_score < 40:
                continue
            if "tetbiq edilm" in t_norm or "tetbiqi " in t_norm:
                title_score -= 80.0
            if len(t_norm) <= 65 and doc_type in ("qanun", "kodeks", "konstitusiya"):
                title_score += 45.0
            if art_count >= 10:
                title_score += 20.0
            title_score += p_boost * 0.45
            if title_score >= 85.0:
                ranked.append((doc_id, title_score))

        ranked.sort(key=lambda x: x[1], reverse=True)
        return [d for d, _ in ranked[:3]]

    @staticmethod
    def _query_target_docs_direct(
        conn: sqlite3.Connection,
        target_doc_ids: list[str],
        raw_tokens: list[str],
        expanded_tokens: list[str],
        target_articles: list[str],
    ) -> list[dict[str, Any]]:
        if not target_doc_ids:
            return []
        unique_docs = list(dict.fromkeys(target_doc_ids))[:5]
        ph = ",".join("?" for _ in unique_docs)
        results: list[dict[str, Any]] = []
        seen_cids: set[int] = set()

        def add_chunk(r: dict[str, Any]) -> None:
            cid = int(r["chunk_id"])
            if cid not in seen_cids:
                seen_cids.add(cid)
                results.append(r)

        if target_articles:
            conds: list[str] = []
            params: list[Any] = list(unique_docs)
            for art in target_articles:
                if "." in art:
                    parent = art.split(".")[0]
                    conds.append("(c.article_number = ? OR c.article_number LIKE ? OR (c.article_number = ? AND c.content LIKE ?))")
                    params.extend([art, f"{art}.%", parent, f"%{art}%"])
                else:
                    conds.append("(c.article_number = ? OR c.article_number LIKE ?)")
                    params.extend([art, f"{art}.%"])
            exact_sql = f"""
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
                WHERE c.document_id IN ({ph})
                  AND ({' OR '.join(conds)})
                ORDER BY c.chunk_index ASC
                LIMIT 40
            """
            for r in conn.execute(exact_sql, params).fetchall():
                add_chunk(dict(r))

        raw_stems = [s for s in (stem_az_token(t) for t in raw_tokens if not t.isdigit()) if len(s) >= 3]
        exp_stems = [s for s in (stem_az_token(t) for t in expanded_tokens if not t.isdigit()) if len(s) >= 4]
        if raw_stems or exp_stems:
            all_sql = """
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
            """
            for did in unique_docs[:3]:
                doc_rows = conn.execute(all_sql, (did,)).fetchall()
                local_hits: list[tuple[dict[str, Any], float]] = []
                for row in doc_rows:
                    r = dict(row)
                    clean_heading = clean_article_heading(str(r.get("article_title") or ""))
                    art_title_n = normalize_az_search(clean_heading)
                    content_n = normalize_az_search(str(r.get("content") or ""))
                    spaceless_n = content_n.replace(" ", "")
                    s = 0.0
                    matched_raw = 0
                    matched_art_title = 0
                    for st in raw_stems:
                        if does_text_match_stem(art_title_n, st):
                            s += 48.0
                            matched_raw += 1
                            matched_art_title += 1
                        elif does_text_match_stem(content_n, st, spaceless_n):
                            s += 10.0
                            matched_raw += 1
                    for st in exp_stems:
                        if does_text_match_stem(art_title_n, st):
                            s += 18.0
                        elif does_text_match_stem(content_n, st, spaceless_n):
                            s += 3.0
                    if matched_art_title >= 2:
                        s += 55.0
                    if matched_raw >= 2:
                        direct_prox = compute_phrase_proximity_score(f"{art_title_n} {content_n}", raw_stems)
                        if direct_prox == 0.0 and spaceless_n:
                            direct_prox = compute_phrase_proximity_score(
                                f"{art_title_n.replace(' ', '')}{spaceless_n}",
                                raw_stems,
                            ) * 0.75
                        s += 18.0 + direct_prox * 0.25
                    if s > 0.0:
                        len_scale = max(1.0, len(content_n) / 1800.0) ** 0.25
                        local_hits.append((r, s / len_scale))
                local_hits.sort(key=lambda x: x[1], reverse=True)
                for r, sc in local_hits[:35]:
                    r["fts_bm25"] = -min(30.0, sc)
                    add_chunk(r)

        return results

    def search_lexical(
        self,
        query: str,
        expanded_queries: list[str] | None = None,
        target_framework_ids: list[str] | None = None,
        target_law_confidence: str = "explicit",
        article_numbers: list[str] | None = None,
        priority_articles: list[str] | None = None,
        forbidden_phrases: list[str] | None = None,
        limit: int = 20,
    ) -> dict[str, Any]:
        t0 = time.perf_counter()
        conn = self._open_ro()
        if conn is None:
            return {"chunks": [], "latency_ms": 0.0}

        try:
            eff_limit = max(1, min(limit, 60))
            query_norm = normalize_az_search(query)
            raw_tokens = tokenize_az_for_fts(query)

            detected_articles = extract_article_numbers_az(query)
            explicit_articles: list[str] = []
            for a in [*(article_numbers or []), *detected_articles]:
                if a and a not in explicit_articles:
                    explicit_articles.append(a)
            concept_priority_articles: list[str] = []
            for a in priority_articles or []:
                if a and a not in explicit_articles and a not in concept_priority_articles:
                    concept_priority_articles.append(a)
            all_lookup_articles = [*explicit_articles, *concept_priority_articles]

            expanded_tokens: list[str] = []
            for eq in expanded_queries or []:
                for tok in tokenize_az_for_fts(eq):
                    if tok not in raw_tokens and tok not in expanded_tokens:
                        expanded_tokens.append(tok)

            target_docs = [str(d) for d in (target_framework_ids or []) if d]
            candidate_rows: dict[int, dict[str, Any]] = {}

            def merge_rows(rows: list[dict[str, Any]]) -> int:
                added = 0
                for row in rows:
                    cid = int(row["chunk_id"])
                    if cid not in candidate_rows:
                        candidate_rows[cid] = row
                        added += 1
                return added

            non_numeric = [t for t in raw_tokens if not t.isdigit()]
            discovered_doc_ids: list[str] = []

            if target_docs:
                merge_rows(
                    self._query_target_docs_direct(conn, target_docs, raw_tokens, expanded_tokens, all_lookup_articles)
                )

            discovered_doc_ids = self._discover_relevant_doc_ids(
                conn, non_numeric, expanded_tokens, set(target_docs)
            )
            if discovered_doc_ids:
                merge_rows(
                    self._query_target_docs_direct(conn, discovered_doc_ids, raw_tokens, expanded_tokens, all_lookup_articles)
                )

            search_tokens = [t for t in non_numeric if t not in explicit_articles]
            corpus_fts_rows = 0
            try:
                if len(search_tokens) >= 2:
                    strict_expr = " AND ".join(build_stem_token(t) for t in search_tokens[:5])
                    corpus_fts_rows += merge_rows(self._run_fts_query(conn, strict_expr, 75))

                raw_sub = [t for t in search_tokens if len(t) >= 4 and t not in _GENERIC_META]
                exp_sub = [
                    t for t in expanded_tokens
                    if len(t) >= 4 and t not in _GENERIC_META and t not in raw_sub
                ]
                substantive = list(dict.fromkeys([*raw_sub, *exp_sub[:4]]))

                if corpus_fts_rows < 25 and len(substantive) >= 2:
                    fts_pool = [build_stem_token(t) for t in substantive[:5]]
                    seen_pairs: set[str] = set()
                    for i in range(len(fts_pool)):
                        if len(seen_pairs) >= 4:
                            break
                        for j in range(i + 1, len(fts_pool)):
                            if len(seen_pairs) >= 4:
                                break
                            if fts_pool[i] == fts_pool[j]:
                                continue
                            pair_expr = f"{fts_pool[i]} AND {fts_pool[j]}"
                            if pair_expr not in seen_pairs:
                                seen_pairs.add(pair_expr)
                                corpus_fts_rows += merge_rows(self._run_fts_query(conn, pair_expr, 35))

                if corpus_fts_rows < 25 and (substantive or search_tokens):
                    or_src = substantive if substantive else search_tokens
                    broad_terms = [*or_src[:6], *expanded_tokens[:4]][:8]
                    broad_expr = " OR ".join(dict.fromkeys(build_stem_token(t) for t in broad_terms))
                    merge_rows(self._run_fts_query(conn, broad_expr, 75))
            except sqlite3.Error:
                pass

            all_targeted = set(target_docs) | set(discovered_doc_ids)
            forbidden = [normalize_az_search(p) for p in (forbidden_phrases or []) if p and normalize_az_search(p)]
            raw_non_num_stems = [s for s in (stem_az_token(t) for t in non_numeric) if len(s) >= 3]
            exp_norms = [normalize_az_search(eq) for eq in (expanded_queries or []) if len(normalize_az_search(eq)) >= 8]

            scored: list[dict[str, Any]] = []
            for row in candidate_rows.values():
                doc_id = str(row.get("document_id") or "")
                is_repealed = int(row.get("is_repealed") or 0)
                if is_repealed and doc_id not in target_docs:
                    continue

                title = str(row.get("title") or "")
                art_num = str(row.get("article_number") or "")
                clean_art_title = clean_article_heading(str(row.get("article_title") or ""))
                content = str(row.get("content") or "")
                source_url = str(row.get("source_url") or f"https://www.e-qanun.ai/results/{doc_id}")
                file_name = str(row.get("file_name") or f"eqanun_doc_{doc_id}")
                doc_type = str(row.get("doc_type") or "")
                priority_boost = float(row.get("priority_boost") or 0.0)
                fts_bm25 = float(row.get("fts_bm25") or 0.0)

                art_title_norm = normalize_az_search(clean_art_title)
                content_norm = normalize_az_search(f"{clean_art_title} {content}")
                spaceless_norm = content_norm.replace(" ", "")
                title_norm = normalize_az_search(title)
                is_amendment = (
                    "deyisiklik" in title_norm
                    or "elave edilm" in title_norm
                    or "elaveler edilm" in title_norm
                )
                is_impl = "tetbiq edilm" in title_norm or "tetbiqi " in title_norm

                score = min(220.0, max(0.0, -fts_bm25) * 6.5) + priority_boost * 1.15
                if is_amendment and doc_id not in all_targeted:
                    score -= 130.0
                if is_impl and doc_id not in all_targeted:
                    score -= 60.0
                if (
                    doc_type == "beynelxalq"
                    and doc_id not in target_docs
                    and "beynelxalq" not in query_norm
                    and "konvensiya" not in query_norm
                    and "sazis" not in query_norm
                ):
                    score -= 110.0

                primary_boost = 150.0 if target_law_confidence == "weak" else 470.0
                secondary_boost = 105.0 if target_law_confidence == "weak" else 240.0
                if target_docs and doc_id == target_docs[0]:
                    score += primary_boost
                elif doc_id in target_docs:
                    score += secondary_boost
                elif doc_id in discovered_doc_ids:
                    score += 90.0 if (target_docs and target_law_confidence != "weak") else 190.0

                is_concept_target = (doc_id in target_docs) if target_docs else (doc_id in all_targeted)
                if art_num and explicit_articles:
                    if art_num in explicit_articles:
                        score += 480.0
                    elif any(
                        art_num.startswith(f"{a}.") or ("." in a and art_num == a.split(".")[0] and a in content)
                        for a in explicit_articles
                    ):
                        score += 430.0
                elif art_num and concept_priority_articles and is_concept_target:
                    if art_num in concept_priority_articles:
                        idx = concept_priority_articles.index(art_num)
                        score += max(95.0, 250.0 - idx * 35.0)
                    else:
                        sub_idx = next(
                            (
                                idx
                                for idx, a in enumerate(concept_priority_articles)
                                if art_num.startswith(f"{a}.") or ("." in a and art_num == a.split(".")[0] and a in content)
                            ),
                            -1,
                        )
                        if sub_idx != -1:
                            score += max(70.0, 165.0 - sub_idx * 25.0)

                title_matches = 0
                art_title_matches = 0
                body_matches = 0
                for tok in raw_tokens:
                    st = stem_az_token(tok)
                    if does_text_match_stem(title_norm, st):
                        title_matches += 1
                        score += 36.0
                    if art_title_norm and does_text_match_stem(art_title_norm, st):
                        art_title_matches += 1
                        score += 95.0
                    if does_text_match_stem(content_norm, st, spaceless_norm):
                        body_matches += 1
                        score += 30.0

                if art_title_matches >= 2:
                    score += 160.0
                if art_title_norm and len(art_title_norm) <= 45 and art_title_matches >= 1:
                    score += 45.0
                if title_matches >= 2 and not is_amendment and not is_repealed:
                    score += 110.0
                if len(raw_tokens) >= 2 and title_matches + body_matches >= len(raw_tokens):
                    score += 105.0
                elif len(raw_tokens) >= 3 and body_matches <= 1 and title_matches == 0 and doc_id not in all_targeted:
                    score -= 90.0

                prox_score = compute_phrase_proximity_score(content_norm, raw_non_num_stems)
                if prox_score == 0.0 and spaceless_norm:
                    prox_score = compute_phrase_proximity_score(spaceless_norm, raw_non_num_stems) * 0.75
                score += prox_score

                for eq_norm in exp_norms:
                    if eq_norm in content_norm:
                        score += 95.0
                if len(query_norm) >= 10 and query_norm in content_norm:
                    score += 130.0
                for bad in forbidden:
                    if bad in content_norm or bad in title_norm:
                        score -= 220.0

                length_damp = max(1.0, len(content) / 1800.0) ** 0.30
                score /= length_damp

                law_id = DOC_ID_TO_LAW_ID.get(doc_id, f"eqanun_{doc_id}")
                chunk_idx = int(row.get("chunk_index") or 0)
                if art_num:
                    full_title = f"{title} — Maddə {art_num}{f' ({clean_art_title})' if clean_art_title else ''}"
                elif clean_art_title:
                    full_title = f"{title} — {clean_art_title}"
                else:
                    full_title = title

                scored.append({
                    "sourceId": f"sqlite_{doc_id}_art_{art_num or '0'}_c{chunk_idx}",
                    "lawId": law_id,
                    "lawName": title,
                    "articleNumber": art_num,
                    "articleTitle": full_title,
                    "content": content,
                    "sourceFile": file_name,
                    "sourceUrl": source_url,
                    "score": round(score, 2),
                    "chunkId": int(row.get("chunk_id") or 0) or None,
                    "documentId": doc_id,
                    "_chunkIndex": chunk_idx,
                })

            scored.sort(key=lambda x: x["score"], reverse=True)

            seen_doc_arts: set[str] = set()
            final_results: list[dict[str, Any]] = []
            for item in scored:
                art_num = item["articleNumber"]
                key = f"{item['lawId']}::{art_num}" if art_num else item["sourceId"]
                if key in seen_doc_arts:
                    continue
                seen_doc_arts.add(key)

                merged = item["content"]
                base_idx = item.pop("_chunkIndex", 0)
                if art_num and item["documentId"] and len(merged) < 2400:
                    try:
                        if base_idx > 0:
                            prev_row = conn.execute(
                                "SELECT content FROM chunks WHERE document_id = ? AND article_number = ? AND chunk_index < ? ORDER BY chunk_index DESC LIMIT 1",
                                (item["documentId"], art_num, base_idx),
                            ).fetchone()
                            if prev_row and prev_row["content"]:
                                prev_txt = str(prev_row["content"]).strip()
                                if prev_txt and len(merged) + len(prev_txt) <= 3600:
                                    merged = prev_txt + "\n" + merged
                        extra_rows = conn.execute(
                            "SELECT content FROM chunks WHERE document_id = ? AND article_number = ? AND chunk_index > ? ORDER BY chunk_index ASC LIMIT 3",
                            (item["documentId"], art_num, base_idx),
                        ).fetchall()
                        for er in extra_rows:
                            extra_txt = str(er["content"] or "").strip()
                            if extra_txt and len(merged) + len(extra_txt) <= 3600:
                                merged += "\n" + extra_txt
                    except sqlite3.Error:
                        pass

                item["content"] = merged
                final_results.append(item)
                if len(final_results) >= eff_limit:
                    break

            return {
                "chunks": final_results,
                "latency_ms": round((time.perf_counter() - t0) * 1000, 1),
            }
        finally:
            conn.close()

    def search_documents(self, query: str, limit: int = 30) -> dict[str, Any]:
        t0 = time.perf_counter()
        conn = self._open_ro()
        if conn is None:
            return {"results": [], "latency_ms": 0.0}

        try:
            tokens = tokenize_az_for_fts(query)
            if not tokens:
                return {"results": [], "latency_ms": 0.0}
            eff_limit = max(1, min(limit, 50))
            norm_query = normalize_az_search(query)
            by_doc: dict[str, dict[str, Any]] = {}

            like_pattern = f"%{norm_query[:80]}%"
            title_rows = conn.execute(
                """
                SELECT d.document_id, d.title, d.doc_type, d.is_repealed, d.priority_boost,
                       d.source_url, d.article_count, d.char_length,
                       c.article_number, c.content
                FROM documents d
                LEFT JOIN chunks c ON c.document_id = d.document_id AND c.chunk_index = 0
                WHERE d.title_norm LIKE ?
                ORDER BY d.priority_boost DESC, d.char_length DESC
                LIMIT ?
                """,
                (like_pattern, eff_limit),
            ).fetchall()

            for r in title_rows:
                did = str(r["document_id"] or "")
                by_doc[did] = {
                    "documentId": did,
                    "title": str(r["title"] or ""),
                    "docType": str(r["doc_type"] or "qanun"),
                    "isRepealed": int(r["is_repealed"] or 0),
                    "sourceUrl": str(r["source_url"] or f"https://www.e-qanun.ai/results/{did}"),
                    "articleCount": int(r["article_count"] or 0),
                    "charLength": int(r["char_length"] or 0),
                    "snippet": str(r["content"] or "")[:600],
                    "articleNumber": str(r["article_number"] or ""),
                    "score": 260.0 + float(r["priority_boost"] or 0.0) * 0.5,
                }

            try:
                match_expr = (
                    " AND ".join(build_stem_token(t) for t in tokens[:5])
                    if len(tokens) >= 2
                    else build_stem_token(tokens[0])
                )
                fts_rows = self._run_fts_query(conn, match_expr, eff_limit * 2)
                if len(fts_rows) < eff_limit and len(tokens) >= 2:
                    or_expr = " OR ".join(build_stem_token(t) for t in tokens[:6])
                    fts_rows.extend(self._run_fts_query(conn, or_expr, eff_limit * 2))

                for r in fts_rows:
                    did = str(r["document_id"] or "")
                    calc = min(180.0, max(0.0, -float(r.get("fts_bm25") or 0.0)) * 6.0) + float(r.get("priority_boost") or 0.0) * 0.6
                    existing = by_doc.get(did)
                    if not existing or calc > existing["score"]:
                        by_doc[did] = {
                            "documentId": did,
                            "title": str(r.get("title") or ""),
                            "docType": str(r.get("doc_type") or "qanun"),
                            "isRepealed": int(r.get("is_repealed") or 0),
                            "sourceUrl": str(r.get("source_url") or f"https://www.e-qanun.ai/results/{did}"),
                            "articleCount": 0,
                            "charLength": len(str(r.get("content") or "")),
                            "snippet": str(r.get("content") or "")[:700],
                            "articleNumber": str(r.get("article_number") or ""),
                            "score": max(existing["score"], calc) if existing else calc,
                        }
            except sqlite3.Error:
                pass

            ranked = sorted(by_doc.values(), key=lambda x: x["score"], reverse=True)[:eff_limit]
            return {
                "results": ranked,
                "latency_ms": round((time.perf_counter() - t0) * 1000, 1),
            }
        finally:
            conn.close()

    def get_document_by_id(self, doc_id: str, article_number: str | None = None) -> dict[str, Any] | None:
        clean_id = re.sub(r"\D", "", str(doc_id or ""))
        if not clean_id:
            return None
        clean_art = (article_number or "").strip() or None

        conn = self._open_ro()
        if conn is not None:
            try:
                doc = conn.execute(
                    "SELECT * FROM documents WHERE document_id = ?",
                    (clean_id,),
                ).fetchone()
                if doc:
                    if clean_art:
                        rows = conn.execute(
                            "SELECT content FROM chunks WHERE document_id = ? AND (article_number = ? OR article_number LIKE ?) ORDER BY chunk_index ASC LIMIT 40",
                            (clean_id, clean_art, f"{clean_art}.%"),
                        ).fetchall()
                        if not rows and "." in clean_art:
                            parent_art = clean_art.split(".")[0]
                            rows = conn.execute(
                                "SELECT content FROM chunks WHERE document_id = ? AND article_number = ? ORDER BY chunk_index ASC LIMIT 40",
                                (clean_id, parent_art),
                            ).fetchall()
                    else:
                        rows = conn.execute(
                            "SELECT content FROM chunks WHERE document_id = ? ORDER BY chunk_index ASC LIMIT 120",
                            (clean_id,),
                        ).fetchall()
                    full_text = "\n\n".join(str(r["content"] or "") for r in rows)
                    if not clean_art and int(doc["chunk_count"] or 0) > 120 and FULL_CORPUS_DIR.exists():
                        fn = Path(str(doc["file_name"] or "")).name
                        fp = FULL_CORPUS_DIR / fn if fn else None
                        if fp and fp.is_file():
                            full_text = fp.read_text(encoding="utf-8", errors="ignore")
                    if full_text.strip():
                        return {
                            "documentId": clean_id,
                            "title": str(doc["title"] or f"e-Qanun Sənədi № {clean_id}"),
                            "sourceUrl": str(doc["source_url"] or f"https://www.e-qanun.ai/results/{clean_id}"),
                            "docType": str(doc["doc_type"] or "qanun"),
                            "isRepealed": int(doc["is_repealed"] or 0),
                            "content": full_text,
                        }
            finally:
                conn.close()

        return None

    def find_document_by_title(self, title_query: str, article_number: str | None = None) -> dict[str, Any] | None:
        norm = _NON_ALNUM_RE.sub(" ", normalize_az_search(title_query)).strip()
        if not norm:
            return None
        conn = self._open_ro()
        if conn is None:
            return None

        try:
            row = conn.execute(
                """
                SELECT document_id, title
                FROM documents
                WHERE title_norm LIKE ?
                ORDER BY is_repealed ASC, priority_boost DESC, LENGTH(title_norm) ASC
                LIMIT 1
                """,
                (f"%{norm}%",),
            ).fetchone()

            if not row:
                stop_words = {
                    "azerbaycan", "respublikasinin", "respublikasi", "haqqinda",
                    "qanunu", "qanun", "tesdiq", "edilmesi", "barede", "qerari", "fermani",
                }
                words = norm.split()
                sig = [w for w in words if len(w) >= 3 and w not in stop_words]
                q_tokens = (sig if sig else words)[:6]
                if q_tokens:
                    where_sql = " AND ".join("title_norm LIKE ?" for _ in q_tokens)
                    row = conn.execute(
                        f"""
                        SELECT document_id, title
                        FROM documents
                        WHERE {where_sql}
                        ORDER BY is_repealed ASC, priority_boost DESC, LENGTH(title_norm) ASC
                        LIMIT 1
                        """,
                        [f"%{t}%" for t in q_tokens],
                    ).fetchone()

            if row and row["document_id"]:
                did = str(row["document_id"])
                clean_art = re.sub(r"[^\d.]", "", str(article_number or "")) or None
                doc = self.get_document_by_id(did, clean_art)
                if (not doc or not doc.get("content")) and clean_art:
                    doc = self.get_document_by_id(did)
                return doc
        finally:
            conn.close()
        return None


lexical_engine = EqanunLexicalEngine()
