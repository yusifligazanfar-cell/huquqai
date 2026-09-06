import os
import time
import requests
from bs4 import BeautifulSoup
from pypdf import PdfReader
import re

URLS = [
    "https://www.arxkom.gov.az/qanunvericilik/azerbaycan-respublikasinin-qanunlari",
    "https://www.arxkom.gov.az/qanunvericilik/ar-prezidentinin-ferman-ve-serencamlari",
    "https://www.arxkom.gov.az/qanunvericilik/ar-nazirler-kabinetinin-qerar-ve-serencamlari",
    "https://www.arxkom.gov.az/qanunvericilik/normativler"
]

OUTPUT_DIR = "frontend/src/data/knowledge_base"
os.makedirs(OUTPUT_DIR, exist_ok=True)

headers = {'User-Agent': 'Mozilla/5.0'}

def extract_text_from_pdf(pdf_path):
    try:
        reader = PdfReader(pdf_path)
        text = ""
        for page in reader.pages:
            t = page.extract_text()
            if t:
                text += t + "\n"
        return text
    except Exception as e:
        print(f"Error reading PDF {pdf_path}: {e}")
        return ""

def clean_filename(title):
    # Keep only alphanumeric and spaces, then replace spaces with underscores
    cleaned = re.sub(r'[^\w\s]', '', title)
    return "_".join(cleaned.split())[:100]

def process_url(url, category_index):
    print(f"Processing URL: {url}")
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        print(f"Failed to fetch {url}")
        return

    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Extract links
    pdf_count = 0
    for a in soup.find_all('a', href=True):
        href = a['href']
        if 'pdf' in href.lower() or 'storage/uploads' in href.lower():
            # Ensure it's absolute
            if href.startswith('/'):
                href = "https://www.arxkom.gov.az" + href
            
            if not href.lower().endswith('.pdf'):
                continue
                
            # Find title
            parent = a.find_parent('div', class_='item') or a.find_parent('li') or a.find_parent('tr')
            title = "Bilinmir"
            if parent:
                # the a tag itself might be "Yükləmək" or "Download"
                # so we get the full text of the parent
                text = parent.get_text(separator=' ', strip=True)
                title = text.replace("Yükləmək", "").strip()
            
            if len(title) < 5 or title == "Bilinmir":
                title = f"arxkom_sened_{category_index}_{pdf_count}"
                
            print(f"Found document: {title[:50]}...")
            
            # Download PDF
            try:
                r = requests.get(href, headers=headers, stream=True)
                if r.status_code == 200:
                    temp_pdf = f"temp_{category_index}_{pdf_count}.pdf"
                    with open(temp_pdf, 'wb') as f:
                        for chunk in r.iter_content(chunk_size=8192):
                            f.write(chunk)
                    
                    # Extract text
                    text = extract_text_from_pdf(temp_pdf)
                    
                    if text.strip():
                        # Save to knowledge base
                        filename = f"arxkom_{clean_filename(title)}.txt"
                        filepath = os.path.join(OUTPUT_DIR, filename)
                        
                        # Add a header to the text so the AI knows what this is
                        content = f"SƏNƏDİN ADI: {title}\nMƏNBƏ: arxkom.gov.az\n\n{text}"
                        
                        with open(filepath, 'w', encoding='utf-8') as f:
                            f.write(content)
                        print(f"Saved {filename}")
                    
                    # Clean up
                    if os.path.exists(temp_pdf):
                        os.remove(temp_pdf)
                        
            except Exception as e:
                print(f"Failed to process {href}: {e}")
                
            pdf_count += 1
            time.sleep(1) # Be nice to the server

for i, url in enumerate(URLS):
    process_url(url, i)

print("Scraping completed!")
