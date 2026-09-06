import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const url = 'https://e-qanun.az/framework/46944';
const title = 'AZƏRBAYCAN RESPUBLİKASININ MÜLKİ MƏCƏLLƏSİ';

async function seedMulki() {
  const browser = await puppeteer.launch({ headless: true });
  console.log(`Fetching: ${title} ...`);
  const page = await browser.newPage();
  
  // Disable CSS/Images to make it render faster
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
      req.abort();
    } else {
      req.continue();
    }
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 600000 });
    
    // Wait until the section text actually has text
    await page.waitForFunction(() => {
      const el = document.getElementById('sectonText');
      return el && el.innerText.length > 50000; // Mulki is huge, wait till it populates
    }, { timeout: 600000 });
    
    const textData = await page.evaluate(() => {
      const section = document.getElementById('sectonText');
      if (!section) return null;
      
      const paragraphs = Array.from(section.querySelectorAll('p, div, td'));
      return paragraphs.map(p => p.innerText.trim()).filter(t => t.length > 5).join('\n\n');
    });
    
    if (textData && textData.length > 50) {
      const fileName = `e_qanun_46944.txt`;
      const content = `${title}\n\n${textData}`;
      fs.writeFileSync(path.join(process.cwd(), 'src/data/knowledge_base', fileName), content, 'utf-8');
      console.log(`Saved: ${fileName} (${content.length} characters)`);
    } else {
      console.log(`Failed to extract data.`);
    }
  } catch (err) {
    console.log(`Error: ${err.message}`);
  }
  
  await browser.close();
  console.log("Done!");
}

seedMulki();
