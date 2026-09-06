import os
import requests
import asyncio
from playwright.async_api import async_playwright

codes = {
    # Məcəllələr (Codes)
    22055: "Gömrük_Məcəlləsi",
    26233: "Miqrasiya_Məcəlləsi",
    2593: "Torpaq_Məcəlləsi",
    46942: "Əmək_Məcəlləsi",
    46955: "Ailə_Məcəlləsi",
    46944: "Mülki_Məcəllə",
    46945: "Mülki_Prosessual_Məcəlləsi",
    46946: "Cinayət_Məcəlləsi",
    46947: "Cinayət_Prosessual_Məcəlləsi",
    46960: "İnzibati_Xətalar_Məcəlləsi",
    46961: "Vergi_Məcəlləsi",
    24209: "Şəhərsalma_və_Tikinti_Məcəlləsi",
    46948: "Cəzaların_İcrası_Məcəlləsi",
    46943: "Meşə_Məcəlləsi",
    46950: "Su_Məcəlləsi",
    
    # Qanunlar (Laws for ministries)
    18320: "Təhsil_haqqında_Qanun",
    26188: "Gömrük_Tarifi_haqqında_Qanun",
    46951: "İstehlakçıların_hüquqlarının_müdafiəsi_haqqında_Qanun",
    29810: "Reklam_haqqında_Qanun",
    46954: "Tibbi_sığorta_haqqında_Qanun",
    2408: "Dövlət_sirri_haqqında_Qanun",
    8740: "Banklar_haqqında_Qanun",
    2727: "Dövlət_Sərhədi_haqqında_Qanun",
    4125: "Polis_haqqında_Qanun",
    46953: "Yol_hərəkəti_haqqında_Qanun",
    1152: "Əhalinin_sağlamlığının_qorunması_haqqında_Qanun",
    46956: "Ətraf_mühitin_mühafizəsi_haqqında_Qanun",
    44030: "Konstitusiya",
    5693: "Korrupsiyaya_qarşı_mübarizə_haqqında_Qanun",
    3672: "Dövlət_Qulluğu_haqqında_Qanun",
    5670: "Mülki_müdafiə_haqqında_Qanun",
    2539: "Büdcə_sistemi_haqqında_Qanun",
    12411: "Dövlət_satınalmaları_haqqında_Qanun",
    8690: "Mərkəzi_Bank_haqqında_Qanun"
}

KB_DIR = "frontend/src/data/knowledge_base"
os.makedirs(KB_DIR, exist_ok=True)

async def scrape_eqanun():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        for q_id, q_name in codes.items():
            filepath = os.path.join(KB_DIR, f"eqanun_mega_{q_id}_{q_name}.txt")
            if os.path.exists(filepath):
                print(f"Skipping {q_name}, already exists.")
                continue
                
            url = f"https://e-qanun.az/framework/{q_id}"
            print(f"Scraping {q_name} from {url}")
            try:
                await page.goto(url, wait_until='networkidle', timeout=30000)
                await page.wait_for_selector(".page-content, .document-body, body", timeout=10000)
                
                content = await page.evaluate('''() => {
                    let docBody = document.querySelector('.page-content') || document.querySelector('.document-body') || document.body;
                    
                    let headers = docBody.querySelectorAll('h1, h2, h3, h4, h5, h6, strong, b');
                    headers.forEach(h => {
                        let text = h.innerText.trim();
                        if (text && !text.startsWith('===')) {
                            h.innerText = '\\n=== ' + text + ' ===\\n';
                        }
                    });

                    return docBody.innerText;
                }''')
                
                if len(content) > 1000:
                    with open(filepath, "w", encoding="utf-8") as f:
                        f.write(content)
                    print(f"✅ Saved {q_name}")
                else:
                    print(f"⚠️ Content too short for {q_name}")
            except Exception as e:
                print(f"❌ Failed to scrape {q_name}: {e}")
                
        await browser.close()

if __name__ == "__main__":
    asyncio.run(scrape_eqanun())
