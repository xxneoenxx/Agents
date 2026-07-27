const { chromium } = require('playwright-core');
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const BASE = 'http://127.0.0.1:8080';
const OUT = __dirname + '/bilder';
const fs = require('fs');
fs.mkdirSync(OUT, { recursive: true });

const fehler = [];
function pruef(ok, name, detail) {
  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${name}${detail ? '  → ' + detail : ''}`);
  if (!ok) fehler.push(name + (detail ? ': ' + detail : ''));
}

(async () => {
  const browser = await chromium.launch({ executablePath: EXE });

  // ---------- Fremdanfragen + Konsolenfehler ----------
  {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    const extern = [], konsole = [];
    page.on('request', r => { if (!r.url().startsWith(BASE) && !r.url().startsWith('data:')) extern.push(r.url()); });
    page.on('pageerror', e => konsole.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') konsole.push(m.text()); });

    for (const p of ['/index.html', '/speisekarte.html', '/kontakt.html', '/impressum.html', '/datenschutz.html']) {
      await page.goto(BASE + p, { waitUntil: 'networkidle' });
    }
    pruef(extern.length === 0, 'Keine Fremdanfragen', extern.slice(0, 3).join(', '));
    pruef(konsole.length === 0, 'Keine JS-Fehler', konsole.slice(0, 3).join(' | '));
    await ctx.close();
  }

  // ---------- Responsive + Screenshots ----------
  for (const [name, w, h] of [['320', 320, 720], ['768', 768, 1024], ['1440', 1440, 900]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const page = await ctx.newPage();

    for (const [datei, pfad] of [['start', '/index.html'], ['karte', '/speisekarte.html']]) {
      await page.goto(BASE + pfad, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      const ueber = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);
      pruef(ueber <= 1, `${datei} @${name}px kein Querscroll`, `Überhang ${ueber}px`);
      await page.screenshot({ path: `${OUT}/${datei}-${name}.png`, fullPage: false });
    }

    // Buch nur ab 760px
    await page.goto(BASE + '/speisekarte.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(900);
    const buchAktiv = await page.evaluate(() =>
      document.querySelector('[data-buch-huelle]').getAttribute('data-aktiv'));
    const erwartet = w >= 760 ? 'true' : 'false';
    pruef(buchAktiv === erwartet, `Buch @${name}px ${erwartet === 'true' ? 'aktiv' : 'aus'}`, `ist ${buchAktiv}`);

    if (w >= 760) {
      const seiten = await page.evaluate(() => document.querySelectorAll('[data-buch-ziel] .seite').length);
      pruef(seiten >= 4, `Buch @${name}px hat Seiten`, `${seiten} Seiten`);
      await page.screenshot({ path: `${OUT}/buch-${name}.png` });

      // Tastatur: vorblättern
      await page.locator('[data-buch="speisen"] [data-buch-vor]').focus();
      const vor = await page.evaluate(() =>
        document.querySelector('[data-buch="speisen"] [data-buch-stand]').textContent);
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(1100);
      const nach = await page.evaluate(() =>
        document.querySelector('[data-buch="speisen"] [data-buch-stand]').textContent);
      pruef(vor !== nach, `Tastatur blättert @${name}px`, `${vor} → ${nach}`);
    }
    await ctx.close();
  }

  // ---------- Ohne JavaScript ----------
  {
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE + '/speisekarte.html', { waitUntil: 'load' });
    const r = await page.evaluate(() => 0).catch(() => null); // JS aus
    const text = await page.textContent('body');
    for (const probe of ['Spaghetti Carbonara', '13,40', 'Pizza La Bonta', 'Glutenhaltig', 'Espresso']) {
      pruef(text.includes(probe), `Ohne JS sichtbar: ${probe}`);
    }
    const sichtbar = await page.isVisible('.karte-liste[data-karte="abend"]');
    pruef(sichtbar, 'Ohne JS: Liste sichtbar');
    await page.screenshot({ path: `${OUT}/ohne-js.png` });
    await ctx.close();
  }

  // ---------- Reduzierte Bewegung ----------
  {
    const ctx = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE + '/index.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const unsichtbar = await page.evaluate(() =>
      [...document.querySelectorAll('[data-animate]')]
        .filter(e => getComputedStyle(e).opacity !== '1').length);
    pruef(unsichtbar === 0, 'Reduzierte Bewegung: Inhalte sichtbar', `${unsichtbar} unsichtbar`);

    await page.goto(BASE + '/speisekarte.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(700);
    const buch = await page.evaluate(() =>
      document.querySelector('[data-buch-huelle]').getAttribute('data-aktiv'));
    pruef(buch === 'false', 'Reduzierte Bewegung: kein Buch', `ist ${buch}`);
    await ctx.close();
  }

  // ---------- Telefon in Daumenreichweite @320 ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 320, height: 640 } });
    const page = await ctx.newPage();
    await page.goto(BASE + '/index.html', { waitUntil: 'networkidle' });
    const box = await page.locator('.ruf-leiste .ruf').boundingBox();
    const sichtbar = box && box.y < 640 && box.y > 400;
    pruef(sichtbar, 'Anrufen @320px ohne Scrollen erreichbar',
          box ? `y=${Math.round(box.y)}, h=${Math.round(box.height)}` : 'nicht gefunden');
    const href = await page.getAttribute('.ruf-leiste .ruf', 'href');
    pruef(href === 'tel:+4937371440929', 'Telefonlink korrekt', href);
    await ctx.close();
  }


  // ---------- Kontrast der durchgefärbten Bedienelemente ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE + '/index.html', { waitUntil: 'networkidle' });
    const eisTop = await page.evaluate(() => document.getElementById('eis').offsetTop);
    const messwerte = [];
    for (const frac of [0.05, 0.25, 0.45, 0.65, 0.85]) {
      await page.evaluate(y => window.scrollTo(0, y), eisTop + frac * 900);
      await page.waitForTimeout(1500);
      messwerte.push(await page.evaluate(() => {
        const rgb = s => s.match(/\d+/g).map(Number);
        const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
        const L = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
        const cr = (a, b) => { const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
        const out = {};
        for (const [name, sel] of [['Kopf-Anrufen', '.kopf .knopf--ruf'], ['Sorte', '[data-eis-name]']]) {
          const el = document.querySelector(sel); if (!el) continue;
          const cs = getComputedStyle(el);
          let bg = cs.backgroundColor, n = el;
          while (bg === 'rgba(0, 0, 0, 0)' && n.parentElement) { n = n.parentElement; bg = getComputedStyle(n).backgroundColor; }
          out[name] = { v: cr(rgb(cs.color), rgb(bg)), sorte: document.querySelector('[data-eis-name]').textContent };
        }
        return out;
      }));
    }
    for (const m of messwerte) {
      const v = m['Kopf-Anrufen'];
      pruef(v.v >= 4.5, `Anruf-Knopf lesbar bei ${v.sorte}`, v.v.toFixed(2) + ':1');
    }
    await ctx.close();
  }

  await browser.close();
  console.log('\n' + (fehler.length ? `${fehler.length} Fehler` : 'Alle Prüfungen bestanden'));
  process.exit(fehler.length ? 1 : 0);
})();
