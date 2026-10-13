import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';

// Die Schriften der App liegen lokal (OFL) in public/fonts; kein CDN beim Rendern.
const FILES: [string, string, string][] = [
  ['Bricolage Grotesque', '600', 'bricolage-grotesque-latin-600-normal.woff2'],
  ['Bricolage Grotesque', '700', 'bricolage-grotesque-latin-700-normal.woff2'],
  ['Figtree', '400', 'figtree-latin-400-normal.woff2'],
  ['Figtree', '500', 'figtree-latin-500-normal.woff2'],
  ['Figtree', '600', 'figtree-latin-600-normal.woff2'],
  ['IBM Plex Mono', '400', 'ibm-plex-mono-latin-400-normal.woff2'],
  ['IBM Plex Mono', '500', 'ibm-plex-mono-latin-500-normal.woff2'],
];

export const fontsReady = Promise.all(
  FILES.map(([family, weight, file]) => loadFont({family, weight, url: staticFile(`fonts/${file}`), format: 'woff2'})),
);
