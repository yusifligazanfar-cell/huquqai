#!/usr/bin/env python3
"""
Builds static JSON shards (`public/c/`, `public/m/`, `public/am/`, `public/i/`, `public/t/`)
from `data/eqanun_full.sqlite` so all 56,983 e-Qanun documents run 100% serverless inside
Cloudflare Workers Free Static Assets (< 20,000 files, < 100 KB per shard, < 5 ms CPU per request).
"""

from __future__ import annotations

import json
import math
import re
import shutil
import sqlite3
import sys
import time
from collections import defaultdict
from pathlib import Path

WORKER_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = WORKER_DIR.parent
sys.path.insert(0, str(ROOT_DIR / "backend"))

from lexical_engine import (  # noqa: E402
    AZ_STOP_WORDS,
    CORPUS_DB_PATH,
    DOC_ID_TO_LAW_ID,
    clean_article_heading,
    normalize_az_search,
    stem_az_token,
)

PUBLIC_DIR = WORKER_DIR / "public"
NON_ALNUM_RE = re.compile(r"[^a-z0-9]+")
SUBCLAUSE_RE = re.compile(r"(?:^|\n)\s*(\d+(?:-\d+)?\.\d+(?:-\d+)?)\.?\s+")
WS_SPACES_RE = re.compile(r"[ \t]+")
WS_NL_RE = re.compile(r"\n{3,}")

MAX_CONTENT_BUCKET_BYTES = 92_000
MAX_POSTINGS_PER_STEM = 220
CORE_DOC_IDS = set(DOC_ID_TO_LAW_ID.keys())

INDEX_BUCKETS = 2048
TITLE_BUCKETS = 512
META_BUCKETS = 256


def fnv1a_32(text: str) -> int:
    h = 2166136261
    for ch in text:
        h ^= ord(ch)
        h = (h * 16777619) & 0xFFFFFFFF
    return h


def compact_text(text: str) -> str:
    s = WS_SPACES_RE.sub(" ", text or "")
    s = WS_NL_RE.sub("\n\n", s)
    return s.strip()


def extract_stems(text: str) -> dict[str, int]:
    norm = NON_ALNUM_RE.sub(" ", normalize_az_search(text)).strip()
    if not norm:
        return {}
    counts: dict[str, int] = {}
    for tok in norm.split():
        if tok.isdigit() or len(tok) < 3 or tok in AZ_STOP_WORDS:
            continue
        st = stem_az_token(tok)
        if len(st) >= 3:
            counts[st] = counts.get(st, 0) + 1
    return counts


