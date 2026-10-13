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

export const Caption: React.FC<CaptionProps> = ({text, start = 6, wordsPerSecond = 2.5, highlight = [], highlightColor = C.accent, y = 1420, size = 66, outAt, times}) => {
  const frame = useCurrentFrame();
  const words = text.split(/\s+/).filter(Boolean);
  const step = FPS / wordsPerSecond;
  const hl = new Set(highlight.map((h) => h.toLowerCase()));
  const out = outAt === undefined ? 1 : interpolate(frame, [outAt, outAt + 8], [1, 0], clamp);
  return (
    <div
      style={{
        position: 'absolute',
        left: 70,
        right: 70,
        top: y,
        transform: 'translateY(-50%)',
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
        opacity: out,
      }}
    >
      {words.map((w, i) => {
        const at = times ? times[Math.min(i, times.length - 1)] - 3 : start + i * step;
        const t = interpolate(frame, [at, at + 9], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
        const isHl = hl.has(clean(w));
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              opacity: t,
              transform: `translateY(${(1 - t) * 22}px) scale(${0.94 + 0.06 * t})`,
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
