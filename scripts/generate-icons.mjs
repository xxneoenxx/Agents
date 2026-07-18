// Erzeugt die PWA-PNG-Icons aus einer vollflaechigen HTML-Vorlage mittels des
// vorinstallierten Chromium. Ausfuehren: node scripts/generate-icons.mjs
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '../public/icons');

const html = (size) => `<!doctype html><html><head><style>
  html,body{margin:0;padding:0;width:${size}px;height:${size}px;overflow:hidden}
  .bg{width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;
      background:linear-gradient(180deg,#FFC24B,#FF8A3D);
      font-family:'Nunito','Arial',sans-serif}
  .coin{width:${size * 0.6}px;height:${size * 0.6}px;border-radius:50%;background:#FFC72C;
        border:${size * 0.04}px solid #E0A800;display:flex;align-items:center;justify-content:center}
  .b{font-size:${size * 0.42}px;font-weight:900;color:#3A2A1F}
</style></head><body><div class="bg"><div class="coin"><span class="b">B</span></div></div></body></html>`;

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
});
for (const size of [192, 512]) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(html(size), { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${outDir}/icon-${size}.png`, omitBackground: false });
  await page.close();
  console.log(`icon-${size}.png erzeugt`);
}
await browser.close();
