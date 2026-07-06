// ZENTRALE TUNING-WERTE. Alle Balancing-Zahlen leben hier -- nichts hartkodiert
// im Spielcode verstreuen. In spaeteren Phasen wachsen diese Werte (Stationen,
// Meilensteine, Offline-Cap, Prestige usw.).

export const BALANCE = {
  // Kostenwachstum je gekaufter Einheit (Preis * growth^besessene).
  costGrowth: 1.07,

  // Meilenstein-Schwellen fuer x2-Umsatz-Boni.
  revenueMilestones: [25, 50, 100, 150, 200, 300, 400, 500],

  // Meilenstein-Schwellen fuer zusaetzlichen x2-Tempo-Bonus.
  speedMilestones: [200, 300],

  // Deckel fuer Offline-Einnahmen in Sekunden (hier: 4 Stunden). Spaeter tunebar.
  offlineCapSeconds: 4 * 60 * 60,

  // Ziel-Framerate (nur Referenzwert fuer spaetere Performance-Checks).
  targetFps: 60,

  // Startkapital der Spielerin.
  startingCoins: 0,
} as const;

export type Balance = typeof BALANCE;
