import Phaser from 'phaser';

// Manager-Figur (Koch-Sprite), die nach dem Einstellen an "ihrer" Station steht
// und leicht wippt (Idle-Animation).
export class ManagerFigure extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number, reducedMotion = false) {
    super(scene, x, y);

    const shadow = scene.add.ellipse(0, 2, 30, 9, 0x000000, 0.15);
    const figure = scene.add.container(0, 0);
    const img = scene.add.image(0, 0, 'chef').setOrigin(0.5, 1).setDisplaySize(40, 54);
    figure.add(img);

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
