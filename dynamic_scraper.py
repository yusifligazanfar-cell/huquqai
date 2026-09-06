import os
import time
import argparse
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

def qanun_ve_alt_maddeler(driver, url):
    """Ana qanunu və bütün alt maddələrini yükləyib vahid mətn kimi qaytarır"""
    
    tam_metn = ""
    
    print(f"[{url}] Ana qanun yüklənir...")
    driver.get(url)
    time.sleep(3)
    
    try:
        # E-qanun mətni adətən #sectonText və ya body içində olur
        try:
            metn = driver.find_element(By.ID, "sectonText").text.strip()
            if len(metn) < 50:
                metn = driver.find_element(By.TAG_NAME, 'body').text.strip()
        except:
            metn = driver.find_element(By.TAG_NAME, 'body').text.strip()
            
        tam_metn += metn + "\n\n"
    except Exception as e:
        print(f"❌ Ana qanun xətası: {e}")
    
    # Alt maddə linklərini tap
    alt_linkler = []
    try:
        links = driver.find_elements(By.CSS_SELECTOR, "a[href*='/framework/']")
        for link in links:
            href = link.get_attribute('href')
            link_ad = link.text.strip()
            # Öz URL-ni və təkrarları siyahıya əlavə etmə
            if href and href != url and href not in [x['url'] for x in alt_linkler]:
                alt_linkler.append({"url": href, "ad": link_ad})
                
        print(f"📋 {len(alt_linkler)} alt maddə tapıldı.")
    except Exception as e:
        print(f"❌ Alt linklər xətası: {e}")
    
    # Hər alt maddəni yüklə
    for i, alt in enumerate(alt_linkler):
        print(f"  -> Alt maddə ({i+1}/{len(alt_linkler)}): {alt['url']}")
        try:
            driver.get(alt['url'])
            time.sleep(2)
            
            try:
                alt_metn = driver.find_element(By.ID, "sectonText").text.strip()
                if len(alt_metn) < 50:
                    alt_metn = driver.find_element(By.TAG_NAME, 'body').text.strip()
            except:
                alt_metn = driver.find_element(By.TAG_NAME, 'body').text.strip()
            
            tam_metn += f"\n\n=== {alt['ad']} ===\n"
            tam_metn += alt_metn
            
        except Exception as e:
            print(f"  ❌ Alt maddə xəta: {e}")
            
    return tam_metn

def main(start_url):
    print("Dinamik Scraper (Parent-Child) işə düşdü...")
    
    options = webdriver.ChromeOptions()
    options.add_argument('--headless')
    options.add_argument('--disable-gpu')
    options.add_argument('--no-sandbox')
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    kb_path = os.path.join(base_dir, "frontend", "src", "data", "knowledge_base")
    os.makedirs(kb_path, exist_ok=True)
    
    try:
        doc_id = start_url.rstrip('/').split('/')[-1]
        file_path = os.path.join(kb_path, f"e_qanun_{doc_id}.txt")
        
        tam_metn = qanun_ve_alt_maddeler(driver, start_url)
        
        if len(tam_metn) > 100:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(tam_metn)
            print(f"✅ Vahid sənəd kimi uğurla saxlandı: {file_path}")
        else:
            print("❌ Yetərli mətn tapılmadı.")
            
    finally:
        driver.quit()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", type=str, required=True, help="Ana qanunun URL-si")
    args = parser.parse_args()
    main(args.url)
