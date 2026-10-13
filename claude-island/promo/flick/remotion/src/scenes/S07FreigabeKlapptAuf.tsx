import React from 'react';
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Caption} from '../lib/Caption';
import {CARD_VIEW, ISLAND, PANEL, PANEL_H, islandBox} from '../lib/layout';
import {MiniClaude} from '../lib/MiniClaude';
import {clamp, pop, tween} from '../lib/motion';
import {PANEL_IMG, PanelShot, panelMascotBox} from '../lib/PanelShot';
import {Pill} from '../lib/Pill';
import {Sfx} from '../lib/Sfx';
import {C, FONT, MOOD_COLOR} from '../lib/theme';
import {timing} from '../lib/timing';
import {Backdrop, TypeOn} from '../lib/ui';
import {Voice, sfxVolume} from '../lib/Voice';
import {CARD_BG} from './panel.parts';

const ID = '07-freigabe-klappt-auf';
// Kopfzeile passend zu den drei Sitzungen aus 06 (api arbeitet, docs fertig, portfolio wartet), Format wie in app.js.
export const HEAD_SUMMARY = {count: 3, parts: ['1 wartet', '1 arbeitet', '1 fertig']};

// SIGNATURE: Freigabe → die Pille klappt von selbst zum Panel auf, und aus dem Kopf
// wachsen erst die Arme, dann die Beine – der ganze Mini-Claude hüpft und winkt.
// Im Editor darunter wird weitergetippt: der Fokus bleibt beim Nutzer.
export const S07FreigabeKlapptAuf: React.FC = () => {
  const f = useCurrentFrame();
  const {durationInFrames: D} = useVideoConfig();
  const T = timing(ID);
  const hero = islandBox();
  const open = T.at('klappt') - 4;

  // Morph Pille → Panel.
  const m = pop(f, open, {damping: 17, stiffness: 120});
  const mc = Math.min(1, Math.max(0, m));
  const L = interpolate(m, [0, 1], [hero.left, PANEL.left]);
  const Tp = interpolate(m, [0, 1], [hero.top, PANEL.top]);
  const Wd = interpolate(m, [0, 1], [hero.width, PANEL.w]);
  const Ht = interpolate(m, [0, 1], [hero.height, PANEL_H]);
  const radius = interpolate(mc, [0, 1], [24 * ISLAND.scale, (26 * PANEL.w) / 720]);
  const pillFade = interpolate(mc, [0, 0.25], [1, 0], clamp);
  const panelFade = interpolate(mc, [0.15, 0.55], [0, 1], clamp);

  // Kamera am Ende: auf die Freigabe-Karte (Anfang von 08).
  const zoom = tween(f, D - 22, D, 0, 1, Easing.inOut(Easing.cubic));
  const pw = interpolate(zoom, [0, 1], [PANEL.w, CARD_VIEW.w]);
  const pl = interpolate(zoom, [0, 1], [PANEL.left, CARD_VIEW.left]);
  const pt = interpolate(zoom, [0, 1], [PANEL.top, CARD_VIEW.top]);

  // Verwandlung auf der Bühne: Arme, dann Beine, dann ein Hopser.
  const arms = pop(f, open + 18, {damping: 9, stiffness: 160});
  const legs = pop(f, open + 30, {damping: 9, stiffness: 160});
  const hopT = f - (open + 46);
  const hop = hopT > 0 && hopT < 24 ? -Math.sin((hopT / 24) * Math.PI) * 0.16 : 0;
  const mb = panelMascotBox(zoom > 0 ? pw : Math.max(Wd, 10));

  // Freigabe-Karte blendet ein, sobald Mini-Claude ganz da ist.
  const card = tween(f, open + 40, open + 58, 1, 0);
  const k = (zoom > 0 ? pw : Math.max(Wd, 10)) / PANEL_IMG.w;

  // Kopf hüpft in der Pille, bevor sie aufklappt.
  const nudge = interpolate(f, [T.w(1), T.w(1) + 6, T.w(1) + 14], [0, -10, 0], clamp);

  const editorFade = interpolate(f, [0, 20], [0, 1], clamp) * (1 - zoom);
  const typed = 'const form = useKontakt({ name, email, nachricht })';

  return (
    <Backdrop glow={{x: 540, y: 600, strength: 0.6}}>
      {/* Editor darunter: es wird weitergetippt, der Cursor blinkt */}
      <div style={{position: 'absolute', left: 90, top: 1010, width: 900, height: 290, borderRadius: 18, background: '#1E1915', border: `2px solid ${C.lineStrong}`, opacity: editorFade * 0.9, overflow: 'hidden'}}>
        <div style={{height: 50, borderBottom: `2px solid ${C.line}`, display: 'flex', alignItems: 'center', padding: '0 22px', fontFamily: FONT.sans, fontWeight: 600, fontSize: 24, color: C.muted}}>kontakt.ts – Editor</div>
        <div style={{padding: '26px 30px', fontFamily: FONT.mono, fontSize: 32, color: C.text}}>
          <TypeOn text={typed} start={12} cps={5.5} style={{color: C.text}} />
        </div>
      </div>

      {/* Morph-Rahmen */}
      <div style={{position: 'absolute', left: zoom > 0 ? pl : L, top: zoom > 0 ? pt : Tp, width: zoom > 0 ? pw : Wd, height: zoom > 0 ? (pw * PANEL_IMG.h) / PANEL_IMG.w : Ht, borderRadius: radius, background: C.bg, border: `2px solid ${C.lineStrong}`, overflow: 'hidden', boxShadow: '0 30px 80px rgba(0,0,0,0.55)'}}>
        {pillFade > 0 ? (
          <div style={{position: 'absolute', left: 0, top: 0, opacity: pillFade, transform: `translateY(${nudge}px)`}}>
            <Pill mood="waiting" name="portfolio" count={3} scale={(Wd / hero.width) * ISLAND.scale} />
          </div>
        ) : null}
        <div style={{position: 'absolute', left: 0, top: 0, opacity: panelFade}}>
          <PanelShot
            variant="approval"
            summary={HEAD_SUMMARY}
            width={zoom > 0 ? pw : Math.max(Wd, 10)}
            mascot={
              <div style={{transform: `translateY(${hop * mb.size}px)`}}>
                <MiniClaude size={mb.size} mood="waiting" arms={arms} legs={legs} />
              </div>
            }
          >
            {/* Karte zunächst abgedeckt */}
            <div style={{position: 'absolute', left: 446 * k, top: 202 * k, width: 964 * k, height: 536 * k, borderRadius: 40 * k, background: CARD_BG, opacity: card}} />
          </PanelShot>
        </div>
      </div>

      <div style={{position: 'absolute', left: 0, right: 0, top: 930, textAlign: 'center', fontFamily: FONT.sans, fontWeight: 500, fontSize: 40, color: C.muted, opacity: interpolate(f, [T.at('ohne'), T.at('ohne') + 12], [0, 1], clamp) * (1 - zoom)}}>
        klappt auf, ohne den Fokus zu stehlen
      </div>

      <Caption text={T.text} times={T.words} highlight={['Freigabe']} highlightColor={MOOD_COLOR.waiting} y={1440} outAt={D - 12} />
      <Voice id={ID} />
      <Sfx at={open} src="Notification.mp3" volume={sfxVolume(ID, open, 0.6)} />
      <Sfx at={open + 46} src="Pop.mp3" volume={sfxVolume(ID, open + 46, 0.7)} />
    </Backdrop>
  );
};
