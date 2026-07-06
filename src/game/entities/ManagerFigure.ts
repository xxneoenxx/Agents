import Phaser from 'phaser';

// Manager-Figur, die nach dem Einstellen an "ihrer" Station steht und leicht
// wippt (Idle-Animation). Programmatische Formen inkl. angedeuteter Kochmuetze.

export class ManagerFigure extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number, reducedMotion = false) {
    super(scene, x, y);

    const shadow = scene.add.ellipse(0, 2, 30, 9, 0x000000, 0.15);
    const figure = scene.add.container(0, 0);
    const body = scene.add
      .rectangle(0, -16, 24, 30, 0xfffdf7)
      .setStrokeStyle(2, 0x3a2a1f)
      .setOrigin(0.5, 1);
    const head = scene.add.circle(0, -30, 10, 0xffd9a0).setStrokeStyle(2, 0x3a2a1f);
    // Kochmuetze
    const hat = scene.add.rectangle(0, -40, 20, 8, 0xffffff).setStrokeStyle(2, 0x3a2a1f);
    const hatTop = scene.add.circle(0, -44, 8, 0xffffff).setStrokeStyle(2, 0x3a2a1f);
    figure.add([body, head, hat, hatTop]);

    this.add([shadow, figure]);
    scene.add.existing(this);
    this.setDepth(4);

    if (!reducedMotion) {
      scene.tweens.add({
        targets: figure,
        y: -3,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }
}
