import Phaser from 'phaser';

// Kunden-Figur als poolbarer Phaser-Container (programmatische Formen, keine
// externen Assets). Koerper + Kopf in einem inneren "figure"-Container, damit
// eine simple Lauf-Animation (Bob) unabhaengig von der Weltposition laeuft.

// Farbvarianten fuer den Koerper, damit die Menge lebendig wirkt.
export const CUSTOMER_TINTS = [
  0xff5c5c, 0x7c5cff, 0x22b573, 0x3aa0ff, 0xff8a3d, 0xff5ca8, 0x00b8b8, 0xffc72c,
] as const;

const WALK_SPEED_PX_PER_MS = 0.11; // ~110 px/s

// Haar-/Hautvarianten fuer mehr Vielfalt in der Menge.
const HAIR_TINTS = [0x3a2a1f, 0x6b4226, 0x111111, 0xa8602a, 0xf0c060, 0x8a4fbf] as const;
const SKIN_TINTS = [0xffd9a0, 0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524] as const;

export class Customer extends Phaser.GameObjects.Container {
  /** Ob die Figur gerade in Benutzung ist (Pooling). */
  inUse = false;

  private figure: Phaser.GameObjects.Container;
  private torso: Phaser.GameObjects.Rectangle;
  private armL: Phaser.GameObjects.Rectangle;
  private armR: Phaser.GameObjects.Rectangle;
  private hair: Phaser.GameObjects.Arc;
  private head: Phaser.GameObjects.Arc;
  private bobTween?: Phaser.Tweens.Tween;
  private walkTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);

    const shadow = scene.add.ellipse(0, 2, 32, 10, 0x000000, 0.15);

    this.figure = scene.add.container(0, 0);
    // Arme (hinter dem Koerper), faerben sich mit dem Koerper.
    this.armL = scene.add.rectangle(-11, -20, 6, 20, 0xff5c5c).setStrokeStyle(2, 0x3a2a1f);
    this.armR = scene.add.rectangle(11, -20, 6, 20, 0xff5c5c).setStrokeStyle(2, 0x3a2a1f);
    this.torso = scene.add
      .rectangle(0, -16, 24, 30, 0xff5c5c)
      .setStrokeStyle(2, 0x3a2a1f)
      .setOrigin(0.5, 1);
    // Haar (hinter/ueber dem Kopf), Kopf ueberdeckt das Gesicht.
    this.hair = scene.add.circle(0, -33, 11, 0x3a2a1f);
    this.head = scene.add.circle(0, -30, 10, 0xffd9a0).setStrokeStyle(2, 0x3a2a1f);
    this.figure.add([this.armL, this.armR, this.torso, this.hair, this.head]);

    this.add([shadow, this.figure]);
    scene.add.existing(this);
    this.setActive(false).setVisible(false).setDepth(5);
  }

  /** Aus dem Pool aktivieren: Position, Farbe, sichtbar. */
  spawn(x: number, y: number, tint: number): void {
    this.setPosition(x, y);
    this.torso.setFillStyle(tint);
    this.armL.setFillStyle(tint);
    this.armR.setFillStyle(tint);
    this.hair.setFillStyle(HAIR_TINTS[Phaser.Math.Between(0, HAIR_TINTS.length - 1)]);
    this.head.setFillStyle(SKIN_TINTS[Phaser.Math.Between(0, SKIN_TINTS.length - 1)]);
    this.figure.setScale(1, 1);
    this.figure.y = 0;
    this.inUse = true;
    this.setActive(true).setVisible(true);
  }

  /** Laeuft zu (x, y); ruft danach onDone. Blickrichtung + Lauf-Bob inklusive. */
  walkTo(x: number, y: number, onDone?: () => void): void {
    this.stopWalk();
    this.faceTowards(x);
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

  private faceTowards(x: number): void {
    const dir = x < this.x ? -1 : 1;
    this.figure.setScale(dir, 1);
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
