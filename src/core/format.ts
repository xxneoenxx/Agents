// Zahlenformatierung fuer grosse Idle-Werte (K, M, B, T, Qa, Qi, ...).
// Engine-unabhaengig und per Vitest getestet.

// Suffix-Tabelle. Index 0 = keine Skalierung (< 1000).
const SUFFIXES = [
  '',
  'K', // Tausend
  'M', // Million
  'B', // Milliarde
  'T', // Billion
  'Qa', // Billiarde
  'Qi', // Trillion
  'Sx', // Trilliarde
  'Sp',
  'Oc',
  'No',
  'Dc',
] as const;

/**
 * Formatiert eine Zahl kompakt mit Suffix, z. B. 1500 -> "1.5K".
 * Schneidet ab (kein kaufmaennisches Runden nach oben), zeigt nie NaN/Infinity.
 *
 * @param value    Der zu formatierende Wert.
 * @param decimals Anzahl Nachkommastellen fuer skalierte Werte (Standard 1).
 */
export function formatNumber(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return '0';
  if (value < 0) return '-' + formatNumber(-value, decimals);
  if (value < 1000) {
    // Ganze Zahlen ohne Nachkommastellen darstellen.
    return Math.floor(value).toString();
  }

  // Passende Groessenordnung finden (in Dreierpotenzen).
  let tier = Math.floor(Math.log10(value) / 3);
  if (tier >= SUFFIXES.length) tier = SUFFIXES.length - 1;

  const scaled = value / Math.pow(1000, tier);
  // Abschneiden statt Runden, damit Werte nie faelschlich "aufsteigen".
  const factor = Math.pow(10, decimals);
  const truncated = Math.floor(scaled * factor) / factor;

  return `${truncated.toFixed(decimals)}${SUFFIXES[tier]}`;
}

/**
 * Formatiert Muenzen fuer die HUD-Anzeige (aktuell identisch zu formatNumber,
 * eigener Name fuer spaeteres, evtl. abweichendes Muenz-Format).
 */
export function formatCoins(value: number): string {
  return formatNumber(value);
}
