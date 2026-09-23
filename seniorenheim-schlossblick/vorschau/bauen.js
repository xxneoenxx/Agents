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
    titel: 'Variante A — Landingpage',
    andere: { datei: 'variante-b-heimseite.html', titel: 'Variante B' }
  },
  {
    datei: 'variante-b-heimseite.html',
    quelle: { arbeitskopie: path.join(PROJEKT, 'index.html') },
    titel: 'Variante B — Heimseite',
    andere: { datei: 'variante-a-landingpage.html', titel: 'Variante A' }
  }
];

/* ── Quelle lesen ───────────────────────────────────────────────────────── */
function lies(q) {
  if (q.arbeitskopie) return fs.readFileSync(q.arbeitskopie, 'utf8');
  return execFileSync('git', ['show', `${q.git}:${q.pfad}`], { cwd: REPO, maxBuffer: 64 * 1024 * 1024 }).toString();
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
let n = 0;
for (const v of VARIANTEN) {
  let s = haerten(lies(v.quelle));
  const { css, html } = leiste(v);

  s = s.replace('</style>', css + '</style>');
  s = s.replace('</body>', html + '</body>');
  s = s.replace(/<title>[^<]*<\/title>/, `<title>${v.titel} · Seniorenheim Schlossblick Rochsburg</title>`);
  // Entwürfe gehören nicht in die Suche.
  if (!s.includes('name="robots"')) {
    s = s.replace('</head>', '<meta name="robots" content="noindex, nofollow">\n</head>');
  }

  const ziel = path.join(HIER, v.datei);
  fs.writeFileSync(ziel, s);
  console.log(`${v.datei}  ${(Buffer.byteLength(s) / 1024).toFixed(0)} KB`);
  n++;
}
console.log(`\n${n} Vorschaudateien geschrieben.`);
