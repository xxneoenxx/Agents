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
    // Das Buch ist jetzt auf JEDER Breite sofort da, ohne Knopfdruck.
    pruef(buchAktiv === 'true', `Buch @${name}px sofort aktiv`, `ist ${buchAktiv}`);

    const einzel = await page.evaluate(() =>
      !!document.querySelector('[data-buch-ziel].buch--einzel'));
    pruef(einzel === (w < 760), `Buch @${name}px ${w < 760 ? 'als Einzelseite' : 'als Doppelseite'}`,
      `einzel=${einzel}`);

    {
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
    // Bei reduzierter Bewegung bleibt das Buch, blättert aber ohne Animation.
    const buch = await page.evaluate(() => ({
      aktiv: document.querySelector('[data-buch-huelle]').getAttribute('data-aktiv'),
      seiten: document.querySelectorAll('[data-buch="speisen"] .seite').length
    }));
    pruef(buch.aktiv === 'true' && buch.seiten > 4,
      'Reduzierte Bewegung: Buch bleibt, ruhig', `aktiv=${buch.aktiv}, ${buch.seiten} Seiten`);
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


  // ---------- Buch übersteht Größenänderung ----------
  // Regressionsschutz: StPageFlip ersetzt beim Initialisieren sein Zielelement.
  // Ohne frisches Ziel je Aufbau verschwand das Buch beim zweiten Mal.
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE + '/speisekarte.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const vor = await page.evaluate(() => document.querySelectorAll('[data-buch="speisen"] .seite').length);

    for (const [w, h] of [[1000, 800], [1280, 900], [900, 700]]) {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(700);
    }
    const nach = await page.evaluate(() => ({
      aktiv: document.querySelector('[data-buch-huelle]').getAttribute('data-aktiv'),
      seiten: document.querySelectorAll('[data-buch="speisen"] .seite').length
    }));
    pruef(nach.aktiv === 'true' && nach.seiten > 4,
      'Buch übersteht mehrfache Größenänderung', `${vor} → ${nach.seiten} Seiten, aktiv=${nach.aktiv}`);

    // Ein Klick darf nach den Neuaufbauten genau einen Schritt gehen
    const s1 = await page.evaluate(() => document.querySelector('[data-buch="speisen"] [data-buch-stand]').textContent);
    await page.click('[data-buch="speisen"] [data-buch-vor]');
    await page.waitForTimeout(1200);
    const s2 = await page.evaluate(() => document.querySelector('[data-buch="speisen"] [data-buch-stand]').textContent);
    const nr = t => parseInt(t.match(/\d+/)[0], 10);
    pruef(nr(s2) - nr(s1) === 2, 'Ein Klick = eine Doppelseite (keine Mehrfach-Handler)', `${s1} → ${s2}`);
    await ctx.close();
  }


  // ---------- Seitenumbruch des Buchs ----------
  // Zwei frühere Fehler: die Messprobe lag außerhalb von .buch und bekam
  // deshalb keinen Innenabstand (rund 50 px zu viel Platz), und Rubrik-
  // Überschriften konnten allein am Seitenfuß landen.
  {
    for (const [w, h] of [[1440, 900], [900, 800]]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } });
      const page = await ctx.newPage();
      await page.goto(BASE + '/speisekarte.html', { waitUntil: 'networkidle' });
      await page.waitForTimeout(1300);
      const r = await page.evaluate(() => {
        const seiten = [...document.querySelectorAll('[data-buch="speisen"] .seite')];
        const waisen = [], ueber = [];
        seiten.forEach((s, i) => {
          const kinder = [...s.children].filter(c => !c.classList.contains('seite__nr'));
          const letzte = kinder[kinder.length - 1];
          if (letzte && letzte.classList.contains('rubrik__titel')) waisen.push(i + 1);
          if (s.scrollHeight > s.clientHeight + 2) ueber.push(i + 1);
        });
        return { n: seiten.length, waisen, ueber };
      });
      pruef(r.ueber.length === 0, `Keine überlaufende Buchseite @${w}px`,
        r.ueber.length ? 'Seiten ' + r.ueber.join(',') : `${r.n} Seiten sauber`);
      pruef(r.waisen.length === 0, `Keine Rubrik-Überschrift am Seitenfuß @${w}px`,
        r.waisen.length ? 'Seiten ' + r.waisen.join(',') : 'geprüft');
      await ctx.close();
    }
  }


  // ---------- Buch in ausgeblendetem Bereich ----------
  // Regressionsschutz: Ist der Bereich noch ausgeblendet, ist seine Breite 0.
  // StPageFlip warf dann "Invalid width or height" und riss den ganzen
  // Skriptlauf mit. Der Aufbau muss stattdessen verschoben werden.
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(String(e).split('\n')[0]));
    await page.goto(BASE + '/speisekarte.html', { waitUntil: 'networkidle' });
    // Bereich ausblenden und Neuaufbau erzwingen
    await page.evaluate(() => {
      document.querySelectorAll('[data-buch]').forEach(s => { s.style.display = 'none'; });
      if (window.__buecherNeu) window.__buecherNeu();
    });
    await page.waitForTimeout(600);
    pruef(errs.length === 0, 'Kein Fehler bei ausgeblendetem Buchbereich', errs.slice(0, 1).join(''));

    // Wieder einblenden: das Buch muss zurückkommen
    await page.evaluate(() => {
      document.querySelectorAll('[data-buch]').forEach(s => { s.style.display = ''; });
      if (window.__buecherNeu) window.__buecherNeu();
    });
    await page.waitForTimeout(1200);
    const zurueck = await page.evaluate(() => ({
      aktiv: document.querySelector('[data-buch-huelle]').getAttribute('data-aktiv'),
      seiten: document.querySelectorAll('[data-buch="speisen"] .seite').length
    }));
    pruef(zurueck.aktiv === 'true' && zurueck.seiten > 4,
      'Buch kommt nach dem Einblenden zurück', `aktiv=${zurueck.aktiv}, ${zurueck.seiten} Seiten`);
    await ctx.close();
  }

  await browser.close();
  console.log('\n' + (fehler.length ? `${fehler.length} Fehler` : 'Alle Prüfungen bestanden'));
  process.exit(fehler.length ? 1 : 0);
})();
