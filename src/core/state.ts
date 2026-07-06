// Zentraler Spielzustand (Single Source of Truth) + Erzeugung des Startzustands.
// Bewusst serialisierbar gehalten (reine Daten), damit Phase 4 ihn speichern kann.

import { BALANCE } from '@data/balance';
import { STATIONS } from '@data/stations';

export interface StationState {
  id: string;
  /** Anzahl besessener Einheiten. */
  owned: number;
  /** Manager eingestellt? Dann laeuft die Station automatisch. */
  manager: boolean;
  /** Laeuft gerade ein Produktionszyklus? */
  active: boolean;
  /** Im aktuellen Zyklus vergangene Zeit (ms). */
  elapsedMs: number;
}

export interface GameState {
  /** Aktueller Muenzstand. */
  coins: number;
  /** Zustand je Station (gleiche Reihenfolge wie STATIONS). */
  stations: StationState[];
  /** Permanenter globaler Umsatz-Multiplikator (Renovieren/Prestige, spaeter). */
  globalMultiplier: number;
  /** Zeitstempel (ms), bis wann der Marketing-Boost aktiv ist. */
  boostUntilMs: number;
  /** Zeitstempel (ms), bis wann der Marketing-Boost wieder verfuegbar ist. */
  boostCooldownUntilMs: number;
  /** Multiplikator waehrend eines aktiven Boosts. */
  boostFactor: number;
}

/** Erzeugt den frischen Startzustand gemaess Balancing. */
export function createInitialState(): GameState {
  const stations: StationState[] = STATIONS.map((def, index) => ({
    id: def.id,
    owned: index === 0 ? BALANCE.startingUnitsFirstStation : 0,
    manager: false,
    // Die erste Station startet noch nicht automatisch -- der erste Zyklus
    // wird durch Tippen ausgeloest.
    active: false,
    elapsedMs: 0,
  }));

  return {
    coins: BALANCE.startingCoins,
    stations,
    globalMultiplier: 1,
    boostUntilMs: 0,
    boostCooldownUntilMs: 0,
    boostFactor: BALANCE.marketing.factor,
  };
}

/** Findet den Stationszustand per Id. */
export function findStation(state: GameState, id: string): StationState | undefined {
  return state.stations.find((s) => s.id === id);
}

/**
 * Ist eine Station freigeschaltet (sichtbar/kaufbar)? Die erste immer, jede
 * weitere, sobald die vorherige mindestens eine Einheit besitzt.
 */
export function isStationUnlocked(state: GameState, index: number): boolean {
  if (index <= 0) return true;
  const prev = state.stations[index - 1];
  return !!prev && prev.owned >= 1;
}
