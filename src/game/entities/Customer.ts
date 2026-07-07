import Phaser from 'phaser';
import { CUSTOMER_KEYS } from '@data/assets';

// Kunden-Figur als poolbarer Phaser-Container. Nutzt echte SVG-Sprites (mehrere
// Varianten) mit einer simplen Lauf-Animation (Bob) und Blickrichtung via flipX.

const WALK_SPEED_PX_PER_MS = 0.11; // ~110 px/s
const SPRITE_W = 40;
const SPRITE_H = 54;

export class Customer extends Phaser.GameObjects.Container {
  /** Ob die Figur gerade in Benutzung ist (Pooling). */
  inUse = false;

  private figure: Phaser.GameObjects.Container;
  private img: Phaser.GameObjects.Image;
  private bobTween?: Phaser.Tweens.Tween;
  private walkTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);

    const shadow = scene.add.ellipse(0, 2, 30, 9, 0x000000, 0.15);
    this.figure = scene.add.container(0, 0);
    this.img = scene.add
      .image(0, 0, CUSTOMER_KEYS[0])
      .setOrigin(0.5, 1)
      .setDisplaySize(SPRITE_W, SPRITE_H);
    this.figure.add(this.img);

    this.add([shadow, this.figure]);
    scene.add.existing(this);
    this.setActive(false).setVisible(false).setDepth(5);
  }

  /** Aus dem Pool aktivieren: Position + zufaellige Variante. */
  spawn(x: number, y: number): void {
    this.setPosition(x, y);
    const key = CUSTOMER_KEYS[Phaser.Math.Between(0, CUSTOMER_KEYS.length - 1)];
    this.img.setTexture(key).setDisplaySize(SPRITE_W, SPRITE_H).setFlipX(false);
    this.figure.y = 0;
    this.inUse = true;
    this.setActive(true).setVisible(true);
  }

  /** Laeuft zu (x, y); ruft danach onDone. Blickrichtung + Lauf-Bob inklusive. */
  walkTo(x: number, y: number, onDone?: () => void): void {
    this.stopWalk();
    this.img.setFlipX(x < this.x);
    this.startBob();
    const dist = Math.hypot(x - this.x, y - this.y);
    const duration = Math.max(180, dist / WALK_SPEED_PX_PER_MS);
    this.walkTween = this.scene.tweens.add({
      targets: this,
      x,
      y,
      duration,
      ease: 'Linear',
      onComplete: () => {
        this.stopBob();
        onDone?.();
      },
    });
  }

  /** Wartet an Ort und Stelle (kein Bob). */
  setWaiting(): void {
    this.stopWalk();
    this.stopBob();
  }

  private startBob(): void {
    if (this.bobTween) return;
    this.bobTween = this.scene.tweens.add({
      targets: this.figure,
      y: -4,
      duration: 160,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private stopBob(): void {
    this.bobTween?.remove();
    this.bobTween = undefined;
    this.figure.y = 0;
  }

  private stopWalk(): void {
    this.walkTween?.remove();
    this.walkTween = undefined;
  }

  /** Zurueck in den Pool (unsichtbar, alle Tweens gestoppt). */
  recycle(): void {
    this.stopWalk();
    this.stopBob();
    this.inUse = false;
    this.setActive(false).setVisible(false);
  }
}
