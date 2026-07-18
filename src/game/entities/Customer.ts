import Phaser from 'phaser';
import { CUSTOMER_VARIANTS, type CustomerVariant } from '@data/assets';

// Kunden-Figur als poolbarer Phaser-Container. Jede Variante hat einen Steh-
// und zwei Lauf-Frames (2-Frame-Geh-Animation per Textur-Wechsel) plus einen
// leichten Bob. Blickrichtung via flipX.

const WALK_SPEED_PX_PER_MS = 0.11; // ~110 px/s
const WALK_FRAME_MS = 150;
const SPRITE_W = 40;
const SPRITE_H = 54;

export class Customer extends Phaser.GameObjects.Container {
  /** Ob die Figur gerade in Benutzung ist (Pooling). */
  inUse = false;

  private figure: Phaser.GameObjects.Container;
  private img: Phaser.GameObjects.Image;
  private variant: CustomerVariant = CUSTOMER_VARIANTS[0];
  private bobTween?: Phaser.Tweens.Tween;
  private walkTween?: Phaser.Tweens.Tween;
  private frameTimer?: Phaser.Time.TimerEvent;
  private reducedMotion: boolean;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    this.reducedMotion =
      typeof window !== 'undefined' &&
      !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const shadow = scene.add.ellipse(0, 2, 30, 9, 0x000000, 0.15);
    this.figure = scene.add.container(0, 0);
    this.img = scene.add
      .image(0, 0, this.variant.stand)
      .setOrigin(0.5, 1)
      .setDisplaySize(SPRITE_W, SPRITE_H);
    this.figure.add(this.img);

    this.add([shadow, this.figure]);
    scene.add.existing(this);
    this.setActive(false).setVisible(false).setDepth(5);
  }

  private setFrame(key: string): void {
    this.img.setTexture(key).setDisplaySize(SPRITE_W, SPRITE_H);
  }

  /** Aus dem Pool aktivieren: Position + zufaellige Variante. */
  spawn(x: number, y: number): void {
    this.setPosition(x, y);
    this.variant = CUSTOMER_VARIANTS[Phaser.Math.Between(0, CUSTOMER_VARIANTS.length - 1)];
    this.setFrame(this.variant.stand);
    this.img.setFlipX(false);
    this.figure.y = 0;
    this.inUse = true;
    this.setActive(true).setVisible(true);
  }

  /** Laeuft zu (x, y); ruft danach onDone. Geh-Frames + leichter Bob. */
  walkTo(x: number, y: number, onDone?: () => void): void {
    this.stopWalk();
    this.img.setFlipX(x < this.x);
    this.startWalkAnim();
    const dist = Math.hypot(x - this.x, y - this.y);
    const duration = Math.max(180, dist / WALK_SPEED_PX_PER_MS);
    this.walkTween = this.scene.tweens.add({
      targets: this,
      x,
      y,
      duration,
      ease: 'Linear',
      onComplete: () => {
        this.stopWalkAnim();
        onDone?.();
      },
    });
  }

  /** Wartet an Ort und Stelle (Steh-Frame). */
  setWaiting(): void {
    this.stopWalk();
    this.stopWalkAnim();
  }

  private startWalkAnim(): void {
    if (this.reducedMotion) return; // nur gleiten, keine Frame-/Bob-Bewegung
    // 2-Frame-Gehen.
    let toggle = false;
    this.setFrame(this.variant.walkA);
    this.frameTimer?.remove();
    this.frameTimer = this.scene.time.addEvent({
      delay: WALK_FRAME_MS,
      loop: true,
      callback: () => {
        toggle = !toggle;
        this.setFrame(toggle ? this.variant.walkB : this.variant.walkA);
      },
    });
    // Leichter Bob (Beine tragen die Hauptbewegung).
    if (!this.bobTween) {
      this.bobTween = this.scene.tweens.add({
        targets: this.figure,
        y: -2,
        duration: WALK_FRAME_MS,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private stopWalkAnim(): void {
    this.frameTimer?.remove();
    this.frameTimer = undefined;
    this.bobTween?.remove();
    this.bobTween = undefined;
    this.figure.y = 0;
    this.setFrame(this.variant.stand);
  }

  private stopWalk(): void {
    this.walkTween?.remove();
    this.walkTween = undefined;
  }

  /** Zurueck in den Pool (unsichtbar, alle Tweens/Timer gestoppt). */
  recycle(): void {
    this.stopWalk();
    this.stopWalkAnim();
    this.inUse = false;
    this.setActive(false).setVisible(false);
  }
}
