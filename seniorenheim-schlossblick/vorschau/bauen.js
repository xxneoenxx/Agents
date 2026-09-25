/**
 * Erzeugt die beiden Vorschaudateien für den Kundentermin.
 *
 *   node vorschau/bauen.js
 *
 * Variante A kommt aus dem Git-Verlauf (Stand 4fe2596, die glänzende
 * Landingpage-Fassung), Variante B aus dem Arbeitsverzeichnis. Beide werden
 * fürs iPhone gehärtet und bekommen unten die Umschaltleiste.
 *
 * Warum aus Git und nicht nachgebaut: So ist Variante A garantiert exakt die
 * Fassung, die damals entstanden ist, und nicht eine Rekonstruktion davon.
 * Sie bekommt nur Funktionskorrekturen: die echten Zahlen im „Das Haus" und
 * die Karten. Die Karten übernimmt sie Baustein für Baustein aus der echten
 * Seite (Markierungen KARTE:…:START/END) – eine Quelle, kein Doppelcode.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const HIER = __dirname;
const PROJEKT = path.resolve(HIER, '..');
const REPO = path.resolve(PROJEKT, '..');

const VARIANTEN = [
  {
    datei: 'variante-a-landingpage.html',
    quelle: { git: '4fe2596', pfad: 'seniorenheim-schlossblick/index.html' },
    titel: 'Variante A – Landingpage',
    andere: { datei: 'variante-b-heimseite.html', titel: 'Variante B' },
    nachbessern: varianteANachbessern
  },
  {
    datei: 'variante-b-heimseite.html',
    quelle: { arbeitskopie: path.join(PROJEKT, 'index.html') },
    titel: 'Variante B – Heimseite',
    andere: { datei: 'variante-a-landingpage.html', titel: 'Variante A' }
  }
];

/* Mitkopiert, damit die Links in der Fußzeile nicht ins Leere laufen */
const BEILAGEN = ['impressum.html', 'datenschutz.html'];

/* ── Quelle lesen ───────────────────────────────────────────────────────── */
function lies(q) {
  if (q.arbeitskopie) return fs.readFileSync(q.arbeitskopie, 'utf8');
  return execFileSync('git', ['show', `${q.git}:${q.pfad}`], { cwd: REPO, maxBuffer: 64 * 1024 * 1024 }).toString();
}

/* Ersetzt genau eine Stelle – oder bricht ab. Stillschweigend nichts zu
   ersetzen wäre hier der schlimmste Fehler: Dann sähe die Vorschau fertig
   aus und wäre es nicht. Ersetzt wird immer über eine Funktion, damit
   Zeichenfolgen wie $& im eingefügten Code nicht als Muster gelten. */
function ersetze(s, suche, neu, was) {
  const zahl = typeof suche === 'string'
    ? s.split(suche).length - 1
    : (s.match(new RegExp(suche.source, suche.flags.includes('g') ? suche.flags : suche.flags + 'g')) || []).length;
  if (zahl !== 1) throw new Error(`${was}: ${zahl} Fundstellen statt genau einer`);
  return s.replace(suche, typeof neu === 'function' ? neu : () => neu);
}

/* Schneidet einen markierten Baustein aus der echten Seite */
function baustein(quelle, start, ende, was) {
  const a = quelle.indexOf(start);
  const b = quelle.indexOf(ende, a);
  if (a < 0 || b < 0 || quelle.indexOf(start, a + 1) >= 0) throw new Error(`Baustein ${was} nicht eindeutig gefunden`);
  return quelle.slice(a, b + ende.length);
}

/* ── Härtung für iOS ────────────────────────────────────────────────────────
   Variante B trägt das bereits; Variante A stammt von davor und bekommt es
   hier nachgereicht. Beide Schritte prüfen erst, ob es schon da ist.       */
