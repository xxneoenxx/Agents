import React from 'react';
import {Img, staticFile} from 'remotion';
import {MiniClaude} from './MiniClaude';
import {Mood} from './theme';
import UI from './ui-map.json';

// Aufgeklappte Insel als echter Screenshot (1440×872 = 720×436 bei doppelter
// Pixeldichte). Die *-empty-Varianten haben eine leere Bühne; der Mini-Claude
// wird als lebendige Ebene genau an seine Stelle gesetzt.
export type PanelVariant = 'approval' | 'working' | 'problem' | 'done' | 'idle';
export const PANEL_IMG = {w: 1440, h: 872};
const MASCOT = {x: 76, y: 216, w: 300};
export const VARIANT_MOOD: Record<PanelVariant, Mood> = {approval: 'waiting', working: 'working', problem: 'problem', done: 'done', idle: 'idle'};

type Box = {x: number; y: number; w: number; h: number};
export const uiMap = UI as unknown as Record<string, {buttons: Record<string, Box>; fields: Record<string, Box | null>; models: Record<string, Box>; efforts: Record<string, Box>; [k: string]: unknown}>;

/** Mittelpunkt eines UI-Elements im angezeigten Panel (px relativ zur Panel-Ecke). */
export const panelPoint = (box: Box, width: number) => {
  const k = width / PANEL_IMG.w;
  return {x: (box.x + box.w / 2) * k, y: (box.y + box.h / 2) * k};
};

export type PanelShotProps = {
  variant: PanelVariant;
  /** Angezeigte Breite in px (Original 1440; mehr als ca. 1,4× vermeiden). */
  width: number;
  /** Eigener Mini-Claude statt des Standards (z. B. mit Wachstum). */
  mascot?: React.ReactNode;
  mood?: Mood;
  arms?: number;
  legs?: number;
  look?: {x: number; y: number};
  frame?: number;
  /** Ohne Mini-Claude (nur Bühne). */
  noMascot?: boolean;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};

export const PanelShot: React.FC<PanelShotProps> = ({variant, width, mascot, mood, arms, legs, look, frame, noMascot, style, children}) => {
  const k = width / PANEL_IMG.w;
  return (
    <div style={{position: 'relative', width, height: PANEL_IMG.h * k, ...style}}>
      <Img src={staticFile(`brand-assets/panel-${variant}-empty.png`)} style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}} />
      {noMascot ? null : (
        <div style={{position: 'absolute', left: MASCOT.x * k, top: MASCOT.y * k}}>
          {mascot ?? <MiniClaude size={MASCOT.w * k} mood={mood ?? VARIANT_MOOD[variant]} arms={arms} legs={legs} look={look} frame={frame} />}
        </div>
      )}
      {children}
    </div>
  );
};

/** Position und Größe des Mini-Claude auf der Bühne im angezeigten Panel. */
export const panelMascotBox = (width: number) => {
  const k = width / PANEL_IMG.w;
  return {x: MASCOT.x * k, y: MASCOT.y * k, size: MASCOT.w * k};
};
