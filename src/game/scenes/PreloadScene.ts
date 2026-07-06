import Phaser from 'phaser';
import { ASSETS } from '@data/assets';

// PreloadScene: laedt Assets aus dem Manifest und zeigt einen simplen
// Ladebalken. In Phase 0 ist das Manifest leer -> direkt weiter zur WorldScene.
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    // Assets gemaess Manifest registrieren (aktuell leer).
    for (const asset of ASSETS) {
      if (asset.type === 'image') this.load.image(asset.key, asset.path);
      if (asset.type === 'audio') this.load.audio(asset.key, asset.path);
    }
  }

  create(): void {
    this.scene.start('WorldScene');
  }
}
