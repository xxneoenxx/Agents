import React from 'react';
import {useCurrentFrame} from 'remotion';
import {MiniClaude} from './MiniClaude';
import {wave} from './motion';
import {C, FONT, MOOD_COLOR, MOOD_LABEL, Mood} from './theme';

// Die zugeklappte Insel, scharf nachgebaut nach styles.css (.pill: 232×48, Radius 24).
// `scale` vergrößert sie als Ganzes; gezeichnet wird in App-Maßen.
export type PillProps = {
  mood: Mood;
  name?: string;
  count?: number;
  scale?: number;
  /** Text der Stimmungszeile, falls abweichend (z. B. beim Durchblättern). */
  statusText?: string;
  /** Kopf-Modus (Standard): Arme/Beine eingezogen. Für Morph-Momente 0..1. */
  arms?: number;
  legs?: number;
  look?: {x: number; y: number};
  frame?: number;
  /** Schatten unter der Insel, wenn Fenster darunter durchgleiten. */
  shadow?: boolean;
  style?: React.CSSProperties;
};

export const PILL_W = 232;
export const PILL_H = 48;

export const Pill: React.FC<PillProps> = ({mood, name = 'portfolio', count = 1, scale = 1, statusText, arms = 0, legs = 0, look, frame, shadow, style}) => {
  const sceneFrame = useCurrentFrame();
  const f = frame ?? sceneFrame;
  const color = MOOD_COLOR[mood];
  const urgent = mood === 'waiting' || mood === 'problem';
  const ring = urgent ? 0.12 + 0.48 * (1 - wave(f, 1.6)) : 0;
  return (
    <div style={{width: PILL_W * scale, height: PILL_H * scale, ...style}}>
      <div
        style={{
          position: 'relative',
          width: PILL_W,
          height: PILL_H,
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '0 10px 0 8px',
          borderRadius: 24,
          background: C.bg,
          border: `1px solid ${C.lineStrong}`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05)${shadow ? ', 0 10px 30px rgba(0,0,0,0.55)' : ''}`,
          boxSizing: 'border-box',
        }}
      >
        <div style={{position: 'absolute', inset: -1, borderRadius: 24, border: `1px solid ${color}`, opacity: ring}} />
        <div style={{flex: 'none', marginTop: 7, marginLeft: 2}}>
          <MiniClaude size={44} mood={mood} arms={arms} legs={legs} look={look} frame={f} />
        </div>
        <div style={{flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.15}}>
          <span style={{fontFamily: FONT.display, fontWeight: 700, fontSize: 13.5, letterSpacing: '-0.01em', color}}>{statusText ?? MOOD_LABEL[mood]}</span>
          <span style={{fontFamily: FONT.sans, fontSize: 12, color: C.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{name}</span>
        </div>
        <div
          style={{
            flex: 'none',
            minWidth: 26,
            height: 26,
            padding: '0 7px',
            borderRadius: 13,
            display: 'grid',
            placeItems: 'center',
            fontFamily: FONT.mono,
            fontWeight: 500,
            fontSize: 12,
            background: urgent ? color : C.raise2,
            color: urgent ? C.bg : C.text,
            boxSizing: 'border-box',
          }}
        >
          {count}
        </div>
      </div>
    </div>
  );
};
