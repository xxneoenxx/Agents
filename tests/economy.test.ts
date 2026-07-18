import { describe, it, expect } from 'vitest';
import {
  unitCost,
  totalCostFor,
  maxAffordable,
  milestonesReached,
  milestoneMultiplier,
  speedMultiplier,
  cycleTimeMs,
  revenuePerCycle,
} from '../src/core/economy';
import { BALANCE } from '../src/data/balance';
import type { StationDef } from '../src/data/stations';

const growth = BALANCE.costGrowth;

const testDef: StationDef = {
  id: 'test',
  name: 'Test-Station',
  emoji: '🧪',
  baseCost: 10,
  baseRevenue: 5,
  baseCycleMs: 1000,
  managerCost: 100,
};

describe('unitCost', () => {
  it('erste Einheit kostet baseCost', () => {
    expect(unitCost(10, 0)).toBeCloseTo(10);
  });

  it('waechst geometrisch mit besessenen Einheiten', () => {
    expect(unitCost(10, 1)).toBeCloseTo(10 * growth);
    expect(unitCost(10, 3)).toBeCloseTo(10 * growth ** 3);
  });
});

describe('totalCostFor', () => {
  it('ist 0 fuer count <= 0', () => {
    expect(totalCostFor(10, 0, 0)).toBe(0);
    expect(totalCostFor(10, 0, -5)).toBe(0);
  });

  it('entspricht der Summe der Einzelkosten', () => {
    const owned = 2;
    const count = 4;
    let manual = 0;
    for (let i = 0; i < count; i++) manual += unitCost(10, owned + i);
    expect(totalCostFor(10, owned, count)).toBeCloseTo(manual, 6);
  });

  it('eine Einheit entspricht unitCost', () => {
    expect(totalCostFor(10, 5, 1)).toBeCloseTo(unitCost(10, 5));
  });
});

describe('maxAffordable', () => {
  it('kauft nichts ohne Geld', () => {
    expect(maxAffordable(10, 0, 0)).toEqual({ count: 0, cost: 0 });
    expect(maxAffordable(10, 0, 5)).toEqual({ count: 0, cost: 0 });
  });

  it('kauft genau eine Einheit, wenn nur diese bezahlbar ist', () => {
    const res = maxAffordable(10, 0, 10);
    expect(res.count).toBe(1);
    expect(res.cost).toBeCloseTo(10);
  });

  it('die berechneten Kosten ueberschreiten die Muenzen nie, count+1 waere zu teuer', () => {
    const coins = 1234;
    const owned = 3;
    const res = maxAffordable(10, owned, coins);
    expect(res.cost).toBeLessThanOrEqual(coins + 1e-6);
    const oneMore = totalCostFor(10, owned, res.count + 1);
    expect(oneMore).toBeGreaterThan(coins);
  });

  it('konsistent mit totalCostFor', () => {
    const res = maxAffordable(10, 0, 5000);
    expect(res.cost).toBeCloseTo(totalCostFor(10, 0, res.count), 4);
  });
});

describe('Meilensteine', () => {
  it('zaehlt erreichte Schwellen', () => {
    // Standard-Schwellen: 25/50/100/150/200/300/400/500
    expect(milestonesReached(0, BALANCE.revenueMilestones)).toBe(0);
    expect(milestonesReached(25, BALANCE.revenueMilestones)).toBe(1);
    expect(milestonesReached(49, BALANCE.revenueMilestones)).toBe(1);
    expect(milestonesReached(100, BALANCE.revenueMilestones)).toBe(3);
    expect(milestonesReached(1000, BALANCE.revenueMilestones)).toBe(8);
  });

  it('Umsatz-Multiplikator verdoppelt je Meilenstein', () => {
    expect(milestoneMultiplier(0)).toBe(1);
    expect(milestoneMultiplier(25)).toBe(2);
    expect(milestoneMultiplier(50)).toBe(4);
    expect(milestoneMultiplier(100)).toBe(8);
  });

  it('Tempo-Multiplikator bei 200/300', () => {
    expect(speedMultiplier(0)).toBe(1);
    expect(speedMultiplier(200)).toBe(2);
    expect(speedMultiplier(300)).toBe(4);
  });
});

describe('cycleTimeMs', () => {
  it('verkuerzt sich durch Tempo-Meilensteine', () => {
    expect(cycleTimeMs(testDef, 0)).toBe(1000);
    expect(cycleTimeMs(testDef, 200)).toBe(500);
    expect(cycleTimeMs(testDef, 300)).toBe(250);
  });
});

describe('revenuePerCycle', () => {
  it('ist 0 ohne Einheiten', () => {
    expect(revenuePerCycle(testDef, 0)).toBe(0);
  });

  it('skaliert mit Einheiten und baseRevenue', () => {
    expect(revenuePerCycle(testDef, 10)).toBe(10 * 5);
  });

  it('beruecksichtigt Meilenstein-, Global- und Boost-Multiplikatoren', () => {
    // 25 Einheiten -> Meilenstein x2; global x1.5; boost x3
    const expected = 25 * 5 * 2 * 1.5 * 3;
    expect(revenuePerCycle(testDef, 25, 1.5, 3)).toBeCloseTo(expected);
  });
});
