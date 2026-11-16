import hmac
import os
from contextlib import asynccontextmanager
from typing import Any
from fastapi import Depends, FastAPI, BackgroundTasks, Header, HTTPException
from pydantic import BaseModel
from semantic_engine import semantic_engine
from lexical_engine import lexical_engine


def verify_rag_secret(x_rag_secret: str | None = Header(default=None, alias="x-rag-secret")) -> None:
    expected = (os.environ.get("LEXAZ_RAG_BACKEND_SECRET") or "").strip()
    if expected and not hmac.compare_digest((x_rag_secret or "").strip(), expected):
        raise HTTPException(status_code=401, detail="Invalid RAG backend secret")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    try:
        semantic_engine.ensure_ready()
    except Exception as exc:
        print(f"[backend/api] Semantic engine warmup warning: {exc}")
    yield


app = FastAPI(title="HuquqAI e-Qanun Hybrid Semantic API", lifespan=lifespan)

_legacy_db = None


def get_legacy_db():
    global _legacy_db
    if _legacy_db is None:
        from vector_db import VectorDB

        _legacy_db = VectorDB()
    return _legacy_db


class QueryRequest(BaseModel):
    query: str
    top_k: int = 10


class ScrapeRequest(BaseModel):
    start_id: int
    end_id: int


class SemanticSearchRequest(BaseModel):
    query: str
    top_k: int = 30
    target_doc_ids: list[str] | None = None


class RerankCandidate(BaseModel):
    id: str | int
    chunk_id: int | None = None
    title: str | None = ""
    text: str


class RerankRequest(BaseModel):
    query: str
    candidates: list[RerankCandidate]


class LexicalSearchRequest(BaseModel):
    query: str
    expanded_queries: list[str] = []
    target_framework_ids: list[str] = []
    target_law_confidence: str = "explicit"
    article_numbers: list[str] = []
    priority_articles: list[str] = []
    forbidden_phrases: list[str] = []
    limit: int = 20


class DocSearchRequest(BaseModel):
    query: str
    limit: int = 25


@app.get("/health")
def health():
    return semantic_engine.status()


@app.post("/rag/reload", dependencies=[Depends(verify_rag_secret)])
def reload_embeddings():
    return semantic_engine.ensure_ready(force_reload=True)


@app.post("/rag/semantic", dependencies=[Depends(verify_rag_secret)])
def rag_semantic(request: SemanticSearchRequest):
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Empty query")
    return semantic_engine.semantic_search(
        query=request.query,
        top_k=max(1, min(request.top_k, 80)),
        target_doc_ids=request.target_doc_ids,
    )


@app.post("/rag/rerank", dependencies=[Depends(verify_rag_secret)])
def rag_rerank(request: RerankRequest):
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Empty query")
    cands: list[dict[str, Any]] = [c.model_dump() for c in request.candidates[:120]]
    return semantic_engine.rerank_candidates(query=request.query, candidates=cands)


@app.post("/rag/lexical", dependencies=[Depends(verify_rag_secret)])
def rag_lexical(request: LexicalSearchRequest):
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Empty query")
    return lexical_engine.search_lexical(
        query=request.query,
        expanded_queries=request.expanded_queries,
        target_framework_ids=request.target_framework_ids,
        target_law_confidence=request.target_law_confidence,
        article_numbers=request.article_numbers,
        priority_articles=request.priority_articles,
        forbidden_phrases=request.forbidden_phrases,
        limit=request.limit,
    )


@app.post("/rag/doc-search", dependencies=[Depends(verify_rag_secret)])
def rag_doc_search(request: DocSearchRequest):
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Empty query")
    return lexical_engine.search_documents(
        query=request.query,
        limit=request.limit,
    )


@app.get("/rag/document-by-title", dependencies=[Depends(verify_rag_secret)])
def rag_document_by_title(title: str, article_number: str | None = None):
    doc = lexical_engine.find_document_by_title(title, article_number)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@app.get("/rag/document/{doc_id}", dependencies=[Depends(verify_rag_secret)])
def rag_document(doc_id: str, article_number: str | None = None):
    doc = lexical_engine.get_document_by_id(doc_id, article_number)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@app.post("/query")
def query_documents(request: QueryRequest):
    try:
        db = get_legacy_db()
        results = db.query(request.query, request.top_k)
        return {"status": "success", "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/scrape")
async def trigger_scrape(request: ScrapeRequest, background_tasks: BackgroundTasks):
    from scraper import EqanunScraper

    db = get_legacy_db()
    scraper = EqanunScraper(db)
    background_tasks.add_task(scraper.scrape_range, request.start_id, request.end_id)
    return {"status": "success", "message": f"Scraping started in background for range {request.start_id}-{request.end_id}"}


@app.get("/stats")
def get_stats():
    st = semantic_engine.status()
    return {
        "status": "success",
        **st,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=False)
