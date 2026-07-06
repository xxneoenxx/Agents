// Zentraler Spielzustand (Single Source of Truth) + Erzeugung des Startzustands.
// Serialisierbar (reine Daten) fuer das Speichern in Phase 4. Ab Phase 3 mit
// mehreren Restaurants, Renovierungsstufen, Investoren (Prestige) und Upgrades.

import { BALANCE } from '@data/balance';
import { RESTAURANTS } from '@data/restaurants';

export interface StationState {
  id: string;
  owned: number;
  manager: boolean;
  active: boolean;
  elapsedMs: number;
}

export interface RestaurantState {
  id: string;
  /** Freigeschaltet/eroeffnet? */
  unlocked: boolean;
  /** Renovierungsstufe (0 = Ausgangszustand). */
  level: number;
  stations: StationState[];
}

export interface GameSettings {
  /** Sound/SFX aktiviert. */
  sound: boolean;
}

export interface GameState {
  /** Globaler Muenzstand (ueber alle Restaurants geteilt). */
  coins: number;
  /** Lebenszeit-Umsatz (treibt Freischaltungen + Prestige). */
  totalEarned: number;
  restaurants: RestaurantState[];
  /** Id des aktuell betrachteten Restaurants. */
  currentRestaurantId: string;
  /** Prestige-Waehrung. */
  investors: number;
  /** Gekaufte Upgrade-Stufen (id -> Stufe). */
  upgrades: Record<string, number>;
  /** Marketing-Boost. */
  boostUntilMs: number;
  boostCooldownUntilMs: number;
  boostFactor: number;
  /** Einstellungen (Sound etc.). */
  settings: GameSettings;
}

function createStations(restaurantIndex: number): StationState[] {
  return RESTAURANTS[restaurantIndex].stations.map((def, i) => ({
    id: def.id,
    owned: restaurantIndex === 0 && i === 0 ? BALANCE.startingUnitsFirstStation : 0,
    manager: false,
    active: false,
    elapsedMs: 0,
  }));
}

/** Erzeugt den frischen Startzustand. Das erste Restaurant ist offen. */
export function createInitialState(): GameState {
  const restaurants: RestaurantState[] = RESTAURANTS.map((def, index) => ({
    id: def.id,
    unlocked: index === 0,
    level: 0,
    stations: createStations(index),
  }));

  return {
    coins: BALANCE.startingCoins,
    totalEarned: 0,
    restaurants,
    currentRestaurantId: RESTAURANTS[0].id,
    investors: 0,
    upgrades: {},
    boostUntilMs: 0,
    boostCooldownUntilMs: 0,
    boostFactor: BALANCE.marketing.factor,
    settings: { sound: true },
  };
}

export function findRestaurant(state: GameState, id: string): RestaurantState | undefined {
  return state.restaurants.find((r) => r.id === id);
}

export function getCurrentRestaurant(state: GameState): RestaurantState {
  return findRestaurant(state, state.currentRestaurantId) ?? state.restaurants[0];
}

/** Findet Restaurant + Station zu einer Station-Id (ueber alle Lokale). */
export function locateStation(
  state: GameState,
  stationId: string,
): { restaurant: RestaurantState; station: StationState } | undefined {
  for (const restaurant of state.restaurants) {
    const station = restaurant.stations.find((s) => s.id === stationId);
    if (station) return { restaurant, station };
  }
  return undefined;
}

/**
 * Ist eine Station innerhalb ihres Restaurants freigeschaltet? Die erste immer,
 * jede weitere, sobald die vorherige mindestens eine Einheit besitzt.
 */
export function isStationUnlocked(restaurant: RestaurantState, index: number): boolean {
  if (index <= 0) return true;
  const prev = restaurant.stations[index - 1];
  return !!prev && prev.owned >= 1;
}
