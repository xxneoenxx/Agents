// Wirtschaftslogik (rein, engine-unabhaengig, per Vitest getestet).
// Kosten, geometrische Kaufsummen, Max-Kauf, Meilenstein-/Tempo-Multiplikatoren
// und Umsatzberechnung. Alle globalen Tuning-Werte kommen aus data/balance.ts.

import { BALANCE } from '@data/balance';
import type { StationDef } from '@data/stations';

/**
 * Kosten der naechsten einzelnen Einheit:
 *   baseCost * growth^owned
 */
export function unitCost(baseCost: number, owned: number, growth = BALANCE.costGrowth): number {
  return baseCost * Math.pow(growth, owned);
}

/**
 * Gesamtkosten fuer `count` weitere Einheiten ab `owned` (geometrische Summe):
 *   baseCost * growth^owned * (growth^count - 1) / (growth - 1)
 */
export function totalCostFor(
  baseCost: number,
  owned: number,
  count: number,
  growth = BALANCE.costGrowth,
): number {
  if (count <= 0) return 0;
  const first = unitCost(baseCost, owned, growth);
  // Geometrische Summe; growth > 1, daher Nenner != 0.
  return (first * (Math.pow(growth, count) - 1)) / (growth - 1);
}

export interface MaxBuyResult {
  /** Anzahl bezahlbarer Einheiten. */
  count: number;
  /** Gesamtkosten fuer diese Anzahl. */
  cost: number;
}

/**
 * Groesste Anzahl Einheiten, die mit `coins` bezahlbar ist (via umgestellter
 * geometrischer Summe), plus deren Gesamtkosten.
 */
export function maxAffordable(
  baseCost: number,
  owned: number,
  coins: number,
  growth = BALANCE.costGrowth,
): MaxBuyResult {
  if (coins <= 0) return { count: 0, cost: 0 };
  const first = unitCost(baseCost, owned, growth);
  if (coins < first) return { count: 0, cost: 0 };

  // coins >= first * (growth^n - 1) / (growth - 1)
  // => growth^n <= 1 + coins * (growth - 1) / first
  const ratio = 1 + (coins * (growth - 1)) / first;
  const count = Math.floor(Math.log(ratio) / Math.log(growth));
  const safeCount = Math.max(0, count);
  return { count: safeCount, cost: totalCostFor(baseCost, owned, safeCount, growth) };
}

/**
 * Anzahl erreichter Meilensteine in `thresholds` bei `owned` Einheiten.
 */
export function milestonesReached(owned: number, thresholds: readonly number[]): number {
  let n = 0;
  for (const t of thresholds) {
    if (owned >= t) n++;
  }
  return n;
}

/**
 * Umsatz-Multiplikator aus Meilensteinen: je erreichtem Meilenstein x2.
 */
export function milestoneMultiplier(owned: number): number {
  return Math.pow(2, milestonesReached(owned, BALANCE.revenueMilestones));
}

/**
 * Tempo-Multiplikator aus Meilensteinen: je erreichtem Tempo-Meilenstein x2
 * (kuerzere Zykluszeit).
 */
export function speedMultiplier(owned: number): number {
  return Math.pow(2, milestonesReached(owned, BALANCE.speedMilestones));
}

/**
 * Effektive Zykluszeit einer Station in Millisekunden (durch Tempo-Boni verkuerzt).
 */
export function cycleTimeMs(def: StationDef, owned: number): number {
  return def.baseCycleMs / speedMultiplier(owned);
}

/**
 * Umsatz einer Station pro abgeschlossenem Zyklus:
 *   owned * baseRevenue * Meilenstein-Multiplikator * globalMult * boostMult
 */
export function revenuePerCycle(
  def: StationDef,
  owned: number,
  globalMultiplier = 1,
  boostMultiplier = 1,
): number {
  if (owned <= 0) return 0;
  return (
    owned * def.baseRevenue * milestoneMultiplier(owned) * globalMultiplier * boostMultiplier
  );
}
