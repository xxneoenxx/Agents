import { describe, it, expect } from 'vitest';
import { restaurantMultiplier } from '../src/core/economy';
import {
  investorsForEarned,
  investorsGainOnPrestige,
  prestigeMultiplier,
  canPrestige,
} from '../src/core/prestige';
import { nextRenovationCost, canRenovate, canUnlockRestaurant } from '../src/core/progression';
import { upgradeCost, upgradeIncomeMultiplier, UPGRADES } from '../src/data/upgrades';
import { getRestaurantDef, RESTAURANTS } from '../src/data/restaurants';
import { BALANCE } from '../src/data/balance';

describe('restaurantMultiplier', () => {
  it('waechst je Renovierungsstufe um den Faktor', () => {
    const m = BALANCE.renovation.multiplier;
    expect(restaurantMultiplier(0)).toBe(1);
    expect(restaurantMultiplier(1)).toBeCloseTo(m);
    expect(restaurantMultiplier(3)).toBeCloseTo(m ** 3);
  });
});

describe('Prestige/Investoren', () => {
  it('Investoren aus Lebenszeit-Umsatz (floor sqrt)', () => {
    const scale = BALANCE.prestige.scale;
    expect(investorsForEarned(0)).toBe(0);
    expect(investorsForEarned(scale)).toBe(1);
    expect(investorsForEarned(scale * 100)).toBe(10);
  });

  it('Zugewinn ist Potenzial minus Besitz, nie negativ', () => {
    const scale = BALANCE.prestige.scale;
    expect(investorsGainOnPrestige(scale * 100, 0)).toBe(10);
    expect(investorsGainOnPrestige(scale * 100, 10)).toBe(0);
    expect(investorsGainOnPrestige(scale * 100, 20)).toBe(0);
  });

  it('permanenter Multiplikator steigt je Investor', () => {
    const b = BALANCE.prestige.bonusPerInvestor;
    expect(prestigeMultiplier(0)).toBe(1);
    expect(prestigeMultiplier(10)).toBeCloseTo(1 + 10 * b);
  });

  it('Prestige erst ab Mindestumsatz und mit Zugewinn', () => {
    const min = BALANCE.prestige.minEarnedToPrestige;
    expect(canPrestige(min - 1, 0)).toBe(false);
    expect(canPrestige(min, 0)).toBe(true);
    // Genug Umsatz, aber schon alle Investoren kassiert -> kein Prestige.
    const inv = investorsForEarned(min);
    expect(canPrestige(min, inv)).toBe(false);
  });
});

describe('Renovierung', () => {
  it('Kosten pro Stufe, undefined am Ende', () => {
    const def = RESTAURANTS[0];
    expect(nextRenovationCost(def, 0)).toBe(def.renovations[0].cost);
    expect(nextRenovationCost(def, def.renovations.length)).toBeUndefined();
  });

  it('canRenovate haengt an Muenzen', () => {
    const def = RESTAURANTS[0];
    const cost = def.renovations[0].cost;
    expect(canRenovate('street', 0, cost - 1)).toBe(false);
    expect(canRenovate('street', 0, cost)).toBe(true);
  });
});

describe('Restaurant-Freischaltung', () => {
  it('canUnlockRestaurant haengt an Muenzen vs. unlockCost', () => {
    const def = getRestaurantDef('bistro')!;
    expect(canUnlockRestaurant('bistro', def.unlockCost - 1)).toBe(false);
    expect(canUnlockRestaurant('bistro', def.unlockCost)).toBe(true);
  });
});

describe('Upgrades', () => {
  it('Kosten wachsen geometrisch je Stufe', () => {
    const def = UPGRADES[0];
    expect(upgradeCost(def, 0)).toBe(def.baseCost);
    expect(upgradeCost(def, 2)).toBeCloseTo(def.baseCost * def.costGrowth ** 2);
  });

  it('Umsatz-Multiplikator ist Produkt aller Stufen', () => {
    expect(upgradeIncomeMultiplier({})).toBe(1);
    const levels = { ingredients: 2, equipment: 1 };
    const expected = UPGRADES[0].multiplierPerLevel ** 2 * UPGRADES[2].multiplierPerLevel;
    expect(upgradeIncomeMultiplier(levels)).toBeCloseTo(expected);
  });
});
