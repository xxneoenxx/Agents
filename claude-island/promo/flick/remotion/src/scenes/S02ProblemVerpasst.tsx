import React from 'react';
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Caption} from '../lib/Caption';
import {ISLAND, islandBox} from '../lib/layout';
import {clamp, tween, wave} from '../lib/motion';
import {Sfx} from '../lib/Sfx';
import {C, FONT, MOOD_COLOR} from '../lib/theme';
import {timing} from '../lib/timing';
import {Backdrop} from '../lib/ui';
import {Voice, sfxVolume} from '../lib/Voice';
import {BrowserWin, EditorWin, Switcher, TERMINAL, TerminalWin} from './desktop.parts';

const ID = '02-problem-verpasst';

// Ständig umschalten, Zähler läuft hoch – und die Freigabe wartet trotzdem ungesehen.
export const S02ProblemVerpasst: React.FC = () => {
  const f = useCurrentFrame();
  const {durationInFrames: D} = useVideoConfig();
  const T = timing(ID);

  // Umschalten in immer kürzeren Abständen (×1 … ×7) bis kurz vor „Und“.
  const flickEnd = T.w(2) - 4;
  const switches: number[] = [];
  let t = 4;
  let gap = 20;
  while (switches.length < 7) {
    switches.push(t);
    t += gap;
    gap = Math.max(7, gap - 3);
  }
  const scaleT = (flickEnd - 30) / switches[6];
  const at = switches.map((s) => Math.round(s * Math.min(1, scaleT)));
  const count = at.filter((a) => f >= a).length;
  const order = ['editor', 'terminal', 'browser'] as const;
  const front = count === 0 ? 'browser' : order[(count - 1) % 3];
  const switcherOn = f < flickEnd;
  const selected = count === 0 ? 1 : [0, 2, 1][(count - 1) % 3];

  // Push-in ins Terminal bei „Und trotzdem …“, dann zurück, Terminal wieder verdeckt.
  const pushIn = tween(f, T.w(2), T.w(2) + 16, 0, 1, Easing.inOut(Easing.cubic));
  const pullBack = tween(f, T.w(5), T.w(5) + 14, 0, 1, Easing.inOut(Easing.cubic));
  const zoom = 1 + 0.32 * pushIn * (1 - pullBack);
  const termFront = f >= T.w(2) - 2 && f < T.w(5) + 6;
  const tagPulse = wave(f, 0.7);
  const ignoredGlow = f > T.w(5) + 10 ? 0.35 + 0.5 * wave(f - T.w(5), 0.55) : 0.3;

  // Übergang: der gelbe Schimmer löst sich und fliegt oben in die Mitte (dort wird er in 03 zur Insel).
  const fly = tween(f, D - 26, D - 2, 0, 1, Easing.inOut(Easing.cubic));
  const island = islandBox();
  const orbFrom = {x: TERMINAL.x + TERMINAL.w - 30, y: TERMINAL.y + 120};
  const orbTo = {x: ISLAND.cx, y: island.top + island.height / 2};
  const orbX = interpolate(fly, [0, 1], [orbFrom.x, orbTo.x]);
  const orbY = interpolate(fly, [0, 1], [orbFrom.y, orbTo.y]) - Math.sin(fly * Math.PI) * 140;
  const orbSize = interpolate(fly, [0, 1], [60, 120]);

  const cam: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    transformOrigin: `${TERMINAL.x + TERMINAL.w / 2}px ${TERMINAL.y + TERMINAL.h / 2}px`,
    transform: `scale(${zoom})`,
  };

  const editor = <EditorWin key="e" typed="function validateKont" caretOn={Math.floor(f / 30) % 2 === 0} />;
  const browser = <BrowserWin key="b" />;
  const terminal = <TerminalWin key="t" command mascot={false} tagPulse={tagPulse} glow={termFront ? 0 : ignoredGlow} />;
  const stack = termFront ? [editor, browser, terminal] : front === 'editor' ? [terminal, browser, editor] : front === 'terminal' ? [editor, browser, terminal] : [terminal, editor, browser];

  return (
    <Backdrop>
      <div style={cam}>{stack}</div>

      {switcherOn ? <Switcher selected={selected} /> : null}

      {/* Zähler oben links */}
      <div
        style={{
          position: 'absolute',
          left: 70,
          top: 150,
          opacity: interpolate(f, [at[0], at[0] + 6, T.w(5), T.w(5) + 10], [0, 1, 1, 0], clamp),
          fontFamily: FONT.mono,
          fontWeight: 500,
          fontSize: 54,
          color: C.text,
          padding: '10px 26px',
          borderRadius: 18,
          background: 'rgba(30,25,21,0.92)',
          border: `2px solid ${C.lineStrong}`,
          transform: `scale(${1 + 0.1 * Math.max(0, ...at.map((a) => interpolate(f, [a, a + 3, a + 10], [0, 1, 0], clamp)))})`,
        }}
      >
        Alt-Tab ×{Math.max(1, count)}
      </div>

      {fly > 0 ? (
        <div
          style={{
            position: 'absolute',
            left: orbX - orbSize / 2,
            top: orbY - orbSize / 2,
            width: orbSize,
            height: orbSize,
            borderRadius: '50%',
            background: `radial-gradient(circle, #fff3c4 0%, ${MOOD_COLOR.waiting} 45%, rgba(255,200,87,0) 72%)`,
            boxShadow: `0 0 80px 30px rgba(255,200,87,0.45)`,
          }}
        />
      ) : null}

      <Caption text="Ständig nachsehen. Und trotzdem die Freigabe verpassen." times={T.words} highlight={['Freigabe']} highlightColor={MOOD_COLOR.waiting} outAt={D - 14} />
      <Voice id={ID} />
      {at.map((a, i) => (
        <Sfx key={i} at={a} src="Click.mp3" volume={sfxVolume(ID, a, 0.45)} />
      ))}
      <Sfx at={T.w(2)} src="Zoomin-OR-out.mp3" volume={sfxVolume(ID, T.w(2), 0.7)} />
    </Backdrop>
  );
};
