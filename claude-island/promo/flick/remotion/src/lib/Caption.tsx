import React from 'react';
import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {clamp} from './motion';
import {C, FONT, FPS} from './theme';

// Der Sprechertext als animierte Zeile: Wort für Wort im Sprechtempo
// (ca. 2,5 Wörter/s), bis zu zwei Zeilen, im unteren Mittelfeld.
export type CaptionProps = {
  text: string;
  /** Frame, ab dem das erste Wort erscheint. */
  start?: number;
  wordsPerSecond?: number;
  /** Wörter (ohne Satzzeichen), die farbig hervorgehoben werden. */
  highlight?: string[];
  highlightColor?: string;
  /** Mittellinie der Untertitel in px von oben. */
  y?: number;
  size?: number;
  /** Ab diesem Frame blendet der Text aus (optional). */
  outAt?: number;
  /** Feste Startframes je Wort (aus timing()); ersetzt start/wordsPerSecond. */
  times?: number[];
};

const clean = (w: string) => w.replace(/[.,!?:;„“"()]/g, '').toLowerCase();

// Längere Texte laufen in Häppchen: ein Satz bzw. höchstens 6 Wörter, immer nur das aktuelle.
// Untertitel in Häppchen (höchstens ca. zwei Zeilen): Satzenden trennen immer,
// innerhalb eines Satzes wird nach Kommas oder vor Bindewörtern getrennt.
const MAX_CHARS = 43;
const CONJ = new Set(['und', 'oder', 'aber', 'auch', 'dann', 'wenn', 'während', 'ob', 'was', 'wie', 'ohne', 'darunter', 'zum', 'also', 'etwa']);
const PREP = new Set(['auf', 'über', 'von', 'für', 'im', 'in', 'mit', 'ab', 'bis', 'nach', 'bei', 'gleich']);
const bare = (w: string) => w.toLowerCase().replace(/[^a-zäöüß-]/g, '');
// Kosten einer Trennung vor seg[j]
const breakCost = (seg: string[], j: number) =>
  (CONJ.has(bare(seg[j - 1])) ? 8 : 0) + (/,$/.test(seg[j - 1]) ? 0 : CONJ.has(bare(seg[j])) ? 2 : PREP.has(bare(seg[j])) ? 4 : 9);

const chunk = (words: string[]) => {
  const out: number[][] = [];
  let s = 0;
  for (let e = 0; e < words.length; e++) {
    if (!/[.?!:]$/.test(words[e]) && e < words.length - 1) continue;
    const seg = words.slice(s, e + 1);
    const n = seg.length;
    const len = (a: number, b: number) => seg.slice(a, b).join(' ').length;
    // günstigste Aufteilung des Satzes (kürzester Weg über die Trennstellen)
    const best = Array<number>(n + 1).fill(Infinity);
    const prev = Array<number>(n + 1).fill(-1);
    best[0] = 0;
    for (let b = 1; b <= n; b++) {
      for (let a = 0; a < b; a++) {
        if (best[a] === Infinity || (b - a > 1 && len(a, b) > MAX_CHARS)) continue;
        const c = best[a] + 1 + (len(a, b) < 12 && b - a < n ? 6 : 0) + (a > 0 ? breakCost(seg, a) : 0) + (b - a === 1 && n > 1 ? 12 : 0);
        if (c < best[b]) {
          best[b] = c;
          prev[b] = a;
        }
      }
    }
    const parts: number[][] = [];
    for (let b = n; b > 0; b = prev[b]) parts.unshift(Array.from({length: b - prev[b]}, (_, i) => s + prev[b] + i));
    out.push(...parts);
    s = e + 1;
  }
  return out;
};

export const Caption: React.FC<CaptionProps> = ({text, start = 6, wordsPerSecond = 2.5, highlight = [], highlightColor = C.accent, y = 1420, size = 66, outAt, times}) => {
  const frame = useCurrentFrame();
  const words = text.split(/\s+/).filter(Boolean);
  const step = FPS / wordsPerSecond;
  const at = (i: number) => (times ? times[Math.min(i, times.length - 1)] - 3 : start + i * step);
  const hl = new Set(highlight.map((h) => h.toLowerCase()));
  const out = outAt === undefined ? 1 : interpolate(frame, [outAt, outAt + 8], [1, 0], clamp);
  const chunks = chunk(words);
  // aktuelles Häppchen: das letzte, dessen erstes Wort schon dran ist
  let k = 0;
  chunks.forEach((c, i) => {
    if (frame >= at(c[0]) - 2) k = i;
  });
  const active = chunks[k];
  const enter = interpolate(frame, [at(active[0]) - 2, at(active[0]) + 6], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
  return (
    <div
      style={{
        position: 'absolute',
        left: 70,
        right: 70,
        top: y,
        transform: `translateY(calc(-50% + ${(1 - enter) * 14}px))`,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        columnGap: size * 0.26,
        rowGap: size * 0.08,
        fontFamily: FONT.display,
        fontWeight: 700,
        fontSize: size,
        lineHeight: 1.12,
        letterSpacing: '-0.015em',
        textAlign: 'center',
        opacity: out * (k === 0 ? 1 : 0.4 + 0.6 * enter),
      }}
    >
      {active.map((i) => {
        const w = words[i];
        const t = interpolate(frame, [at(i), at(i) + 9], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
        const isHl = hl.has(clean(w));
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity: 0.18 + 0.82 * t,
              transform: `translateY(${(1 - t) * 10}px)`,
              color: isHl ? highlightColor : C.text,
              textShadow: '0 4px 28px rgba(0,0,0,0.65)',
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

/** Frame, an dem Wort `index` (0-basiert) einer Caption erscheint. */
export const wordAt = (index: number, start = 6, wordsPerSecond = 2.5) => start + index * (FPS / wordsPerSecond);
