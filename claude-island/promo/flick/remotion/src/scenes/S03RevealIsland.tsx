import React from 'react';
import {Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Caption} from '../lib/Caption';
import {ISLAND, MONITOR, islandBox, monitorPillCenter} from '../lib/layout';
import {clamp, pop, tween} from '../lib/motion';
import {Pill} from '../lib/Pill';
import {Sfx} from '../lib/Sfx';
import {C, FONT, MOOD_COLOR} from '../lib/theme';
import {timing} from '../lib/timing';
import {Backdrop} from '../lib/ui';
import {Voice, sfxVolume} from '../lib/Voice';
import {BrowserWin, EditorWin, TerminalWin} from './desktop.parts';

const ID = '03-reveal-island';

// Der Schimmer landet oben und ploppt zur Insel auf; die Fenster wischen weg.
export const S03RevealIsland: React.FC = () => {
  const f = useCurrentFrame();
  const {durationInFrames: D} = useVideoConfig();
  const T = timing(ID);
  const box = islandBox();

  // Aufploppen: Squash & Stretch mit Überschwingen.
  const p = pop(f, 2, {damping: 11, stiffness: 190});
  const sx = interpolate(p, [0, 0.6, 1, 1.15], [0.18, 0.85, 1, 1.06], {extrapolateRight: 'clamp'});
  const sy = interpolate(p, [0, 0.6, 1, 1.15], [0.55, 1.12, 1, 0.96], {extrapolateRight: 'clamp'});
  const orb = interpolate(f, [0, 8], [1, 0], clamp);

  // „Schluss damit“: alle Fenster wischen nach unten weg.
  const wipe = tween(f, T.w(0), T.w(1) + 10, 0, 1, Easing.in(Easing.cubic));

  // „Claude Island“: Icon und Schriftzug gleiten hoch; am Ende wieder raus.
  const brand = pop(f, T.w(4) - 6, {damping: 16, stiffness: 140});
  const out = tween(f, D - 22, D - 2, 0, 1, Easing.in(Easing.cubic));
  // Am Ende gleitet die Oberkante eines Monitors unter die Insel (Start von 04).
  const monitor = tween(f, D - 18, D, 0, 1, Easing.out(Easing.cubic));
  const CAM = ISLAND.scale / MONITOR.pillScale;
  const monitorTop = box.top + box.height / 2 + (MONITOR.y - monitorPillCenter.y) * CAM;

  return (
    <Backdrop glow={{x: ISLAND.cx, y: box.top + box.height / 2, strength: interpolate(p, [0, 1], [0, 1], clamp)}}>
      <div style={{position: 'absolute', inset: 0, transform: `translateY(${wipe * 2100}px)`, opacity: wipe >= 1 ? 0 : 1 - wipe * 0.3}}>
        <TerminalWin command mascot={false} />
        <EditorWin typed="function validateKont" caretOn={false} />
        <BrowserWin />
      </div>

      {/* Monitor-Oberkante für den Übergang in Szene 04: derselbe Monitor wie dort, Kamera ×4. */}
      <div
        style={{
          position: 'absolute',
          left: ISLAND.cx - (ISLAND.cx - MONITOR.x) * CAM,
          width: MONITOR.w * CAM,
          top: interpolate(monitor, [0, 1], [1950, monitorTop]),
          height: MONITOR.h * CAM,
          borderRadius: 30 * CAM,
          border: `${4 * CAM}px solid ${C.muted}`,
          background: '#1A1512',
          opacity: monitor,
        }}
      />

      <div style={{position: 'absolute', left: box.left, top: box.top, transformOrigin: '50% 50%', transform: `scale(${sx}, ${sy})`}}>
        <Pill mood="waiting" name="portfolio" count={1} scale={ISLAND.scale} shadow look={{x: 0, y: 0.3}} />
      </div>
      {orb > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: ISLAND.cx - 60,
            top: box.top + box.height / 2 - 60,
            width: 120,
            height: 120,
            borderRadius: '50%',
            opacity: orb,
            background: `radial-gradient(circle, #fff3c4 0%, ${MOOD_COLOR.waiting} 45%, rgba(255,200,87,0) 72%)`,
          }}
        />
      ) : null}

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 700,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 26,
          opacity: brand * (1 - out),
          transform: `translateY(${(1 - brand) * 120 + out * 160}px)`,
        }}
      >
        <Img src={staticFile('brand-assets/icon.png')} style={{width: 210, height: 210, imageRendering: 'pixelated'}} />
        <div style={{fontFamily: FONT.display, fontWeight: 700, fontSize: 112, letterSpacing: '-0.02em', color: C.text}}>Claude Island</div>
      </div>

      <Caption text={T.text} times={T.words} highlight={['Claude', 'Island']} y={1420} outAt={D - 16} />
      <Voice id={ID} />
      <Sfx at={2} src="Pop.mp3" volume={sfxVolume(ID, 2, 0.8)} />
      <Sfx at={T.w(0)} src="transitions.mp3" volume={sfxVolume(ID, T.w(0), 0.7)} />
    </Backdrop>
  );
};
