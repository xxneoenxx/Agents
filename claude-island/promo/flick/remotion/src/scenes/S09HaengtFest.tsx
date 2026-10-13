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
import {FIELD_BG, Overlay, btn, center, field} from './panel.parts';

const ID = '09-haengt-fest';
const HINT = 'Kurz warten, dann weiter.';
// Näher an die Karte, damit der getippte Hinweis lesbar ist.
const NEAR = {w: 1360, left: -330, top: 250};

// Hängt fest: Mini-Claude zittert. Hinweis tippen, „Erneut versuchen“ leuchtet auf,
// „Hinweis geben“ klicken – und es geht weiter (Arbeitet, Anfang von 10).
export const S09HaengtFest: React.FC = () => {
  const f = useCurrentFrame();
  const {durationInFrames: D} = useVideoConfig();
  const T = timing(ID);

  const typeAt = T.at('gib') + 10;
  const sendAt = Math.min(D - 40, Math.max(T.at('erneut') + 14, typeAt + typeFrames(HINT, 20) + 30));

  const near = tween(f, T.at('zeigt'), T.at('gib'), 0, 1, Easing.inOut(Easing.cubic));
  const far = tween(f, sendAt + 8, sendAt + 34, 0, 1, Easing.inOut(Easing.cubic));
  const z = near * (1 - far);
  const pw = interpolate(z, [0, 1], [PANEL.w, NEAR.w]);
  const pl = interpolate(z, [0, 1], [PANEL.left, NEAR.left]);
  const pt = interpolate(z, [0, 1], [PANEL.top, NEAR.top]);
  const k = pw / PANEL_IMG.w;

  const hint = field('problem', 'hint');
  const hintC = center(hint, pw);
  const send = center(btn('problem', 'hint'), pw);
  const ease = Easing.inOut(Easing.cubic);
  const cx = interpolate(f, [T.at('zeigt'), typeAt - 4, sendAt - 16, sendAt - 2], [1000, hintC.x + pl - 120 * k, hintC.x + pl - 100 * k, send.x + pl], {...clamp, easing: ease});
  const cy = interpolate(f, [T.at('zeigt'), typeAt - 4, sendAt - 16, sendAt - 2], [1350, hintC.y + pt - 20 * k, hintC.y + pt, send.y + pt], {...clamp, easing: ease});
  const clickField = interpolate(f, [typeAt - 6, typeAt - 3, typeAt + 4], [0, 1, 0], clamp);
  const clickSend = interpolate(f, [sendAt - 3, sendAt, sendAt + 7], [0, 1, 0], clamp);
  const focused = f >= typeAt - 3;
  const retryGlow = interpolate(f, [T.at('versuch') - 4, T.at('versuch') + 6, T.at('erneut') + 6, T.at('erneut') + 16], [0, 1, 1, 0], clamp) * (0.6 + 0.4 * wave(f, 0.5));
  const working = f >= sendAt + 6;
  const cursorOut = tween(f, sendAt + 14, sendAt + 30, 1, 0);

  return (
    <Backdrop glow={{x: 540, y: 700, color: working ? 'rgba(143,184,255,0.10)' : 'rgba(255,122,107,0.10)'}}>
      <div style={{position: 'absolute', left: pl, top: pt}}>
        <PanelShot variant={working ? 'working' : 'problem'} width={pw}>
          {!working ? (
            <>
              {/* Hinweisfeld: Platzhalter weg, Fokus-Rahmen, getippter Hinweis */}
              <Overlay box={hint} width={pw} color={FIELD_BG} inset={2} radius={11} opacity={focused ? 1 : 0}>
                <div style={{position: 'absolute', inset: 0, borderRadius: 22 * k, border: `${2 * k}px solid rgba(255,154,98,0.7)`}} />
                <div style={{position: 'absolute', left: 24 * k, top: 18 * k, fontFamily: FONT.sans, fontSize: 28 * k, color: C.text}}>
                  <TypeOn text={HINT} start={typeAt} cps={20} />
                </div>
              </Overlay>
              <Overlay box={btn('problem', 'retry')} width={pw} color="#F6EFE8" opacity={0.14 * retryGlow} />
              <Overlay box={btn('problem', 'hint')} width={pw} color="#15110E" opacity={0.25 * clickSend} />
            </>
          ) : null}
        </PanelShot>
      </div>
      <ClickRing x={hintC.x + pl - 120 * k} y={hintC.y + pt - 20 * k} progress={interpolate(f, [typeAt - 3, typeAt + 15], [0, 1], clamp)} />
      <ClickRing x={send.x + pl} y={send.y + pt} progress={interpolate(f, [sendAt, sendAt + 18], [0, 1], clamp)} color={C.accent} />
      <Cursor x={cx} y={cy} pressed={Math.max(clickField, clickSend)} opacity={interpolate(f, [T.at('zeigt'), T.at('zeigt') + 8], [0, 1], clamp) * cursorOut} size={52} />

      <Caption text={T.text} times={T.words} highlight={['fest', 'Hinweis']} highlightColor={MOOD_COLOR.problem} y={1440} outAt={D - 10} />
      <Voice id={ID} />
      <Sfx at={typeAt - 3} src="Click.mp3" volume={sfxVolume(ID, typeAt - 3, 0.6)} />
      <Sfx at={typeAt} src="Typing.mp3" volume={sfxVolume(ID, typeAt, 0.5)} durationInFrames={Math.min(72, typeFrames(HINT, 20))} />
      <Sfx at={sendAt} src="Click.mp3" volume={sfxVolume(ID, sendAt, 0.9)} />
    </Backdrop>
  );
};
