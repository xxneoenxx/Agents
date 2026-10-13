import {Easing, interpolate, spring} from 'remotion';
import {FPS} from './theme';

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// Werte zwischen zwei Frames, standardmäßig weich (ease-in-out).
export const tween = (frame: number, from: number, to: number, a: number, b: number, easing = Easing.inOut(Easing.cubic)) =>
  interpolate(frame, [from, to], [a, b], {...clamp, easing});

// Federnder Einstieg ab `delay` (Frames): 0 → 1 mit leichtem Überschwingen.
export const pop = (frame: number, delay = 0, config: {damping?: number; stiffness?: number; mass?: number} = {}) =>
  spring({frame: frame - delay, fps: FPS, config: {damping: 13, stiffness: 170, mass: 0.9, ...config}});

// Ruhiger Einstieg ohne Überschwingen.
export const settle = (frame: number, delay = 0) =>
  spring({frame: frame - delay, fps: FPS, config: {damping: 200, stiffness: 120}});

// Phase 0..1 einer Schleife mit `period` Sekunden.
export const phase = (frame: number, period: number, offset = 0) => {
  const p = (frame / FPS + offset) / period;
  return p - Math.floor(p);
};

// 0 → 1 → 0 über eine Periode, weich (wie CSS ease-in-out alternate).
export const wave = (frame: number, period: number, offset = 0) => (1 - Math.cos(2 * Math.PI * phase(frame, period, offset))) / 2;

// Stückweise Keyframes wie in CSS: stops = [[0, v], [0.45, v], ...] über p in 0..1.
export const keyframes = (p: number, stops: [number, number][], easing = Easing.inOut(Easing.sin)) =>
  interpolate(p, stops.map((s) => s[0]), stops.map((s) => s[1]), {...clamp, easing});

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
