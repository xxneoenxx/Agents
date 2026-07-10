// Asset-Manifest: Sprites als INLINE-Data-URIs (die SVGs werden zur Bauzeit als
// Rohtext eingebettet). So sind keine Laufzeit-Datei-Fetches noetig -- das Spiel
// funktioniert auch als einzelne HTML-Datei per Doppelklick (file://).

import customer1 from '../assets/sprites/customer1.svg?raw';
import customer2 from '../assets/sprites/customer2.svg?raw';
import customer3 from '../assets/sprites/customer3.svg?raw';
import chef from '../assets/sprites/chef.svg?raw';
import investor from '../assets/sprites/investor.svg?raw';
import stall from '../assets/sprites/stall.svg?raw';
import coin from '../assets/sprites/coin.svg?raw';

export interface SpriteEntry {
  key: string;
  /** Data-URI der Grafik. */
  path: string;
  /** Zielbreite/-hoehe (CSS-Pixel) im Spiel. */
  width: number;
  height: number;
}

function dataUri(svg: string): string {
  // Phasers SVG-Loader erwartet bei Data-URIs Base64 (die Grafiken sind ASCII).
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export const SPRITES: SpriteEntry[] = [
  { key: 'customer1', path: dataUri(customer1), width: 40, height: 54 },
  { key: 'customer2', path: dataUri(customer2), width: 40, height: 54 },
  { key: 'customer3', path: dataUri(customer3), width: 40, height: 54 },
  { key: 'chef', path: dataUri(chef), width: 40, height: 54 },
  { key: 'investor', path: dataUri(investor), width: 50, height: 62 },
  { key: 'stall', path: dataUri(stall), width: 120, height: 104 },
  { key: 'coin', path: dataUri(coin), width: 22, height: 22 },
];

/** Kunden-Textur-Keys fuer zufaellige Varianten. */
export const CUSTOMER_KEYS = ['customer1', 'customer2', 'customer3'] as const;
