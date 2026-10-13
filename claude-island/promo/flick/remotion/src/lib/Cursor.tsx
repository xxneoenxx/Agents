import React from 'react';

// Schlichter Mauspfeil mit Klick-Zustand. (x, y) ist die Pfeilspitze.
export const Cursor: React.FC<{x: number; y: number; pressed?: number; size?: number; opacity?: number}> = ({x, y, pressed = 0, size = 46, opacity = 1}) => (
  <div style={{position: 'absolute', left: x, top: y, width: size, height: size * 1.4, opacity, transformOrigin: '0 0', transform: `scale(${1 - 0.12 * pressed})`, filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.5))'}}>
    <svg viewBox="0 0 20 28" width={size} height={size * 1.4}>
      <path d="M1.5 1.5 L1.5 22 L6.6 17.3 L10 25.5 L13.6 24 L10.3 16 L17.5 16 Z" fill="#F6EFE8" stroke="#15110E" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  </div>
);

/** Klick-Ring, der sich vom Klickpunkt ausbreitet. progress 0..1. */
export const ClickRing: React.FC<{x: number; y: number; progress: number; color?: string}> = ({x, y, progress, color = '#F6EFE8'}) =>
  progress <= 0 || progress >= 1 ? null : (
    <div
      style={{
        position: 'absolute',
        left: x - 40,
        top: y - 40,
        width: 80,
        height: 80,
        borderRadius: '50%',
        border: `3px solid ${color}`,
        opacity: 0.7 * (1 - progress),
        transform: `scale(${0.3 + progress * 0.9})`,
      }}
    />
  );
