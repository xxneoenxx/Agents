import React from 'react';
import {Easing, useCurrentFrame} from 'remotion';
import {keyframes, lerp, phase, wave} from './motion';
import {C, MOOD_COLOR, Mood} from './theme';

// Mini-Claude, Pixel für Pixel nach der App (claude-island/app/renderer/styles.css):
// ein Pixel ist 1 u breit und 2 u hoch, die Figur 16 u × 10 u. Die Stimmungen
// sind die Keyframes der App, hier Frame für Frame gerechnet.

export type MiniClaudeProps = {
  /** Breite der Figur in px (= 16 u). Höhe ist 10 u. */
  size: number;
  mood: Mood;
  /** Eigener Takt, Standard ist der Frame der Szene. */
  frame?: number;
  /** 0 = eingezogen (nur Kopf), 1 = ganz draußen; Werte über 1 schwingen über. */
  arms?: number;
  legs?: number;
  /** Blickrichtung −1..1. */
  look?: {x: number; y: number};
  spark?: boolean;
  sparkColor?: string;
  sparkOpacity?: number;
  /** false = ruhige Pose ohne Stimmungsbewegung (Hüpfen, Zittern …). */
  motion?: boolean;
  blink?: boolean;
  style?: React.CSSProperties;
};

const abs: React.CSSProperties = {position: 'absolute'};

