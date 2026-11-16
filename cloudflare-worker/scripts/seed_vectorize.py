#!/usr/bin/env python3
"""
Embeds top 4,880 substantive statutory articles using Cloudflare Workers AI (`@cf/baai/bge-m3`, 1024d)
and upserts them into Vectorize Free (`huquqai-legal-v1`, <= 5,000,000 stored dimensions).
"""

from __future__ import annotations

import json
import os
import sqlite3
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

WORKER_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = WORKER_DIR.parent
PUBLIC_DIR = WORKER_DIR / "public"
sys.path.insert(0, str(ROOT_DIR / "backend"))

from lexical_engine import CORPUS_DB_PATH, DOC_ID_TO_LAW_ID, clean_article_heading  # noqa: E402

INDEX_NAME = "huquqai-legal-v1"
MODEL_ID = "@cf/baai/bge-m3"
MAX_VECTORS = 4880  # 4880 * 1024 = 4,997,120 <= 5,000,000 Vectorize Free dim limit
EMBED_BATCH = 50
UPSERT_BATCH = 500

# Highest-usage Codes & Core Laws first so key operational statutes fit inside Vectorize Free cap
PRIORITY_CORE_ORDER = [
    "46960",  # İnzibati Xətalar Məcəlləsi
    "46943",  # Əmək Məcəlləsi
    "46946",  # Ailə Məcəlləsi
    "46947",  # Cinayət Məcəlləsi
    "46944",  # Mülki Məcəllə
    "897",    # Konstitusiya
    "46948",  # Vergi Məcəlləsi
    "46945",  # Mülki Prosessual Məcəllə
    "46950",  # Cinayət-Prosessual Məcəllə
    "46955",  # Mənzil Məcəlləsi
    "3423",   # Yol hərəkəti haqqında
    "46956",  # İnzibati Prosessual Məcəllə
    "9479",   # İstehlakçıların hüquqları
    "107",    # Notariat haqqında
    "5825",   # Banklar haqqında
    "257",    # Vəkillər və vəkillik fəaliyyəti
    "3933",   # Məhkəmələr və hakimlər
    "18343",  # Təhsil haqqında
    "46959",  # Miqrasiya Məcəlləsi
    "46957",  # Gömrük Məcəlləsi
    "2937",   # Polis haqqında
    "46942",  # Torpaq Məcəlləsi
    "46953",  # Seçki Məcəlləsi
    "46958",  # Şəhərsalma və Tikinti Məcəlləsi
    "46951",  # Cəzaların İcrası Məcəlləsi
    "46940",  # Su Məcəlləsi
    "46941",  # Meşə Məcəlləsi
    "46952",  # Ticarət Gəmiçiliyi Məcəlləsi
]


def load_env() -> tuple[str, str]:
    env_file = Path.home() / ".env"
    if env_file.exists():
        for raw in env_file.read_text(encoding="utf-8").splitlines():
            raw = raw.strip()
            if not raw or raw.startswith("#") or "=" not in raw:
                continue
            k, v = raw.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())
    return os.environ["CLOUDFLARE_ACCOUNT_ID"], os.environ["CLOUDFLARE_API_TOKEN"]


def cf_request(url: str, tok: str, data: bytes, content_type: str = "application/json") -> dict:
    for attempt in range(6):
        req = urllib.request.Request(
            url,
            data=data,
            headers={"Authorization": f"Bearer {tok}", "Content-Type": content_type},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="ignore")
            if e.code in (429, 500, 502, 503, 504) and attempt < 5:
                time.sleep(2.0 * (attempt + 1))
                continue
            raise RuntimeError(f"Cloudflare API HTTP {e.code} on {url}: {err_body[:300]}")
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            if attempt < 5:
                time.sleep(2.0 * (attempt + 1))
                continue
            raise
    raise RuntimeError(f"Failed request: {url}")


