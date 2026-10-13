import React from 'react';
import {Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Caption} from '../lib/Caption';
import {ClickRing, Cursor} from '../lib/Cursor';
import {CARD_VIEW, PANEL} from '../lib/layout';
import {clamp, tween} from '../lib/motion';
import {PanelShot} from '../lib/PanelShot';
import {Sfx} from '../lib/Sfx';
import {MOOD_COLOR} from '../lib/theme';
import {timing} from '../lib/timing';
import {Backdrop} from '../lib/ui';
import {Voice, sfxVolume} from '../lib/Voice';
import {Overlay, btn, center} from './panel.parts';
import {HEAD_SUMMARY} from './S07FreigabeKlapptAuf';

const ID = '08-freigeben';

// Nah an der Freigabe-Karte: über „Ablehnen“ fahren, „Freigeben“ klicken – die Sitzung
// arbeitet weiter, ohne Fensterwechsel. Am Ende kippt die Stimmung auf „Hängt fest“.
export const S08Freigeben: React.FC = () => {
  const f = useCurrentFrame();
  const {durationInFrames: D} = useVideoConfig();
  const T = timing(ID);
  const click = T.at('klick') + 6;

  // Kamera: Karte (wie Ende 07) → nach dem Klick zurück aufs ganze Panel.
  const back = tween(f, click + 20, click + 50, 0, 1, Easing.inOut(Easing.cubic));
  const pw = interpolate(back, [0, 1], [CARD_VIEW.w, PANEL.w]);
  const pl = interpolate(back, [0, 1], [CARD_VIEW.left, PANEL.left]);
  const pt = interpolate(back, [0, 1], [CARD_VIEW.top, PANEL.top]);

  const deny = center(btn('approval', 'deny'), pw);
  const allow = center(btn('approval', 'allow'), pw);
  const ease = Easing.inOut(Easing.cubic);
  // Mauszeiger: von unten rechts über „Ablehnen“ zu „Freigeben“.
  const cx = interpolate(f, [T.at('direkt') - 20, T.at('ablehnen'), T.at('ablehnen') + 24, click - 4], [980, deny.x + pl, deny.x + pl + 10, allow.x + pl], {...clamp, easing: ease});
  const cy = interpolate(f, [T.at('direkt') - 20, T.at('ablehnen'), T.at('ablehnen') + 24, click - 4], [1300, deny.y + pt, deny.y + pt + 4, allow.y + pt], {...clamp, easing: ease});
  const hoverDeny = interpolate(f, [T.at('ablehnen') - 4, T.at('ablehnen') + 4, T.at('ablehnen') + 22, T.at('ablehnen') + 30], [0, 1, 1, 0], clamp);
  const pressed = interpolate(f, [click - 3, click, click + 7], [0, 1, 0], clamp);
  const cursorOut = tween(f, click + 24, click + 40, 1, 0);

  // Nach dem Klick: Arbeitet; ganz am Ende: Hängt fest (Anfang von 09).
  const working = f >= click + 6;
  const toProblem = tween(f, D - 16, D - 4, 0, 1);

  const shot = (variant: 'approval' | 'working' | 'problem', opacity: number) => (
    <div style={{position: 'absolute', left: pl, top: pt, opacity}}>
      <PanelShot variant={variant} width={pw} summary={variant === 'approval' ? HEAD_SUMMARY : undefined}>
        {variant === 'approval' ? (
          <>
            <Overlay box={btn('approval', 'deny')} width={pw} color="#F6EFE8" opacity={0.1 * hoverDeny} />
            <Overlay box={btn('approval', 'allow')} width={pw} color="#15110E" opacity={0.25 * pressed} />
          </>
        ) : null}
      </PanelShot>
    </div>
  );

  return (
    <Backdrop glow={{x: 540, y: 700, color: working ? 'rgba(143,184,255,0.10)' : 'rgba(255,200,87,0.10)'}}>
      {!working ? (
        <div style={{position: 'absolute', inset: 0, transformOrigin: `${allow.x + pl}px ${allow.y + pt}px`, transform: `scale(${1 - 0.02 * pressed})`}}>{shot('approval', 1)}</div>
      ) : (
        <>
          {shot('working', 1 - toProblem)}
          {toProblem > 0 ? shot('problem', toProblem) : null}
        </>
      )}
      <ClickRing x={allow.x + pl} y={allow.y + pt} progress={interpolate(f, [click, click + 18], [0, 1], clamp)} color={MOOD_COLOR.done} />
      <Cursor x={cx} y={cy} pressed={pressed} opacity={cursorOut} size={52} />

      <Caption text={T.text} times={T.words} highlight={['Freigeben']} highlightColor={MOOD_COLOR.done} y={1440} outAt={D - 10} />
      <Voice id={ID} />
      <Sfx at={click} src="Click.mp3" volume={sfxVolume(ID, click, 0.9)} />
    </Backdrop>
  );
};
