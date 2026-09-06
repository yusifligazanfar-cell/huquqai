import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

async function fetchAile() {
  const browser = await puppeteer.launch({ headless: true });
  const doc = { id: 46946, title: 'AZƏRBAYCAN RESPUBLİKASININ AİLƏ MƏCƏLLƏSİ' };
  const url = `https://e-qanun.az/framework/${doc.id}`;
  
  let page;
  try {
    page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) req.abort();
      else req.continue();
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    
    await page.waitForFunction(() => {
      const el = document.getElementById('sectonText');
      return el && el.innerText.length > 5000; 
    }, { timeout: 120000 }); // Increased timeout for Aile Mecellesi
    
    const textData = await page.evaluate(() => {
      const section = document.getElementById('sectonText');
      if (!section) return null;
      const paragraphs = Array.from(section.querySelectorAll('p, div, td'));
      return paragraphs.map(p => p.innerText.trim()).filter(t => t.length > 5).join('\n\n');
    });
    
    if (textData && textData.length > 500) {
      const fileName = `e_qanun_${doc.id}.txt`;
      const kbPath = path.join(process.cwd(), 'src/data/knowledge_base');
      const content = `${doc.title}\n\n${textData}`;
      fs.writeFileSync(path.join(kbPath, fileName), content, 'utf-8');
      console.log(`[SUCCESS] Saved ${fileName}`);
    }
  } catch (err) {
    console.log(`[ERROR] ${err.message}`);
  } finally {
    if (page) await page.close();
    await browser.close();
  }
}
fetchAile();
