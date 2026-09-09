import urllib.request
import json
import sys

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing document_id"}))
        sys.exit(1)

    document_id = sys.argv[1]
    url = f"https://api.e-qanun.ai/api/v2/enlarge/documents?index=0&semantic_weight=1&document_id={document_id}"
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Referer": "https://www.e-qanun.ai/"
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            raw_text = resp.read().decode('utf-8')
            data = json.loads(raw_text)
            doc_name = data.get("doc_name", f"e-Qanun Sənədi № {document_id}")
            html_content = data.get("data", [""])[0] if data.get("data") else ""
            print(json.dumps({
                "document_id": document_id,
                "api_status": resp.status,
                "title": doc_name,
                "html": html_content
            }))
    except Exception as e:
        print(json.dumps({
            "document_id": document_id,
            "error": str(e)
        }))

if __name__ == "__main__":
    main()
