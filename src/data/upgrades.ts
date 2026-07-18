// Upgrade-/Boost-Karten: kaufbare, permanente globale Verbesserungen mit
// eskalierenden Kosten. Wirken als Umsatz-Multiplikatoren (Feintuning Phase 5).

export interface UpgradeDef {
  id: string;
  name: string;
  emoji: string;
  /** Kurzbeschreibung (Deutsch, UI-sichtbar). */
  description: string;
  /** Umsatz-Multiplikator je gekaufter Stufe. */
  multiplierPerLevel: number;
  baseCost: number;
  /** Kostenwachstum je Stufe. */
  costGrowth: number;
  maxLevel: number;
}

export const UPGRADES: UpgradeDef[] = [
  {
    id: 'ingredients',
    name: 'Bessere Zutaten',
    emoji: '🥬',
    description: '+50 % Umsatz je Stufe',
    multiplierPerLevel: 1.5,
    baseCost: 5_000,
    costGrowth: 6,
    maxLevel: 12,
  },
  {
    id: 'service',
    name: 'Schnellerer Service',
    emoji: '⚡',
    description: '+30 % Umsatz je Stufe',
    multiplierPerLevel: 1.3,
    baseCost: 25_000,
    costGrowth: 5,
    maxLevel: 12,
  },
  {
    id: 'equipment',
    name: 'Profi-Ausstattung',
    emoji: '🍳',
    description: 'Umsatz ×2 je Stufe',
    multiplierPerLevel: 2,
    baseCost: 250_000,
    costGrowth: 9,
    maxLevel: 8,
  },
];

/** Kosten der naechsten Stufe eines Upgrades. */
export function upgradeCost(def: UpgradeDef, level: number): number {
  return def.baseCost * Math.pow(def.costGrowth, level);
}

/** Globaler Umsatz-Multiplikator aus allen gekauften Upgrades. */
export function upgradeIncomeMultiplier(levels: Record<string, number>): number {
  let mult = 1;
  for (const def of UPGRADES) {
    const lvl = levels[def.id] ?? 0;
    if (lvl > 0) mult *= Math.pow(def.multiplierPerLevel, lvl);
  }
  return mult;
}

export function getUpgradeDef(id: string): UpgradeDef | undefined {
  return UPGRADES.find((u) => u.id === id);
}
