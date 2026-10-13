import React from 'react';
import {Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Caption} from '../lib/Caption';
import {ClickRing, Cursor} from '../lib/Cursor';
import {ISLAND, LOOP, islandBox} from '../lib/layout';
import {LoopHero} from '../lib/LoopHero';
import {MiniClaude} from '../lib/MiniClaude';
import {clamp, pop, tween} from '../lib/motion';
import {Pill} from '../lib/Pill';
import {Sfx} from '../lib/Sfx';
import {C, FONT} from '../lib/theme';
import {timing} from '../lib/timing';
import {Backdrop} from '../lib/ui';
import {Voice, sfxVolume} from '../lib/Voice';

const ID = '14-cta-loop';
const STEPS = ['1 · Setup.exe doppelklicken', '2 · ‚Plugin aktivieren‘ klicken', '3 · Claude-App neu starten'];
// Die Setup-Datei ist nicht signiert: SmartScreen warnt beim ersten Start.
const WARN = ['Windows warnt?', 'Weitere Informationen', 'Trotzdem ausführen'];
// Klickpunkt auf dem Download-Knopf (Knopf im Bild ca. x 222–857, y 651–768).
const BTN = {x: 600, y: 722};

// Endkarte mit Download, Link, drei Schritten und dem Hinweis zur Windows-Warnung. Danach kippt die Kamera hoch zur
// wartenden Insel, Mini-Claude springt heraus und landet exakt im ersten Bild von 01.
export const S14CtaLoop: React.FC = () => {
  const f = useCurrentFrame();
  const {durationInFrames: D} = useVideoConfig();
  const T = timing(ID);

  const title = pop(f, Math.max(4, T.at('claude') - 6), {damping: 15, stiffness: 140});
  const sub = pop(f, T.at('windows'), {damping: 18, stiffness: 150});
  const btnIn = pop(f, T.at('setup-datei') - 4, {damping: 14, stiffness: 160});
  const link = pop(f, T.at('github') - 4, {damping: 18, stiffness: 150});
  const clickAt = T.at('doppelt') + 2;
  const press = interpolate(f, [clickAt - 3, clickAt, clickAt + 8], [0, 1, 0], clamp);
  const steps = ['doppelt', 'plugin', 'startest'].map((w) => pop(f, T.at(w) - 4, {damping: 18, stiffness: 160}));
  const warn = pop(f, T.at('warnt') - 4, {damping: 18, stiffness: 160});
  const warnHl = [T.at('weitere'), T.at('trotzdem')].map((at) => interpolate(f, [at - 4, at + 6], [0, 1], clamp));

  // Outro: ab ~1,4 s nach dem letzten Wort.
  const outroAt = Math.max(T.speechEnd + 84, clickAt + 90);
  const tilt = tween(f, outroAt, outroAt + 22, 0, 1, Easing.in(Easing.cubic));
  const pillIn = tween(f, outroAt + 8, outroAt + 26, 0, 1, Easing.out(Easing.cubic));
  const jumpAt = outroAt + 34;
  const jump = tween(f, jumpAt, D - 14, 0, 1, Easing.inOut(Easing.cubic));
  const hero = islandBox();
  const arms = pop(f, jumpAt + 4, {damping: 10, stiffness: 180});
  const legs = pop(f, jumpAt + 10, {damping: 10, stiffness: 180});
  const startSize = 44 * ISLAND.scale;
  const startX = hero.left + (8 + 2) * ISLAND.scale;
  const startY = hero.top + 7 * ISLAND.scale;
  const size = interpolate(jump, [0, 1], [startSize, LOOP.size]);
  const mx = interpolate(jump, [0, 1], [startX, LOOP.cx - LOOP.size / 2]);
  const my = interpolate(jump, [0, 1], [startY, LOOP.cy - (LOOP.size * 0.625) / 2]) - Math.sin(jump * Math.PI) * 260;
  const landed = f >= D - 14;

  const card: React.CSSProperties = {position: 'absolute', inset: 0, transform: `translateY(${tilt * 1900}px)`};
  const cursorOn = interpolate(f, [T.at('github'), T.at('github') + 8], [0, 1], clamp) * tween(f, clickAt + 16, clickAt + 28, 1, 0);
  const cx = interpolate(f, [T.at('github'), clickAt - 3], [960, BTN.x], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const cy = interpolate(f, [T.at('github'), clickAt - 3], [1250, BTN.y], {...clamp, easing: Easing.inOut(Easing.cubic)});

  return (
    <Backdrop glow={{x: 540, y: 560, strength: 1 - tilt}}>
      <div style={card}>
        <div style={{position: 'absolute', left: 0, right: 0, top: 210, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
          <Img src={staticFile('brand-assets/icon.png')} style={{width: 190, height: 190, opacity: Math.min(1, title * 1.5), transform: `scale(${0.6 + 0.4 * title})`}} />
          <div style={{marginTop: 26, fontFamily: FONT.display, fontWeight: 700, fontSize: 104, letterSpacing: '-0.02em', color: C.text, opacity: Math.min(1, title * 1.5), transform: `translateY(${(1 - title) * 40}px)`}}>Claude Island</div>
          <div style={{marginTop: 8, fontFamily: FONT.sans, fontWeight: 500, fontSize: 40, color: C.muted, opacity: Math.min(1, sub * 1.5)}}>für Windows · kostenlos · Quellcode auf GitHub</div>
          <div
            style={{
              marginTop: 44,
              width: 640,
              height: 118,
              borderRadius: 34,
              background: C.accent,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: Math.min(1, btnIn * 1.5),
              transform: `scale(${(0.7 + 0.3 * btnIn) * (1 - 0.05 * press)})`,
              boxShadow: '0 18px 50px rgba(255,154,98,0.35)',
            }}
          >
            <div style={{fontFamily: FONT.sans, fontWeight: 700, fontSize: 44, color: C.bg}}>Setup.exe herunterladen</div>
            <div style={{fontFamily: FONT.sans, fontWeight: 600, fontSize: 26, color: 'rgba(21,17,14,0.75)'}}>ohne Admin-Rechte</div>
          </div>
          <div style={{marginTop: 30, fontFamily: FONT.mono, fontWeight: 500, fontSize: 40, color: C.text, opacity: Math.min(1, link * 1.5)}}>github.com/xxneoenxx/Agents/releases</div>
          <div style={{marginTop: 34, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'flex-start'}}>
            {STEPS.map((s, i) => (
              <React.Fragment key={s}>
                <div style={{fontFamily: FONT.sans, fontWeight: 600, fontSize: 38, color: C.text, opacity: Math.min(1, steps[i] * 1.5), transform: `translateX(${(1 - steps[i]) * 40}px)`}}>
                  {s}
                </div>
                {i === 0 ? (
                  <div style={{marginLeft: 50, fontFamily: FONT.sans, fontWeight: 500, fontSize: 30, color: C.muted, opacity: Math.min(1, warn * 1.5), transform: `translateX(${(1 - warn) * 40}px)`}}>
                    {WARN[0]} <span style={{color: warnHl[0] > 0.1 ? C.text : C.muted}}>{WARN[1]}</span> ›{' '}
                    <span style={{color: warnHl[1] > 0.1 ? C.text : C.muted}}>{WARN[2]}</span>
                  </div>
                ) : null}
              </React.Fragment>
            ))}
          </div>
        </div>
        <ClickRing x={BTN.x} y={BTN.y} progress={interpolate(f, [clickAt, clickAt + 18], [0, 1], clamp)} color={C.text} />
        <Cursor x={cx} y={cy} pressed={press} opacity={cursorOn} size={52} />
        <div style={{position: 'absolute', left: 0, right: 0, top: 1528, textAlign: 'center', fontFamily: FONT.sans, fontWeight: 500, fontSize: 30, color: C.muted}}>
          Inoffizielles Community-Tool, nicht von Anthropic.
        </div>
      </div>

      {/* Outro: die wartende Insel, Mini-Claude springt heraus und landet im Loop-Bild */}
      {pillIn > 0 && !landed ? (
        <div style={{position: 'absolute', left: hero.left, top: hero.top - (1 - pillIn) * 300, opacity: 1 - jump}}>
          <Pill mood="waiting" name="portfolio" count={1} scale={ISLAND.scale} />
        </div>
      ) : null}
      {f >= jumpAt && !landed ? (
        <div style={{position: 'absolute', left: mx, top: my}}>
          <MiniClaude size={size} mood="waiting" frame={0} arms={arms} legs={legs} />
        </div>
      ) : null}
      {landed ? <LoopHero frame={0} /> : null}

      <Caption text={T.text} times={T.words} highlight={['GitHub']} y={1420} size={60} outAt={outroAt - 10} />
      <Voice id={ID} />
      <Sfx at={clickAt} src="Click.mp3" volume={sfxVolume(ID, clickAt, 0.9)} />
      <Sfx at={jumpAt - 6} src="Zoomin-OR-out.mp3" volume={sfxVolume(ID, jumpAt - 6, 0.6)} />
      <Sfx at={D - 14} src="Pop.mp3" volume={sfxVolume(ID, D - 14, 0.75)} />
    </Backdrop>
  );
};
