import { describe, it, expect } from 'vitest';
import { formatNumber, formatCoins } from '../src/core/format';

// Tests fuer die Zahlenformatierung. Sichert Suffix-Logik und Robustheit ab.
describe('formatNumber', () => {
  it('zeigt kleine Zahlen ohne Suffix und ohne Nachkommastellen', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(42)).toBe('42');
    expect(formatNumber(999)).toBe('999');
  });

  it('kuerzt Tausender mit K', () => {
    expect(formatNumber(1000)).toBe('1.0K');
    expect(formatNumber(1500)).toBe('1.5K');
    expect(formatNumber(999999)).toBe('999.9K');
  });

  it('nutzt M, B, T fuer groessere Werte', () => {
    expect(formatNumber(1_000_000)).toBe('1.0M');
    expect(formatNumber(2_500_000_000)).toBe('2.5B');
    expect(formatNumber(1_000_000_000_000)).toBe('1.0T');
  });

  it('schneidet ab, statt aufzurunden', () => {
    // 1999 -> 1.999K -> abgeschnitten 1.9K (nicht 2.0K)
    expect(formatNumber(1999)).toBe('1.9K');
  });

  it('behandelt negative Werte', () => {
    expect(formatNumber(-1500)).toBe('-1.5K');
  });

  it('zeigt nie NaN oder Infinity', () => {
    expect(formatNumber(NaN)).toBe('0');
    expect(formatNumber(Infinity)).toBe('0');
    expect(formatNumber(-Infinity)).toBe('0');
  });
});

describe('formatCoins', () => {
  it('formatiert wie formatNumber', () => {
    expect(formatCoins(1500)).toBe('1.5K');
  });
});