export const MiniClaude: React.FC<MiniClaudeProps> = ({
  size,
  mood,
  frame: frameProp,
  arms = 1,
  legs = 1,
  look = {x: 0, y: 0},
  spark = true,
  sparkColor,
  sparkOpacity,
  motion = true,
  blink = true,
  style,
}) => {
  const sceneFrame = useCurrentFrame();
  const f = frameProp ?? sceneFrame;
  const u = size / 16;
  const px = (n: number) => n * u;
  const m = (moodName: Mood) => mood === moodName;
  const live = motion ? f : 0;

  // ---------- ganze Figur: Hüpfen, Zittern, Federn ----------
  let figY = 0;
  let figX = 0;
  let figRot = 0;
  let figSX = 1;
  let figSY = 1;
  if (motion && m('waiting')) {
    const p = phase(f, 0.95);
    const ease = Easing.bezier(0.3, 0, 0.4, 1);
    figY = keyframes(p, [[0, 0], [0.2, 0], [0.45, -1.8], [0.6, -1.6], [1, 0]], ease);
    figSX = keyframes(p, [[0, 1.04], [0.2, 0.97], [0.45, 1], [0.6, 1], [1, 1.04]], ease);
    figSY = keyframes(p, [[0, 0.96], [0.2, 1.03], [0.45, 1], [0.6, 1], [1, 0.96]], ease);
  } else if (motion && m('problem')) {
    const p = phase(f, 0.9);
    const stops: [number, number][] = [[0, 0], [0.04, -1], [0.12, 1], [0.2, -1], [0.28, 1], [0.36, -1], [0.44, 1], [0.46, 0], [1, 0]];
    const s = keyframes(p, stops, Easing.linear);
    figX = 0.35 * s;
    figRot = 1.5 * s;
  } else if (motion && m('done')) {
    const p = phase(f, 1.3);
    figY = keyframes(p, [[0, 0], [0.2, -0.9], [0.35, 0], [0.5, 0], [1, 0]]);
    figSX = keyframes(p, [[0, 1], [0.2, 1], [0.35, 1.03], [0.5, 1], [1, 1]]);
    figSY = keyframes(p, [[0, 1], [0.2, 1], [0.35, 0.97], [0.5, 1], [1, 1]]);
  }

  // ---------- Oberkörper: Sitzen, Wippen ----------
  let upperY = 0;
  if (m('idle')) upperY = 1.4 + 0.3 * wave(live, 5.5);
  else if (m('working')) upperY = 0.45 * wave(live, 0.5);

  const breathe = wave(live, m('idle') ? 5.5 : 4.2);

  // ---------- Augen ----------
  // Blinzeln alle ~3,7 s, nie im ersten Bild (Loop-Bild).
  const blinking = blink && motion && (f + 120) % 223 < 8 && !m('idle') && !m('problem') && !m('done');
  let eyeTransform = blinking ? 'scaleY(0.15)' : 'none';
  let eyeOrigin = '50% 50%';
  let chevrons: 'none' | 'squeeze' | 'happy' = 'none';
  if (m('idle')) {
    eyeTransform = 'scale(1.3, 0.25)';
    eyeOrigin = '50% 100%';
  } else if (m('waiting')) {
    eyeTransform = blinking ? 'scale(1.4, 0.15)' : 'scale(1.4, 1.2)';
  } else if (m('problem')) {
    chevrons = 'squeeze';
  } else if (m('done')) {
    chevrons = 'happy';
  }

  // ---------- Arme und Beine ----------
  const armRot = (side: 'l' | 'r') => {
    if (!motion && !m('done') && !m('problem')) return side === 'l' && m('waiting') ? 14 : side === 'r' && m('waiting') ? -50 : 0;
    if (m('working')) return side === 'l' ? lerp(-22, 8, wave(f, 0.52)) : lerp(22, -8, wave(f, 0.52, 0.13));
    if (m('waiting')) return side === 'l' ? 14 : lerp(-30, -75, wave(f, 0.96));
    if (m('problem')) return side === 'l' ? -35 : 35;
    if (m('done')) {
      const a = keyframes(phase(live, 1.3), [[0, 52], [0.2, 72], [0.5, 52], [1, 52]]);
      return side === 'l' ? a : -a;
    }
    return 0;
  };
  const armScale = `scale(${Math.max(0, arms)}, ${lerp(0.5, 1, Math.min(1, Math.max(0, arms))) * (arms > 1 ? 1 + (arms - 1) * 0.4 : 1)})`;
  const legScale = `scale(${lerp(0.6, 1, Math.min(1, Math.max(0, legs)))}, ${Math.max(0, legs)})`;
  const legPx = (i: number): React.CSSProperties => {
    if (m('idle')) return {transform: 'scaleY(0.45)', transformOrigin: '50% 100%'};
    if (m('working') && motion) return {transform: `translateY(${-0.9 * wave(f, 0.5, i % 2 ? 0.25 : 0) * u}px)`};
    return {};
  };

  // ---------- Status-Pixel ----------
  let sparkOp = 1;
  if (m('idle')) sparkOp = 0.4;
  else if (m('working')) sparkOp = lerp(1, 0.35, wave(live, 0.9));
  else if (m('waiting') || m('problem')) {
    const p = phase(live, m('waiting') ? 0.95 : 0.5);
    sparkOp = p < 0.25 || p >= 0.75 ? 1 : 0.25;
  }
  if (sparkOpacity !== undefined) sparkOp = sparkOpacity;
  const sparkC = sparkColor ?? MOOD_COLOR[mood];

  const limb = (left: number, top: number, w: number, h: number, origin: string, scale: string, inner: React.CSSProperties, key: string) => (
    <div key={key} style={{...abs, left: px(left), top: px(top), width: px(w), height: px(h), transformOrigin: origin, transform: scale}}>
      <div style={{...abs, inset: 0, background: C.claude, transformOrigin: origin, ...inner}} />
    </div>
  );

  const bar = (transform: string, key: string) => (
    <div
      key={key}
      style={{...abs, left: '50%', top: '50%', width: px(1.5), height: px(0.55), marginLeft: px(-0.75), marginTop: px(-0.275), background: C.ink, transform}}
    />
  );
  const eye = (left: number, side: 'l' | 'r') => {
    let bars: React.ReactNode = null;
    if (chevrons === 'squeeze') {
      bars = side === 'l'
        ? [bar(`translateY(${px(-0.4)}px) rotate(30deg)`, 'a'), bar(`translateY(${px(0.4)}px) rotate(-30deg)`, 'b')]
        : [bar(`translateY(${px(-0.4)}px) rotate(-30deg)`, 'a'), bar(`translateY(${px(0.4)}px) rotate(30deg)`, 'b')];
    } else if (chevrons === 'happy') {
      bars = [bar(`translateX(${px(-0.4)}px) rotate(-45deg)`, 'a'), bar(`translateX(${px(0.4)}px) rotate(45deg)`, 'b')];
    }
    return (
      <div
        style={{
          ...abs,
          left: px(left),
          top: px(2),
          width: px(1),
          height: px(2),
          background: chevrons === 'none' ? C.ink : 'transparent',
          transform: chevrons === 'none' ? eyeTransform : 'none',
          transformOrigin: eyeOrigin,
        }}
      >
        {bars}
      </div>
    );
  };

  const zzz = m('idle')
    ? [0, 1, 2].map((i) => {
        const p = phase(f, 3.6, -1.2 * i);
        const op = keyframes(p, [[0, 0], [0.2, 0.9], [1, 0]], Easing.out(Easing.quad));
        const t = Easing.out(Easing.quad)(p);
        return (
          <div
            key={i}
            style={{
              ...abs,
              left: px(13.5),
              top: px(-1),
              fontFamily: "'Bricolage Grotesque', sans-serif",
              fontWeight: 700,
              fontSize: px(3),
              lineHeight: 1,
              color: C.muted,
              opacity: op,
              transform: `translate(${t * px(2.4)}px, ${-t * px(3.9)}px) scale(${lerp(0.6, 1.2, t)})`,
            }}
          >
            z
          </div>
        );
      })
    : null;

  const sweat = m('problem') ? (() => {
    const p = phase(f, 1.4);
    return (
      <div
        style={{
          ...abs,
          left: px(12.6),
          top: px(0.6),
          width: px(0.9),
          height: px(1.3),
          background: C.sweat,
          opacity: keyframes(p, [[0, 0], [0.2, 1], [1, 0]], Easing.linear),
          transform: `translateY(${Easing.in(Easing.quad)(p) * px(4)}px)`,
        }}
      />
    );
  })() : null;

  const sparkles = m('done')
    ? ([[-0.4, -1.2, 0], [15.4, 0.6, -0.8]] as const).map(([x, y, off], i) => {
        const p = phase(f, 1.6, off);
        const op = keyframes(p, [[0, 0], [0.4, 1], [0.7, 0], [1, 0]]);
        const sc = keyframes(p, [[0, 0], [0.4, 1.2], [0.7, 0.4], [1, 0]]);
        return (
          <div
            key={i}
            style={{...abs, left: px(x), top: px(y), width: px(1), height: px(1), background: MOOD_COLOR.done, opacity: op, transform: `rotate(45deg) scale(${sc})`}}
          />
        );
      })
    : null;

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: px(10),
        transformOrigin: '50% 100%',
        transform: `translate(${figX * u}px, ${figY * u}px) rotate(${figRot}deg) scale(${figSX}, ${figSY})`,
        ...style,
      }}
    >
      {/* Beine hinter dem Körper */}
      {[3, 5, 10, 12].map((x, i) => limb(x, 7.4, 1, 2.6, '50% 0', legScale, legPx(i), `leg${i}`))}
      <div style={{...abs, inset: 0, transform: `translateY(${upperY * u}px)`}}>
        {spark ? (
          <div
            style={{
              ...abs,
              left: px(7.35),
              top: px(-2.9),
              width: px(1.3),
              height: px(1.3),
              background: sparkC,
              boxShadow: `0 0 ${px(1.4)}px ${sparkC}`,
              opacity: sparkOp,
            }}
          />
        ) : null}
        {limb(0, 4, 2.6, 2, `${px(2.3)}px 50%`, armScale, {transform: `rotate(${armRot('l')}deg)`}, 'arm-l')}
        {limb(13.4, 4, 2.6, 2, `${px(0.3)}px 50%`, armScale, {transform: `rotate(${armRot('r')}deg)`}, 'arm-r')}
        <div
          style={{
            ...abs,
            left: px(2),
            top: 0,
            width: px(12),
            height: px(8),
            background: C.claude,
            boxShadow: `inset 0 ${px(-0.6)}px 0 rgba(110, 36, 12, 0.28)`,
            transformOrigin: '50% 100%',
            transform: `scale(${1 + 0.015 * breathe}, ${1 - 0.025 * breathe})`,
          }}
        >
          <div style={{...abs, inset: 0, transform: `translate(${look.x * 0.8 * u}px, ${look.y * 0.6 * u}px)`}}>
            {eye(2, 'l')}
            {eye(9, 'r')}
          </div>
        </div>
        {sweat}
      </div>
      {zzz}
      {sparkles}
    </div>
  );
};
