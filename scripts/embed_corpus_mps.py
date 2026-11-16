#!/usr/bin/env python3
"""
Computes normalized 384-dim multilingual embeddings using Apple Silicon MPS (or CPU)
from data/eqanun_full.sqlite into data/eqanun_embeddings.sqlite for pgvector sync.

Run with:
  ./backend/venv/bin/python scripts/embed_corpus_mps.py --codes-only
  ./backend/venv/bin/python scripts/embed_corpus_mps.py --batch-size 256
"""

import argparse
import re
import sqlite3
import sys
import time
from pathlib import Path

import numpy as np
import torch
from sentence_transformers import SentenceTransformer

ROOT_DIR = Path(__file__).resolve().parent.parent
DB_PATH = ROOT_DIR / "data" / "eqanun_full.sqlite"
EMB_DB_PATH = ROOT_DIR / "data" / "eqanun_embeddings.sqlite"
MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"

PRIORITY_CODES = (
    "897", "46940", "46941", "46942", "46943", "46944", "46945", "46946",
    "46947", "46948", "46950", "46951", "46952", "46953", "46955", "46956",
    "46957", "46958", "46959", "46960", "3423", "9479", "3933", "18343",
    "2937", "257",
)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--codes-only", action="store_true", help="Only embed primary codes & key laws")
    parser.add_argument(
        "--statutory",
        action="store_true",
        help="Embed all active Konstitusiya, Kodeks, Qanun, Ferman, and Serencam chunks",
    )
    parser.add_argument("--batch-size", type=int, default=256)
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()

    if not DB_PATH.exists():
        print(f"ERROR: {DB_PATH} not found. Run build_full_rag_index.py first.", file=sys.stderr)
        sys.exit(1)

    device = "mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Loading {MODEL_NAME} on device={device} ...", flush=True)
    model = SentenceTransformer(MODEL_NAME, device=device, local_files_only=True)

    src = sqlite3.connect(str(DB_PATH))
    dst = sqlite3.connect(str(EMB_DB_PATH))
    dst.execute("""
        CREATE TABLE IF NOT EXISTS chunk_embeddings (
            chunk_id INTEGER PRIMARY KEY,
            embedding BLOB NOT NULL
        );
    """)
    dst.commit()

    already = {r[0] for r in dst.execute("SELECT chunk_id FROM chunk_embeddings")}

    sql = """
        SELECT c.id, d.title, c.article_number, c.article_title, c.content
        FROM chunks c
        JOIN documents d ON d.document_id = c.document_id
    """
    params = []
    if args.codes_only:
        placeholders = ",".join("?" for _ in PRIORITY_CODES)
        sql += f" WHERE c.document_id IN ({placeholders})"
        params.extend(PRIORITY_CODES)
    elif args.statutory:
        sql += " WHERE d.is_repealed = 0 AND d.doc_type IN ('konstitusiya', 'kodeks', 'qanun', 'ferman', 'serencam')"
    else:
        sql += " WHERE d.is_repealed = 0"
    sql += " ORDER BY d.priority_boost DESC, c.id ASC"
    if args.limit > 0:
        sql += f" LIMIT {args.limit}"

    rows = [r for r in src.execute(sql, params) if r[0] not in already]
    total = len(rows)
    print(f"Chunks to embed: {total} (already cached: {len(already)})", flush=True)
    if total == 0:
        return

    clause_leak_re = re.compile(r"\s+\d+(?:-\d+)*(?:\.\d+)+\.?\s+.*$")
    kmq_re = re.compile(r"(?:\bKMQ\d+\b|={2,}|\[\d+\])")

    def clean_heading(h: str) -> str:
        s = kmq_re.sub("", h or "")
        s = clause_leak_re.sub("", s)
        return " ".join(s.split())[:180]

    t0 = time.time()
    done = 0
    for i in range(0, total, args.batch_size):
        batch = rows[i : i + args.batch_size]
        texts = [
            f"{r[1]} | Maddə {r[2]} {clean_heading(r[3])}\n{r[4]}"[:1400]
            for r in batch
        ]
        vecs = model.encode(texts, batch_size=args.batch_size, normalize_embeddings=True, show_progress_bar=False)
        vecs_f32 = np.asarray(vecs, dtype=np.float32)

        dst.executemany(
            "INSERT OR REPLACE INTO chunk_embeddings (chunk_id, embedding) VALUES (?, ?)",
            [(batch[k][0], vecs_f32[k].tobytes()) for k in range(len(batch))],
        )
        dst.commit()
        done += len(batch)
        if done % 2048 == 0 or done == total:
            rate = done / max(0.1, time.time() - t0)
            print(f"  [{done}/{total}] rate={rate:.0f} chunks/s elapsed={time.time()-t0:.1f}s", flush=True)

    src.close()
    dst.close()
    print(f"DONE! Embedded {done} chunks into {EMB_DB_PATH} in {time.time()-t0:.1f}s", flush=True)


if __name__ == "__main__":
    main()
