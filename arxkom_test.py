import requests
from bs4 import BeautifulSoup
import json

url = "https://www.arxkom.gov.az/qanunvericilik/normativler"
headers = {'User-Agent': 'Mozilla/5.0'}
response = requests.get(url, headers=headers)
soup = BeautifulSoup(response.text, 'html.parser')

items = []
for a in soup.find_all('a', href=True):
    href = a['href']
    if 'pdf' in href.lower() or 'doc' in href.lower() or 'storage' in href.lower():
        parent = a.find_parent('div', class_='item') or a.find_parent('li') or a.find_parent('tr')
        title = "Unknown"
        if parent:
            title = parent.text.strip().replace('\n', ' ')
        items.append({'title': title[:100], 'url': href})

print(json.dumps(items, ensure_ascii=False, indent=2))
