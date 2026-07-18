// Offline-Einnahmen (rein, getestet). Berechnet das passive Einkommen der
// automatisierten (gemanagten) Stationen ueber alle freigeschalteten Restaurants
// und daraus die gedeckelten Einnahmen fuer eine verstrichene Abwesenheit.

import { BALANCE } from '@data/balance';
import { getRestaurantDef } from '@data/restaurants';
import { upgradeIncomeMultiplier } from '@data/upgrades';
import { cycleTimeMs, restaurantMultiplier, revenuePerCycle } from '@core/economy';
import { prestigeMultiplier } from '@core/prestige';
import type { GameState } from '@core/state';

/**
 * Passives Einkommen pro Sekunde OHNE zeitlich befristeten Marketing-Boost
 * (Prestige- und Upgrade-Boni sowie Renovierung sind enthalten).
 */
export function passiveIncomePerSecond(state: GameState): number {
  const globalMult =
    prestigeMultiplier(state.investors) * upgradeIncomeMultiplier(state.upgrades);
  let sum = 0;
  for (const restaurant of state.restaurants) {
    if (!restaurant.unlocked) continue;
    const defs = getRestaurantDef(restaurant.id)?.stations ?? [];
    const rmult = restaurantMultiplier(restaurant.level) * globalMult;
    restaurant.stations.forEach((st, i) => {
      if (!st.manager || st.owned <= 0) return;
      const def = defs[i];
      sum += (revenuePerCycle(def, st.owned, rmult) * 1000) / cycleTimeMs(def, st.owned);
    });
  }
  return sum;
}

export interface OfflineResult {
  earned: number;
  /** Tatsaechlich angerechnete Sekunden (nach Deckelung). */
  seconds: number;
  /** Wurde durch den Deckel begrenzt? */
  capped: boolean;
}

/**
 * Offline-Einnahmen fuer eine verstrichene Zeit, gedeckelt auf
 * BALANCE.offlineCapSeconds.
 */
export function offlineEarnings(state: GameState, elapsedMs: number): OfflineResult {
  const capMs = BALANCE.offlineCapSeconds * 1000;
  const clampedMs = Math.max(0, Math.min(elapsedMs, capMs));
  const seconds = clampedMs / 1000;
  const earned = passiveIncomePerSecond(state) * seconds;
  return { earned, seconds, capped: elapsedMs > capMs };
}
