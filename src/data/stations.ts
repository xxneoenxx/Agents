// Stations-Definitionen des Start-Lokals. Jede Station produziert ein Gericht
// und bedient Kunden -> Muenzen. Kosten/Umsatz sind grob x10 gestaffelt.
// Diese stationsspezifischen Werte leben hier; globale Tuning-Werte in balance.ts.

export interface StationDef {
  id: string;
  /** Im Spiel sichtbarer Name (Deutsch). */
  name: string;
  /** Emoji-Platzhalter, bis eigene Sprites folgen. */
  emoji: string;
  /** Kosten der ersten Einheit (weitere via Kostenwachstum). */
  baseCost: number;
  /** Umsatz je Einheit und Zyklus. */
  baseRevenue: number;
  /** Grunddauer eines Produktionszyklus in Millisekunden. */
  baseCycleMs: number;
  /** Einmalkosten fuer den Manager (danach laeuft die Station automatisch). */
  managerCost: number;
}

export const STATIONS: StationDef[] = [
  {
    id: 'lemonade',
    name: 'Limonaden-Stand',
    emoji: '🍋',
    baseCost: 4,
    baseRevenue: 1,
    baseCycleMs: 800,
    managerCost: 60,
  },
  {
    id: 'burger',
    name: 'Burger-Bude',
    emoji: '🍔',
    baseCost: 60,
    baseRevenue: 20,
    baseCycleMs: 2000,
    managerCost: 600,
  },
  {
    id: 'fries',
    name: 'Pommes-Theke',
    emoji: '🍟',
    baseCost: 600,
    baseRevenue: 200,
    baseCycleMs: 4000,
    managerCost: 6_000,
  },
  {
    id: 'hotdog',
    name: 'Hotdog-Wagen',
    emoji: '🌭',
    baseCost: 6_000,
    baseRevenue: 2_000,
    baseCycleMs: 8_000,
    managerCost: 60_000,
  },
  {
    id: 'pizza',
    name: 'Pizzeria',
    emoji: '🍕',
    baseCost: 60_000,
    baseRevenue: 20_000,
    baseCycleMs: 12_000,
    managerCost: 600_000,
  },
  {
    id: 'icecream',
    name: 'Eisdiele',
    emoji: '🍦',
    baseCost: 600_000,
    baseRevenue: 200_000,
    baseCycleMs: 16_000,
    managerCost: 6_000_000,
  },
  {
    id: 'cafe',
    name: 'Café',
    emoji: '☕',
    baseCost: 6_000_000,
    baseRevenue: 2_000_000,
    baseCycleMs: 20_000,
    managerCost: 60_000_000,
  },
  {
    id: 'sushi',
    name: 'Sushi-Bar',
    emoji: '🍣',
    baseCost: 60_000_000,
    baseRevenue: 20_000_000,
    baseCycleMs: 24_000,
    managerCost: 600_000_000,
  },
];

/** Schneller Zugriff auf eine Definition per Id. */
export function getStationDef(id: string): StationDef | undefined {
  return STATIONS.find((s) => s.id === id);
}
