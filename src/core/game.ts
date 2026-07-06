// Game-Controller: haelt den Zustand, bietet Aktionen (kaufen, Manager,
// tippen, Marketing) und treibt den Loop (tick). Engine-unabhaengig -- nutzt nur
// den Event-Bus, damit Darstellung (Phaser) und UI (DOM) reagieren koennen.

import { BALANCE } from '@data/balance';
import { STATIONS, type StationDef } from '@data/stations';
import { EventBus, type GameEvents } from '@core/events';
import {
  cycleTimeMs,
  maxAffordable,
  revenuePerCycle,
  totalCostFor,
  unitCost,
} from '@core/economy';
import {
  createInitialState,
  findStation,
  isStationUnlocked,
  type GameState,
} from '@core/state';

export type BuyAmount = number | 'max';

export interface BoostInfo {
  active: boolean;
  remainingMs: number;
  onCooldown: boolean;
  cooldownRemainingMs: number;
  available: boolean;
  factor: number;
}

export class GameController {
  readonly bus: EventBus<GameEvents>;
  private state: GameState;
  private lastTickMs = -1;

  constructor(state: GameState = createInitialState(), bus?: EventBus<GameEvents>) {
    this.state = state;
    this.bus = bus ?? new EventBus<GameEvents>();
  }

  getState(): GameState {
    return this.state;
  }

  getDef(id: string): StationDef | undefined {
    return STATIONS.find((s) => s.id === id);
  }

  isUnlocked(index: number): boolean {
    return isStationUnlocked(this.state, index);
  }

  // --- Muenzen ---------------------------------------------------------------

  private setCoins(value: number): void {
    this.state.coins = value;
    this.bus.emit('coinsChanged', value);
  }

  // --- Aktionen --------------------------------------------------------------

  /**
   * Kauft Einheiten einer Station. `amount` ist eine feste Zahl (alles-oder-nichts)
   * oder 'max' (so viele wie bezahlbar). Gibt die tatsaechlich gekaufte Anzahl zurueck.
   */
  buyUnits(id: string, amount: BuyAmount): number {
    const def = this.getDef(id);
    const st = findStation(this.state, id);
    if (!def || !st) return 0;

    let count: number;
    let cost: number;

    if (amount === 'max') {
      const res = maxAffordable(def.baseCost, st.owned, this.state.coins);
      count = res.count;
      cost = res.cost;
    } else {
      count = Math.floor(amount);
      cost = totalCostFor(def.baseCost, st.owned, count);
      // Feste Menge nur alles-oder-nichts.
      if (count <= 0 || this.state.coins < cost) return 0;
    }

    if (count <= 0 || this.state.coins < cost) return 0;

    this.setCoins(this.state.coins - cost);
    st.owned += count;
    this.bus.emit('stationChanged', id);
    return count;
  }

  /** Stellt den Manager einer Station ein (Einmalkauf) -> laeuft automatisch. */
  hireManager(id: string): boolean {
    const def = this.getDef(id);
    const st = findStation(this.state, id);
    if (!def || !st) return false;
    if (st.manager || st.owned <= 0) return false;
    if (this.state.coins < def.managerCost) return false;

    this.setCoins(this.state.coins - def.managerCost);
    st.manager = true;
    st.active = true; // Automatik sofort starten
    this.bus.emit('stationChanged', id);
    return true;
  }

  /**
   * Startet manuell einen Produktionszyklus (Tippen). Ohne Wirkung, wenn keine
   * Einheit vorhanden ist, bereits ein Zyklus laeuft oder ein Manager die
   * Station ohnehin automatisch betreibt.
   */
  tapStation(id: string): boolean {
    const st = findStation(this.state, id);
    if (!st || st.owned <= 0 || st.active || st.manager) return false;
    st.active = true;
    this.bus.emit('stationStarted', id);
    this.bus.emit('stationChanged', id);
    return true;
  }

  /** Aktiviert den Marketing-Boost, sofern nicht in der Abklingzeit. */
  activateMarketing(nowMs: number): boolean {
    if (nowMs < this.state.boostCooldownUntilMs) return false;
    const m = BALANCE.marketing;
    this.state.boostUntilMs = nowMs + m.durationMs;
    this.state.boostCooldownUntilMs = nowMs + m.cooldownMs;
    this.state.boostFactor = m.factor;
    this.bus.emit('boostChanged', {
      activeUntilMs: this.state.boostUntilMs,
      cooldownUntilMs: this.state.boostCooldownUntilMs,
      factor: m.factor,
    });
    return true;
  }

