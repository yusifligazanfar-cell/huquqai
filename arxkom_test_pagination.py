import requests
from bs4 import BeautifulSoup
url = "https://www.arxkom.gov.az/qanunvericilik/ar-nazirler-kabinetinin-qerar-ve-serencamlari"
headers = {'User-Agent': 'Mozilla/5.0'}
r = requests.get(url, headers=headers)
soup = BeautifulSoup(r.text, 'html.parser')
pagination = soup.find('ul', class_='pagination')
if pagination:
    print([a['href'] for a in pagination.find_all('a', href=True)])
else:
    print("No pagination found.")
