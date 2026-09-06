import os
import re
import asyncio
from playwright.async_api import async_playwright

OUTPUT_DIR = "frontend/src/data/knowledge_base"
os.makedirs(OUTPUT_DIR, exist_ok=True)

KNOWN_LAWS = {
    "Əmək_Məcəlləsi": 46943,
    "Mülki_Məcəllə": 46947,
    "Mülki_Məcəllə_I_Hissə": 46944,
    "İnzibati_Xətalar_Məcəlləsi": 46960,
    "Mülki_Prosessual_Məcəllə": 46945,
    "Cinayət_Prosessual_Məcəllə": 46950,
    "Ailə_Məcəlləsi": 46946,
    "Vergi_Məcəlləsi": 46948,
    "Miqrasiya_Məcəlləsi": 46959,
    "Gömrük_Məcəlləsi": 46957,
    "Cəzaların_İcrası_Məcəlləsi": 46951,
    "Su_Məcəlləsi": 46940,
    "Meşə_Məcəlləsi": 46941,
    "Torpaq_Məcəlləsi": 46942,
    "Şəhərsalma_və_Tikinti_Məcəlləsi": 46955,
    "Polis_haqqında_qanun": 2937,
    "Təhsil_haqqında_qanun": 18343,
    "Məhkəmələr_və_hakimlər_haqqında_qanun": 3933,
    "Müdafiə_haqqında_qanun": 8688,
    "Dövlət_sirri_haqqında_qanun": 2408
}

async def fetch_eqanun_doc(page, doc_id, law_name):
    print(f"Fetching document ID: {doc_id} for {law_name}")
    url = f"https://e-qanun.az/framework/{doc_id}"
    try:
        await page.goto(url, wait_until='networkidle', timeout=30000)
        
        # Wait for the document content to load (adjust selector based on Next.js rendering)
        # e-qanun usually injects the text into the body after hydration
        await page.wait_for_selector('div', timeout=15000)
        
        # Just grab the entire body text and clean it
        text = await page.locator('body').inner_text()
        
        if len(text) > 500:
            text = re.sub(r'\n{3,}', '\n\n', text)
            
            filename = f"eqanun_mega_{doc_id}_{law_name}.txt"
            filepath = os.path.join(OUTPUT_DIR, filename)
            
            header = f"SƏNƏDİN ADI: {law_name.replace('_', ' ')}\nMƏNBƏ: e-qanun.az (ID: {doc_id})\n\n"
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(header + text)
            
            print(f"Successfully saved {law_name} ({len(text)} chars)")
            return True
        else:
            print(f"Content too short for {doc_id}. Possibly not loaded.")
            return False
            
    except Exception as e:
        print(f"Error fetching document {doc_id}: {e}")
        return False

async def main():
    print("Starting Global e-Qanun Playwright Mega-Scraper...")
    successful = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        for law, doc_id in KNOWN_LAWS.items():
            success = await fetch_eqanun_doc(page, doc_id, law)
            if success:
                successful.append(law)
                
        await browser.close()
            
    print(f"\nCompleted! Successfully integrated: {len(successful)} documents.")

if __name__ == "__main__":
    asyncio.run(main())
