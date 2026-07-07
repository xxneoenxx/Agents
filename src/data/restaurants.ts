// Restaurant-Definitionen: mehrere Lokale/Themen mit eigenen Stationen und
// Renovierungsstufen. Reihenfolge = Freischalt-Reihenfolge. Alle Zahlen sind
// Balancing-Daten (Feintuning in Phase 5).

import type { StationDef } from '@data/stations';

export interface RenovationLevel {
  /** Neuer Lokal-Name nach dieser Renovierung. */
  name: string;
  /** Kosten der Renovierung (Muenzen). */
  cost: number;
}

export type DecoStyle = 'street' | 'bistro' | 'gourmet';

export interface RestaurantTheme {
  wall: number;
  floor: number;
  counter: number;
  /** Akzentfarbe (Lichterketten, Deko). */
  accent: number;
  /** Deko-Stil des Lokals. */
  deco: DecoStyle;
}

export interface RestaurantDef {
  id: string;
  /** Start-Name (vor Renovierungen). */
  name: string;
  emoji: string;
  theme: RestaurantTheme;
  /** Muenzkosten zum Freischalten/Eroeffnen (0 = von Beginn an offen). */
  unlockCost: number;
  stations: StationDef[];
  renovations: RenovationLevel[];
}

// --- Erstes Lokal: Strassen-Imbiss (die urspruenglichen 8 Stationen) --------
const streetStations: StationDef[] = [
  { id: 'lemonade', name: 'Limonaden-Stand', emoji: '🍋', baseCost: 4, baseRevenue: 1, baseCycleMs: 800, managerCost: 60 },
  { id: 'burger', name: 'Burger-Bude', emoji: '🍔', baseCost: 60, baseRevenue: 20, baseCycleMs: 2000, managerCost: 600 },
  { id: 'fries', name: 'Pommes-Theke', emoji: '🍟', baseCost: 600, baseRevenue: 200, baseCycleMs: 4000, managerCost: 6_000 },
  { id: 'hotdog', name: 'Hotdog-Wagen', emoji: '🌭', baseCost: 6_000, baseRevenue: 2_000, baseCycleMs: 8_000, managerCost: 60_000 },
  { id: 'pizza', name: 'Pizzeria', emoji: '🍕', baseCost: 60_000, baseRevenue: 20_000, baseCycleMs: 12_000, managerCost: 600_000 },
  { id: 'icecream', name: 'Eisdiele', emoji: '🍦', baseCost: 600_000, baseRevenue: 200_000, baseCycleMs: 16_000, managerCost: 6_000_000 },
  { id: 'cafe', name: 'Café', emoji: '☕', baseCost: 6_000_000, baseRevenue: 2_000_000, baseCycleMs: 20_000, managerCost: 60_000_000 },
  { id: 'sushi', name: 'Sushi-Bar', emoji: '🍣', baseCost: 60_000_000, baseRevenue: 20_000_000, baseCycleMs: 24_000, managerCost: 600_000_000 },
];

// Numerische Vorlage fuer die weiteren (6-Stationen-)Lokale; wird skaliert.
const TEMPLATE6 = [
  { cost: 4, rev: 1, cycle: 1200, mgr: 80 },
  { cost: 60, rev: 18, cycle: 2500, mgr: 800 },
  { cost: 700, rev: 210, cycle: 4500, mgr: 8_000 },
  { cost: 8_000, rev: 2_400, cycle: 9_000, mgr: 90_000 },
  { cost: 90_000, rev: 27_000, cycle: 13_000, mgr: 1_000_000 },
  { cost: 1_000_000, rev: 300_000, cycle: 18_000, mgr: 12_000_000 },
];

function buildStations(
  prefix: string,
  factor: number,
  themed: { key: string; name: string; emoji: string }[],
): StationDef[] {
  return themed.map((t, i) => {
    const tpl = TEMPLATE6[i];
    return {
      id: `${prefix}-${t.key}`,
      name: t.name,
      emoji: t.emoji,
      baseCost: tpl.cost * factor,
      baseRevenue: tpl.rev * factor,
      baseCycleMs: tpl.cycle,
      managerCost: tpl.mgr * factor,
    };
  });
}

const bistroStations = buildStations('bistro', 50_000, [
  { key: 'salad', name: 'Salatbar', emoji: '🥗' },
  { key: 'pasta', name: 'Pasta-Station', emoji: '🍝' },
  { key: 'grill', name: 'Grillstation', emoji: '🥩' },
  { key: 'wine', name: 'Weinbar', emoji: '🍷' },
  { key: 'patisserie', name: 'Patisserie', emoji: '🍰' },
  { key: 'cheese', name: 'Käsetheke', emoji: '🧀' },
]);

const gourmetStations = buildStations('gourmet', 5_000_000_000, [
  { key: 'lobster', name: 'Hummer-Station', emoji: '🦞' },
  { key: 'champagne', name: 'Champagner-Bar', emoji: '🍾' },
  { key: 'oyster', name: 'Austern-Theke', emoji: '🦪' },
  { key: 'dessert', name: 'Dessert-Kunst', emoji: '🍮' },
  { key: 'chocolate', name: 'Schoko-Manufaktur', emoji: '🍫' },
  { key: 'signature', name: 'Signature-Menü', emoji: '⭐' },
]);

export const RESTAURANTS: RestaurantDef[] = [
  {
    id: 'street',
    name: 'Bellas Imbissmeile',
    emoji: '🛖',
    theme: { wall: 0xffd27a, floor: 0x8fce6a, counter: 0xfffdf7, accent: 0xff5c5c, deco: 'street' },
    unlockCost: 0,
    stations: streetStations,
    renovations: [
      { name: 'Bellas Streetfood-Ecke', cost: 250_000 },
      { name: 'Bellas Food-Court', cost: 25_000_000 },
    ],
  },
  {
    id: 'bistro',
    name: 'Bellas Bistro',
    emoji: '🍽️',
    theme: { wall: 0xf6c9a8, floor: 0x9fb8d8, counter: 0xfff4e6, accent: 0x7c5cff, deco: 'bistro' },
    unlockCost: 500_000,
    stations: bistroStations,
    renovations: [
      { name: 'Bellas Brasserie', cost: 50_000_000 },
      { name: 'Bellas Grand Bistro', cost: 5_000_000_000 },
    ],
  },
  {
    id: 'gourmet',
    name: 'Bellas Gourmet-Tempel',
    emoji: '⭐',
    theme: { wall: 0x3a2a4f, floor: 0x5c4a6e, counter: 0xffe9a8, accent: 0xffc72c, deco: 'gourmet' },
    unlockCost: 50_000_000_000,
    stations: gourmetStations,
    renovations: [
      { name: 'Bellas Sterne-Restaurant', cost: 5_000_000_000_000 },
      { name: 'Bellas Gastro-Imperium', cost: 500_000_000_000_000 },
    ],
  },
];

/** Restaurant-Definition per Id. */
export function getRestaurantDef(id: string): RestaurantDef | undefined {
  return RESTAURANTS.find((r) => r.id === id);
}

/** Station-Definition per Id (ueber alle Restaurants). */
export function getStationDef(id: string): StationDef | undefined {
  for (const r of RESTAURANTS) {
    const s = r.stations.find((st) => st.id === id);
    if (s) return s;
  }
  return undefined;
}

/** Aktueller Lokal-Name unter Beruecksichtigung der Renovierungsstufe. */
export function restaurantDisplayName(def: RestaurantDef, level: number): string {
  if (level > 0 && level <= def.renovations.length) {
    return def.renovations[level - 1].name;
  }
  return def.name;
}
