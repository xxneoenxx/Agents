import React from 'react';
import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {Caption} from '../lib/Caption';
import {LOOP} from '../lib/layout';
import {MiniClaude} from '../lib/MiniClaude';
import {clamp, pop, tween} from '../lib/motion';
import {Sfx} from '../lib/Sfx';
import {timing} from '../lib/timing';
import {Backdrop, Keycap} from '../lib/ui';
import {Voice, sfxVolume} from '../lib/Voice';
import {BrowserWin, EditorWin, Switcher, TERMINAL, TerminalWin} from './desktop.parts';

const ID = '01-hook-alt-tab';

// Hook: Mini-Claude wartet groß im Bild, dann zweimal Alt-Tab – und die wartende
// Sitzung verschwindet hinter anderen Fenstern.
export const S01HookAltTab: React.FC = () => {
  const f = useCurrentFrame();
  const T = timing(ID);
  const alt1 = T.w(0);
  const alt2 = T.w(3);

  // Mini-Claude schrumpft vom Loop-Bild ins Terminal (Kamera ruckt zurück).
  const shrink = pop(f, alt1, {damping: 18, stiffness: 140});
  const heroSize = LOOP.size;
  const termMascot = {size: 150, x: TERMINAL.x + TERMINAL.w - 70 - 150, y: TERMINAL.y + TERMINAL.h - 60 - 150 * 0.625};
  const size = interpolate(shrink, [0, 1], [heroSize, termMascot.size]);
  const mx = interpolate(shrink, [0, 1], [LOOP.cx - heroSize / 2, termMascot.x]);
  const my = interpolate(shrink, [0, 1], [LOOP.cy - (heroSize * 0.625) / 2, termMascot.y]);

  // Fenster: Terminal erscheint um Mini-Claude, der Editor schiebt sich davor,
  // beim zweiten Alt-Tab kommt der Browser nach vorn.
  const desk = tween(f, alt1, alt1 + 10, 0, 1);
  const editorIn = pop(f, alt1 + 12, {damping: 20, stiffness: 160});
  const browserIn = pop(f, alt2 + 22, {damping: 20, stiffness: 160});
  const jolt = f >= alt1 && f < alt1 + 8 ? Math.sin(((f - alt1) / 8) * Math.PI) * -18 : f >= alt2 && f < alt2 + 8 ? Math.sin(((f - alt2) / 8) * Math.PI) * -12 : 0;

  // Gelber Schimmer am Fensterrand: pulsiert bei „Wartet Claude?“ und schwächer bei „Hängt er fest?“.
  const glow1 = interpolate(f, [T.w(1), T.w(1) + 10, T.w(1) + 34], [0.25, 1, 0.3], clamp);
  const glow2 = interpolate(f, [T.w(4), T.w(4) + 10, T.w(4) + 34], [0.3, 0.6, 0.2], clamp);
  const glow = f < alt1 + 20 ? 0 : f < T.w(4) ? glow1 : glow2;

  // Tastenkappen im unteren Drittel.
  const keysIn = pop(f, alt1 - 14);
  const press = (at: number) => interpolate(f, [at - 2, at + 2, at + 9], [0, 1, 0], clamp);
  const pressNow = Math.max(press(alt1), press(alt2));

  // Umschalter beim zweiten Alt-Tab, Auswahl gleitet von Editor zu Browser.
  const sw = pop(f, alt2);
  const swOut = tween(f, alt2 + 30, alt2 + 40, 1, 0);
  const sel = tween(f, alt2 + 8, alt2 + 18, 0, 1, Easing.out(Easing.cubic));

  const shift = `translateY(${jolt}px)`;

  return (
    <Backdrop>
      <TerminalWin glow={glow} mascot={false} style={{opacity: desk, transform: `${shift} scale(${0.96 + 0.04 * desk})`}} />
      {/* Mini-Claude: erst groß (Loop-Bild), dann klein im Terminal – der Editor schiebt sich darüber. */}
      <div style={{position: 'absolute', left: mx, top: my + jolt * shrink}}>
        <MiniClaude size={size} mood="waiting" frame={f} />
      </div>
      <EditorWin
        caretOn={Math.floor(f / 30) % 2 === 0}
        style={{transform: `${shift} translateX(${(1 - editorIn) * -1000}px)`, opacity: editorIn > 0.01 ? 1 : 0}}
      />
      <BrowserWin style={{transform: `${shift} translateY(${(1 - browserIn) * 900}px)`, opacity: browserIn > 0.01 ? 1 : 0}} />

      {f >= alt2 - 2 && swOut > 0 ? <Switcher selected={sel} opacity={Math.min(sw, swOut)} scale={0.9 + 0.1 * sw} /> : null}

      <div style={{position: 'absolute', left: 0, right: 0, top: 1130, display: 'flex', justifyContent: 'center', gap: 34, opacity: keysIn, transform: `translateY(${(1 - keysIn) * 60}px)`}}>
        <Keycap label="Alt" size={150} press={pressNow} />
        <Keycap label="Tab" size={150} press={pressNow} />
      </div>

      <Caption text={T.text} times={T.words} highlight={['Wartet', 'fest']} highlightColor="#FFC857" y={1420} />
      <Voice id={ID} />
      <Sfx at={alt1} src="Click.mp3" volume={sfxVolume(ID, alt1, 0.8)} />
      <Sfx at={alt2} src="Click.mp3" volume={sfxVolume(ID, alt2, 0.8)} />
    </Backdrop>
  );
};
