import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

for i in range(46940, 46970):
    try:
        r = requests.get(f"https://e-qanun.az/api/frameworks/{i}", verify=False, timeout=5)
        if r.status_code == 200:
            data = r.json()
            title = data.get('act_title_az') or data.get('act_title') or data.get('doc_name')
            print(f"ID {i}: {title}")
    except Exception as e:
        pass
