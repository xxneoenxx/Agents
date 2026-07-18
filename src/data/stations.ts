// Interface einer Station. Die konkreten Stationssaetze je Restaurant liegen in
// data/restaurants.ts. Stations-spezifische Zahlen bleiben Daten (kein Code).

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
