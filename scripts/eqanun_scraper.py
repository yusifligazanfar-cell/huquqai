import urllib.request
import json
import re
import os
import sys
import time
from html import unescape
from concurrent.futures import ThreadPoolExecutor, as_completed

KB_DIR = os.path.abspath("frontend/src/data/knowledge_base")
os.makedirs(KB_DIR, exist_ok=True)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Referer": "https://www.e-qanun.ai/",
    "Origin": "https://www.e-qanun.ai"
}

def clean_html(raw_html: str) -> str:
    text = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', raw_html, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<(p|div|br|tr|h[1-6]|li)[^>]*>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = unescape(text)
    lines = [re.sub(r'[ \t]+', ' ', line).strip() for line in text.split('\n')]
    return '\n'.join([line for line in lines if line])

def sanitize_filename(name: str) -> str:
    clean = re.sub(r'[\\/*?:"<>|]', "", name)
    clean = clean.replace(' ', '_')
    return clean[:60]

def fetch_and_save_doc(doc_id: int):
    # Check if any file with this ID exists
    prefix = f"eqanun_doc_{doc_id}_"
    existing = [f for f in os.listdir(KB_DIR) if f.startswith(prefix) or f == f"eqanun_doc_{doc_id}.txt"]
    if existing:
        return doc_id, "SKIPPED", None

    url = f"https://api.e-qanun.ai/api/v2/enlarge/documents?index=0&semantic_weight=1&document_id={doc_id}"
    req = urllib.request.Request(url, headers=HEADERS)
    
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=12) as resp:
                if resp.status == 200:
                    payload = json.loads(resp.read().decode('utf-8'))
                    raw_data = payload.get("data", [])
                    doc_name = payload.get("doc_name") or f"Sənəd {doc_id}"
                    
                    if raw_data and isinstance(raw_data, list) and len(raw_data) > 0 and raw_data[0]:
                        raw_html = raw_data[0]
                        clean_text = clean_html(raw_html)
                        
                        if len(clean_text) > 100:
                            safe_title = sanitize_filename(doc_name)
                            filename = f"eqanun_doc_{doc_id}_{safe_title}.txt"
                            filepath = os.path.join(KB_DIR, filename)
                            
                            header = f"SƏNƏDİN ADI: {doc_name}\nMƏNBƏ: e-qanun.az (ID: {doc_id})\nURL: https://www.e-qanun.ai/results/{doc_id}\n\n"
                            with open(filepath, "w", encoding="utf-8") as f:
                                f.write(header + clean_text)
                            return doc_id, "SAVED", doc_name
                        else:
                            return doc_id, "EMPTY", None
                    else:
                        return doc_id, "EMPTY", None
                elif resp.status == 404:
                    return doc_id, "NOT_FOUND", None
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return doc_id, "NOT_FOUND", None
            time.sleep(1)
        except Exception:
            time.sleep(1)
            
    return doc_id, "FAILED", None

def run_scraper(start_id: int, end_id: int, max_workers: int = 10):
    total = end_id - start_id + 1
    print(f"=== E-Qanun Scraper: ID {start_id} - {end_id} (Cəmi {total} sənəd, {max_workers} worker) ===")
    
    counts = {"SAVED": 0, "SKIPPED": 0, "EMPTY": 0, "NOT_FOUND": 0, "FAILED": 0}
    
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(fetch_and_save_doc, doc_id): doc_id for doc_id in range(start_id, end_id + 1)}
        
        done = 0
        for future in as_completed(futures):
            doc_id = futures[future]
            try:
                _, status, title = future.result()
                counts[status] = counts.get(status, 0) + 1
            except Exception as e:
                counts["FAILED"] = counts.get("FAILED", 0) + 1
                
            done += 1
            if done % 50 == 0 or done == total:
                print(f"[{done}/{total}] Yükləndi: {counts['SAVED']} | Keçildi: {counts['SKIPPED']} | Boş/Yoxdur: {counts['EMPTY']+counts['NOT_FOUND']} | Xəta: {counts['FAILED']}", flush=True)

    print(f"\nTamamlandı! Cəmi {counts['SAVED']} sənəd bilik bazasına əlavə edildi.")

if __name__ == "__main__":
    start = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    end = int(sys.argv[2]) if len(sys.argv) > 2 else 500
    workers = int(sys.argv[3]) if len(sys.argv) > 3 else 10
    run_scraper(start, end, workers)
