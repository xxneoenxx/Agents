import Phaser from 'phaser';

// Grossinvestor-NPC: auffaellige Figur (Zylinder, Anzug, Aktenkoffer) mit
// Glitzern. Laeuft langsam durch die Szene und ist antippbar. Programmatische
// Formen (keine externen Assets).
export class Investor extends Phaser.GameObjects.Container {
  private figure: Phaser.GameObjects.Container;
  private walkTween?: Phaser.Tweens.Tween;
  private tapped = false;

  constructor(
    scene: Phaser.Scene,
    private onTap: () => void,
    reducedMotion = false,
  ) {
    super(scene, 0, 0);

    const shadow = scene.add.ellipse(0, 2, 40, 12, 0x000000, 0.18);
    this.figure = scene.add.container(0, 0);
    const body = scene.add
      .rectangle(0, -18, 30, 38, 0x3a2a4f)
      .setStrokeStyle(2, 0x1c1330)
      .setOrigin(0.5, 1);
    const tie = scene.add.triangle(0, -30, 0, 0, 4, 8, -4, 8, 0xffc72c);
    const head = scene.add.circle(0, -40, 11, 0xffd9a0).setStrokeStyle(2, 0x3a2a1f);
    const hatBrim = scene.add.rectangle(0, -50, 26, 5, 0x1c1330);
    const hatTop = scene.add.rectangle(0, -58, 18, 14, 0x1c1330).setOrigin(0.5, 1);
    const briefcase = scene.add.rectangle(18, -12, 14, 11, 0x8a5a2b).setStrokeStyle(2, 0x3a2a1f);
    this.figure.add([body, tie, head, hatBrim, hatTop, briefcase]);

    const sparkle = scene.add.text(16, -64, '✨', { fontSize: '18px' }).setOrigin(0.5);

    this.add([shadow, this.figure, sparkle]);
    scene.add.existing(this);
    this.setDepth(8);

    // Antippbereich.
    this.setSize(48, 80);
    this.setInteractive(
      new Phaser.Geom.Rectangle(-24, -72, 48, 80),
      Phaser.Geom.Rectangle.Contains,
    );
    this.on('pointerdown', (_p: Phaser.Input.Pointer, _x: number, _y: number, e?: Phaser.Types.Input.EventData) => {
      e?.stopPropagation?.();
      if (this.tapped) return;
      this.tapped = true;
      this.onTap();
    });

    if (!reducedMotion) {
      scene.tweens.add({
        targets: sparkle,
        alpha: 0.2,
        scale: 1.3,
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      scene.tweens.add({
        targets: this.figure,
        y: -3,
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  /** Laeuft langsam von fromX nach toX (auf Hoehe y); danach onDone. */
  walkAcross(fromX: number, toX: number, y: number, onDone: () => void): void {
    this.setPosition(fromX, y);
    this.figure.setScale(toX < fromX ? -1 : 1, 1);
    const dist = Math.abs(toX - fromX);
    this.walkTween = this.scene.tweens.add({
      targets: this,
      x: toX,
      duration: Math.max(4000, dist / 0.05), // langsam (~50 px/s)
      ease: 'Linear',
      onComplete: onDone,
    });
  }

  wasTapped(): boolean {
    return this.tapped;
  }

  stopAndDestroy(): void {
    this.walkTween?.remove();
    this.destroy();
  }
}
