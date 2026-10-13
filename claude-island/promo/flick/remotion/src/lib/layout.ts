// Feste Positionen, damit Szenen an ihren Übergängen exakt aneinanderpassen.
import {PILL_H, PILL_W} from './Pill';

/** Die Insel in Heldenposition: oben mittig (ca. 19 % unter der Oberkante). */
export const ISLAND = {cx: 540, top: 360, scale: 2.8};
export const islandBox = (scale = ISLAND.scale) => ({left: ISLAND.cx - (PILL_W * scale) / 2, top: ISLAND.top, width: PILL_W * scale, height: PILL_H * scale});

/** Das aufgeklappte Panel (Screenshot 1440×872) in Standardgröße. */
export const PANEL = {w: 1000, left: 40, top: 300};
export const PANEL_H = (PANEL.w * 872) / 1440;

/** Mittellinie der Untertitel; darunter bleibt die Safe Zone frei (unten 380 px). */
export const CAPTION_Y = 1420;

/** Das Loop-Bild (erstes Bild von 01, letztes von 14): wartender Mini-Claude groß in der Mitte. */
export const LOOP = {size: 600, cx: 540, cy: 860};

/** Monitor in Szene 04 (Weltkoordinaten bei Kamera 1): Bildschirm 900×562, Insel oben mittig. */
export const MONITOR = {x: 90, y: 560, w: 900, h: 562, pillScale: 0.7, pillTop: 574};
export const monitorPillCenter = {x: 540, y: MONITOR.pillTop + (48 * MONITOR.pillScale) / 2};

/** Nahaufnahme der Pille (Ende 04, ganz 05, Anfang 06). */
export const CLOSEUP = {cx: 540, cy: 760, scale: 4.3};

/** Nahaufnahme der Karte rechts im Panel (Ende 07, Anfang 08): Panel 1494 px breit. */
export const CARD_VIEW = {w: 1494, left: -423, top: 210};

/** Bühnenkarte links im Fertig-Panel, zentriert (Ende 12, ganz 13): Panel 2020 px breit, auf die Karte beschnitten. */
export const STAGE_VIEW = {w: 2020, cardLeft: 265, cardTop: 300, cardW: 550, cardH: 870};
