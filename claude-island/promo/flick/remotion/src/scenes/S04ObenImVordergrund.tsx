import React from 'react';
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Caption} from '../lib/Caption';
import {Cursor} from '../lib/Cursor';
import {CLOSEUP, ISLAND, MONITOR, islandBox, monitorPillCenter} from '../lib/layout';
import {clamp, tween} from '../lib/motion';
import {PILL_W, Pill} from '../lib/Pill';
import {Sfx} from '../lib/Sfx';
import {C, FONT} from '../lib/theme';
import {timing} from '../lib/timing';
import {Backdrop} from '../lib/ui';
import {Voice, sfxVolume} from '../lib/Voice';

const ID = '04-oben-im-vordergrund';

// Kamera zieht zurück: die Insel ist klein, oben auf dem Bildschirm, und bleibt über allen Fenstern.
export const S04ObenImVordergrund: React.FC = () => {
  const f = useCurrentFrame();
  const {durationInFrames: D} = useVideoConfig();
  const T = timing(ID);
  const hero = islandBox();
  const heroCenter = {x: ISLAND.cx, y: hero.top + hero.height / 2};

  // Kamera: Start = Heldenposition (×4), Mitte = ganzer Monitor (×1), Ende = Nahaufnahme für 05.
  const pull = tween(f, 0, T.at('klein') + 12, 0, 1, Easing.inOut(Easing.cubic));
  const push = tween(f, D - 24, D, 0, 1, Easing.in(Easing.cubic));
  const c0 = ISLAND.scale / MONITOR.pillScale;
  const cEnd = CLOSEUP.scale / MONITOR.pillScale;
  const cam = push > 0 ? interpolate(push, [0, 1], [1, cEnd]) : interpolate(pull, [0, 1], [c0, 1]);
  const P = push > 0
    ? {x: CLOSEUP.cx, y: interpolate(push, [0, 1], [monitorPillCenter.y, CLOSEUP.cy])}
    : {x: ISLAND.cx, y: interpolate(pull, [0, 1], [heroCenter.y, monitorPillCenter.y])};
  const world: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 1080,
    height: 1920,
    transformOrigin: '0 0',
    transform: `translate(${P.x}px, ${P.y}px) scale(${cam}) translate(${-monitorPillCenter.x}px, ${-monitorPillCenter.y}px)`,
  };

  // Die Pille atmet einmal bei „Insel“.
  const breathe = interpolate(f, [T.at('schwebt'), T.at('schwebt') + 10, T.at('schwebt') + 24], [1, 1.1, 1], clamp);

  // Ein Fenster gleitet von unten hoch und UNTER der Insel durch.
  const winY = interpolate(f, [T.at('immer') - 6, T.at('fenstern') + 24], [MONITOR.y + MONITOR.h + 10, MONITOR.y - 380], {...clamp, easing: Easing.inOut(Easing.cubic)});
  const under = winY < MONITOR.pillTop + 40 && winY > MONITOR.pillTop - 380;

  // Mauszeiger fährt an der Insel vorbei; Mini-Claude schaut ihm nach.
  const cx = interpolate(f, [T.at('mini-claude') - 10, T.at('hinterher') + 30], [MONITOR.x + MONITOR.w + 40, MONITOR.x + 120], {...clamp, easing: Easing.inOut(Easing.sin)});
  const cy = interpolate(f, [T.at('mini-claude') - 10, T.at('hinterher') + 30], [MONITOR.y + 300, MONITOR.y + 140], clamp);
  const pillLeft = 540 - (PILL_W * MONITOR.pillScale) / 2;
  const look = {x: Math.max(-1, Math.min(1, (cx - 540) / 220)), y: Math.max(-1, Math.min(1, (cy - monitorPillCenter.y) / 160))};

  const label = interpolate(f, [T.at('vordergrund'), T.at('vordergrund') + 12], [0, 1], clamp) * (1 - push);

  return (
    <Backdrop>
      <div style={world}>
        {/* Monitor mit Fuß */}
        <div style={{position: 'absolute', left: MONITOR.x - 4, top: MONITOR.y - 4, width: MONITOR.w + 8, height: MONITOR.h + 8, borderRadius: 30, border: `4px solid ${C.muted}`, background: '#1A1512', boxSizing: 'border-box'}} />
        <div style={{position: 'absolute', left: 540 - 60, top: MONITOR.y + MONITOR.h + 4, width: 120, height: 86, background: '#2A231E', borderLeft: `3px solid ${C.line}`, borderRight: `3px solid ${C.line}`}} />
        <div style={{position: 'absolute', left: 540 - 190, top: MONITOR.y + MONITOR.h + 88, width: 380, height: 22, borderRadius: 11, background: '#2A231E'}} />

        {/* Bildschirminhalt, auf den Bildschirm beschnitten */}
        <div style={{position: 'absolute', left: MONITOR.x, top: MONITOR.y, width: MONITOR.w, height: MONITOR.h, overflow: 'hidden', borderRadius: 26}}>
          <div
            style={{
              position: 'absolute',
              left: 150,
              top: winY - MONITOR.y,
              width: 600,
              height: 360,
              borderRadius: 12,
              background: '#241E19',
              border: `2px solid ${C.lineStrong}`,
              boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{height: 34, borderBottom: `2px solid ${C.line}`, display: 'flex', alignItems: 'center', padding: '0 14px', fontFamily: FONT.sans, fontSize: 16, color: C.muted}}>Editor</div>
            <div style={{padding: 20, display: 'flex', flexDirection: 'column', gap: 14}}>
              {[320, 260, 380, 200, 300].map((w, i) => (
                <div key={i} style={{width: w, height: 10, borderRadius: 5, background: i === 2 ? 'rgba(143,184,255,0.35)' : 'rgba(246,239,232,0.16)'}} />
              ))}
            </div>
          </div>
        </div>

        {/* Die Insel bleibt obenauf */}
        <div style={{position: 'absolute', left: pillLeft, top: MONITOR.pillTop, transformOrigin: '50% 50%', transform: `scale(${breathe})`}}>
          <Pill mood="waiting" name="portfolio" count={1} scale={MONITOR.pillScale} shadow={under} look={look} />
        </div>

        <Cursor x={cx} y={cy} size={30} opacity={interpolate(f, [T.at('mini-claude') - 10, T.at('mini-claude')], [0, 1], clamp) * (1 - push)} />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 1240,
          textAlign: 'center',
          fontFamily: FONT.sans,
          fontWeight: 500,
          fontSize: 48,
          color: C.muted,
          opacity: label,
          transform: `translateY(${(1 - label) * 16}px)`,
        }}
      >
        immer im Vordergrund
      </div>

      <Caption text={T.text} times={T.words} highlight={['Insel']} y={1420} outAt={D - 14} />
      <Voice id={ID} />
      <Sfx at={T.at('immer')} src="transitions.mp3" volume={sfxVolume(ID, T.at('immer'), 0.45)} />
      <Sfx at={D - 24} src="Zoomin-OR-out.mp3" volume={sfxVolume(ID, D - 24, 0.6)} />
    </Backdrop>
  );
};
