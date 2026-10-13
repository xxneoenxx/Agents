import React from 'react';
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Caption} from '../lib/Caption';
import {ClickRing, Cursor} from '../lib/Cursor';
import {PANEL} from '../lib/layout';
import {clamp, tween, wave} from '../lib/motion';
import {PANEL_IMG, PanelShot} from '../lib/PanelShot';
import {Sfx} from '../lib/Sfx';
import {C, FONT, MOOD_COLOR} from '../lib/theme';
import {timing} from '../lib/timing';
import {Backdrop, TypeOn, typeFrames} from '../lib/ui';
import {Voice, sfxVolume} from '../lib/Voice';
import {CARD_BG, FIELD_BG, Overlay, btn, center, field} from './panel.parts';

const ID = '10-live-und-fertig';
const NEXT = 'Jetzt noch ein Impressum.';
// Zeilen der Werkzeugschritte im Arbeitet-Screenshot (Bildkoordinaten).
const ROWS = [298, 354, 410, 466];
const ROW_H = 56;

// Live: die Schritte erscheinen nacheinander. „Fertig?“: Jubel, letzte Antwort, und gleich
// die nächste Anweisung tippen und senden. Danach gleitet das Bild zur Modell-Leiste.
export const S10LiveUndFertig: React.FC = () => {
  const f = useCurrentFrame();
  const {durationInFrames: D} = useVideoConfig();
  const T = timing(ID);
  const pw = PANEL.w;
  const k = pw / PANEL_IMG.w;

  const doneAt = T.at('fertig') - 4;
  const done = f >= doneAt;
  const flash = interpolate(f, [doneAt, doneAt + 4, doneAt + 20], [0, 0.18, 0], clamp);
  const typeAt = T.at('schickst') + 4;
  const sendAt = Math.min(D - 34, typeAt + typeFrames(NEXT, 22) + 72);
  const slide = tween(f, D - 22, D, 0, 1, Easing.in(Easing.cubic));

  // Schritte nacheinander aufdecken (Read, Write, Edit, Bash), passend zu den ersten Wörtern.
  const STEP_WORDS = ['während', 'arbeitet', 'siehst', 'schritt'];
  const reveal = (i: number) => tween(f, T.at(STEP_WORDS[i]) - 6, T.at(STEP_WORDS[i]) + 8, 0, 1, Easing.out(Easing.cubic));

  const compose = field('done', 'compose');
  const cc = center(compose, pw);
  const sc = center(btn('done', 'send'), pw);
  const ease = Easing.inOut(Easing.cubic);
  const cx = interpolate(f, [doneAt + 10, typeAt - 4, sendAt - 18, sendAt - 2], [960, cc.x + PANEL.left - 200 * k, cc.x + PANEL.left - 150 * k, sc.x + PANEL.left], {...clamp, easing: ease});
  const cy = interpolate(f, [doneAt + 10, typeAt - 4, sendAt - 18, sendAt - 2], [1250, cc.y + PANEL.top, cc.y + PANEL.top + 10, sc.y + PANEL.top], {...clamp, easing: ease});
  const clickField = interpolate(f, [typeAt - 6, typeAt - 3, typeAt + 4], [0, 1, 0], clamp);
  const clickSend = interpolate(f, [sendAt - 3, sendAt, sendAt + 7], [0, 1, 0], clamp);
  const cursorOn = interpolate(f, [doneAt + 10, doneAt + 18], [0, 1], clamp) * tween(f, sendAt + 10, sendAt + 22, 1, 0);

  return (
    <Backdrop glow={{x: 540, y: 700, color: done ? 'rgba(126,214,168,0.10)' : 'rgba(143,184,255,0.10)'}}>
      <div style={{position: 'absolute', left: PANEL.left, top: PANEL.top, transform: `translateY(${-slide * 1100}px)`, opacity: 1 - slide * 0.6}}>
        <PanelShot variant={done ? 'done' : 'working'} width={pw}>
          {!done ? (
            <>
              {ROWS.map((y, i) => (
                <div
                  key={y}
                  style={{position: 'absolute', left: 468 * k, top: y * k, width: 924 * k, height: ROW_H * k, background: CARD_BG, opacity: 1 - reveal(i), transform: `translateX(${reveal(i) * 30 * k}px)`}}
                />
              ))}
              {/* aktueller Schritt pulsiert */}
              <div style={{position: 'absolute', left: 470 * k, top: ROWS[3] * k, width: 920 * k, height: ROW_H * k, borderRadius: 16 * k, background: MOOD_COLOR.working, opacity: reveal(3) * 0.08 * wave(f, 0.9)}} />
            </>
          ) : (
            <>
              <Overlay box={compose} width={pw} color={FIELD_BG} inset={2} radius={11} opacity={f >= typeAt - 3 ? 1 : 0}>
                <div style={{position: 'absolute', inset: 0, borderRadius: 22 * k, border: `${2 * k}px solid rgba(255,154,98,0.7)`}} />
                <div style={{position: 'absolute', left: 24 * k, top: 18 * k, fontFamily: FONT.sans, fontSize: 28 * k, color: C.text, whiteSpace: 'nowrap'}}>
                  {f < sendAt + 4 ? <TypeOn text={NEXT} start={typeAt} cps={22} /> : null}
                </div>
              </Overlay>
              <Overlay box={btn('done', 'send')} width={pw} color="#15110E" opacity={0.25 * clickSend} />
              <div style={{position: 'absolute', inset: 0, background: MOOD_COLOR.done, opacity: flash, borderRadius: 36}} />
            </>
          )}
        </PanelShot>
      </div>
      <ClickRing x={sc.x + PANEL.left} y={sc.y + PANEL.top} progress={interpolate(f, [sendAt, sendAt + 18], [0, 1], clamp)} color={C.accent} />
      <Cursor x={cx} y={cy} pressed={Math.max(clickField, clickSend)} opacity={cursorOn} size={52} />

      <Caption text={T.text} times={T.words} highlight={['live', 'Fertig']} highlightColor={MOOD_COLOR.done} y={1440} outAt={D - 14} />
      <Voice id={ID} />
      <Sfx at={doneAt} src="Correct.mp3" volume={sfxVolume(ID, doneAt, 0.55)} durationInFrames={60} />
      <Sfx at={typeAt - 3} src="Click.mp3" volume={sfxVolume(ID, typeAt - 3, 0.5)} />
      <Sfx at={sendAt} src="Click.mp3" volume={sfxVolume(ID, sendAt, 0.9)} />
      <Sfx at={D - 22} src="transitions.mp3" volume={sfxVolume(ID, D - 22, 0.6)} />
    </Backdrop>
  );
};
