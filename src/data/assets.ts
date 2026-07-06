// Asset-Manifest: Keys -> Dateien. Haelt Grafiken/Sounds austauschbar, damit
// Platzhalter spaeter leicht durch eigene Sprites ersetzt werden koennen.
// In Phase 0 noch leer (programmatische Platzhalter genuegen).

export interface AssetEntry {
  key: string;
  path: string;
  type: 'image' | 'spritesheet' | 'audio';
}

export const ASSETS: AssetEntry[] = [
  // Beispiel (folgt in spaeteren Phasen):
  // { key: 'customer', path: 'sprites/customer.png', type: 'spritesheet' },
];
