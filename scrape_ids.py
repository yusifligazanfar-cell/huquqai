import asyncio
from playwright.async_api import async_playwright

queries = [
    "Dövlət Sərhədi haqqında",
    "Tibbi sığorta haqqında",
    "Turizm haqqında",
    "Gömrük Məcəlləsi",
    "Miqrasiya Məcəlləsi",
    "Mərkəzi Bank haqqında",
    "Reklam haqqında",
    "Mülki müdafiə haqqında",
    "Təhsil haqqında",
    "Qida təhlükəsizliyi haqqında",
    "Korrupsiyaya qarşı mübarizə haqqında"
]

results = {}

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        for q in queries:
            try:
                await page.goto("https://e-qanun.az/")
                await page.fill("input[name='search']", q)
                await page.press("input[name='search']", "Enter")
                await page.wait_for_selector(".search-result-item", timeout=5000)
                
                # Get first link
                href = await page.eval_on_selector(".search-result-item a", "el => el.href")
                doc_id = href.split("framework/")[1].split("?")[0].replace("/", "")
                results[q] = int(doc_id)
                print(f"{q}: {doc_id}")
            except Exception as e:
                print(f"Failed {q}: {e}")
                
        await browser.close()
        import json
        print(json.dumps(results, indent=2))

asyncio.run(main())
