import requests
from bs4 import BeautifulSoup
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

for i in range(46940, 46970):
    try:
        r = requests.get(f"https://e-qanun.az/framework/{i}", verify=False, timeout=5)
        if r.status_code == 200:
            soup = BeautifulSoup(r.text, 'html.parser')
            title_tag = soup.find('title')
            title = title_tag.text if title_tag else "No title"
            if "Məcəllə" in title or "qanunu" in title.lower():
                print(f"Found ID {i}: {title.strip()}")
    except Exception as e:
        pass
