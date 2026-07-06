import { describe, it, expect } from 'vitest';
import { GameController } from '../src/core/game';
import { createInitialState } from '../src/core/state';
import { totalCostFor } from '../src/core/economy';

function fresh(coins = 0): GameController {
  const gc = new GameController(createInitialState());
  gc.getState().coins = coins;
  return gc;
}

describe('Startzustand', () => {
  it('erste Station besitzt eine Einheit, ist aber nicht automatisch aktiv', () => {
    const gc = fresh();
    const st = gc.currentRestaurant().stations[0];
    expect(st.owned).toBe(1);
    expect(st.active).toBe(false);
    expect(st.manager).toBe(false);
  });

  it('Freischaltung: naechste Station erst, wenn Vorgaenger >= 1 Einheit hat', () => {
    const gc = fresh();
    expect(gc.isUnlocked(0)).toBe(true);
    expect(gc.isUnlocked(1)).toBe(true); // Limonade hat 1 -> Burger frei
    expect(gc.isUnlocked(2)).toBe(false); // Burger hat 0 -> Pommes gesperrt
  });
});

describe('Tippen (manueller Zyklus)', () => {
  it('startet einen Zyklus und zahlt nach Ablauf einmal aus, dann Stopp', () => {
    const gc = fresh();
    expect(gc.tapStation('lemonade')).toBe(true);
    expect(gc.currentRestaurant().stations[0].active).toBe(true);

    gc.tick(0); // Zeitbasis
    gc.tick(800); // ein Zyklus (Limonade: 800ms, Umsatz 1)
    expect(gc.getState().coins).toBeCloseTo(1);
    // Ohne Manager stoppt die Station nach der Auszahlung.
    expect(gc.currentRestaurant().stations[0].active).toBe(false);
  });

  it('ohne Einheiten kein Zyklus', () => {
    const gc = fresh();
    expect(gc.tapStation('burger')).toBe(false); // Burger owned 0
  });
});

describe('Einheiten kaufen', () => {
  it('feste Menge ist alles-oder-nichts', () => {
    const gc = fresh(0);
    expect(gc.buyUnits('lemonade', 10)).toBe(0); // kein Geld
    const cost = totalCostFor(4, 1, 10);
    gc.getState().coins = cost;
    expect(gc.buyUnits('lemonade', 10)).toBe(10);
    expect(gc.currentRestaurant().stations[0].owned).toBe(11);
    expect(gc.getState().coins).toBeCloseTo(0);
  });

  it('Max kauft so viel wie bezahlbar und geht nie ins Minus', () => {
    const gc = fresh(100);
    const bought = gc.buyUnits('lemonade', 'max');
    expect(bought).toBeGreaterThan(0);
    expect(gc.getState().coins).toBeGreaterThanOrEqual(0);
    expect(gc.currentRestaurant().stations[0].owned).toBe(1 + bought);
  });
});

describe('Manager', () => {
  it('kann erst mit Einheit und genug Geld eingestellt werden und automatisiert', () => {
    const gc = fresh(60); // Manager-Kosten Limonade = 60
    expect(gc.hireManager('lemonade')).toBe(true);
    expect(gc.getState().coins).toBeCloseTo(0);
    const st = gc.currentRestaurant().stations[0];
    expect(st.manager).toBe(true);
    expect(st.active).toBe(true);

    // Automatik zahlt ueber mehrere Zyklen wiederholt aus.
    gc.tick(0);
    gc.tick(800);
    gc.tick(1600);
    expect(gc.getState().coins).toBeCloseTo(2);
    expect(gc.currentRestaurant().stations[0].active).toBe(true); // laeuft weiter
  });

  it('ohne Einheiten kein Manager', () => {
    const gc = fresh(1_000_000);
    expect(gc.hireManager('burger')).toBe(false);
  });
});

describe('Delta-Cap im Loop', () => {
  it('deckelt riesige Zeitspruenge (Hintergrund-Tab)', () => {
    const gc = fresh(60);
    gc.hireManager('lemonade');
    gc.tick(0);
    // 100 Sekunden Sprung -> auf 1000ms gedeckelt -> nur ein 800ms-Zyklus.
    gc.tick(100_000);
    expect(gc.getState().coins).toBeCloseTo(1);
  });
});

