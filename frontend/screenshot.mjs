import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  try {
    await page.goto('https://www.e-qanun.ai', { waitUntil: 'networkidle2' });
    const text = await page.evaluate(() => document.body.innerText);
    console.log(text.substring(0, 2000));
  } catch (e) {
    console.error(e);
  }
  await browser.close();
})();
