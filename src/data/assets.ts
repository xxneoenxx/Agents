// Asset-Manifest: Keys -> Dateien + Zielgroesse. Haelt Grafiken austauschbar.
// SVG-Sprites werden gerastert bei doppelter Zielgroesse geladen (schaerfer auf
// hochaufloesenden Displays) und im Spiel per setDisplaySize auf die Zielgroesse
// gebracht.

export interface SpriteEntry {
  key: string;
  path: string;
  /** Zielbreite/-hoehe (CSS-Pixel) im Spiel. */
  width: number;
  height: number;
}

export const SPRITES: SpriteEntry[] = [
  { key: 'customer1', path: 'sprites/customer1.svg', width: 40, height: 54 },
  { key: 'customer2', path: 'sprites/customer2.svg', width: 40, height: 54 },
  { key: 'customer3', path: 'sprites/customer3.svg', width: 40, height: 54 },
  { key: 'chef', path: 'sprites/chef.svg', width: 40, height: 54 },
  { key: 'investor', path: 'sprites/investor.svg', width: 50, height: 62 },
  { key: 'stall', path: 'sprites/stall.svg', width: 120, height: 104 },
  { key: 'coin', path: 'sprites/coin.svg', width: 22, height: 22 },
];

/** Kunden-Textur-Keys fuer zufaellige Varianten. */
export const CUSTOMER_KEYS = ['customer1', 'customer2', 'customer3'] as const;
