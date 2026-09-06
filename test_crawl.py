import asyncio
from playwright.async_api import async_playwright
import re

sites = [
    "https://migration.gov.az",
    "https://customs.gov.az",
    "https://tourism.gov.az"
]

async def check_site(url):
    print(f"Checking {url}")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        try:
            await page.goto(url, wait_until='networkidle', timeout=15000)
            links = await page.eval_on_selector_all('a', '(elements) => elements.map(el => el.href)')
            qanun_links = [l for l in links if 'qanun' in l.lower() or 'legis' in l.lower() or 'normativ' in l.lower()]
            print(f"Found {len(qanun_links)} potential legislation links on {url}:")
            for l in list(set(qanun_links))[:5]:
                print(" -", l)
        except Exception as e:
            print(f"Error on {url}: {e}")
        finally:
            await browser.close()

async def main():
    for site in sites:
        await check_site(site)

asyncio.run(main())
