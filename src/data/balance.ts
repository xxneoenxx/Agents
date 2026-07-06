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

  // Anzahl Einheiten der ersten Station zu Spielbeginn (damit sofort getippt
  // und Umsatz erzielt werden kann).
  startingUnitsFirstStation: 1,

  // Marketing-Boost: befristeter globaler Umsatz-Multiplikator mit Abklingzeit.
  marketing: {
    factor: 3, // x3 Umsatz waehrend des Boosts
    durationMs: 30_000, // 30 Sekunden aktiv
    cooldownMs: 90_000, // danach 90 Sekunden Abklingzeit
  },

  // Obergrenze fuer die pro Tick verarbeitete Zeit (Delta-Cap), damit ein
  // Hintergrund-Tab keine riesigen Zeitspruenge in einem Frame verrechnet.
  // Offline-Einnahmen werden spaeter separat (Phase 4) behandelt.
  maxTickDeltaMs: 1_000,

  // Renovierung: jede Stufe multipliziert den Umsatz des Lokals.
  renovation: {
    multiplier: 1.5,
  },

  // Grossinvestor-NPC: erscheint gelegentlich, laeuft durch die Szene und
  // bietet beim Antippen einen Deal an.
  investor: {
    appearMinMs: 45_000,
    appearMaxMs: 90_000,
    stayMs: 12_000, // so lange ist er antippbar
    cashSeconds: 180, // Sofort-Bonus = so viele Sekunden Umsatz
    boostFactor: 5,
    boostDurationMs: 20_000,
    minInvestorsGrant: 1,
    maxInvestorsGrant: 3,
  },

  // Rush Hour: gelegentlicher Kundenansturm (nur visuell) mit Zeitfenster.
  rush: {
    everyMinMs: 60_000,
    everyMaxMs: 150_000,
    durationMs: 15_000,
  },

  // Prestige / Investoren: verdiente Investoren aus dem Lebenszeit-Umsatz,
  // jeder gibt einen permanenten globalen Umsatz-Bonus.
  prestige: {
    // Skalierung: Investoren = floor(sqrt(totalEarned / scale)).
    scale: 10_000,
    // Permanenter Umsatz-Bonus je Investor (2 %).
    bonusPerInvestor: 0.02,
    // Mindest-Lebenszeit-Umsatz, bevor Prestige moeglich ist.
    minEarnedToPrestige: 1_000_000,
  },
} as const;

export type Balance = typeof BALANCE;
