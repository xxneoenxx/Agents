/*
 * Erzeugt eine eigenständige Vorschau-Datei (vorschau.html) aus index.html:
 *  - CSS und JavaScript werden direkt eingebettet
 *  - alle Bilder werden als Data-URI eingebettet
 *  - die Google-Maps-Karte wird durch einen sichtbaren Platzhalter ersetzt
 *  - interne Unterseiten-Links werden neutralisiert
 *
 * So lässt sich die Seite als EINZELNE Datei ansehen (auch ohne Server,
 * auch auf dem Handy). Für den echten Upload immer index.html verwenden.
 *
 * Aufruf:  npm run preview   (führt vorher den CSS-Build aus)
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const p = (rel) => path.join(root, rel);

let html = fs.readFileSync(p('index.html'), 'utf8');
const css = fs.readFileSync(p('assets/css/styles.css'), 'utf8');
const js = fs.readFileSync(p('assets/js/main.js'), 'utf8');

const dataUri = (rel, mime) =>
  `data:${mime};base64,` + fs.readFileSync(p(rel)).toString('base64');

// 1. CSS einbetten
html = html.replace(
  '<link rel="stylesheet" href="/assets/css/styles.css" />',
  '<style>\n' + css + '\n</style>'
);

// 2. Bilder (SVG) als Data-URI einbetten
html = html.replace(/\/assets\/img\/([a-z0-9-]+)\.svg/g, (m, name) =>
  dataUri(`assets/img/${name}.svg`, 'image/svg+xml')
);

// 3. JavaScript einbetten
html = html.replace(
  /<script src="\/assets\/js\/main\.js" defer><\/script>/,
  '<script>\n' + js + '\n</script>'
);

// 4. Google-Maps-iframe → sichtbarer Platzhalter (externe iframes laden lokal nicht)
html = html.replace(
  /<div class="overflow-hidden rounded-2xl shadow-card">\s*<iframe[\s\S]*?<\/iframe>\s*<\/div>/,
  `<a href="https://www.google.com/maps?q=Markt+20,+09328+Lunzenau" target="_blank" rel="noopener" class="flex h-[320px] w-full flex-col items-center justify-center gap-2 rounded-2xl bg-brand-50 text-center text-brand shadow-card">
    <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"/></svg>
    <span class="font-display font-bold">Google-Maps-Karte</span>
    <span class="text-sm">Markt 20, 09328 Lunzenau</span>
    <span class="text-xs">(in der Live-Website als interaktive Karte eingebettet)</span>
  </a>`
);

// 5. Interne Unterseiten-Links in der Einzeldatei neutralisieren
html = html.replace(
  /href="\/(impressum|datenschutz)\.html"/g,
  'href="#" title="Im echten Upload als $1.html verfügbar"'
);

// 6. Hinweis-Banner
const banner = `
  <div style="position:fixed;left:0;right:0;bottom:0;z-index:200;background:#241F1C;color:#FBF6EF;font:14px/1.4 Inter,system-ui,sans-serif;padding:10px 16px;text-align:center">
    Eigenständige Vorschau (Bilder = Illustrationen, Karte als Vorschau) &middot; für den echten Upload <code>index.html</code> verwenden.
  </div>
`;
html = html.replace('</body>', banner + '</body>');

fs.writeFileSync(p('vorschau.html'), html);
console.log(
  'vorschau.html erstellt –',
  (Buffer.byteLength(html) / 1024).toFixed(0),
  'KB'
);
