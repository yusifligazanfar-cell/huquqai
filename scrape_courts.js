const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrape(url) {
    console.log(`Navigating to ${url}...`);
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        
        // The court acts are usually loaded via API and displayed in the DOM
        // We can just grab the entire text content of the body for a quick look
        const textContent = await page.evaluate(() => document.body.innerText);
        
        console.log(`--- Content from ${url} ---`);
        console.log(textContent.substring(0, 1000) + '...\n\n'); // Print first 1000 chars
        
        // Save full text to a file for review
        const urlObj = new URL(url);
        const id = urlObj.pathname.split('/').pop();
        fs.writeFileSync(`/Users/gazanfaryusifli/.gemini/antigravity/scratch/lexaz-ai/court_${id}.txt`, textContent);
        console.log(`Saved full text to court_${id}.txt`);
        
    } catch (e) {
        console.error(`Error processing ${url}:`, e);
    } finally {
        await browser.close();
    }
}

const urls = [
    'https://courts.gov.az/ad86d9eb-bec0-40b0-a478-e1bbeaa6ab02',
    'https://courts.gov.az/d482693d-fafb-4f14-ae63-ed0163b4fe71'
];

async function main() {
    for (const url of urls) {
        await scrape(url);
    }
}

main();
