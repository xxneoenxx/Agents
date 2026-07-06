import { describe, it, expect, beforeEach } from 'vitest';
import { createInitialState } from '../src/core/state';
import { passiveIncomePerSecond, offlineEarnings } from '../src/core/offline';
import { saveGame, loadGame, clearSave } from '../src/core/save';
import { GameController } from '../src/core/game';
import { BALANCE } from '../src/data/balance';

// Einfacher In-Memory-localStorage-Ersatz fuer die Save-Tests.
class MemStorage {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}

describe('passiveIncomePerSecond', () => {
  it('summiert nur automatisierte Stationen', () => {
    const state = createInitialState();
    const st = state.restaurants[0].stations[0];
    st.owned = 10;
    st.manager = true;
    // Limonade: rev 1, cycle 800ms, owned 10 -> 10 pro 0.8s = 12.5/s
    expect(passiveIncomePerSecond(state)).toBeCloseTo(12.5);
  });

  it('ohne Manager kein passives Einkommen', () => {
    const state = createInitialState();
    state.restaurants[0].stations[0].owned = 10;
    expect(passiveIncomePerSecond(state)).toBe(0);
  });
});

describe('offlineEarnings', () => {
  it('deckelt auf die Obergrenze', () => {
    const state = createInitialState();
    const st = state.restaurants[0].stations[0];
    st.owned = 10;
    st.manager = true;
    const perSec = passiveIncomePerSecond(state);

    const tenHours = 10 * 3600 * 1000;
    const res = offlineEarnings(state, tenHours);
    expect(res.capped).toBe(true);
    expect(res.seconds).toBe(BALANCE.offlineCapSeconds);
    expect(res.earned).toBeCloseTo(perSec * BALANCE.offlineCapSeconds);
  });

  it('unter dem Deckel linear', () => {
    const state = createInitialState();
    const st = state.restaurants[0].stations[0];
    st.owned = 4;
    st.manager = true;
    const res = offlineEarnings(state, 10_000); // 10 Sekunden
    expect(res.capped).toBe(false);
    expect(res.earned).toBeCloseTo(passiveIncomePerSecond(state) * 10);
  });
});

describe('Speichern/Laden', () => {
  beforeEach(() => {
    (globalThis as unknown as { localStorage: MemStorage }).localStorage = new MemStorage();
  });

  it('Roundtrip erhaelt Zustand und Zeitstempel', () => {
    const state = createInitialState();
    state.coins = 12345;
    state.investors = 7;
    saveGame(state, 1000);
    const loaded = loadGame();
    expect(loaded).not.toBeNull();
    expect(loaded!.savedAt).toBe(1000);
    expect(loaded!.state.coins).toBe(12345);
    expect(loaded!.state.investors).toBe(7);
  });

  it('clearSave entfernt den Stand', () => {
    saveGame(createInitialState(), 1);
    clearSave();
    expect(loadGame()).toBeNull();
  });
});

describe('Investor-Deals', () => {
  it('Cash-Deal erhoeht Muenzen und Lebenszeit-Umsatz', () => {
    const gc = new GameController(createInitialState());
    gc.acceptDeal({ kind: 'cash', amount: 500, label: '' }, 0);
    expect(gc.getState().coins).toBe(500);
    expect(gc.getState().totalEarned).toBe(500);
  });

  it('Investoren-Deal erhoeht permanenten Bonus', () => {
    const gc = new GameController(createInitialState());
    const before = gc.effectiveGlobalMultiplier();
    gc.acceptDeal({ kind: 'investors', count: 5, label: '' }, 0);
    expect(gc.getState().investors).toBe(5);
    expect(gc.effectiveGlobalMultiplier()).toBeGreaterThan(before);
  });

  it('Boost-Deal aktiviert einen Umsatz-Boost', () => {
    const gc = new GameController(createInitialState());
    gc.acceptDeal({ kind: 'boost', factor: 5, durationMs: 20_000, label: '' }, 0);
    expect(gc.boostMultiplier(0)).toBe(5);
    expect(gc.boostMultiplier(21_000)).toBe(1);
  });
});