def main() -> None:
    aid, tok = load_env()
    conn = sqlite3.connect(f"file:{CORPUS_DB_PATH}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row

    # Load `m/` and `am/` bucket_ids produced by `build_static_rag.py`
    meta_by_doc: dict[str, dict] = {}
    for p in (PUBLIC_DIR / "m").glob("*.json"):
        meta_by_doc.update(json.loads(p.read_text(encoding="utf-8")))

    am_cache: dict[str, dict] = {}
    for did in DOC_ID_TO_LAW_ID:
        ap = PUBLIC_DIR / "am" / f"{did}.json"
        if ap.exists():
            am_cache[did] = json.loads(ap.read_text(encoding="utf-8"))

    # Also prioritize major high-traffic specialized laws (Pensiya, İcra, Dövlət rüsumu, Tütün, Əmək pensiyaları, İpoteka)
    extra_docs = [
        str(r[0])
        for r in conn.execute(
            """
            SELECT document_id FROM documents
            WHERE is_repealed = 0 AND doc_type IN ('qanun', 'kodeks', 'konstitusiya')
              AND article_count >= 10
              AND title_norm NOT LIKE '%deyisiklik%'
            ORDER BY priority_boost DESC, article_count DESC
            LIMIT 60
            """
        ).fetchall()
    ]
    ordered_docs = list(dict.fromkeys([*PRIORITY_CORE_ORDER, *extra_docs]))

    candidates: list[dict] = []
    seen_art: set[str] = set()

    for did in ordered_docs:
        if len(candidates) >= MAX_VECTORS:
            break
        dmeta = meta_by_doc.get(did)
        if not dmeta or int(dmeta.get("r", 0)) != 0:
            continue

        rows = conn.execute(
            """
            SELECT id, chunk_index, article_number, article_title, content
            FROM chunks
            WHERE document_id = ?
            ORDER BY chunk_index ASC
            """,
            (did,),
        ).fetchall()

        # Merge text per article to embed rich operative meaning inside single vector
        art_map: dict[str, dict] = {}
        for r in rows:
            art = str(r["article_number"] or "").strip()
            if not art:
                continue
            key = f"{did}::{art}"
            at = clean_article_heading(str(r["article_title"] or ""))
            txt = str(r["content"] or "")
            if key not in art_map:
                art_map[key] = {
                    "chunk_id": int(r["id"]),
                    "chunk_index": int(r["chunk_index"]),
                    "doc_id": did,
                    "art_num": art,
                    "art_title": at,
                    "parts": [txt],
                }
            else:
                if not art_map[key]["art_title"] and at:
                    art_map[key]["art_title"] = at
                art_map[key]["parts"].append(txt)

        doc_am = am_cache.get(did)
        for key, item in art_map.items():
            if key in seen_art:
                continue
            merged = " ".join(" ".join(item["parts"]).split())
            lower_m = merged.lower()
            # Skip repealed placeholder articles ("Çıxarılıb" / ultra-short stubs)
            if len(merged) < 95 or ("çıxarılıb" in lower_m and len(merged) < 180):
                continue
            seen_art.add(key)

            bid = dmeta["bs"][0] if dmeta.get("bs") else 0
            if doc_am and item["art_num"] in doc_am:
                bid = int(doc_am[item["art_num"]][0])

            embed_input = f"{dmeta['t']} — Maddə {item['art_num']} ({item['art_title']})\n{merged}"[:1400]
            candidates.append(
                {
                    "id": f"v_{did}_{item['art_num']}",
                    "text": embed_input,
                    "metadata": {
                        "chunk_id": item["chunk_id"],
                        "document_id": did,
                        "chunk_index": item["chunk_index"],
                        "article_number": item["art_num"],
                        "article_title": item["art_title"][:160],
                        "title": dmeta["t"][:160],
                        "source_url": dmeta["u"],
                        "doc_type": dmeta["dt"],
                        "priority_boost": dmeta["pb"],
                        "bucket_id": bid,
                        "snippet": merged[:350],
                    },
                }
            )
            if len(candidates) >= MAX_VECTORS:
                break

    conn.close()
    print(f"Selected {len(candidates)} core articles ({len(candidates)*1024:,} dims <= 5,000,000 Vectorize Free cap)")

    ai_url = f"https://api.cloudflare.com/client/v4/accounts/{aid}/ai/run/{MODEL_ID}"
    upsert_url = f"https://api.cloudflare.com/client/v4/accounts/{aid}/vectorize/v2/indexes/{INDEX_NAME}/upsert"

    t0 = time.perf_counter()
    ndjson_buf: list[str] = []
    start_idx = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    uploaded = start_idx

    for i in range(start_idx, len(candidates), EMBED_BATCH):
        batch = candidates[i : i + EMBED_BATCH]
        res = cf_request(ai_url, tok, json.dumps({"text": [b["text"] for b in batch]}).encode("utf-8"))
        vecs = res.get("result", {}).get("data", [])
        if len(vecs) != len(batch):
            raise RuntimeError(f"Mismatch embedding count: {len(vecs)} != {len(batch)}")

        for item, vec in zip(batch, vecs):
            ndjson_buf.append(
                json.dumps(
                    {
                        "id": item["id"][:64],
                        "values": vec,
                        "metadata": item["metadata"],
                    },
                    ensure_ascii=False,
                    separators=(",", ":"),
                )
            )

        if len(ndjson_buf) >= UPSERT_BATCH or i + EMBED_BATCH >= len(candidates):
            payload = ("\n".join(ndjson_buf) + "\n").encode("utf-8")
            cf_request(upsert_url, tok, payload, content_type="application/x-ndjson")
            uploaded += len(ndjson_buf)
            ndjson_buf.clear()
            print(f"Upserted {uploaded}/{len(candidates)} vectors ({time.perf_counter()-t0:.1f}s)")

    print(f"Completed Vectorize seeding: {uploaded} vectors in {time.perf_counter()-t0:.1f}s")


if __name__ == "__main__":
    main()
