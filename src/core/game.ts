// Game-Controller: haelt den Zustand, bietet Aktionen (kaufen, Manager, tippen,
// Marketing, renovieren, Restaurant freischalten, reisen, Upgrades, Prestige)
// und treibt den Loop (tick ueber ALLE freigeschalteten Restaurants, damit
// gemanagte Stationen auch andernorts weiter verdienen). Engine-unabhaengig.

import { BALANCE } from '@data/balance';
import type { StationDef } from '@data/stations';
import {
  RESTAURANTS,
  getRestaurantDef,
  getStationDef,
  restaurantDisplayName,
  type RestaurantDef,
} from '@data/restaurants';
import {
  UPGRADES,
  getUpgradeDef,
  upgradeCost,
  upgradeIncomeMultiplier,
  type UpgradeDef,
} from '@data/upgrades';
import { EventBus, type GameEvents } from '@core/events';
import {
  cycleTimeMs,
  maxAffordable,
  restaurantMultiplier,
  revenuePerCycle,
  totalCostFor,
  unitCost,
} from '@core/economy';
import {
  investorsForEarned,
  investorsGainOnPrestige,
  prestigeMultiplier,
  canPrestige,
} from '@core/prestige';
import { nextRenovationCost } from '@core/progression';
import {
  createInitialState,
  findRestaurant,
  getCurrentRestaurant,
  isStationUnlocked,
  locateStation,
  type GameState,
  type RestaurantState,
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

export interface RestaurantListItem {
  id: string;
  name: string;
  emoji: string;
  unlocked: boolean;
  unlockCost: number;
  isCurrent: boolean;
  level: number;
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

  // --- Aktuelles Restaurant --------------------------------------------------

  currentRestaurant(): RestaurantState {
    return getCurrentRestaurant(this.state);
  }

  currentRestaurantDef(): RestaurantDef {
    return getRestaurantDef(this.state.currentRestaurantId) ?? RESTAURANTS[0];
  }

  currentStationDefs(): StationDef[] {
    return this.currentRestaurantDef().stations;
  }

  isUnlocked(index: number): boolean {
    return isStationUnlocked(this.currentRestaurant(), index);
  }

  // --- Multiplikatoren -------------------------------------------------------

  /** Permanenter globaler Umsatz-Multiplikator (Prestige x Upgrades). */
  effectiveGlobalMultiplier(): number {
    return (
      prestigeMultiplier(this.state.investors) * upgradeIncomeMultiplier(this.state.upgrades)
    );
  }

  // --- Muenzen ---------------------------------------------------------------

  private setCoins(value: number): void {
    this.state.coins = value;
    this.bus.emit('coinsChanged', value);
  }

  // --- Kaufen / Manager / Tippen --------------------------------------------

  buyUnits(id: string, amount: BuyAmount): number {
    const loc = locateStation(this.state, id);
    const def = getStationDef(id);
    if (!loc || !def) return 0;
    const st = loc.station;

    let count: number;
    let cost: number;
    if (amount === 'max') {
      const res = maxAffordable(def.baseCost, st.owned, this.state.coins);
      count = res.count;
      cost = res.cost;
    } else {
      count = Math.floor(amount);
      cost = totalCostFor(def.baseCost, st.owned, count);
      if (count <= 0 || this.state.coins < cost) return 0;
    }
    if (count <= 0 || this.state.coins < cost) return 0;

    this.setCoins(this.state.coins - cost);
    st.owned += count;
    this.bus.emit('stationChanged', id);
    return count;
  }

  hireManager(id: string): boolean {
    const loc = locateStation(this.state, id);
    const def = getStationDef(id);
    if (!loc || !def) return false;
    const st = loc.station;
    if (st.manager || st.owned <= 0) return false;
    if (this.state.coins < def.managerCost) return false;

    this.setCoins(this.state.coins - def.managerCost);
    st.manager = true;
    st.active = true;
    this.bus.emit('stationChanged', id);
    return true;
  }

  tapStation(id: string): boolean {
    const loc = locateStation(this.state, id);
    if (!loc) return false;
    const st = loc.station;
    if (st.owned <= 0 || st.active || st.manager) return false;
    st.active = true;
    this.bus.emit('stationStarted', id);
    this.bus.emit('stationChanged', id);
    return true;
  }

  // --- Marketing-Boost -------------------------------------------------------

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

  boostMultiplier(nowMs: number): number {
    return nowMs < this.state.boostUntilMs ? this.state.boostFactor : 1;
  }

  getBoostInfo(nowMs: number): BoostInfo {
    const onCooldown = nowMs < this.state.boostCooldownUntilMs;
    return {
      active: nowMs < this.state.boostUntilMs,
      remainingMs: Math.max(0, this.state.boostUntilMs - nowMs),
      onCooldown,
      cooldownRemainingMs: Math.max(0, this.state.boostCooldownUntilMs - nowMs),
      available: !onCooldown,
      factor: this.state.boostFactor,
    };
  }

  // --- Renovieren / Reisen / Freischalten -----------------------------------

  /** Renoviert ein Restaurant (Standard: aktuelles) auf die naechste Stufe. */
  renovate(restaurantId: string = this.state.currentRestaurantId): boolean {
    const r = findRestaurant(this.state, restaurantId);
    const def = getRestaurantDef(restaurantId);
    if (!r || !def) return false;
    const cost = nextRenovationCost(def, r.level);
    if (cost === undefined || this.state.coins < cost) return false;

    this.setCoins(this.state.coins - cost);
    r.level += 1;
    this.bus.emit('restaurantChanged', restaurantId);
    return true;
  }

  /** Eroeffnet ein gesperrtes Restaurant und reist dorthin. */
  unlockRestaurant(id: string): boolean {
    const r = findRestaurant(this.state, id);
    const def = getRestaurantDef(id);
    if (!r || !def || r.unlocked) return false;
    if (this.state.coins < def.unlockCost) return false;

    this.setCoins(this.state.coins - def.unlockCost);
    r.unlocked = true;
    r.stations[0].owned = Math.max(r.stations[0].owned, 1);
    this.state.currentRestaurantId = id;
    this.bus.emit('restaurantChanged', id);
    return true;
  }

  /** Wechselt zu einem freigeschalteten Restaurant. */
  travelTo(id: string): boolean {
    const r = findRestaurant(this.state, id);
    if (!r || !r.unlocked) return false;
    if (this.state.currentRestaurantId === id) return true;
    this.state.currentRestaurantId = id;
    this.bus.emit('restaurantChanged', id);
    return true;
  }

  // --- Upgrades --------------------------------------------------------------

  buyUpgrade(id: string): boolean {
    const def = getUpgradeDef(id);
    if (!def) return false;
    const level = this.state.upgrades[id] ?? 0;
    if (level >= def.maxLevel) return false;
    const cost = upgradeCost(def, level);
    if (this.state.coins < cost) return false;

    this.setCoins(this.state.coins - cost);
    this.state.upgrades[id] = level + 1;
    this.bus.emit('upgradeChanged', id);
    return true;
  }

  // --- Prestige --------------------------------------------------------------

  prestige(): boolean {
    if (!canPrestige(this.state.totalEarned, this.state.investors)) return false;
    const keepInvestors =
      this.state.investors + investorsGainOnPrestige(this.state.totalEarned, this.state.investors);

    const fresh = createInitialState();
    fresh.investors = keepInvestors;
    this.state = fresh;
    this.lastTickMs = -1;

    this.bus.emit('coinsChanged', fresh.coins);
    this.bus.emit('restaurantChanged', fresh.currentRestaurantId);
    this.bus.emit('prestiged', keepInvestors);
    return true;
  }

  // --- Abgeleitete Werte (UI) ------------------------------------------------

  costFor(id: string, amount: BuyAmount): { count: number; cost: number } {
    const loc = locateStation(this.state, id);
    const def = getStationDef(id);
    if (!loc || !def) return { count: 0, cost: 0 };
    if (amount === 'max') return maxAffordable(def.baseCost, loc.station.owned, this.state.coins);
    const count = Math.floor(amount);
    return { count, cost: totalCostFor(def.baseCost, loc.station.owned, count) };
  }

  nextUnitCost(id: string): number {
    const loc = locateStation(this.state, id);
    const def = getStationDef(id);
    if (!loc || !def) return Infinity;
    return unitCost(def.baseCost, loc.station.owned);
  }

  /** Passives Einkommen pro Sekunde ueber alle Restaurants (automatisiert). */
  incomePerSecond(nowMs: number): number {
    const globalMult = this.effectiveGlobalMultiplier();
    const boost = this.boostMultiplier(nowMs);
    let sum = 0;
    for (const restaurant of this.state.restaurants) {
      if (!restaurant.unlocked) continue;
      const defs = getRestaurantDef(restaurant.id)?.stations ?? [];
      const rmult = restaurantMultiplier(restaurant.level) * globalMult;
      restaurant.stations.forEach((st, i) => {
        if (!st.manager || st.owned <= 0) return;
        const def = defs[i];
        const rev = revenuePerCycle(def, st.owned, rmult, boost);
        sum += (rev * 1000) / cycleTimeMs(def, st.owned);
      });
    }
    return sum;
  }

  cycleProgress(id: string): number {
    const loc = locateStation(this.state, id);
    const def = getStationDef(id);
    if (!loc || !def || !loc.station.active) return 0;
    return Math.min(1, loc.station.elapsedMs / cycleTimeMs(def, loc.station.owned));
  }

  getRenovationInfo(restaurantId: string = this.state.currentRestaurantId): {
    level: number;
    name: string;
    nextCost?: number;
    maxed: boolean;
  } {
    const r = findRestaurant(this.state, restaurantId);
    const def = getRestaurantDef(restaurantId);
    if (!r || !def) return { level: 0, name: '', maxed: true };
    const nextCost = nextRenovationCost(def, r.level);
    return {
      level: r.level,
      name: restaurantDisplayName(def, r.level),
      nextCost,
      maxed: nextCost === undefined,
    };
  }

  getPrestigeInfo(): {
    investors: number;
    gain: number;
    can: boolean;
    multiplier: number;
    potential: number;
  } {
    return {
      investors: this.state.investors,
      gain: investorsGainOnPrestige(this.state.totalEarned, this.state.investors),
      can: canPrestige(this.state.totalEarned, this.state.investors),
      multiplier: prestigeMultiplier(this.state.investors),
      potential: investorsForEarned(this.state.totalEarned),
    };
  }

  listRestaurants(): RestaurantListItem[] {
    return this.state.restaurants.map((r) => {
      const def = getRestaurantDef(r.id)!;
      return {
        id: r.id,
        name: restaurantDisplayName(def, r.level),
        emoji: def.emoji,
        unlocked: r.unlocked,
        unlockCost: def.unlockCost,
        isCurrent: r.id === this.state.currentRestaurantId,
        level: r.level,
      };
    });
  }

  listUpgrades(): { def: UpgradeDef; level: number; cost: number; maxed: boolean }[] {
    return UPGRADES.map((def) => {
      const level = this.state.upgrades[def.id] ?? 0;
      const maxed = level >= def.maxLevel;
      return { def, level, cost: upgradeCost(def, level), maxed };
    });
  }

  // --- Loop ------------------------------------------------------------------

  tick(nowMs: number): void {
    if (this.lastTickMs < 0) {
      this.lastTickMs = nowMs;
      return;
    }
    let dt = nowMs - this.lastTickMs;
    this.lastTickMs = nowMs;
    if (dt <= 0) return;
    if (dt > BALANCE.maxTickDeltaMs) dt = BALANCE.maxTickDeltaMs;

    const globalMult = this.effectiveGlobalMultiplier();
    const boost = this.boostMultiplier(nowMs);
    let totalPaid = 0;

    for (const restaurant of this.state.restaurants) {
      if (!restaurant.unlocked) continue;
      const defs = getRestaurantDef(restaurant.id)?.stations ?? [];
      const rmult = restaurantMultiplier(restaurant.level) * globalMult;

      restaurant.stations.forEach((st, i) => {
        if (!st.active || st.owned <= 0) return;
        const def = defs[i];
        const cycle = cycleTimeMs(def, st.owned);
        st.elapsedMs += dt;

        let paid = 0;
        while (st.elapsedMs >= cycle) {
          st.elapsedMs -= cycle;
          paid += revenuePerCycle(def, st.owned, rmult, boost);
          if (!st.manager) {
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
    }

    if (totalPaid > 0) {
      this.state.totalEarned += totalPaid;
      this.setCoins(this.state.coins + totalPaid);
    }
  }
}
