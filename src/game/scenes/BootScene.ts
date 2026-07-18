import Phaser from 'phaser';

// BootScene: minimale Erst-Initialisierung, dann Wechsel zur PreloadScene.
// Hier koennen spaeter globale Einstellungen (Skalierung, Input) gesetzt werden.
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    this.scene.start('PreloadScene');
  }
}