def main() -> None:
    t0 = time.perf_counter()
    if not CORPUS_DB_PATH.exists():
        raise FileNotFoundError(f"SQLite corpus not found: {CORPUS_DB_PATH}")

    if PUBLIC_DIR.exists():
        shutil.rmtree(PUBLIC_DIR)
    for sub in ("c", "m", "am", "i", "t"):
        (PUBLIC_DIR / sub).mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(f"file:{CORPUS_DB_PATH}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row

    # 1. Load document metadata
    docs: dict[str, dict] = {}
    title_postings: dict[str, list] = defaultdict(list)

    for r in conn.execute(
        "SELECT document_id, title, title_norm, source_url, doc_type, is_repealed, priority_boost, article_count, char_length FROM documents"
    ):
        did = str(r["document_id"])
        title = str(r["title"] or "")
        t_norm = str(r["title_norm"] or normalize_az_search(title))
        doc_type = str(r["doc_type"] or "qanun")
        is_rep = int(r["is_repealed"] or 0)
        pb = float(r["priority_boost"] or 0.0)
        ac = int(r["article_count"] or 0)
        cl = int(r["char_length"] or 0)
        src = str(r["source_url"] or f"https://www.e-qanun.ai/results/{did}")

        docs[did] = {
            "t": title,
            "tn": t_norm,
            "dt": doc_type,
            "r": is_rep,
            "pb": round(pb, 2),
            "u": src,
            "ac": ac,
            "cl": cl,
            "bs": [],
        }

        if is_rep == 0:
            t_stems = extract_stems(t_norm)
            is_amend = 1 if ("deyisiklik" in t_norm or "elave edilm" in t_norm) else 0
            t_score = round(pb + (40.0 if len(t_norm) <= 65 and doc_type in ("qanun", "kodeks", "konstitusiya") else 0.0) - is_amend * 90.0, 1)
            for st in t_stems:
                title_postings[st].append([did, t_score, is_amend])

    # 2. Stream active chunks grouped cleanly into merged articles & continuation parts
    content_buckets: list[dict[str, dict]] = []
    cur_bucket: dict[str, dict] = {}
    cur_bytes = 2
    bucket_idx = 0

    def flush_bucket() -> int:
        nonlocal cur_bucket, cur_bytes, bucket_idx
        if cur_bucket:
            out_path = PUBLIC_DIR / "c" / f"{bucket_idx}.json"
            out_path.write_text(json.dumps(cur_bucket, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
            content_buckets.append({})
            used_id = bucket_idx
            bucket_idx += 1
            cur_bucket = {}
            cur_bytes = 2
            return used_id
        return bucket_idx

    def add_content_entry(key: str, val: dict) -> int:
        nonlocal cur_bytes
        serialized = json.dumps({key: val}, ensure_ascii=False, separators=(",", ":"))
        sz = len(serialized.encode("utf-8"))
        if cur_bucket and cur_bytes + sz > MAX_CONTENT_BUCKET_BYTES:
            flush_bucket()
        cur_bucket[key] = val
        cur_bytes += sz
        return bucket_idx

    stem_postings: dict[str, list] = defaultdict(list)
    art_maps: dict[str, dict[str, list]] = defaultdict(dict)

    # Accumulate chunks per (document_id, article_number)
    cur_doc = None
    cur_art = None
    cur_at = ""
    cur_parts: list[str] = []

    def emit_article() -> None:
        if cur_doc is None or cur_doc not in docs:
            return
        dmeta = docs[cur_doc]
        full_txt = compact_text("\n".join(p for p in cur_parts if p))
        if not full_txt:
            return

        # Keep first <= 4200 chars in primary article entry; overflow chunks split cleanly for full doc read
        primary_txt = full_txt[:14000]
        art_key = f"{cur_doc}::{cur_art or '0'}"
        primary_bid = add_content_entry(
            art_key,
            {"d": cur_doc, "a": cur_art or "", "at": cur_at, "txt": primary_txt},
        )
        if primary_bid not in dmeta["bs"]:
            dmeta["bs"].append(primary_bid)

        pos = 14000
        part_num = 2
        while pos < len(full_txt):
            slice_txt = full_txt[pos : pos + 28000]
            p_key = f"{art_key}#{part_num}"
            p_bid = add_content_entry(
                p_key,
                {"d": cur_doc, "a": cur_art or "", "at": cur_at, "txt": slice_txt},
            )
            if p_bid not in dmeta["bs"]:
                dmeta["bs"].append(p_bid)
            pos += 28000
            part_num += 1

        # Record O(1) article map for multi-article documents
        if dmeta["ac"] >= 2 and cur_art:
            art_maps[cur_doc][cur_art] = [primary_bid, cur_at]
            for m in SUBCLAUSE_RE.finditer(full_txt[:20000]):
                sub = m.group(1)
                if sub and sub not in art_maps[cur_doc]:
                    art_maps[cur_doc][sub] = [primary_bid, cur_at, cur_art]

        # Build inverted index postings for this article
        t_norm = dmeta["tn"]
        at_norm = normalize_az_search(cur_at)
        body_norm = normalize_az_search(full_txt[:16000])

        t_stems = set(extract_stems(t_norm).keys())
        at_stems = set(extract_stems(at_norm).keys())
        body_counts = extract_stems(body_norm)

        is_amend = 1 if ("deyisiklik" in t_norm or "elave edilm" in t_norm or "elaveler edilm" in t_norm) else 0
        is_impl = 1 if ("tetbiq edilm" in t_norm or "tetbiqi " in t_norm) else 0
        is_treaty = 1 if dmeta["dt"] == "beynelxalq" else 0
        is_core = 1 if cur_doc in CORE_DOC_IDS else 0

        len_damp = max(1.0, len(full_txt) / 1800.0) ** 0.30
        all_stems = set(body_counts.keys()) | at_stems
        for st in all_stems:
            tf = body_counts.get(st, 0)
            in_t = 1 if st in t_stems else 0
            in_at = 1 if st in at_stems else 0
            if tf == 0 and not in_at:
                continue
            raw_s = (
                min(190.0, math.log1p(tf) * 34.0)
                + dmeta["pb"] * 1.15
                + in_at * 95.0
                + in_t * 36.0
                + (12.0 if tf >= 2 else 0.0)
            )
            if is_amend and not is_core:
                raw_s -= 115.0
            if is_impl and not is_core:
                raw_s -= 55.0
            if is_treaty and not is_core:
                raw_s -= 95.0
            adj_s = round(raw_s / len_damp, 1)
            flags = (
                (in_t * 1)
                | (in_at * 2)
                | (is_amend * 4)
                | (is_impl * 8)
                | (is_treaty * 16)
                | (is_core * 32)
            )
            stem_postings[st].append((is_core, adj_s, cur_doc, cur_art or "", primary_bid, flags))

    rows = conn.execute(
        """
        SELECT c.document_id, c.article_number, c.article_title, c.content
        FROM chunks c
        JOIN documents d ON d.document_id = c.document_id
        WHERE d.is_repealed = 0
        ORDER BY c.document_id, c.chunk_index ASC
        """
    )
    for r in rows:
        did = str(r["document_id"])
        art = str(r["article_number"] or "").strip()
        at = clean_article_heading(str(r["article_title"] or ""))
        txt = str(r["content"] or "")
        if did != cur_doc or art != cur_art:
            emit_article()
            cur_doc = did
            cur_art = art
            cur_at = at
            cur_parts = [txt]
        else:
            if not cur_at and at:
                cur_at = at
            cur_parts.append(txt)
    emit_article()
    flush_bucket()

    # 3. Write doc metadata shards (`m/`)
    meta_sharded: list[dict[str, dict]] = [{} for _ in range(META_BUCKETS)]
    for did, meta in docs.items():
        b = int(did) % META_BUCKETS if did.isdigit() else fnv1a_32(did) % META_BUCKETS
        meta_sharded[b][did] = {
            "t": meta["t"],
            "dt": meta["dt"],
            "r": meta["r"],
            "pb": meta["pb"],
            "u": meta["u"],
            "bs": meta["bs"],
        }
    for idx_m, shard in enumerate(meta_sharded):
        (PUBLIC_DIR / "m" / f"{idx_m}.json").write_text(
            json.dumps(shard, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
        )

    # 4. Write multi-article maps (`am/`)
    for did, amap in art_maps.items():
        (PUBLIC_DIR / "am" / f"{did}.json").write_text(
            json.dumps(amap, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
        )

    # 5. Write stem inverted index shards (`i/`)
    idx_sharded: list[dict[str, list]] = [{} for _ in range(INDEX_BUCKETS)]
    for st, plist in stem_postings.items():
        core_hits = [p for p in plist if p[0] == 1]
        other_hits = [p for p in plist if p[0] == 0]
        core_hits.sort(key=lambda x: x[1], reverse=True)
        other_hits.sort(key=lambda x: x[1], reverse=True)
        kept = core_hits[:60] + other_hits[: max(40, MAX_POSTINGS_PER_STEM - min(60, len(core_hits)))]
        kept.sort(key=lambda x: x[1], reverse=True)
        compact = [[p[2], p[3], p[4], round(p[1]), p[5]] for p in kept[:MAX_POSTINGS_PER_STEM]]
        b = fnv1a_32(st) % INDEX_BUCKETS
        idx_sharded[b][st] = compact
    for idx_b, shard in enumerate(idx_sharded):
        (PUBLIC_DIR / "i" / f"{idx_b}.json").write_text(
            json.dumps(shard, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
        )

    # 6. Write title inverted index shards (`t/`)
    title_sharded: list[dict[str, list]] = [{} for _ in range(TITLE_BUCKETS)]
    for st, tlist in title_postings.items():
        tlist.sort(key=lambda x: x[1], reverse=True)
        b = fnv1a_32(st) % TITLE_BUCKETS
        title_sharded[b][st] = tlist[:140]
    for idx_t, shard in enumerate(title_sharded):
        (PUBLIC_DIR / "t" / f"{idx_t}.json").write_text(
            json.dumps(shard, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
        )

    conn.close()
    total_files = sum(1 for p in PUBLIC_DIR.rglob("*.json"))
    total_bytes = sum(p.stat().st_size for p in PUBLIC_DIR.rglob("*.json"))
    max_file = max((p.stat().st_size for p in PUBLIC_DIR.rglob("*.json")), default=0)
    print(
        f"Built Cloudflare static RAG bundle in {time.perf_counter()-t0:.1f}s: "
        f"files={total_files}, total_mb={total_bytes/1e6:.1f}MB, "
        f"c_buckets={bucket_idx}, am_files={len(art_maps)}, max_file_kb={max_file/1024:.1f}KB"
    )


if __name__ == "__main__":
    main()