function haerten(s) {
  // Ohne JavaScript sollen dieselben Regeln greifen wie bei "Bewegung aus".
  // Die Klasse .js setzt ein Inline-Skript im <head>; fehlt sie, fehlt JS.
  if (!s.includes(':root:not(.js)')) {
    s = s.replace(
      /((?::root\[data-motion="off"\][^{};]*)(?:,\s*[^{};]+)*)\{/g,
      (m, sel) => sel.split(',')
        .map(x => x.trim())
        .flatMap(x => x.includes(':root[data-motion="off"]')
          ? [x, x.replace(':root[data-motion="off"]', ':root:not(.js)')]
          : [x])
        .join(',\n') + '{'
    );
    s = s.replace(
      '.hdr.is-stuck{',
      ':root:not(.js) .hdr{background:var(--porzellan);border-bottom-color:var(--linie-stark)}\n.hdr.is-stuck{'
    );
  }

  // svh gibt es erst ab iOS 15.4. Ohne Rückfall springt die gepinnte Bühne,
  // sobald Safari die Adressleiste ein- oder ausblendet.
  if (!s.includes('/* Rückfall: svh')) {
    s = s.replace(
      /\.flight__stage\{\s*\n\s*position:sticky;top:0;height:100svh;overflow:hidden;/,
      '.flight__stage{\n  position:sticky;top:0;\n  height:100vh;      /* Rückfall: svh gibt es erst ab iOS 15.4 */\n  height:100svh;\n  overflow:hidden;'
    );
  }

  if (!s.includes('iOS-Härtung')) {
    s = s.replace('/* ── Basis ───', `/* ── iOS-Härtung ──────────────────────────────────────────────────────────
   Safe Area für Geräte mit Home-Indikator, und das Filmkorn (mix-blend-mode
   über sechs Ebenen) kostet auf Touchgeräten spürbar Bildrate.             */
@supports (padding:max(0px)){
  .a11y{bottom:max(1rem,env(safe-area-inset-bottom));right:max(1rem,env(safe-area-inset-right))}
  .ftr{padding-bottom:calc(var(--sp-4) + env(safe-area-inset-bottom))}
}
@media (hover:none){ .grain{display:none} }

/* ── Basis ───`);
    s = s.replace(
      '  overflow-x:hidden;\n  text-rendering:optimizeLegibility;\n}',
      '  overflow-x:hidden;\n  text-rendering:optimizeLegibility;\n  -webkit-tap-highlight-color:rgba(43,106,115,.14);\n}\nbutton,a,summary,label,select,input[type="date"]{touch-action:manipulation}'
    );
  }
  return s;
}

/* ── Variante A: Funktionskorrekturen ──────────────────────────────────────
   Läuft NACH haerten(): Die Kartenbausteine bringen eigene :root:not(.js)-
   Regeln mit, und haerten() spiegelt nur, solange es noch keine gibt.      */
function varianteANachbessern(s, echt) {
  // 1 · Die Zahlen standen fest auf 0; der echte Wert lebte nur im Skript.
  //     In der Dateivorschau des iPhones blieb deshalb überall die 0 stehen.
  const vorher = (s.match(/<span class="stat__num" data-count="\d+">0<\/span>/g) || []).length;
  if (vorher !== 4) throw new Error(`Zahlen: ${vorher} statt 4 Fundstellen`);
  s = s.replace(/(<span class="stat__num" data-count="(\d+)">)0(<\/span>)/g, (m, a, zahl, b) => a + zahl + b);

  s = ersetze(s, `/* ═══ 4 · Zahlen zählen hoch ═══════════════════════════════════════════════ */
$$('[data-count]').forEach(el => {
  const end = +el.dataset.count;
  if (!MOTION || !('IntersectionObserver' in window)) { el.textContent = end; return; }
  const io = new IntersectionObserver((es, obs) => es.forEach(e => {
    if (!e.isIntersecting) return;
    obs.disconnect();
    const t0 = performance.now(), dur = 1500;
    (function step(now) {
      const p = clamp01((now - t0) / dur);
      el.textContent = Math.round(end * easeOut(p));
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }), { threshold: .4 });
  io.observe(el);
});`, `/* ═══ 4 · Zahlen zählen hoch ═══════════════════════════════════════════════
   Die echte Zahl steht im HTML und bleibt stehen, wenn hier nichts läuft.
   Gezählt wird nur, wenn sie wirklich ins Bild kommt, und ein Zeitgeber
   setzt am Ende in jedem Fall den Endwert – auch wenn
   requestAnimationFrame hängen bleibt.                                    */
$$('[data-count]').forEach(el => {
  const end = +el.dataset.count;
  if (!MOTION || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((es, obs) => es.forEach(e => {
    if (!e.isIntersecting) return;
    obs.disconnect();
    const t0 = performance.now(), dur = 1500;
    const sicher = setTimeout(() => { el.textContent = end; }, dur + 300);
    (function step(now) {
      const p = clamp01((now - t0) / dur);
      el.textContent = Math.round(end * easeOut(p));
      if (p < 1) requestAnimationFrame(step); else clearTimeout(sicher);
    })(t0);
  }), { threshold: .4 });
  io.observe(el);
});`, 'Zähler');

  // 2 · Karten aus der echten Seite übernehmen
  const libCss = baustein(echt, '<!-- KARTE:LIB-CSS:START', '<!-- KARTE:LIB-CSS:END -->', 'Leaflet-CSS');
  const css = baustein(echt, '/* KARTE:CSS:START', '/* KARTE:CSS:END */', 'Karten-CSS');
  const haus = baustein(echt, '      <!-- KARTE:HAUS:START', '<!-- KARTE:HAUS:END -->', 'Das Haus');
  const kontakt = baustein(echt, '        <!-- KARTE:KONTAKT:START', '<!-- KARTE:KONTAKT:END -->', 'Kontakt');
  const js = baustein(echt, '<!-- KARTE:JS:START', '<!-- KARTE:JS:END -->', 'Skripte');

  s = ersetze(s, '\n<style>\n/* ═══', () => `\n${libCss}\n\n<style>\n/* ═══`, 'Leaflet-CSS einsetzen');
  s = ersetze(s, '/* ── Druckfassung ───', () => `${css}\n\n/* ── Druckfassung ───`, 'Karten-CSS einsetzen');
  s = ersetze(s,
    /      <div class="frame">\n        <!-- Lageskizze: das Haus im Verhältnis zu Fluss, Schloss und Haltestelle -->\n        <svg viewBox="0 0 640 520"[\s\S]*?\n        <\/svg>\n        <span class="frame__tag">Lage in Rochsburg<\/span>\n      <\/div>\n/,
    () => haus + '\n', 'Lageskizze ersetzen');
  s = ersetze(s,
    /        <div class="map">\n          <svg viewBox="0 0 700 460"[\s\S]*?\n          <\/svg>\n        <\/div>\n        <p class="note">Bewusst ohne eingebettete Fremdkarte[\s\S]*?<\/p>\n/,
    () => kontakt + '\n', 'Anfahrtsskizze ersetzen');
  s = ersetze(s,
    /          <a class="btn btn--ghost" href="https:\/\/www\.openstreetmap\.org\/search\?query=[^"]*" target="_blank" rel="noopener noreferrer">\n            Route öffnen\n            <svg[^\n]*<\/svg>\n          <\/a>\n/,
    '', 'Knopf „Route öffnen" entfernen');
  s = ersetze(s, '</script>\n</body>', () => `</script>\n\n${js}\n</body>`, 'Kartenskripte einsetzen');
  // Mit Karte und Ortsliste ist die linke Kontaktspalte die längere –
  // die rechte soll oben anfangen, nicht auf halber Höhe.
  s = ersetze(s, `<h2 data-animate>So erreichen Sie uns</h2>
    </div>
    <div class="split">`, `<h2 data-animate>So erreichen Sie uns</h2>
    </div>
    <div class="split" style="align-items:start">`, 'Kontaktspalten oben ausrichten');

  // 3 · Barrierefreiheits-Rad: '[data-motion]' traf auch <html data-motion="off">,
  //     dann setzte jeder Klick auf die Seite die gedrückten Knöpfe zurück.
  for (const k of ['fs', 'contrast', 'motion']) {
    s = ersetze(s, `group('[data-${k}]'`, `group('.a11y__opt[data-${k}]'`, `Rad ${k}`);
    s = ersetze(s, `$$('[data-${k}]').forEach(b => b.setAttribute`, `$$('.a11y__opt[data-${k}]').forEach(b => b.setAttribute`, `Rad ${k} Start`);
  }

  // 4 · Druck: Was beim Drucken noch nicht eingeblendet war, stand unsichtbar
  //     auf dem Papier – bei sofortigem Drucken also fast die ganze Seite.
  s = ersetze(s, `@media print{
  @page{margin:1.5cm}
  :root{--fs-scale:1}
`, `@media print{
  @page{margin:1.5cm}
  :root{--fs-scale:1}
  [data-animate]{opacity:1!important;transform:none!important}
`, 'Druck: eingeblendete Blöcke');

  // 5 · Kommentare, die nicht mehr stimmen
  s = ersetze(s, `Es ist der EINZIGE externe Request dieser
     Seite; danach lädt sie vollständig aus eigener Hand. -->`,
  `Danach kommt nur noch die Karte von außen
     (OpenStreetMap, siehe Datenschutzerklärung Abschnitt 8). -->`, 'Kommentar Schriften (Kopf)');
  s = ersetze(s, '   Es ist der EINZIGE externe Request dieser Seite.\n',
    '   Neben der Karte (OpenStreetMap) ist das der einzige Abruf von fremden\n   Servern.\n', 'Kommentar Schriften (CSS)');
  s = ersetze(s, `   Gründe: (1) die Seite lädt dadurch nichts von fremden Servern nach —
   für einen Pflegeträger in Deutschland der sauberere Weg; (2) sie
   funktioniert auch offline und ohne CDN; (3) die Kamerafahrt braucht
   ohnehin nur eine Zeitachse, und die sind hier 40 Zeilen.`,
  `   Gründe: (1) der Code kommt vollständig aus dieser Datei, kein CDN —
   für einen Pflegeträger in Deutschland der sauberere Weg; (2) er
   funktioniert auch offline; (3) die Kamerafahrt braucht ohnehin nur eine
   Zeitachse, und die sind hier 40 Zeilen.
   Die eine Ausnahme sind die Karten am Ende der Datei: Dafür ist Leaflet
   eingebettet, die Kartenbilder kommen von OpenStreetMap.`, 'Kommentar Skript');
  return s;
}

/* ── Umschaltleiste ─────────────────────────────────────────────────────────
   Unten statt oben: oben käme sie der festen Kopfzeile und der gepinnten
   Bildstrecke ins Gehege, unten liegt sie auf dem Telefon unter dem Daumen. */
function leiste(v) {
  const css = `
/* ══ Vorschauleiste ══════════════════════════════════════════════════════
   Gehört NICHT zur Website. Wird von vorschau/bauen.js eingefügt, damit im
   Kundentermin klar ist, welcher Entwurf zu sehen ist und man umschalten
   kann, ohne zurück in die Dateien-App zu müssen.                        */
:root{--vorschau-h:3.5rem}
body{padding-bottom:calc(var(--vorschau-h) + env(safe-area-inset-bottom,0px))}
.vorschau{
  position:fixed;left:0;right:0;bottom:0;z-index:300;
  display:flex;align-items:center;justify-content:space-between;gap:1rem;
  min-height:var(--vorschau-h);
  padding:.5rem clamp(.9rem,3vw,1.6rem);
  padding-bottom:calc(.5rem + env(safe-area-inset-bottom,0px));
  background:#16232A;color:#C2D2D4;border-top:3px solid #D9A441;
  font-family:'Atkinson Hyperlegible',system-ui,-apple-system,sans-serif;
  font-size:.8rem;font-weight:700;line-height:1.25;
}
.vorschau span{min-width:0}
.vorschau b{color:#fff;display:block;font-size:.92rem}
.vorschau em{font-style:normal;letter-spacing:.11em;text-transform:uppercase;
  font-size:.66rem;color:#8FA8AB;display:block;margin-bottom:.12rem}
.vorschau a{
  color:#fff;background:#2B6A73;text-decoration:none;white-space:nowrap;
  padding:.62rem 1rem;border-radius:.2rem;border:2px solid #2B6A73;flex:none;
}
.vorschau a:hover,.vorschau a:focus-visible{background:#3E7D86;border-color:#3E7D86}
@media (max-width:460px){
  .vorschau{font-size:.74rem;padding:.4rem .8rem;padding-bottom:calc(.4rem + env(safe-area-inset-bottom,0px))}
  .vorschau em{display:none}
  .vorschau b{font-size:.84rem}
  .vorschau a{padding:.55rem .8rem}
}
/* Alles, was sonst unten klebt, über die Leiste heben */
.a11y{bottom:calc(var(--vorschau-h) + 1rem + env(safe-area-inset-bottom,0px))!important}
.captions{bottom:calc(var(--vorschau-h) + clamp(1rem,4vh,2.4rem))!important}
@media print{ .vorschau{display:none!important} body{padding-bottom:0!important} }
`;
  const html = `
<div class="vorschau">
  <span><em>Entwurf · nicht veröffentlicht</em><b>${v.titel}</b></span>
  <a href="${v.andere.datei}">${v.andere.titel} ansehen →</a>
</div>
<script>
/* Die Leiste misst sich selbst. Auf dem iPhone bricht der Text um und sie
   wird höher als jede geratene Zahl – dann säße das Barrierefreiheits-Rad
   darauf. */
(function () {
  var l = document.querySelector('.vorschau');
  if (!l) return;
  var setzen = function () {
    document.documentElement.style.setProperty('--vorschau-h', l.offsetHeight + 'px');
  };
  setzen();
  addEventListener('resize', setzen);
  addEventListener('orientationchange', function () { setTimeout(setzen, 250); });
})();
<\/script>
`;
  return { css, html };
}

/* ── Bauen ──────────────────────────────────────────────────────────────── */
const echt = fs.readFileSync(path.join(PROJEKT, 'index.html'), 'utf8');
let n = 0;
for (const v of VARIANTEN) {
  let s = haerten(lies(v.quelle));
  if (v.nachbessern) s = v.nachbessern(s, echt);
  const { css, html } = leiste(v);

  // Eigener Block am Ende des <head>: kommt nach dem Stylesheet der Seite
  // und gewinnt deshalb bei gleicher Spezifität.
  s = ersetze(s, '</head>', () => `<style>${css}</style>\n</head>`, 'Leistenstil einsetzen');
  s = ersetze(s, /<\/body>/, () => html + '</body>', 'Leiste einsetzen');
  s = s.replace(/<title>[^<]*<\/title>/, () => `<title>${v.titel} · Seniorenheim Schlossblick Rochsburg</title>`);
  // Entwürfe gehören nicht in die Suche.
  if (!s.includes('name="robots"')) {
    s = s.replace('</head>', () => '<meta name="robots" content="noindex, nofollow">\n</head>');
  }

  const ziel = path.join(HIER, v.datei);
  fs.writeFileSync(ziel, s);
  console.log(`${v.datei}  ${(Buffer.byteLength(s) / 1024).toFixed(0)} KB`);
  n++;
}
for (const b of BEILAGEN) {
  fs.copyFileSync(path.join(PROJEKT, b), path.join(HIER, b));
  console.log(`${b}  (kopiert)`);
}
console.log(`\n${n} Vorschaudateien geschrieben.`);
