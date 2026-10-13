import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {clamp} from './motion';
import {C, FONT} from './theme';

/** Dunkle Leinwand, optional mit warmem Schein (x, y in px). */
export const Backdrop: React.FC<{glow?: {x: number; y: number; color?: string; strength?: number}; children?: React.ReactNode}> = ({glow, children}) => (
  <AbsoluteFill style={{background: C.bg, overflow: 'hidden'}}>
    {glow ? (
      <div
        style={{
          position: 'absolute',
          left: glow.x - 700,
          top: glow.y - 700,
          width: 1400,
          height: 1400,
          background: `radial-gradient(circle, ${glow.color ?? 'rgba(255,154,98,0.10)'} 0%, transparent 60%)`,
          opacity: glow.strength ?? 1,
        }}
      />
    ) : null}
    {children}
  </AbsoluteFill>
);

/** Tippt Text Zeichen für Zeichen ab `start` (Frames), mit blinkendem Caret. */
export const TypeOn: React.FC<{text: string; start: number; cps?: number; caret?: boolean; style?: React.CSSProperties}> = ({text, start, cps = 22, caret = true, style}) => {
  const frame = useCurrentFrame();
  const n = Math.max(0, Math.min(text.length, Math.floor(((frame - start) / 60) * cps)));
  const showCaret = caret && frame >= start && Math.floor(frame / 18) % 2 === 0;
  return (
    <span style={style}>
      {text.slice(0, n)}
      <span style={{display: 'inline-block', width: '0.09em', height: '1.05em', marginLeft: '0.06em', verticalAlign: '-0.15em', background: 'currentColor', opacity: showCaret ? 1 : 0}} />
    </span>
  );
};

/** Wie viele Frames TypeOn für `text` braucht. */
export const typeFrames = (text: string, cps = 22) => Math.ceil((text.length / cps) * 60);

/** Tastenkappe, `press` 0..1 drückt sie ein. */
export const Keycap: React.FC<{label: string; press?: number; size?: number}> = ({label, press = 0, size = 150}) => (
  <div
    style={{
      width: size * 1.25,
      height: size,
      borderRadius: size * 0.16,
      background: '#2A231E',
      border: `2px solid ${C.lineStrong}`,
      boxShadow: `0 ${size * 0.08 * (1 - press)}px 0 #0b0907, 0 ${size * 0.12}px ${size * 0.3}px rgba(0,0,0,0.5)`,
      transform: `translateY(${size * 0.07 * press}px)`,
      display: 'grid',
      placeItems: 'center',
      fontFamily: FONT.sans,
      fontWeight: 600,
      fontSize: size * 0.32,
      color: C.text,
    }}
  >
    {label}
  </div>
);

/** Pille als Badge („Kostenlos“ usw.). */
export const Badge: React.FC<{label: string; color?: string; size?: number; style?: React.CSSProperties}> = ({label, color = C.accent, size = 44, style}) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: size * 0.3,
      padding: `${size * 0.32}px ${size * 0.62}px`,
      borderRadius: size,
      background: 'rgba(21,17,14,0.92)',
      border: `2px solid ${color}`,
      color: C.text,
      fontFamily: FONT.sans,
      fontWeight: 600,
      fontSize: size,
      lineHeight: 1,
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    <span style={{width: size * 0.36, height: size * 0.36, borderRadius: '50%', background: color, boxShadow: `0 0 ${size * 0.4}px ${color}`}} />
    {label}
  </div>
);

/** Callout: Linie von (x1,y1) zum Ziel (x2,y2) und ein Label am Anfang. `t` 0..1. */
export const Callout: React.FC<{x1: number; y1: number; x2: number; y2: number; label: string; t: number; align?: 'left' | 'right' | 'center'}> = ({x1, y1, x2, y2, label, t, align = 'center'}) => {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const ang = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
  const draw = interpolate(t, [0, 0.7], [0, 1], clamp);
  const fade = interpolate(t, [0.2, 1], [0, 1], clamp);
  return (
    <>
      <div style={{position: 'absolute', left: x1, top: y1, width: len * draw, height: 3, background: C.muted, transformOrigin: '0 50%', transform: `rotate(${ang}deg)`, borderRadius: 2}} />
      <div style={{position: 'absolute', left: x2 - 7, top: y2 - 7, width: 14, height: 14, borderRadius: '50%', background: C.muted, opacity: draw >= 1 ? 1 : 0}} />
      <div
        style={{
          position: 'absolute',
          left: x1,
          top: y1,
          transform: `translate(${align === 'center' ? '-50%' : align === 'right' ? '-100%' : '0'}, ${y1 > y2 ? '10px' : 'calc(-100% - 10px)'})`,
          opacity: fade,
          fontFamily: FONT.sans,
          fontWeight: 600,
          fontSize: 46,
          color: C.text,
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </div>
    </>
  );
};
