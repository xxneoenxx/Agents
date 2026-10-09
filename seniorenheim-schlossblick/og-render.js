/**
 * Rendert og-card.html zu og-image.jpg (1200 × 630) — dem Bild, das bei
 * WhatsApp, Facebook, LinkedIn oder Signal erscheint, wenn jemand den Link teilt.
 *
 *   npm install playwright && npx playwright install chromium
 *   node og-render.js
 *
 * Ohne Node geht es auch von Hand: og-card.html im Browser öffnen, das Fenster
 * auf exakt 1200 × 630 stellen und einen Screenshot machen.
 *
 * WANN NEU RENDERN
 *   · nach dem Einbinden der lokalen Schriften (sonst steht die Karte in der
 *     Systemschrift statt in Fraunces)
 *   · wenn sich Headline, Fakten oder die Farbwelt ändern
 */
const path = require('path');

(async () => {
  let chromium;
  try {
    ({ chromium } = require('playwright'));
  } catch (e) {
    console.error('Playwright fehlt.  npm install playwright && npx playwright install chromium');
    process.exit(1);
  }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, 'og-card.html'), { waitUntil: 'networkidle' });
  try { await page.evaluate(() => document.fonts.ready); } catch (e) {}
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(__dirname, 'og-image.jpg'), type: 'jpeg', quality: 90 });
  await browser.close();
  console.log('og-image.jpg geschrieben (1200 × 630)');
})();
