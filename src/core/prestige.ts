// Prestige/Investoren (rein, getestet). Aus dem Lebenszeit-Umsatz ergibt sich
// eine Zahl potenzieller Investoren; jeder verdiente Investor gibt einen
// permanenten globalen Umsatz-Bonus. Ein Prestige setzt den Fortschritt zurueck
// (Muenzen/Restaurants/Upgrades), behaelt aber die Investoren.

import { BALANCE } from '@data/balance';

/** Potenzielle Investoren fuer einen gegebenen Lebenszeit-Umsatz. */
export function investorsForEarned(totalEarned: number): number {
  if (totalEarned <= 0) return 0;
  return Math.floor(Math.sqrt(totalEarned / BALANCE.prestige.scale));
}

/**
 * Wie viele Investoren ein Prestige jetzt zusaetzlich einbraechte
 * (potenziell minus bereits besessen), nie negativ.
 */
export function investorsGainOnPrestige(totalEarned: number, currentInvestors: number): number {
  return Math.max(0, investorsForEarned(totalEarned) - currentInvestors);
}

/** Permanenter globaler Umsatz-Multiplikator aus der Investorenzahl. */
export function prestigeMultiplier(investors: number): number {
  return 1 + investors * BALANCE.prestige.bonusPerInvestor;
}

/** Ist ein Prestige bereits sinnvoll/erlaubt? */
export function canPrestige(totalEarned: number, currentInvestors: number): boolean {
  return (
    totalEarned >= BALANCE.prestige.minEarnedToPrestige &&
    investorsGainOnPrestige(totalEarned, currentInvestors) > 0
  );
}
