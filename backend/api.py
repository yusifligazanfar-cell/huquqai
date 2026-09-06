from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
from vector_db import VectorDB
from scraper import EqanunScraper
import asyncio

app = FastAPI(title="LexAZ Vector API")
db = VectorDB()

class QueryRequest(BaseModel):
    query: str
    top_k: int = 10

class ScrapeRequest(BaseModel):
    start_id: int
    end_id: int

@app.post("/query")
def query_documents(request: QueryRequest):
    try:
        results = db.query(request.query, request.top_k)
        return {"status": "success", "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/scrape")
async def trigger_scrape(request: ScrapeRequest, background_tasks: BackgroundTasks):
    scraper = EqanunScraper(db)
    
    # We run the scrape in the background so the API returns immediately
    background_tasks.add_task(scraper.scrape_range, request.start_id, request.end_id)
    
    return {"status": "success", "message": f"Scraping started in background for range {request.start_id}-{request.end_id}"}

@app.get("/stats")
def get_stats():
    return {
        "status": "success",
        "document_chunks": db.collection.count()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="127.0.0.1", port=8000, reload=True)
