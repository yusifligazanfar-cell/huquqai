import requests

url = "https://e-qanun.az/api/search"
# Let's try to search for something simple
try:
    r = requests.post(url, json={"query": "Təhsil Nazirliyi", "limit": 10}, verify=False)
    print(r.status_code)
    print(r.text[:500])
except Exception as e:
    print(e)
