"""
Hybrid Dense Semantic Engine modeled on e-qanun.ai's multi-stage retrieval architecture:
- Uses cached local SBERT (`paraphrase-multilingual-MiniLM-L12-v2`) on Apple Silicon MPS / CPU.
- Keeps precomputed statutory embeddings (`eqanun_embeddings.sqlite`) in RAM for sub-20ms dot-product search.
- Supports live on-demand semantic reranking of ANY chunk across all 56,983 documents in `eqanun_full.sqlite`.
"""

from __future__ import annotations

import os
import sqlite3
import threading
import time
from typing import Any

import numpy as np
import torch
from sentence_transformers import SentenceTransformer

from lexical_engine import CORPUS_DB_PATH, clean_article_heading, resolve_data_file

EMB_DB_PATH = resolve_data_file("EQANUN_EMB_SQLITE_PATH", "eqanun_embeddings.sqlite")
MODEL_NAME = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"


class EqanunSemanticEngine:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.device = "mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu")
        self.model: SentenceTransformer | None = None
        self.chunk_ids: np.ndarray = np.empty(0, dtype=np.int64)
        self.chunk_id_to_row: dict[int, int] = {}
        self.doc_ids: list[str] = []
        self.vectors: np.ndarray | None = None
        self._loaded_emb_count: int = 0
        self._loaded_emb_mtime: float = 0.0

    def _ensure_model(self) -> SentenceTransformer:
        if self.model is not None:
            return self.model
        with self._lock:
            if self.model is None:
                try:
                    self.model = SentenceTransformer(MODEL_NAME, device=self.device, local_files_only=True)
                except Exception:
                    self.model = SentenceTransformer(MODEL_NAME, device=self.device, local_files_only=False)
        return self.model

    def _maybe_reload_embeddings(self, force: bool = False) -> None:
        if not EMB_DB_PATH.exists() or not CORPUS_DB_PATH.exists():
            return
        try:
            mtime = EMB_DB_PATH.stat().st_mtime
        except OSError:
            return
        if not force and self.vectors is not None and mtime == self._loaded_emb_mtime:
            return

        with self._lock:
            if not force and self.vectors is not None and mtime == self._loaded_emb_mtime:
                return
            emb_conn = sqlite3.connect(f"file:{EMB_DB_PATH}?mode=ro", uri=True)
            corpus_conn = sqlite3.connect(f"file:{CORPUS_DB_PATH}?mode=ro", uri=True)
            try:
                rows = emb_conn.execute("SELECT chunk_id, embedding FROM chunk_embeddings ORDER BY chunk_id ASC").fetchall()
                if not rows:
                    self._loaded_emb_mtime = mtime
                    return

                valid_ids = [int(r[0]) for r in rows]
                doc_map: dict[int, str] = {}
                for i in range(0, len(valid_ids), 900):
                    batch = valid_ids[i : i + 900]
                    ph = ",".join("?" for _ in batch)
                    for cid, did in corpus_conn.execute(
                        f"SELECT c.id, c.document_id FROM chunks c JOIN documents d ON d.document_id = c.document_id WHERE c.id IN ({ph}) AND d.is_repealed = 0",
                        batch,
                    ):
                        doc_map[int(cid)] = str(did)

                kept_ids: list[int] = []
                kept_docs: list[str] = []
                kept_vecs: list[np.ndarray] = []
                for cid, blob in rows:
                    ic = int(cid)
                    did = doc_map.get(ic)
                    if not did or not blob:
                        continue
                    v = np.frombuffer(blob, dtype=np.float32)
                    if v.shape[0] != 384:
                        continue
                    norm = float(np.linalg.norm(v))
                    if norm > 0:
                        kept_ids.append(ic)
                        kept_docs.append(did)
                        kept_vecs.append(v / norm)

                if kept_vecs:
                    mat = np.vstack(kept_vecs).astype(np.float32, copy=False)
                    self.chunk_ids = np.asarray(kept_ids, dtype=np.int64)
                    self.chunk_id_to_row = {int(cid): idx for idx, cid in enumerate(kept_ids)}
                    self.doc_ids = kept_docs
                    self.vectors = mat
                    self._loaded_emb_count = len(kept_ids)
                self._loaded_emb_mtime = mtime
            finally:
                emb_conn.close()
                corpus_conn.close()

    def ensure_ready(self, force_reload: bool = False) -> dict[str, Any]:
        self._ensure_model()
        self._maybe_reload_embeddings(force=force_reload)
        return self.status()

    def status(self) -> dict[str, Any]:
        corpus_docs = 0
        corpus_chunks = 0
        if CORPUS_DB_PATH.exists():
            try:
                conn = sqlite3.connect(f"file:{CORPUS_DB_PATH}?mode=ro", uri=True)
                corpus_docs = int(conn.execute("SELECT COUNT(*) FROM documents").fetchone()[0])
                corpus_chunks = int(conn.execute("SELECT COUNT(*) FROM chunks").fetchone()[0])
                conn.close()
            except Exception:
                pass
        return {
            "ok": self.model is not None,
            "model": MODEL_NAME,
            "device": self.device,
            "vectors_loaded": int(self._loaded_emb_count),
            "corpus_docs": corpus_docs,
            "corpus_chunks": corpus_chunks,
        }

    def encode(self, texts: list[str]) -> np.ndarray:
        if not texts:
            return np.empty((0, 384), dtype=np.float32)
        model = self._ensure_model()
        vecs = model.encode(texts, batch_size=64, normalize_embeddings=True, show_progress_bar=False)
        return np.asarray(vecs, dtype=np.float32)

    def semantic_search(
        self,
        query: str,
        top_k: int = 30,
        target_doc_ids: list[str] | None = None,
    ) -> dict[str, Any]:
        t0 = time.perf_counter()
        self._maybe_reload_embeddings()
        if self.vectors is None or self.chunk_ids.size == 0:
            return {"results": [], "latency_ms": round((time.perf_counter() - t0) * 1000, 1)}

        q_vec = self.encode([query])[0]
        sims = self.vectors @ q_vec

        target_set = set(str(d) for d in (target_doc_ids or []) if d)
        boosted = sims.copy()
        if target_set:
            for idx, did in enumerate(self.doc_ids):
                if did in target_set:
                    boosted[idx] += 0.10

        pool_k = min(max(top_k * 3, 60), int(boosted.shape[0]))
        top_pos = np.argpartition(-boosted, pool_k - 1)[:pool_k]
        top_pos = top_pos[np.argsort(-boosted[top_pos])]

        sel_cids = [int(self.chunk_ids[p]) for p in top_pos]
        sim_by_cid = {int(self.chunk_ids[p]): float(sims[p]) for p in top_pos}

        conn = sqlite3.connect(f"file:{CORPUS_DB_PATH}?mode=ro", uri=True)
        conn.row_factory = sqlite3.Row
        try:
            ph = ",".join("?" for _ in sel_cids)
            rows = conn.execute(
                f"""
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
                WHERE c.id IN ({ph}) AND d.is_repealed = 0
                """,
                sel_cids,
            ).fetchall()
        finally:
            conn.close()

        row_map = {int(r["chunk_id"]): dict(r) for r in rows}
        results = []
        seen_art: set[str] = set()
        for cid in sel_cids:
            row = row_map.get(cid)
            if not row:
                continue
            art_key = f"{row['document_id']}::{row['article_number'] or cid}"
            if art_key in seen_art:
                continue
            seen_art.add(art_key)
            row["semantic_score"] = round(sim_by_cid[cid], 4)
            results.append(row)
            if len(results) >= top_k:
                break

        return {
            "results": results,
            "latency_ms": round((time.perf_counter() - t0) * 1000, 1),
        }

    def rerank_candidates(
        self,
        query: str,
        candidates: list[dict[str, Any]],
    ) -> dict[str, Any]:
        t0 = time.perf_counter()
        self._maybe_reload_embeddings()
        if not candidates:
            return {"scores": [], "latency_ms": 0.0}

        q_vec = self.encode([query])[0]
        scores_by_idx: dict[int, float] = {}
        uncached_indices: list[int] = []
        uncached_texts: list[str] = []

        for idx, cand in enumerate(candidates):
            cid_raw = cand.get("chunk_id")
            if cid_raw is not None:
                try:
                    cid = int(cid_raw)
                    vec_row = self.chunk_id_to_row.get(cid)
                    if vec_row is not None and self.vectors is not None:
                        scores_by_idx[idx] = float(self.vectors[vec_row] @ q_vec)
                        continue
                except (ValueError, TypeError):
                    pass

            title = clean_article_heading(str(cand.get("title") or ""))
            text = str(cand.get("text") or "")
            combined = f"{title}\n{text}"[:1100]
            uncached_indices.append(idx)
            uncached_texts.append(combined)

        if uncached_texts:
            c_vecs = self.encode(uncached_texts)
            c_sims = c_vecs @ q_vec
            for pos, orig_idx in enumerate(uncached_indices):
                scores_by_idx[orig_idx] = float(c_sims[pos])

        out = [
            {"id": candidates[i].get("id"), "semantic_score": round(scores_by_idx.get(i, 0.0), 4)}
            for i in range(len(candidates))
        ]
        return {
            "scores": out,
            "latency_ms": round((time.perf_counter() - t0) * 1000, 1),
        }


semantic_engine = EqanunSemanticEngine()
