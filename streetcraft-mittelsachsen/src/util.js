// Kleine Hilfsfunktionen ohne DOM-Abhängigkeit.

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Deterministischer 32-Bit-Hash aus beliebig vielen Ganzzahlen.
export function hash32(...nums) {
  let h = 0x811c9dc5;
  for (const n of nums) {
    let v = n | 0;
    for (let i = 0; i < 4; i++) {
      h ^= v & 0xff;
      h = Math.imul(h, 0x01000193);
      v >>>= 8;
    }
  }
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return h >>> 0;
}

// Zufallszahl in [0, 1) aus einem Hash.
export function hashFloat(...nums) {
  return hash32(...nums) / 4294967296;
}

// Mulberry32: kleiner, schneller Zufallsgenerator mit Startwert.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Winkel in Grad auf [0, 360) bringen.
export function normDeg(d) {
  return ((d % 360) + 360) % 360;
}

// Kleinster Unterschied zweier Winkel in Grad, Ergebnis in [-180, 180).
export function angleDiff(a, b) {
  return normDeg(a - b + 180) - 180;
}
