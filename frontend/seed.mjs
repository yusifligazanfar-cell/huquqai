import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

const links = [
  { url: 'https://e-qanun.az/framework/897', title: 'AZƏRBAYCAN RESPUBLİKASININ KONSTİTUSİYASI' },
  { url: 'https://e-qanun.az/framework/46947', title: 'AZƏRBAYCAN RESPUBLİKASININ CİNAYƏT MƏCƏLLƏSİ' },
  { url: 'https://e-qanun.az/framework/46944', title: 'AZƏRBAYCAN RESPUBLİKASININ MÜLKİ MƏCƏLLƏSİ' },
  { url: 'https://e-qanun.az/framework/46960', title: 'AZƏRBAYCAN RESPUBLİKASININ İNZİBATİ XƏTALAR MƏCƏLLƏSİ' },
  { url: 'https://e-qanun.az/framework/46943', title: 'AZƏRBAYCAN RESPUBLİKASININ ƏMƏK MƏCƏLLƏSİ' },
  { url: 'https://e-qanun.az/framework/46945', title: 'AZƏRBAYCAN RESPUBLİKASININ MÜLKİ PROSESSUAL MƏCƏLLƏSİ' },
  { url: 'https://e-qanun.az/framework/46950', title: 'AZƏRBAYCAN RESPUBLİKASININ CİNAYƏT-PROSESSUAL MƏCƏLLƏSİ' }
];

async function seed() {
  const browser = await puppeteer.launch({ headless: true });
  
  for (const link of links) {
    console.log(`Fetching: ${link.title} ...`);
    const page = await browser.newPage();
    try {
      await page.goto(link.url, { waitUntil: 'networkidle2', timeout: 60000 });
      await page.waitForSelector('#sectonText', { timeout: 30000 }).catch(() => null);
      
      const textData = await page.evaluate(() => {
        const section = document.getElementById('sectonText');
        return section ? section.innerText : null;
      });
      
      if (textData && textData.length > 50) {
        const docId = link.url.split('/').pop();
        const fileName = `e_qanun_${docId}.txt`;
        const content = `${link.title}\n\n${textData}`;
        fs.writeFileSync(path.join(process.cwd(), 'src/data/knowledge_base', fileName), content, 'utf-8');
        console.log(`Saved: ${fileName} (${content.length} characters)`);
      } else {
        console.log(`Failed to fetch text for: ${link.url}`);
      }
    } catch (err) {
      console.log(`Error on ${link.url}: ${err.message}`);
    }
    await page.close();
  }
  
  await browser.close();
  console.log("Done!");
}

seed();
