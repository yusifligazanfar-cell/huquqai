import urllib.request
import json
import os

class EQanunClient:
    def __init__(self):
        self.base_url = "https://api.e-qanun.ai/api/v2/enlarge/documents"

    def get_document(self, document_id: int):
        doc_id_str = str(document_id)
        url = f"{self.base_url}?index=0&semantic_weight=1&document_id={doc_id_str}"
        
        # 1. Attempt Live API
        try:
            req = urllib.request.Request(
                url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "application/json, text/plain, */*",
                    "Referer": "https://www.e-qanun.ai/"
                }
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode('utf-8'))
                    return {
                        "document_id": document_id,
                        "api_status": 200,
                        "title": data.get("doc_name", f"e-Qanun Sənədi № {doc_id_str}"),
                        "data": data.get("data", []),
                        "source": "api.e-qanun.ai (LIVE)"
                    }
        except Exception:
            pass

        # 2. Fallback to Local Ingested Corpus
        catalog_path = os.path.join(os.path.dirname(__file__), "../../frontend/src/data/eqanun_catalog.json")
        if os.path.exists(catalog_path):
            with open(catalog_path, "r", encoding="utf-8") as f:
                catalog = json.load(f)
                match = next((item for item in catalog if str(item.get("id")) == doc_id_str), None)
                if match and match.get("file"):
                    corpus_path = os.path.join(os.path.dirname(__file__), "../../data/full_eqanun_corpus", match["file"])
                    if os.path.exists(corpus_path):
                        with open(corpus_path, "r", encoding="utf-8") as cf:
                            content = cf.read()
                            return {
                                "document_id": document_id,
                                "api_status": 200,
                                "title": match.get("title", f"e-Qanun Sənədi № {doc_id_str}"),
                                "data": [content],
                                "source": f"local_corpus ({match['file']})"
                            }

        return {
            "document_id": document_id,
            "api_status": 404,
            "title": f"e-Qanun Sənədi № {doc_id_str}",
            "data": [],
            "source": "not_found"
        }
