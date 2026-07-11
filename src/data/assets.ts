// Asset-Manifest: Sprites als INLINE-Data-URIs (die SVGs werden zur Bauzeit als
// Rohtext eingebettet). So sind keine Laufzeit-Datei-Fetches noetig -- das Spiel
// funktioniert auch als einzelne HTML-Datei per Doppelklick (file://).

import customer1 from '../assets/sprites/customer1.svg?raw';
import customer1WalkA from '../assets/sprites/customer1-walk-a.svg?raw';
import customer1WalkB from '../assets/sprites/customer1-walk-b.svg?raw';
import customer2 from '../assets/sprites/customer2.svg?raw';
import customer2WalkA from '../assets/sprites/customer2-walk-a.svg?raw';
import customer2WalkB from '../assets/sprites/customer2-walk-b.svg?raw';
import customer3 from '../assets/sprites/customer3.svg?raw';
import customer3WalkA from '../assets/sprites/customer3-walk-a.svg?raw';
import customer3WalkB from '../assets/sprites/customer3-walk-b.svg?raw';
import chef from '../assets/sprites/chef.svg?raw';
import chefWorkA from '../assets/sprites/chef-work-a.svg?raw';
import chefWorkB from '../assets/sprites/chef-work-b.svg?raw';
import investor from '../assets/sprites/investor.svg?raw';
import stallBack from '../assets/sprites/stall-back.svg?raw';
import stallCounter from '../assets/sprites/stall-counter.svg?raw';
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
  { key: 'customer1-walk-a', path: dataUri(customer1WalkA), width: 40, height: 54 },
  { key: 'customer1-walk-b', path: dataUri(customer1WalkB), width: 40, height: 54 },
  { key: 'customer2', path: dataUri(customer2), width: 40, height: 54 },
  { key: 'customer2-walk-a', path: dataUri(customer2WalkA), width: 40, height: 54 },
  { key: 'customer2-walk-b', path: dataUri(customer2WalkB), width: 40, height: 54 },
  { key: 'customer3', path: dataUri(customer3), width: 40, height: 54 },
  { key: 'customer3-walk-a', path: dataUri(customer3WalkA), width: 40, height: 54 },
  { key: 'customer3-walk-b', path: dataUri(customer3WalkB), width: 40, height: 54 },
  { key: 'chef', path: dataUri(chef), width: 40, height: 54 },
  { key: 'chef-work-a', path: dataUri(chefWorkA), width: 40, height: 54 },
  { key: 'chef-work-b', path: dataUri(chefWorkB), width: 40, height: 54 },
  { key: 'investor', path: dataUri(investor), width: 50, height: 62 },
  { key: 'stall-back', path: dataUri(stallBack), width: 120, height: 104 },
  { key: 'stall-counter', path: dataUri(stallCounter), width: 120, height: 104 },
  { key: 'coin', path: dataUri(coin), width: 22, height: 22 },
];

export interface CustomerVariant {
  stand: string;
  walkA: string;
  walkB: string;
}

/** Kunden-Varianten mit Steh- und Lauf-Frames. */
export const CUSTOMER_VARIANTS: CustomerVariant[] = [
  { stand: 'customer1', walkA: 'customer1-walk-a', walkB: 'customer1-walk-b' },
  { stand: 'customer2', walkA: 'customer2-walk-a', walkB: 'customer2-walk-b' },
  { stand: 'customer3', walkA: 'customer3-walk-a', walkB: 'customer3-walk-b' },
];
