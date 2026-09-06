import urllib.request
from bs4 import BeautifulSoup
import time
import json
from duckduckgo_search import DDGS

laws_to_find = [
    "Azərbaycan Respublikasının Miqrasiya Məcəlləsi",
    "Azərbaycan Respublikasının Gömrük Məcəlləsi",
    "Təhsil haqqında Azərbaycan Respublikasının Qanunu",
    "Dövlət Sərhədi haqqında Azərbaycan Respublikasının Qanunu",
    "Əhalinin sağlamlığının qorunması haqqında Azərbaycan Respublikasının Qanunu",
    "Tibbi sığorta haqqında Azərbaycan Respublikasının Qanunu",
    "Torpaq Məcəlləsi",
    "İşsizlikdən sığorta haqqında Azərbaycan Respublikasının Qanunu",
    "Büdcə sistemi haqqında Azərbaycan Respublikasının Qanunu",
    "Dövlət sirri haqqında Azərbaycan Respublikasının Qanunu",
    "Banklar haqqında Azərbaycan Respublikasının Qanunu",
    "Azərbaycan Respublikasının Mərkəzi Bankı haqqında",
    "Reklam haqqında Azərbaycan Respublikasının Qanunu",
    "Mülki müdafiə haqqında Azərbaycan Respublikasının Qanunu",
    "Dövlət satınalmaları haqqında Azərbaycan Respublikasının Qanunu",
    "Polis haqqında Azərbaycan Respublikasının Qanunu",
    "Yol hərəkəti haqqında Azərbaycan Respublikasının Qanunu",
    "Silahlı Qüvvələr haqqında Azərbaycan Respublikasının Qanunu",
    "Hərbi vəziyyət haqqında Azərbaycan Respublikasının Qanunu",
    "Fövqəladə vəziyyət haqqında Azərbaycan Respublikasının Qanunu",
    "Uşaq hüquqları haqqında Azərbaycan Respublikasının Qanunu",
    "Turizm haqqında Azərbaycan Respublikasının Qanunu",
    "Qida təhlükəsizliyi haqqında Azərbaycan Respublikasının Qanunu",
    "Dövlət qulluğu haqqında Azərbaycan Respublikasının Qanunu",
    "Korrupsiyaya qarşı mübarizə haqqında Azərbaycan Respublikasının Qanunu"
]

results = {}

with DDGS() as ddgs:
    for law in laws_to_find:
        print(f"Searching: {law}")
        search_res = list(ddgs.text(f'site:e-qanun.az/framework "{law}"', max_results=3))
        for res in search_res:
            if 'framework' in res['href']:
                try:
                    # extract ID
                    law_id = res['href'].split('framework/')[1].split('?')[0].replace('/','')
                    if law_id.isdigit():
                        results[law] = int(law_id)
                        print(f"Found ID: {law_id}")
                        break
                except:
                    pass
        time.sleep(1.5)

print(json.dumps(results, indent=2, ensure_ascii=False))
