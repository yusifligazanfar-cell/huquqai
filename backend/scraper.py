import asyncio
import aiohttp
from bs4 import BeautifulSoup
import re
import logging
from vector_db import VectorDB

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Base URL for e-qanun.az framework documents
BASE_URL = "https://e-qanun.az/framework/"

class EqanunScraper:
    def __init__(self, db: VectorDB):
        self.db = db
        self.max_concurrent_requests = 10
        self.semaphore = asyncio.Semaphore(self.max_concurrent_requests)

    async def fetch_document(self, session: aiohttp.ClientSession, doc_id: int):
        url = f"{BASE_URL}{doc_id}"
        async with self.semaphore:
            try:
                async with session.get(url, timeout=15) as response:
                    if response.status == 200:
                        html = await response.text()
                        return doc_id, html
                    elif response.status == 404:
                        return doc_id, None
                    else:
                        logger.warning(f"Failed to fetch {doc_id}, status code: {response.status}")
                        return doc_id, None
            except Exception as e:
                logger.error(f"Error fetching {doc_id}: {str(e)}")
                return doc_id, None

    def clean_text(self, text: str) -> str:
        # Basic text cleaning
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

    def chunk_text(self, text: str, chunk_size: int = 1500, overlap: int = 200) -> list[str]:
        words = text.split()
        chunks = []
        i = 0
        while i < len(words):
            chunk = " ".join(words[i:i + chunk_size])
            if len(chunk) > 50: # Only add meaningful chunks
                chunks.append(chunk)
            i += chunk_size - overlap
        return chunks

    async def process_document(self, doc_id: int, html: str):
        if not html:
            return

        soup = BeautifulSoup(html, 'lxml')
        
        # Try to find the main document content
        # E-qanun usually has content inside <div class="doc_content"> or similar
        content_div = soup.find('div', id='doc_content') or soup.find('div', class_='doc_text')
        
        # Title is usually in an H1 or <title>
        title_tag = soup.find('h1') or soup.find('title')
        title = title_tag.text.strip() if title_tag else f"Document {doc_id}"

        if content_div:
            # Extract paragraphs and clean
            paragraphs = content_div.find_all(['p', 'div', 'li'])
            text_blocks = [self.clean_text(p.get_text(separator=' ')) for p in paragraphs]
            full_text = "\n".join([b for b in text_blocks if len(b) > 10])
        else:
            # Fallback to body text
            body = soup.find('body')
            if body:
                full_text = self.clean_text(body.get_text(separator=' '))
            else:
                return

        if len(full_text) < 100:
            return

        chunks = self.chunk_text(full_text)
        
        # Prepare for VectorDB
        documents = chunks
        metadatas = [{"source": str(doc_id), "title": title} for _ in chunks]
        ids = [f"doc_{doc_id}_{i}" for i in range(len(chunks))]
        
        try:
            self.db.add_documents(documents=documents, metadatas=metadatas, ids=ids)
            logger.info(f"Successfully indexed document {doc_id}: '{title}' ({len(chunks)} chunks)")
        except Exception as e:
            logger.error(f"Error indexing document {doc_id}: {str(e)}")

    async def scrape_range(self, start_id: int, end_id: int):
        logger.info(f"Starting scrape from {start_id} to {end_id}")
        
        # Create an aiohttp session
        async with aiohttp.ClientSession() as session:
            tasks = []
            for doc_id in range(start_id, end_id + 1):
                tasks.append(self.fetch_document(session, doc_id))
            
            # Run tasks concurrently
            for future in asyncio.as_completed(tasks):
                doc_id, html = await future
                if html:
                    await self.process_document(doc_id, html)
                
        logger.info("Scraping complete.")

async def main():
    # Initialize Vector DB
    db = VectorDB()
    scraper = EqanunScraper(db)
    
    # We can chunk the scraping to not overload the system
    # E.g. scraping recent documents 46000 to 47000 as a test
    await scraper.scrape_range(46944, 46944) # Test with Civil Code

if __name__ == "__main__":
    asyncio.run(main())
