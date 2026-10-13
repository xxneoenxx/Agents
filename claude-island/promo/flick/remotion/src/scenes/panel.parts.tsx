import React from 'react';
import {PANEL_IMG, uiMap} from '../lib/PanelShot';

// Hilfen für Überlagerungen auf den Panel-Screenshots (Koordinaten aus ui-map.json, 1440×872).
export type Box = {x: number; y: number; w: number; h: number};
export const CARD_BG = '#1D1815';
export const FIELD_BG = '#14110F';

/** Box in angezeigte Koordinaten (relativ zur Panel-Ecke) für Panelbreite `width`. */
export const scaleBox = (b: Box, width: number) => {
  const k = width / PANEL_IMG.w;
  return {left: b.x * k, top: b.y * k, width: b.w * k, height: b.h * k};
};
export const center = (b: Box, width: number) => {
  const k = width / PANEL_IMG.w;
  return {x: (b.x + b.w / 2) * k, y: (b.y + b.h / 2) * k};
};

export const btn = (variant: string, act: string) => uiMap[variant].buttons[act] as Box;
export const field = (variant: string, name: 'hint' | 'compose') => uiMap[variant].fields[name] as Box;

/** Halbtransparente Fläche über einer Box (Hover, Druck, Abdecken). */
export const Overlay: React.FC<{box: Box; width: number; color: string; opacity?: number; radius?: number; inset?: number; style?: React.CSSProperties; children?: React.ReactNode}> = ({box, width, color, opacity = 1, radius = 12, inset = 0, style, children}) => {
  const k = width / PANEL_IMG.w;
  const s = scaleBox(box, width);
  return (
    <div
      style={{
        position: 'absolute',
        left: s.left + inset * k,
        top: s.top + inset * k,
        width: s.width - 2 * inset * k,
        height: s.height - 2 * inset * k,
        borderRadius: radius * k * 2,
        background: color,
        opacity,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
