import requests
from bs4 import BeautifulSoup
import re
import time

LAWS = ["Miqrasiya Məcəlləsi e-qanun", "Gömrük Məcəlləsi e-qanun", "Cəzaların İcrası Məcəlləsi e-qanun", "Su Məcəlləsi e-qanun"]
headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

for law in LAWS:
    url = f"https://html.duckduckgo.com/html/?q={requests.utils.quote(law)}"
    try:
        r = requests.get(url, headers=headers)
        soup = BeautifulSoup(r.text, 'html.parser')
        for a in soup.find_all('a', class_='result__url'):
            href = a.get('href', '')
            if 'framework' in href:
                match = re.search(r'framework(?:%2F|/)(\d+)', href)
                if match:
                    print(f"{law} -> {match.group(1)}")
                    break
    except Exception as e:
        print(e)
    time.sleep(1)
