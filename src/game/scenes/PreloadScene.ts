import Phaser from 'phaser';
import { SPRITES } from '@data/assets';

// PreloadScene: laedt die SVG-Sprites (bei doppelter Groesse gerastert fuer
// Schaerfe) und wechselt dann zur WorldScene.
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    for (const s of SPRITES) {
      this.load.svg(s.key, s.path, { width: s.width * 2, height: s.height * 2 });
    }
  }

  create(): void {
    this.scene.start('WorldScene');
  }
}
