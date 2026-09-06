import requests
import json

url = "https://e-qanun.az/api/search"
payload = {"query": "Miqrasiya Məcəlləsi", "page": 1}
# Let's try GET and POST
try:
    r = requests.get("https://e-qanun.az/api/search?q=Miqrasiya")
    print("GET status:", r.status_code)
    print("GET text:", r.text[:200])
except Exception as e:
    print(e)
