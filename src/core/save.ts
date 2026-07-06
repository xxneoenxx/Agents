// Persistenz: Spielstand in localStorage speichern/laden (inkl. Zeitstempel fuer
// Offline-Einnahmen). Bewusst schlank; ein Umzug auf IndexedDB (idb-keyval) ist
// spaeter moeglich, ohne die Aufrufer zu aendern.

import type { GameState } from '@core/state';

const SAVE_KEY = 'bfe:save';
const SAVE_VERSION = 4;

interface SaveEnvelope {
  v: number;
  savedAt: number;
  state: GameState;
}

export interface LoadResult {
  state: GameState;
  savedAt: number;
}

function storage(): Storage | undefined {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : undefined;
  } catch {
    return undefined;
  }
}

/** Speichert den Zustand mit aktuellem Zeitstempel. */
export function saveGame(state: GameState, now: number = Date.now()): void {
  const store = storage();
  if (!store) return;
  const envelope: SaveEnvelope = { v: SAVE_VERSION, savedAt: now, state };
  try {
    store.setItem(SAVE_KEY, JSON.stringify(envelope));
  } catch {
    // Speicher voll/nicht verfuegbar -> still ignorieren.
  }
}

/** Laedt den Zustand, oder null wenn keiner/inkompatibel. */
export function loadGame(): LoadResult | null {
  const store = storage();
  if (!store) return null;
  const raw = store.getItem(SAVE_KEY);
  if (!raw) return null;
  try {
    const env = JSON.parse(raw) as SaveEnvelope;
    if (env.v !== SAVE_VERSION || !env.state || !Array.isArray(env.state.restaurants)) {
      return null;
    }
    // Fehlende Einstellungen mit Standard auffuellen (Vorwaertskompatibilitaet).
    if (!env.state.settings) env.state.settings = { sound: true };
    return { state: env.state, savedAt: env.savedAt };
  } catch {
    return null;
  }
}

/** Loescht den Spielstand (harter Reset). */
export function clearSave(): void {
  storage()?.removeItem(SAVE_KEY);
}