  // --- Abgeleitete Werte (fuer UI) ------------------------------------------

  boostMultiplier(nowMs: number): number {
    return nowMs < this.state.boostUntilMs ? this.state.boostFactor : 1;
  }

  getBoostInfo(nowMs: number): BoostInfo {
    const active = nowMs < this.state.boostUntilMs;
    const onCooldown = nowMs < this.state.boostCooldownUntilMs;
    return {
      active,
      remainingMs: Math.max(0, this.state.boostUntilMs - nowMs),
      onCooldown,
      cooldownRemainingMs: Math.max(0, this.state.boostCooldownUntilMs - nowMs),
      available: !onCooldown,
      factor: this.state.boostFactor,
    };
  }

  /** Kosten fuer den naechsten Kauf einer Menge (fuer die UI-Anzeige). */
  costFor(id: string, amount: BuyAmount): { count: number; cost: number } {
    const def = this.getDef(id);
    const st = findStation(this.state, id);
    if (!def || !st) return { count: 0, cost: 0 };
    if (amount === 'max') {
      return maxAffordable(def.baseCost, st.owned, this.state.coins);
    }
    const count = Math.floor(amount);
    return { count, cost: totalCostFor(def.baseCost, st.owned, count) };
  }

  /** Kosten einer einzelnen naechsten Einheit. */
  nextUnitCost(id: string): number {
    const def = this.getDef(id);
    const st = findStation(this.state, id);
    if (!def || !st) return Infinity;
    return unitCost(def.baseCost, st.owned);
  }

  /** Passives Einkommen pro Sekunde (nur automatisierte Stationen). */
  incomePerSecond(nowMs: number): number {
    const boost = this.boostMultiplier(nowMs);
    let sum = 0;
    this.state.stations.forEach((st, i) => {
      if (!st.manager || st.owned <= 0) return;
      const def = STATIONS[i];
      const rev = revenuePerCycle(def, st.owned, this.state.globalMultiplier, boost);
      sum += (rev * 1000) / cycleTimeMs(def, st.owned);
    });
    return sum;
  }

  // --- Loop ------------------------------------------------------------------

  /**
   * Treibt die Simulation voran. Der erste Aufruf setzt nur die Zeitbasis.
   * Delta wird gedeckelt (Hintergrund-Tab), damit keine Riesenspruenge in
   * einem Frame verrechnet werden.
   */
  tick(nowMs: number): void {
    if (this.lastTickMs < 0) {
      this.lastTickMs = nowMs;
      return;
    }
    let dt = nowMs - this.lastTickMs;
    this.lastTickMs = nowMs;
    if (dt <= 0) return;
    if (dt > BALANCE.maxTickDeltaMs) dt = BALANCE.maxTickDeltaMs;

    const boost = this.boostMultiplier(nowMs);
    let totalPaid = 0;

    this.state.stations.forEach((st, i) => {
      if (!st.active || st.owned <= 0) return;
      const def = STATIONS[i];
      const cycle = cycleTimeMs(def, st.owned);
      st.elapsedMs += dt;

      let paid = 0;
      while (st.elapsedMs >= cycle) {
        st.elapsedMs -= cycle;
        paid += revenuePerCycle(def, st.owned, this.state.globalMultiplier, boost);
        if (!st.manager) {
          // Manuell gestarteter Zyklus: nach einer Auszahlung stoppen.
          st.active = false;
          st.elapsedMs = 0;
          break;
        }
      }

      if (paid > 0) {
        totalPaid += paid;
        this.bus.emit('stationPaid', { id: st.id, amount: paid });
        this.bus.emit('stationChanged', st.id);
      }
    });

    if (totalPaid > 0) {
      this.setCoins(this.state.coins + totalPaid);
    }
  }

  /** Aktueller Fortschritt (0..1) eines Stationszyklus -- fuer Fortschrittsbalken. */
  cycleProgress(id: string): number {
    const def = this.getDef(id);
    const st = findStation(this.state, id);
    if (!def || !st || !st.active) return 0;
    const cycle = cycleTimeMs(def, st.owned);
    return Math.min(1, st.elapsedMs / cycle);
  }
}
