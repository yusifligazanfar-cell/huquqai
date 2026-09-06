import os
import chromadb
from chromadb.utils import embedding_functions
import logging

logger = logging.getLogger(__name__)

class VectorDB:
    def __init__(self, db_path: str = "./chroma_db"):
        # Initialize ChromaDB client pointing to local path
        os.makedirs(db_path, exist_ok=True)
        self.client = chromadb.PersistentClient(path=db_path)
        
        # Use a multilingual embedding model for Azerbaijani text
        # 'paraphrase-multilingual-MiniLM-L12-v2' is lightweight and effective
        self.embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
            model_name="paraphrase-multilingual-MiniLM-L12-v2"
        )
        
        # Create or get collection
        self.collection = self.client.get_or_create_collection(
            name="lexaz_documents",
            embedding_function=self.embedding_fn,
            metadata={"hnsw:space": "cosine"} # Use cosine similarity
        )
        logger.info(f"VectorDB initialized at {db_path}. Total documents currently: {self.collection.count()}")

    def add_documents(self, documents: list[str], metadatas: list[dict], ids: list[str]):
        """Add chunks to the vector database."""
        # ChromaDB can ingest batches, but we ensure it's not too large
        batch_size = 100
        for i in range(0, len(documents), batch_size):
            self.collection.add(
                documents=documents[i:i+batch_size],
                metadatas=metadatas[i:i+batch_size],
                ids=ids[i:i+batch_size]
            )

    def query(self, query_text: str, n_results: int = 10) -> list[dict]:
        """Search the vector database."""
        results = self.collection.query(
            query_texts=[query_text],
            n_results=n_results
        )
        
        # Format results
        formatted_results = []
        if results and results['documents'] and len(results['documents']) > 0:
            docs = results['documents'][0]
            metas = results['metadatas'][0]
            dists = results['distances'][0]
            
            for i in range(len(docs)):
                formatted_results.append({
                    "content": docs[i],
                    "metadata": metas[i],
                    "distance": dists[i]
                })
                
        return formatted_results
