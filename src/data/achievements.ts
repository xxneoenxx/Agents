// Achievements/Ziele: kleine Erfolge mit Belohnung. Die Bedingungen arbeiten auf
// einem kompakten Kennzahlen-Snapshot (AchState), den der Controller liefert.

export interface AchState {
  /** Lebenszeit-Umsatz. */
  totalEarned: number;
  /** Anzahl Auszahlungen (Proxy fuer bediente Kunden). */
  payouts: number;
  /** Manuelle Tipp-Aktionen. */
  taps: number;
  /** Summe besessener Einheiten ueber alle Restaurants. */
  stationsOwned: number;
  /** Anzahl eingestellter Manager. */
  managers: number;
  /** Anzahl freigeschalteter Restaurants. */
  restaurantsUnlocked: number;
  /** Hoechste Renovierungsstufe eines Lokals. */
  maxRenovation: number;
  /** Investoren (Prestige). */
  investors: number;
  /** Summe gekaufter Upgrade-Stufen. */
  upgradeLevels: number;
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** Belohnung in Muenzen. */
  reward: number;
  /** Fortschritt 0..1 (fuer die Anzeige). */
  progress: (s: AchState) => number;
}

function ratio(value: number, target: number): number {
  return Math.max(0, Math.min(1, value / target));
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first-taps',
    name: 'Erste Handgriffe',
    description: '50-mal selbst servieren',
    icon: '👆',
    reward: 200,
    progress: (s) => ratio(s.taps, 50),
  },
  {
    id: 'served-500',
    name: 'Volles Haus',
    description: '500 Bestellungen abwickeln',
    icon: '🍽️',
    reward: 2_500,
    progress: (s) => ratio(s.payouts, 500),
  },
  {
    id: 'first-manager',
    name: 'Delegieren',
    description: 'Den ersten Manager einstellen',
    icon: '🧑‍🍳',
    reward: 500,
    progress: (s) => ratio(s.managers, 1),
  },
  {
    id: 'five-managers',
    name: 'Führungsteam',
    description: '5 Manager beschäftigen',
    icon: '👔',
    reward: 10_000,
    progress: (s) => ratio(s.managers, 5),
  },
  {
    id: 'owned-100',
    name: 'Expansion',
    description: 'Insgesamt 100 Einheiten besitzen',
    icon: '📈',
    reward: 5_000,
    progress: (s) => ratio(s.stationsOwned, 100),
  },
  {
    id: 'earn-1m',
    name: 'Erste Million',
    description: '1 Mio. Umsatz erreichen',
    icon: '💰',
    reward: 25_000,
    progress: (s) => ratio(s.totalEarned, 1_000_000),
  },
  {
    id: 'renovate-1',
    name: 'Schöner wohnen',
    description: 'Ein Lokal renovieren',
    icon: '🎨',
    reward: 15_000,
    progress: (s) => ratio(s.maxRenovation, 1),
  },
  {
    id: 'second-restaurant',
    name: 'Zweigstelle',
    description: 'Ein zweites Restaurant eröffnen',
    icon: '🏬',
    reward: 100_000,
    progress: (s) => ratio(s.restaurantsUnlocked, 2),
  },
  {
    id: 'upgrades-5',
    name: 'Aufgerüstet',
    description: '5 Upgrade-Stufen kaufen',
    icon: '⭐',
    reward: 50_000,
    progress: (s) => ratio(s.upgradeLevels, 5),
  },
  {
    id: 'first-investors',
    name: 'Kapitalgeber',
    description: 'Die ersten Investoren gewinnen',
    icon: '💼',
    reward: 0,
    progress: (s) => ratio(s.investors, 1),
  },
  {
    id: 'all-restaurants',
    name: 'Gastro-Imperium',
    description: 'Alle Restaurants eröffnen',
    icon: '👑',
    reward: 1_000_000,
    progress: (s) => ratio(s.restaurantsUnlocked, 3),
  },
  {
    id: 'earn-1b',
    name: 'Milliardenschwer',
    description: '1 Mrd. Umsatz erreichen',
    icon: '🏦',
    reward: 5_000_000,
    progress: (s) => ratio(s.totalEarned, 1_000_000_000),
  },
  {
    id: 'all-renovated',
    name: 'Rundum saniert',
    description: 'Ein Lokal voll ausbauen (Stufe 2)',
    icon: '🏗️',
    reward: 250_000,
    progress: (s) => ratio(s.maxRenovation, 2),
  },
  {
    id: 'prestige-veteran',
    name: 'Investoren-Magnet',
    description: '100 Investoren sammeln',
    icon: '🤝',
    reward: 0,
    progress: (s) => ratio(s.investors, 100),
  },
];

/** Ist ein Achievement erfuellt? */
export function isAchieved(def: AchievementDef, s: AchState): boolean {
  return def.progress(s) >= 1;
}
