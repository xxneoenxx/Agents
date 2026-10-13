import React from 'react';
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Caption} from '../lib/Caption';
import {CLOSEUP, ISLAND, islandBox} from '../lib/layout';
import {clamp, pop, tween, wave} from '../lib/motion';
import {PILL_H, PILL_W, Pill} from '../lib/Pill';
import {Sfx} from '../lib/Sfx';
import {C, FONT, MOOD_COLOR, Mood} from '../lib/theme';
import {timing} from '../lib/timing';
import {Backdrop} from '../lib/ui';
import {Voice, sfxVolume} from '../lib/Voice';

const ID = '06-mehrere-sitzungen';

// Sitzungs-Chip im Look der App (.chip: 30 px hoch, Punkt in Stimmungsfarbe).
const Chip: React.FC<{name: string; mood: Mood; scale: number; frame: number}> = ({name, mood, scale, frame}) => {
  const color = MOOD_COLOR[mood];
  const urgent = mood === 'waiting' || mood === 'problem';
  const ring = wave(frame, 1.2);
  return (
    <div style={{transform: `scale(${scale})`, transformOrigin: '0 50%'}}>
      <div
        style={{
          height: 30,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          padding: '0 12px 0 10px',
          borderRadius: 15,
          border: `1px solid ${urgent ? color : C.line}`,
          background: C.raise2,
          color: C.text,
          fontFamily: FONT.sans,
          fontWeight: 500,
          fontSize: 13,
          whiteSpace: 'nowrap',
          boxSizing: 'border-box',
        }}
      >
        <span style={{position: 'relative', width: 8, height: 8, borderRadius: '50%', background: color}}>
          {urgent ? <span style={{position: 'absolute', inset: -3, borderRadius: '50%', border: `2px solid ${color}`, opacity: 0.8 * (1 - ring), transform: `scale(${0.55 + 0.6 * ring})`}} /> : null}
        </span>
        {name}
      </div>
    </div>
  );
};

const CHIP_SCALE = 2.6;
const CHIPS: {name: string; mood: Mood; w: number}[] = [
  {name: 'api', mood: 'working', w: 58},
  {name: 'docs', mood: 'done', w: 68},
  {name: 'portfolio', mood: 'waiting', w: 92},
];

// Drei Sitzungen gleiten ein, sortieren sich nach Dringlichkeit, die dringendste fliegt in die Pille.
export const S06MehrereSitzungen: React.FC = () => {
  const f = useCurrentFrame();
  const {durationInFrames: D} = useVideoConfig();
  const T = timing(ID);
  const hero = islandBox();

  // Pille: von der Nahaufnahme (05) in die Heldenposition (Start von 07).
  const move = tween(f, 0, 30, 0, 1, Easing.inOut(Easing.cubic));
  const scale = interpolate(move, [0, 1], [CLOSEUP.scale, ISLAND.scale]);
  const cy = interpolate(move, [0, 1], [CLOSEUP.cy, hero.top + hero.height / 2]);
  const pillLeft = ISLAND.cx - (PILL_W * scale) / 2;
  const pillTop = cy - (PILL_H * scale) / 2;

  // Reihen-Layout der Chips (Mittelpunkt x), vorher und nach dem Sortieren.
  const gap = 18 * CHIP_SCALE;
  const widths = CHIPS.map((c) => c.w * CHIP_SCALE);
  const rowX = (order: number[]) => {
    const total = order.reduce((s, i) => s + widths[i], 0) + gap * (order.length - 1);
    let x = 540 - total / 2;
    const out: number[] = [];
    for (const i of order) {
      out[i] = x;
      x += widths[i] + gap;
    }
    return out;
  };
  const before = rowX([0, 1, 2]);
  const after = rowX([2, 0, 1]);
  const sort = tween(f, T.at('sortiert'), T.at('dringlichkeit') + 6, 0, 1, Easing.inOut(Easing.cubic));
  const rowY = 780;

  // „die dringendste“: portfolio fliegt in die Pille und rastet ein; Zähler 1 → 3.
  const flyAt = T.at('dringendste');
  const fly = tween(f, flyAt, flyAt + 16, 0, 1, Easing.in(Easing.cubic));
  const landed = f >= flyAt + 16;
  const snap = interpolate(f, [flyAt + 16, flyAt + 20, flyAt + 30], [1, 1.07, 1], clamp);
  const othersOut = tween(f, flyAt + 10, flyAt + 30, 1, 0);

  return (
    <Backdrop glow={{x: ISLAND.cx, y: cy, strength: 0.7}}>
      <div style={{position: 'absolute', left: pillLeft, top: pillTop, transformOrigin: '50% 50%', transform: `scale(${snap})`}}>
        <Pill mood="waiting" name="portfolio" count={landed ? 3 : 1} scale={scale} />
      </div>

      {CHIPS.map((c, i) => {
        const enter = pop(f, T.w(0) - 10 + i * 7, {damping: 16, stiffness: 150});
        let x = interpolate(sort, [0, 1], [before[i], after[i]]);
        let y = rowY + (1 - enter) * 500;
        let sc = CHIP_SCALE;
        let op = Math.min(1, enter * 1.5);
        const lift = i === 2 ? Math.sin(sort * Math.PI) * -70 : 0;
        y += lift;
        if (i === 2) {
          // in die Pille: Mittelpunkt auf den Namen in der Pille
          const tx = pillLeft + 64 * ISLAND.scale;
          const ty = pillTop + 34 * ISLAND.scale - 15 * CHIP_SCALE * 0.4;
          x = interpolate(fly, [0, 1], [x, tx]);
          y = interpolate(fly, [0, 1], [y, ty]);
          sc = interpolate(fly, [0, 1], [CHIP_SCALE, CHIP_SCALE * 0.4]);
          op = landed ? 0 : op;
        } else {
          op *= othersOut;
        }
        return (
          <div key={c.name} style={{position: 'absolute', left: x, top: y, opacity: op}}>
            <Chip name={c.name} mood={c.mood} scale={sc} frame={f} />
          </div>
        );
      })}

      <Caption text={T.text} times={T.words} highlight={['dringendste']} highlightColor={MOOD_COLOR.waiting} y={1420} outAt={D - 10} />
      <Voice id={ID} />
      <Sfx at={flyAt + 16} src="Pop.mp3" volume={sfxVolume(ID, flyAt + 16, 0.8)} />
    </Backdrop>
  );
};
