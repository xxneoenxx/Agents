import React from 'react';
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Caption} from '../lib/Caption';
import {ClickRing, Cursor} from '../lib/Cursor';
import {clamp, pop, tween} from '../lib/motion';
import {Sfx} from '../lib/Sfx';
import {C, FONT, MOOD_COLOR} from '../lib/theme';
import {timing} from '../lib/timing';
import {Backdrop} from '../lib/ui';
import {Voice, sfxVolume} from '../lib/Voice';

const ID = '11-modell-aufwand';
const MODELS = ['Opus', 'Sonnet', 'Haiku'];
const EFFORTS = ['Niedrig', 'Mittel', 'Hoch', 'Sehr hoch', 'Max'];

// Segmentierte Leiste wie in der App (.seg), scharf nachgebaut und vergrößert.
// `sel` darf zwischen zwei Einträgen liegen: die orange Markierung gleitet.
const Segments: React.FC<{items: string[]; sel: number; size: number; widths: number[]}> = ({items, sel, size, widths}) => {
  const pad = size * 0.12;
  const xs: number[] = [];
  let x = pad;
  for (const w of widths) {
    xs.push(x);
    x += w;
  }
  const i0 = Math.floor(sel);
  const t = sel - i0;
  const i1 = Math.min(items.length - 1, i0 + 1);
  const hx = xs[i0] + (xs[i1] - xs[i0]) * t;
  const hw = widths[i0] + (widths[i1] - widths[i0]) * t;
  return (
    <div style={{position: 'relative', display: 'inline-flex', padding: pad, borderRadius: size * 0.42, border: `2px solid ${C.lineStrong}`, background: 'rgba(246,239,232,0.03)'}}>
      <div style={{position: 'absolute', left: hx, top: pad, width: hw, height: size * 1.3, borderRadius: size * 0.32, background: C.accent}} />
      {items.map((it, i) => {
        const on = Math.abs(sel - i) < 0.5;
        return (
          <div key={it} style={{position: 'relative', width: widths[i], height: size * 1.3, display: 'grid', placeItems: 'center', fontFamily: FONT.sans, fontWeight: 600, fontSize: size * 0.62, color: on ? C.bg : C.muted}}>
            {it}
          </div>
        );
      })}
    </div>
  );
};

export const S11ModellAufwand: React.FC = () => {
  const f = useCurrentFrame();
  const {durationInFrames: D} = useVideoConfig();
  const T = timing(ID);

  const enter = pop(f, 0, {damping: 18, stiffness: 140});
  const leave = tween(f, D - 18, D, 0, 1, Easing.in(Easing.cubic));
  const modelClick = T.at('sonnet') + 2;
  const effortClick = T.at('niedrig') + 2;
  const model = interpolate(f, [modelClick, modelClick + 14], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const effort = interpolate(f, [effortClick, effortClick + 14], [2, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});

  const size = 70;
  const mW = [190, 230, 200];
  const eW = [190, 170, 140, 230, 130];
  const pad = size * 0.12;
  const rowM = {x: 540 - (mW.reduce((a, b) => a + b, 0) + 2 * pad) / 2, y: 720};
  const rowE = {x: 540 - (eW.reduce((a, b) => a + b, 0) + 2 * pad) / 2, y: 950};
  const segCenter = (row: {x: number; y: number}, widths: number[], i: number) => ({x: row.x + pad + widths.slice(0, i).reduce((a, b) => a + b, 0) + widths[i] / 2, y: row.y + pad + (size * 1.3) / 2});
  const sonnet = segCenter(rowM, mW, 1);
  const mittel = segCenter(rowE, eW, 1);

  const ease = Easing.inOut(Easing.cubic);
  const cx = interpolate(f, [4, modelClick - 3, effortClick - 3], [980, sonnet.x, mittel.x], {...clamp, easing: ease});
  const cy = interpolate(f, [4, modelClick - 3, effortClick - 3], [1300, sonnet.y, mittel.y], {...clamp, easing: ease});
  const press = Math.max(...[modelClick, effortClick].map((a) => interpolate(f, [a - 3, a, a + 7], [0, 1, 0], clamp)));
  const chipGlow = interpolate(f, [T.at('jede') - 4, T.at('jede') + 6, T.at('modell') + 10, T.at('modell') + 24], [0, 1, 1, 0.4], clamp);
  const note = interpolate(f, [T.at('gilt'), T.at('gilt') + 12], [0, 1], clamp);
  const label: React.CSSProperties = {fontFamily: FONT.mono, fontWeight: 500, fontSize: 30, letterSpacing: '0.12em', color: C.muted, marginBottom: 18};

  return (
    <Backdrop glow={{x: 540, y: 840, strength: 0.7}}>
      <div style={{position: 'absolute', inset: 0, opacity: Math.min(1, enter) * (1 - leave), transform: `translateY(${(1 - enter) * 700 + leave * 600}px)`}}>
        {/* Sitzungs-Chip */}
        <div style={{position: 'absolute', left: 0, right: 0, top: 470, display: 'flex', justifyContent: 'center'}}>
          <div style={{display: 'inline-flex', alignItems: 'center', gap: 18, height: 84, padding: '0 34px 0 28px', borderRadius: 42, border: `3px solid ${MOOD_COLOR.done}`, background: C.raise2, boxShadow: `0 0 ${40 * chipGlow}px rgba(126,214,168,${0.45 * chipGlow})`, fontFamily: FONT.sans, fontWeight: 600, fontSize: 40, color: C.text}}>
            <span style={{width: 22, height: 22, borderRadius: '50%', background: MOOD_COLOR.done}} />
            portfolio
          </div>
        </div>
        <div style={{position: 'absolute', left: rowM.x, top: rowM.y - 66}}>
          <div style={label}>MODELL</div>
        </div>
        <div style={{position: 'absolute', left: rowM.x, top: rowM.y}}>
          <Segments items={MODELS} sel={model} size={size} widths={mW} />
        </div>
        <div style={{position: 'absolute', left: rowE.x, top: rowE.y - 66}}>
          <div style={label}>AUFWAND</div>
        </div>
        <div style={{position: 'absolute', left: rowE.x, top: rowE.y}}>
          <Segments items={EFFORTS} sel={effort} size={size} widths={eW} />
        </div>
        <div style={{position: 'absolute', left: 0, right: 0, top: 1130, textAlign: 'center', fontFamily: FONT.sans, fontWeight: 500, fontSize: 40, color: C.muted, opacity: note}}>wirkt ab dem nächsten Modellaufruf</div>
        <ClickRing x={sonnet.x} y={sonnet.y} progress={interpolate(f, [modelClick, modelClick + 18], [0, 1], clamp)} />
        <ClickRing x={mittel.x} y={mittel.y} progress={interpolate(f, [effortClick, effortClick + 18], [0, 1], clamp)} />
        <Cursor x={cx} y={cy} pressed={press} size={52} opacity={tween(f, effortClick + 30, effortClick + 42, 1, 0)} />
      </div>

      <Caption text={T.text} times={T.words} highlight={['Modell', 'Aufwand']} y={1440} outAt={D - 12} />
      <Voice id={ID} />
      <Sfx at={modelClick} src="Click.mp3" volume={sfxVolume(ID, modelClick, 0.9)} />
      <Sfx at={effortClick} src="Click.mp3" volume={sfxVolume(ID, effortClick, 0.9)} />
    </Backdrop>
  );
};
