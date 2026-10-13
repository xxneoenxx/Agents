import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Caption} from '../lib/Caption';
import {CLOSEUP} from '../lib/layout';
import {clamp, tween} from '../lib/motion';
import {PILL_H, PILL_W, Pill} from '../lib/Pill';
import {Sfx} from '../lib/Sfx';
import {Mood} from '../lib/theme';
import {timing} from '../lib/timing';
import {Backdrop, Callout} from '../lib/ui';
import {Voice, sfxVolume} from '../lib/Voice';

const ID = '05-ein-blick';

// Nahaufnahme der Pille: die Stimmung blättert durch und rastet auf „Wartet auf dich“ ein,
// dann zeigen Callouts auf Stimmung, Sitzung und Anzahl.
export const S05EinBlick: React.FC = () => {
  const f = useCurrentFrame();
  const {durationInFrames: D} = useVideoConfig();
  const T = timing(ID);
  const s = CLOSEUP.scale;
  const left = CLOSEUP.cx - (PILL_W * s) / 2;
  const top = CLOSEUP.cy - (PILL_H * s) / 2;
  const at = (x: number, y: number) => ({x: left + x * s, y: top + y * s});

  // Fallblatt: Ruhig → Arbeitet → Hängt fest → Fertig → Wartet auf dich.
  const seq: Mood[] = ['idle', 'working', 'problem', 'done', 'waiting'];
  const step = Math.max(8, Math.round((T.w(2) - T.w(0)) / 4));
  const flips = seq.map((_, i) => T.w(0) - 6 + i * step);
  const idx = flips.filter((x) => f >= x).length - 1;
  const mood = seq[Math.max(0, idx)];
  const lastFlip = flips[Math.max(0, idx)];
  const squash = f >= flips[0] ? interpolate(f, [lastFlip, lastFlip + 3, lastFlip + 9], [1, 0.9, 1], clamp) : 1;

  // Callouts kurz vor ihrem Wort, danach stehen alle drei bis kurz vor Szenenende.
  const fadeOut = tween(f, D - 12, D - 2, 1, 0);
  const c = (word: string) => tween(f, T.at(word) - 8, T.at(word) + 8, 0, 1) * fadeOut;
  const status = at(110, 13);
  const name = at(95, 41);
  const count = at(209, 11);

  return (
    <Backdrop glow={{x: CLOSEUP.cx, y: CLOSEUP.cy, strength: 0.8}}>
      <div style={{position: 'absolute', left, top, transformOrigin: '50% 50%', transform: `scaleY(${squash})`}}>
        <Pill mood={mood} name="portfolio" count={1} scale={s} />
      </div>

      <Callout x1={300} y1={470} x2={status.x} y2={status.y} label="Stimmung" t={c('stimmung')} />
      <Callout x1={330} y1={1080} x2={name.x} y2={name.y} label="dringendste Sitzung" t={c('dringendste')} align="center" />
      <Callout x1={880} y1={470} x2={count.x} y2={count.y} label="Anzahl" t={c('viele')} />

      <Caption text={T.text} times={T.words} highlight={['Blick']} y={1420} outAt={D - 12} />
      <Voice id={ID} />
      {flips.map((x, i) => (
        <Sfx key={i} at={x} src="Click.mp3" volume={sfxVolume(ID, x, i === 4 ? 0.6 : 0.3)} />
      ))}
    </Backdrop>
  );
};
