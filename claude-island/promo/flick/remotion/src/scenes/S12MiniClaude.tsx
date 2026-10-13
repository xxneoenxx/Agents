import React from 'react';
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Caption} from '../lib/Caption';
import {STAGE_VIEW} from '../lib/layout';
import {MiniClaude} from '../lib/MiniClaude';
import {clamp, pop, tween} from '../lib/motion';
import {PANEL_IMG, PanelShot} from '../lib/PanelShot';
import {Sfx} from '../lib/Sfx';
import {C, FONT, MOOD_COLOR, MOOD_LABEL, Mood} from '../lib/theme';
import {timing} from '../lib/timing';
import {Backdrop} from '../lib/ui';
import {Voice, sfxVolume} from '../lib/Voice';

const ID = '12-mini-claude';
const ORDER: Mood[] = ['idle', 'working', 'waiting', 'problem', 'done'];

// Bühnenkarte des Fertig-Panels (wie 13): Panel 2020 px breit, auf die Karte beschnitten.
export const StageCard: React.FC<{opacity?: number; children?: React.ReactNode; mascot?: React.ReactNode}> = ({opacity = 1, children, mascot}) => {
  const k = STAGE_VIEW.w / PANEL_IMG.w;
  return (
    <div style={{position: 'absolute', left: STAGE_VIEW.cardLeft, top: STAGE_VIEW.cardTop, width: STAGE_VIEW.cardW, height: STAGE_VIEW.cardH, overflow: 'hidden', borderRadius: 40 * k, opacity}}>
      <div style={{position: 'absolute', left: -30 * k, top: -118 * k}}>
        <PanelShot variant="done" width={STAGE_VIEW.w} noMascot={!!mascot || mascot === null} mascot={mascot ?? undefined} />
      </div>
      {children}
    </div>
  );
};
/** Mini-Claude auf der Bühnenkarte (Bildschirmkoordinaten). */
export const stageMascot = () => {
  const k = STAGE_VIEW.w / PANEL_IMG.w;
  return {x: STAGE_VIEW.cardLeft + (76 - 30) * k, y: STAGE_VIEW.cardTop + (216 - 118) * k, size: 300 * k};
};

// Mini-Claude groß in der Mitte: er landet, setzt sich, und wechselt Wort für Wort
// die Stimmung – schläft, tippt, winkt, zittert, jubelt. Dann hüpft er zurück auf die Bühne.
export const S12MiniClaude: React.FC = () => {
  const f = useCurrentFrame();
  const {durationInFrames: D} = useVideoConfig();
  const T = timing(ID);
  const big = 560;
  const home = {x: 540 - big / 2, y: 520};

  // Landung von oben mit Squash.
  const land = pop(f, 0, {damping: 12, stiffness: 120});
  const ly = interpolate(land, [0, 1], [-900, 0]);
  const squash = interpolate(f, [12, 16, 26], [1, 0.86, 1], clamp);

  const verbs = ['schläft', 'tippt', 'winkt', 'zittert', 'jubelt'].map((v) => T.at(v) - 3);
  const active = verbs.filter((v) => f >= v).length - 1;
  const mood: Mood = active < 0 ? 'idle' : ORDER[active];

  // Zurück auf die Bühne (Anfang von 13).
  const back = tween(f, D - 26, D - 4, 0, 1, Easing.inOut(Easing.cubic));
  const target = stageMascot();
  const size = interpolate(back, [0, 1], [big, target.size]);
  const x = interpolate(back, [0, 1], [home.x, target.x]);
  const y = interpolate(back, [0, 1], [home.y + ly, target.y]) - Math.sin(back * Math.PI) * 160;
  const chipsOut = 1 - back;

  return (
    <Backdrop glow={{x: 540, y: 700, color: `${MOOD_COLOR[mood]}22`, strength: 1}}>
      {back > 0 ? <StageCard opacity={back} mascot={null} /> : null}
      <div style={{position: 'absolute', left: x, top: y, transformOrigin: '50% 100%', transform: `scaleY(${squash}) scaleX(${2 - squash})`}}>
        <MiniClaude size={size} mood={back > 0.5 ? 'done' : mood} />
      </div>

      {/* Stimmungs-Chips (3 + 2): gedämpft, leuchten beim passenden Verb auf */}
      <div style={{position: 'absolute', left: 60, right: 60, top: 1010, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 22, opacity: chipsOut}}>
        {ORDER.map((m, i) => {
          const inT = pop(f, T.w(0) + i * 6, {damping: 18, stiffness: 160});
          const lit = f >= verbs[i];
          const flare = interpolate(f, [verbs[i], verbs[i] + 6, verbs[i] + 20], [0, 1, 0], clamp);
          return (
            <div
              key={m}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 14,
                height: 76,
                padding: '0 30px 0 24px',
                borderRadius: 38,
                border: `3px solid ${lit ? MOOD_COLOR[m] : C.muted}`,
                background: lit ? `${MOOD_COLOR[m]}1f` : 'transparent',
                color: lit ? C.text : C.muted,
                fontFamily: FONT.sans,
                fontWeight: 600,
                fontSize: 36,
                opacity: Math.min(1, inT),
                transform: `translateY(${(1 - inT) * 60}px) scale(${1 + 0.08 * flare})`,
              }}
            >
              <span style={{width: 18, height: 18, borderRadius: '50%', background: lit ? MOOD_COLOR[m] : C.muted}} />
              {MOOD_LABEL[m]}
            </div>
          );
        })}
      </div>

      <Caption text={T.text} times={T.words} highlight={['Mini-Claude']} y={1440} outAt={D - 12} />
      <Voice id={ID} />
      <Sfx at={12} src="Pop.mp3" volume={sfxVolume(ID, 12, 0.7)} />
      <Sfx at={verbs[4]} src="energy.MP3" volume={sfxVolume(ID, verbs[4], 0.7)} />
      <Sfx at={D - 6} src="Pop.mp3" volume={sfxVolume(ID, D - 6, 0.6)} />
    </Backdrop>
  );
};
