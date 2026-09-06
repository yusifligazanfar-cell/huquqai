"use server"

import puppeteer from 'puppeteer'
import fs from 'fs'
import path from 'path'

export async function scrapeEQanun(url: string) {
  let browser;
  try {
    // Basic validation
    if (!url.includes('e-qanun.az')) {
      return { success: false, error: "Zəhmət olmasa düzgün e-qanun.az linki daxil edin." };
    }

    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // Go to the E-Qanun URL
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    // Wait for the text div to appear (timeout after 15s)
    await page.waitForSelector('#sectonText', { timeout: 15000 }).catch(() => null);
    
    // Extract the text content
    const textData = await page.evaluate(() => {
      const section = document.getElementById('sectonText');
      if (section) {
        return section.innerText;
      }
      return null;
    });
    
    // Get title
    const titleData = await page.evaluate(() => {
      const titleEl = document.querySelector('title');
      return titleEl ? titleEl.innerText : 'Qanunvericilik Aktı';
    });

    await browser.close();

    if (!textData || textData.length < 50) {
      return { success: false, error: "Mətn tapılmadı və ya səhifə tam yüklənmədi. Linkin düzgünlüyünü yoxlayın." };
    }

    // Save to knowledge base
    const urlParts = url.split('?')[0].split('/');
    const docId = urlParts[urlParts.length - 1] || Date.now().toString();
    const fileName = `e_qanun_${docId}.txt`;
    const kbPath = path.join(process.cwd(), 'src/data/knowledge_base');
    
    if (!fs.existsSync(kbPath)) {
      fs.mkdirSync(kbPath, { recursive: true });
    }
    
    // Prepend title so semantic search recognizes the document name
    const contentToSave = `${titleData}\n\n${textData}`;
    fs.writeFileSync(path.join(kbPath, fileName), contentToSave, 'utf-8');

    return { 
      success: true, 
      message: `Qanunvericilik aktı uğurla bazaya əlavə edildi! Artıq süni zəka bu qanunu tam bilir.`,
      title: titleData
    };
    
  } catch (error: any) {
    if (browser) await browser.close();
    console.error("Scraping error:", error);
    return { success: false, error: "Server xətası baş verdi: " + error.message };
  }
}
