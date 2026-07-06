// Fortschritt: Renovieren (Lokal-Stufen) und Freischalten neuer Restaurants.
// Rein und getestet; arbeitet auf Definitionen + minimalem Zustand.

import { getRestaurantDef, type RestaurantDef } from '@data/restaurants';

/** Kosten der naechsten Renovierung, oder undefined wenn maximal ausgebaut. */
export function nextRenovationCost(def: RestaurantDef, level: number): number | undefined {
  if (level >= def.renovations.length) return undefined;
  return def.renovations[level].cost;
}

/** Kann das Restaurant mit `coins` renoviert werden? */
export function canRenovate(restaurantId: string, level: number, coins: number): boolean {
  const def = getRestaurantDef(restaurantId);
  if (!def) return false;
  const cost = nextRenovationCost(def, level);
  return cost !== undefined && coins >= cost;
}

/** Kann ein (noch gesperrtes) Restaurant mit `coins` eroeffnet werden? */
export function canUnlockRestaurant(restaurantId: string, coins: number): boolean {
  const def = getRestaurantDef(restaurantId);
  if (!def) return false;
  return coins >= def.unlockCost;
}
