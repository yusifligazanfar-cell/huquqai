import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

// List of the most critical Codes (Məcəllələr) in Azerbaijani Law
const CODES_TO_SCRAPE = [
  { id: 46944, title: 'AZƏRBAYCAN RESPUBLİKASININ MÜLKİ MƏCƏLLƏSİ' },
  { id: 46943, title: 'AZƏRBAYCAN RESPUBLİKASININ ƏMƏK MƏCƏLLƏSİ' },
  { id: 46947, title: 'AZƏRBAYCAN RESPUBLİKASININ CİNAYƏT MƏCƏLLƏSİ' },
  { id: 46950, title: 'AZƏRBAYCAN RESPUBLİKASININ CİNAYƏT-PROSESSUAL MƏCƏLLƏSİ' },
  { id: 46945, title: 'AZƏRBAYCAN RESPUBLİKASININ MÜLKİ PROSESSUAL MƏCƏLLƏSİ' },
  { id: 46960, title: 'AZƏRBAYCAN RESPUBLİKASININ İNZİBATİ XƏTALAR MƏCƏLLƏSİ' },
  { id: 46946, title: 'AZƏRBAYCAN RESPUBLİKASININ AİLƏ MƏCƏLLƏSİ' },
  { id: 46948, title: 'AZƏRBAYCAN RESPUBLİKASININ VERGİ MƏCƏLLƏSİ' },
  { id: 46951, title: 'AZƏRBAYCAN RESPUBLİKASININ GÖMRÜK MƏCƏLLƏSİ' },
  { id: 46952, title: 'AZƏRBAYCAN RESPUBLİKASININ MƏNZİL MƏCƏLLƏSİ' },
  { id: 46955, title: 'AZƏRBAYCAN RESPUBLİKASININ SEÇKİ MƏCƏLLƏSİ' },
];

const delay = (ms) => new Promise(res => setTimeout(res, ms));

async function runMassScraper() {
  const browser = await puppeteer.launch({ headless: true });
  const kbPath = path.join(process.cwd(), 'src/data/knowledge_base');
  
  if (!fs.existsSync(kbPath)) {
    fs.mkdirSync(kbPath, { recursive: true });
  }

  console.log(`Starting automated scrape of ${CODES_TO_SCRAPE.length} fundamental laws from e-qanun.az...`);

  for (let i = 0; i < CODES_TO_SCRAPE.length; i++) {
    const doc = CODES_TO_SCRAPE[i];
    const fileName = `e_qanun_${doc.id}.txt`;
    const filePath = path.join(kbPath, fileName);
    
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 10000) {
      console.log(`[SKIPPED] ${doc.title} is already downloaded. Moving to next...`);
      continue;
    }

    const url = `https://e-qanun.az/framework/${doc.id}`;
    console.log(`\n[${i + 1}/${CODES_TO_SCRAPE.length}] Fetching: ${doc.title} (${url})`);
    
    let page;
    try {
      page = await browser.newPage();
      
      // Disable CSS/Images to make it render faster and avoid overwhelming the server
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
          req.abort();
        } else {
          req.continue();
        }
      });

      // Navigate to the law page
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
      
      // Wait for the main text container to populate (it fetches via an internal API call)
      await page.waitForFunction(() => {
        const el = document.getElementById('sectonText');
        return el && el.innerText.length > 5000; 
      }, { timeout: 60000 });
      
      // Extract raw text
      const textData = await page.evaluate(() => {
        const section = document.getElementById('sectonText');
        if (!section) return null;
        
        // E-qanun uses a lot of nested tables and paragraphs. We extract innerText of p, div, td.
        const paragraphs = Array.from(section.querySelectorAll('p, div, td'));
        
        // Remove empty blocks and join
        return paragraphs
          .map(p => p.innerText.trim())
          .filter(t => t.length > 5)
          .join('\n\n');
      });
      
      if (textData && textData.length > 500) {
        const content = `${doc.title}\n\n${textData}`;
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`[SUCCESS] Saved ${fileName} (${content.length} characters).`);
      } else {
        console.log(`[FAILED] Could not extract sufficient text for ${doc.id}.`);
      }

    } catch (err) {
      console.log(`[ERROR] Timeout or failure scraping ${doc.id}: ${err.message}`);
    } finally {
      if (page) await page.close();
    }
    
    // Crucial: Wait 5 seconds between requests so we don't DDOS the government server or get IP banned
    console.log(`Waiting 5 seconds before next request...`);
    await delay(5000);
  }
  
  await browser.close();
  console.log("\nMass Scraping Completed Successfully! 🎉");
}

runMassScraper();
