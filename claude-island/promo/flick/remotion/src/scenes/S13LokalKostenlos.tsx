import React from 'react';
import {Easing, useCurrentFrame, useVideoConfig} from 'remotion';
import {Caption} from '../lib/Caption';
import {STAGE_VIEW} from '../lib/layout';
import {MiniClaude} from '../lib/MiniClaude';
import {pop, tween} from '../lib/motion';
import {PANEL_IMG} from '../lib/PanelShot';
import {Sfx} from '../lib/Sfx';
import {C, FONT, MOOD_COLOR} from '../lib/theme';
import {timing} from '../lib/timing';
import {Backdrop, Badge, TypeOn} from '../lib/ui';
import {Voice, sfxVolume} from '../lib/Voice';
import {StageCard, stageMascot} from './S12MiniClaude';

const ID = '13-lokal-kostenlos';

// Bühnenkarte (Fertig): Badges „Kostenlos“ und „Open Source · MIT“, dann Push-in auf die
// echten Statuszeilen und 127.0.0.1:47821 – die Insel läuft lokal.
export const S13LokalKostenlos: React.FC = () => {
  const f = useCurrentFrame();
  const {durationInFrames: D} = useVideoConfig();
  const T = timing(ID);
  const k = STAGE_VIEW.w / PANEL_IMG.w;

  // Statuszeilen auf der Karte (Bildkoordinaten 132,646 – 320,708).
  const conn = {x: STAGE_VIEW.cardLeft + (132 - 30) * k, y: STAGE_VIEW.cardTop + (646 - 118) * k, w: 188 * k, h: 62 * k};
  const connC = {x: conn.x + conn.w / 2, y: conn.y + conn.h / 2};

  // Push-in ab „Die Insel läuft lokal“, mit scharfem Nachbau der Zeilen.
  const push = tween(f, T.w(3) - 4, T.w(3) + 18, 0, 1, Easing.inOut(Easing.cubic));
  const zoom = 1 + 0.5 * push;
  // Die Statuszeilen wandern dabei in die Bildmitte (y ≈ 980).
  const shiftY = (980 - connC.y) * push;
  const badgesOut = 1 - tween(f, T.w(3) - 6, T.w(3) + 6, 0, 1);
  const out = tween(f, D - 22, D, 0, 1, Easing.in(Easing.cubic));

  const b1 = pop(f, T.w(0) - 6);
  const b2 = pop(f, T.w(1) - 6);
  const b3 = pop(f, T.w(8) - 4);
  const typeAt = T.w(6) - 4;
  const m = stageMascot();

  return (
    <Backdrop glow={{x: 540, y: 700, color: 'rgba(126,214,168,0.10)'}}>
      <div style={{position: 'absolute', inset: 0, transform: `translateY(${-out * 2000}px)`}}>
        <div style={{position: 'absolute', inset: 0, transformOrigin: `${connC.x}px ${connC.y}px`, transform: `translate(${(540 - connC.x) * push}px, ${shiftY}px) scale(${zoom})`}}>
          <StageCard mascot={null} />
          <div style={{position: 'absolute', left: m.x, top: m.y}}>
            <MiniClaude size={m.size} mood="done" />
          </div>
          {/* scharfer Nachbau der Statuszeilen über dem Screenshot */}
          <div style={{position: 'absolute', left: conn.x - 10, top: conn.y - 6, width: conn.w + 20, height: conn.h + 12, background: '#211C18', opacity: push, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 * k, paddingLeft: 10}}>
            {['Server :47821', 'Mod verbunden'].map((t) => (
              <div key={t} style={{display: 'flex', alignItems: 'center', gap: 8 * k, fontFamily: FONT.mono, fontSize: 21 * k, color: C.muted, whiteSpace: 'nowrap'}}>
                <span style={{width: 8 * k, height: 8 * k, borderRadius: '50%', background: MOOD_COLOR.done}} />
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* Badges */}
        <div style={{position: 'absolute', left: 0, right: 0, top: 150, display: 'flex', justifyContent: 'center', gap: 28, opacity: badgesOut}}>
          <div style={{transform: `scale(${b1})`, opacity: Math.min(1, b1 * 2)}}>
            <Badge label="Kostenlos" color={C.accent} size={44} />
          </div>
          <div style={{transform: `scale(${b2})`, opacity: Math.min(1, b2 * 2)}}>
            <Badge label="Open Source · MIT" color={MOOD_COLOR.working} size={44} />
          </div>
        </div>

        {/* 127.0.0.1:47821 und „läuft lokal“ */}
        <div style={{position: 'absolute', left: 0, right: 0, top: 1085, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, opacity: push}}>
          <div style={{fontFamily: FONT.mono, fontWeight: 500, fontSize: 56, color: C.text, padding: '14px 30px', borderRadius: 18, background: 'rgba(0,0,0,0.35)', border: `2px solid ${C.lineStrong}`}}>
            <TypeOn text="127.0.0.1:47821" start={typeAt} cps={16} />
          </div>
        </div>
        <div style={{position: 'absolute', left: 0, right: 0, top: 1200, display: 'flex', justifyContent: 'center', transform: `scale(${b3})`, opacity: Math.min(1, b3 * 2)}}>
          <Badge label="läuft lokal" color={MOOD_COLOR.done} size={40} />
        </div>
      </div>

      <div style={{position: 'absolute', left: 0, right: 0, top: 1528, textAlign: 'center', fontFamily: FONT.sans, fontWeight: 500, fontSize: 30, color: C.muted, opacity: 1 - out}}>
        Inoffizielles Community-Tool · nicht von Anthropic
      </div>

      <Caption text="Kostenlos, Open Source. Die Insel läuft lokal auf deinem PC." times={T.words} highlight={['Kostenlos', 'lokal']} y={1400} size={60} outAt={D - 16} />
      <Voice id={ID} />
      <Sfx at={T.w(0) - 6} src="Pop.mp3" volume={sfxVolume(ID, T.w(0) - 6, 0.7)} />
      <Sfx at={T.w(1) - 6} src="Pop.mp3" volume={sfxVolume(ID, T.w(1) - 6, 0.7)} />
      <Sfx at={T.w(3) - 4} src="Zoomin-OR-out.mp3" volume={sfxVolume(ID, T.w(3) - 4, 0.6)} />
      <Sfx at={T.w(8) - 4} src="Pop.mp3" volume={sfxVolume(ID, T.w(8) - 4, 0.7)} />
      <Sfx at={D - 22} src="transitions.mp3" volume={sfxVolume(ID, D - 22, 0.6)} />
    </Backdrop>
  );
};
