/*
 * Erzeugt appetitliche SVG-Platzhalter-Illustrationen in der Markenfarbwelt.
 * Diese ersetzen vorübergehend echte Fotos. Aufruf: node tools/gen-art.js
 * → Echte Fotos einfach unter gleichem Dateinamen (.jpg) im img/ ablegen
 *   und im HTML den Pfad anpassen (siehe README).
 */
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'assets', 'img');

const C = {
  cream: '#FBF6EF', cream2: '#F3E8D9',
  red: '#E0402F', redD: '#9C2316',
  orange: '#F08A24', orangeD: '#D57313',
  ink: '#241F1C', inkL: '#403933',
  green: '#7BA05B', greenD: '#557039',
  bun: '#E3B774', bunD: '#C9974F',
  meat: '#A6532E', meatD: '#7E3C20',
  white: '#FFFDFA',
};

function svg(w, h, body, defs = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${C.cream}"/><stop offset="1" stop-color="${C.cream2}"/>
  </linearGradient>
  <radialGradient id="plate" cx="50%" cy="42%" r="60%">
    <stop offset="0" stop-color="${C.white}"/><stop offset="1" stop-color="#ECE1D2"/>
  </radialGradient>
  ${defs}
</defs>
${body}
</svg>`;
}

// runde Servierplatte
function plate(cx, cy, r) {
  return `<ellipse cx="${cx}" cy="${cy + r * 0.12}" rx="${r}" ry="${r * 0.92}" fill="rgba(36,31,28,0.10)"/>
  <ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 0.9}" fill="url(#plate)"/>
  <ellipse cx="${cx}" cy="${cy}" rx="${r * 0.74}" ry="${r * 0.66}" fill="none" stroke="#E0D3C2" stroke-width="${r * 0.03}"/>`;
}

// Döner / Dürüm (gerollter Wrap)
function doener(cx, cy, s) {
  return `<g transform="translate(${cx} ${cy}) scale(${s})">
    <path d="M -70 120 L -40 -120 Q 0 -150 40 -120 L 70 120 Q 0 150 -70 120 Z" fill="${C.bun}"/>
    <path d="M -70 120 L -40 -120 Q 0 -150 40 -120 L 70 120 Q 0 150 -70 120 Z" fill="none" stroke="${C.bunD}" stroke-width="6"/>
    <path d="M -52 -70 Q 0 -95 52 -70" stroke="${C.green}" stroke-width="14" fill="none" stroke-linecap="round"/>
    <path d="M -56 -30 Q 0 -8 56 -30" stroke="${C.meat}" stroke-width="20" fill="none" stroke-linecap="round"/>
    <path d="M -58 18 Q 0 42 58 18" stroke="${C.red}" stroke-width="14" fill="none" stroke-linecap="round"/>
    <path d="M -60 60 Q 0 84 60 60" stroke="${C.white}" stroke-width="12" fill="none" stroke-linecap="round"/>
  </g>`;
}

// Frühlingsrollen
function springrolls(cx, cy, s) {
  const roll = (x, y, rot) => `<g transform="translate(${x} ${y}) rotate(${rot})">
    <rect x="-22" y="-78" width="44" height="156" rx="22" fill="${C.bun}"/>
    <rect x="-22" y="-78" width="44" height="156" rx="22" fill="none" stroke="${C.bunD}" stroke-width="5"/>
    <line x1="-10" y1="-50" x2="14" y2="-30" stroke="${C.bunD}" stroke-width="4"/>
    <line x1="-12" y1="0" x2="12" y2="20" stroke="${C.bunD}" stroke-width="4"/>
  </g>`;
  return `<g transform="translate(${cx} ${cy}) scale(${s})">
    ${roll(-34, 6, -18)}${roll(34, -6, 14)}
    <ellipse cx="0" cy="92" rx="34" ry="14" fill="${C.redD}"/>
  </g>`;
}

// Schale mit Bratnudeln
function noodles(cx, cy, s) {
  let strands = '';
  for (let i = -3; i <= 3; i++) {
    strands += `<path d="M ${i * 22} -20 q 14 -34 28 0 q -14 30 0 56" stroke="${C.bun}" stroke-width="7" fill="none" stroke-linecap="round" transform="rotate(${i * 6} 0 0)"/>`;
  }
  return `<g transform="translate(${cx} ${cy}) scale(${s})">
    <path d="M -118 0 A 118 118 0 0 0 118 0 Z" fill="${C.red}"/>
    <path d="M -118 0 A 118 118 0 0 0 118 0 Z" fill="none" stroke="${C.redD}" stroke-width="6"/>
    <ellipse cx="0" cy="0" rx="118" ry="30" fill="${C.orange}"/>
    <ellipse cx="0" cy="-2" rx="104" ry="24" fill="${C.bun}"/>
    ${strands}
    <path d="M -30 -16 q 14 -22 30 0" stroke="${C.green}" stroke-width="8" fill="none" stroke-linecap="round"/>
    <circle cx="40" cy="-8" r="9" fill="${C.meat}"/><circle cx="-46" cy="-4" r="8" fill="${C.meat}"/>
    <line x1="60" y1="-60" x2="120" y2="-150" stroke="${C.inkL}" stroke-width="7" stroke-linecap="round"/>
    <line x1="78" y1="-58" x2="140" y2="-146" stroke="${C.inkL}" stroke-width="7" stroke-linecap="round"/>
  </g>`;
}

// Teller mit Bratreis
function friedrice(cx, cy, s) {
  let grains = '';
  for (let i = 0; i < 60; i++) {
    const a = Math.random() * Math.PI * 2, rr = Math.random() * 90;
    grains += `<ellipse cx="${Math.cos(a) * rr}" cy="${Math.sin(a) * rr * 0.6}" rx="6" ry="3" fill="${C.bun}" transform="rotate(${Math.random() * 180} ${Math.cos(a) * rr} ${Math.sin(a) * rr * 0.6})"/>`;
  }
  return `<g transform="translate(${cx} ${cy}) scale(${s})">
    <ellipse cx="0" cy="6" rx="130" ry="64" fill="${C.cream2}"/>
    <ellipse cx="0" cy="0" rx="120" ry="58" fill="${C.orange}"/>
    <ellipse cx="0" cy="-2" rx="104" ry="48" fill="${C.bun}"/>
    ${grains}
    <circle cx="-30" cy="-6" r="10" fill="${C.meat}"/><circle cx="36" cy="6" r="10" fill="${C.meat}"/>
    <circle cx="6" cy="-18" r="7" fill="${C.green}"/><circle cx="-58" cy="14" r="6" fill="${C.red}"/>
    <circle cx="54" cy="-12" r="6" fill="${C.green}"/>
  </g>`;
}

// Asia-Bowl mit Stäbchen
function bowl(cx, cy, s) {
  return `<g transform="translate(${cx} ${cy}) scale(${s})">
    <path d="M -120 -6 A 120 120 0 0 0 120 -6 Z" fill="${C.red}"/>
    <path d="M -120 -6 A 120 120 0 0 0 120 -6 Z" fill="none" stroke="${C.redD}" stroke-width="6"/>
    <ellipse cx="0" cy="-6" rx="120" ry="32" fill="${C.orange}"/>
    <ellipse cx="0" cy="-8" rx="106" ry="26" fill="${C.bun}"/>
    <path d="M -60 -20 q 30 -18 60 0" stroke="${C.green}" stroke-width="9" fill="none" stroke-linecap="round"/>
    <circle cx="30" cy="-12" r="10" fill="${C.meat}"/><circle cx="-26" cy="-6" r="9" fill="${C.meat}"/>
    <line x1="40" y1="-66" x2="118" y2="-156" stroke="${C.inkL}" stroke-width="7" stroke-linecap="round"/>
    <line x1="58" y1="-64" x2="136" y2="-152" stroke="${C.inkL}" stroke-width="7" stroke-linecap="round"/>
  </g>`;
}

// Getränkebecher
function drink(cx, cy, s) {
  return `<g transform="translate(${cx} ${cy}) scale(${s})">
    <path d="M -48 -70 L 48 -70 L 38 90 Q 0 100 -38 90 Z" fill="${C.red}"/>
    <path d="M -48 -70 L 48 -70 L 44 -36 L -44 -36 Z" fill="${C.cream}" opacity="0.9"/>
    <rect x="14" y="-150" width="10" height="90" rx="5" fill="${C.orange}" transform="rotate(12 19 -105)"/>
    <ellipse cx="0" cy="-70" rx="48" ry="12" fill="${C.redD}"/>
  </g>`;
}

function compose(w, h, scene, label) {
  return svg(w, h, `
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <circle cx="${w * 0.5}" cy="${h * 0.46}" r="${Math.min(w, h) * 0.36}" fill="${C.orange}" opacity="0.10"/>
  <circle cx="${w * 0.5}" cy="${h * 0.46}" r="${Math.min(w, h) * 0.30}" fill="${C.red}" opacity="0.08"/>
  ${scene(w, h)}
  ${label ? `<text x="${w * 0.5}" y="${h - 26}" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-weight="600" font-size="${Math.round(w / 24)}" fill="${C.ink}" opacity="0.6">${label.replace(/&/g,"&amp;")}</text>` : ''}`);
}

// Hero – großzügiges Food-Arrangement
fs.writeFileSync(path.join(dir, 'hero.svg'), svg(1600, 1100, `
  <rect width="1600" height="1100" fill="url(#bg)"/>
  <circle cx="800" cy="520" r="430" fill="${C.orange}" opacity="0.12"/>
  <circle cx="800" cy="520" r="360" fill="${C.red}" opacity="0.08"/>
  ${plate(800, 560, 360)}
  ${noodles(800, 540, 1.5)}
  ${doener(420, 540, 1.25)}
  ${springrolls(1180, 600, 1.35)}
  ${drink(1230, 360, 1.2)}
`));

// Über uns
fs.writeFileSync(path.join(dir, 'ueber-uns.svg'), compose(1200, 1000, (w, h) => `
  ${plate(w * 0.5, h * 0.5, 320)}
  ${friedrice(w * 0.5, h * 0.46, 1.5)}
  ${springrolls(w * 0.22, h * 0.3, 0.9)}
`, ''));

// OG-Bild
fs.writeFileSync(path.join(dir, 'og-image.svg'), svg(1200, 630, `
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="600" cy="300" r="260" fill="${C.orange}" opacity="0.12"/>
  ${doener(250, 330, 1.0)}
  ${noodles(950, 360, 0.95)}
  <circle cx="600" cy="250" r="66" fill="${C.red}"/>
  <text x="600" y="250" text-anchor="middle" dominant-baseline="central" font-family="Poppins, Arial, sans-serif" font-weight="700" font-size="52" fill="${C.cream}">A&amp;D</text>
  <text x="600" y="392" text-anchor="middle" font-family="Poppins, Arial, sans-serif" font-weight="700" font-size="66" fill="${C.ink}">Imbiss Asia &amp; Döner</text>
  <text x="600" y="450" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" letter-spacing="5" fill="${C.red}">DÖNER · ASIA · TRADITIONELL · LUNZENAU</text>
`));

// Gerichte-Fotos (Speisekarte-Highlights)
fs.writeFileSync(path.join(dir, 'fruehlingsrolle.svg'), compose(900, 700, (w, h) => springrolls(w * 0.5, h * 0.42, 1.5), 'Frühlingsrolle'));
fs.writeFileSync(path.join(dir, 'doener-bratnudeln.svg'), compose(900, 700, (w, h) => `${plate(w*0.5,h*0.46,230)}${noodles(w * 0.5, h * 0.42, 1.2)}${doener(w*0.24,h*0.5,0.7)}`, 'Dönerfleisch mit Bratnudeln'));
fs.writeFileSync(path.join(dir, 'bratreis.svg'), compose(900, 700, (w, h) => friedrice(w * 0.5, h * 0.46, 1.6), 'Bratreis mit Fleisch'));

// Galerie (6 Food-Motive)
const gallery = [
  ['Döner & Dürüm', (w, h) => doener(w * 0.5, h * 0.42, 1.4)],
  ['Bratnudeln', (w, h) => `${plate(w*0.5,h*0.46,210)}${noodles(w * 0.5, h * 0.42, 1.15)}`],
  ['Bratreis', (w, h) => friedrice(w * 0.5, h * 0.46, 1.5)],
  ['Frühlingsrollen', (w, h) => springrolls(w * 0.5, h * 0.42, 1.45)],
  ['Asia-Bowl', (w, h) => `${plate(w*0.5,h*0.46,210)}${bowl(w * 0.5, h * 0.44, 1.15)}`],
  ['Getränke', (w, h) => drink(w * 0.5, h * 0.44, 1.7)],
];
gallery.forEach(([label, scene], i) => {
  fs.writeFileSync(path.join(dir, `gallery-${i + 1}.svg`), compose(900, 900, scene, label));
});

// Favicon
fs.writeFileSync(path.join(dir, 'favicon.svg'), `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64" role="img"><rect width="64" height="64" rx="14" fill="${C.red}"/><text x="50%" y="52%" text-anchor="middle" dominant-baseline="central" font-family="Poppins, Arial, sans-serif" font-weight="700" font-size="26" fill="${C.cream}">A&amp;D</text></svg>`);

console.log('Food-Illustrationen erstellt:', fs.readdirSync(dir).filter(f => f.endsWith('.svg')).length, 'Dateien');