describe('Marketing-Boost', () => {
  it('verdreifacht den Umsatz-Multiplikator waehrend der Laufzeit', () => {
    const gc = fresh();
    expect(gc.boostMultiplier(0)).toBe(1);
    expect(gc.activateMarketing(0)).toBe(true);
    expect(gc.boostMultiplier(0)).toBe(3);
    expect(gc.boostMultiplier(29_000)).toBe(3);
    expect(gc.boostMultiplier(31_000)).toBe(1); // nach 30s vorbei
  });

  it('hat eine Abklingzeit', () => {
    const gc = fresh();
    expect(gc.activateMarketing(0)).toBe(true);
    expect(gc.activateMarketing(1_000)).toBe(false); // noch in Cooldown
    expect(gc.getBoostInfo(1_000).onCooldown).toBe(true);
    expect(gc.activateMarketing(90_000)).toBe(true); // nach 90s wieder frei
  });

  it('Boost erhoeht das passive Einkommen', () => {
    const gc = fresh(60);
    gc.hireManager('lemonade');
    const base = gc.incomePerSecond(0);
    gc.activateMarketing(0);
    expect(gc.incomePerSecond(0)).toBeCloseTo(base * 3, 5);
  });
});

describe('Event-Bus', () => {
  it('meldet Muenzaenderungen', () => {
    const gc = fresh();
    let last = -1;
    gc.bus.on('coinsChanged', (n) => (last = n));
    gc.tapStation('lemonade');
    gc.tick(0);
    gc.tick(800);
    expect(last).toBeCloseTo(1);
  });
});

describe('Renovieren', () => {
  it('hebt die Stufe und multipliziert das Einkommen', () => {
    const gc = fresh(250_060);
    gc.hireManager('lemonade'); // -60 -> 250000 uebrig = Renovierungskosten
    const base = gc.incomePerSecond(0);
    expect(gc.renovate()).toBe(true);
    expect(gc.currentRestaurant().level).toBe(1);
    expect(gc.incomePerSecond(0)).toBeCloseTo(base * 1.5, 5);
  });

  it('ohne genug Geld keine Renovierung', () => {
    const gc = fresh(1000);
    expect(gc.renovate()).toBe(false);
  });
});

describe('Restaurants freischalten & reisen', () => {
  it('eroeffnet ein Restaurant und reist dorthin', () => {
    const gc = fresh(500_000);
    expect(gc.unlockRestaurant('bistro')).toBe(true);
    expect(gc.getState().coins).toBeCloseTo(0);
    expect(gc.getState().currentRestaurantId).toBe('bistro');
    expect(gc.currentRestaurant().stations[0].owned).toBe(1);
    // Zurueckreisen ins offene erste Lokal.
    expect(gc.travelTo('street')).toBe(true);
    expect(gc.getState().currentRestaurantId).toBe('street');
  });

  it('gesperrtes Restaurant kann nicht bereist werden', () => {
    const gc = fresh(0);
    expect(gc.travelTo('bistro')).toBe(false);
  });
});

describe('Upgrades', () => {
  it('kauft ein Upgrade und erhoeht den globalen Multiplikator', () => {
    const gc = fresh(5_000);
    expect(gc.effectiveGlobalMultiplier()).toBeCloseTo(1);
    expect(gc.buyUpgrade('ingredients')).toBe(true);
    expect(gc.getState().upgrades.ingredients).toBe(1);
    expect(gc.effectiveGlobalMultiplier()).toBeCloseTo(1.5);
  });
});

describe('Prestige', () => {
  it('setzt zurueck, behaelt Investoren und permanenten Bonus', () => {
    const gc = fresh(999_999);
    gc.getState().totalEarned = 1_000_000; // -> sqrt(1e6/1e4) = 10 Investoren
    gc.buyUnits('lemonade', 1); // etwas Fortschritt, wird zurueckgesetzt
    expect(gc.getPrestigeInfo().gain).toBe(10);
    expect(gc.prestige()).toBe(true);
    expect(gc.getState().investors).toBe(10);
    expect(gc.getState().coins).toBe(0);
    expect(gc.getState().totalEarned).toBe(0);
    expect(gc.currentRestaurant().stations[0].owned).toBe(1); // frisch
    expect(gc.effectiveGlobalMultiplier()).toBeCloseTo(1.2); // 1 + 10*0.02
  });

  it('kein Prestige unter Mindestumsatz', () => {
    const gc = fresh(0);
    gc.getState().totalEarned = 100;
    expect(gc.prestige()).toBe(false);
  });
});
