import Phaser from 'phaser';

// Grossinvestor-NPC (Zylinder-Sprite mit Glitzern). Laeuft langsam durch die
// Szene und ist antippbar.
export class Investor extends Phaser.GameObjects.Container {
  private figure: Phaser.GameObjects.Container;
  private img: Phaser.GameObjects.Image;
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
    this.img = scene.add.image(0, 0, 'investor').setOrigin(0.5, 1).setDisplaySize(50, 62);
    this.figure.add(this.img);
    const sparkle = scene.add.text(18, -58, '✨', { fontSize: '18px' }).setOrigin(0.5);

    this.add([shadow, this.figure, sparkle]);
    scene.add.existing(this);
    this.setDepth(8);

    // Antippbereich.
    this.setSize(52, 66);
    this.setInteractive(
      new Phaser.Geom.Rectangle(-26, -64, 52, 66),
      Phaser.Geom.Rectangle.Contains,
    );
    this.on(
      'pointerdown',
      (_p: Phaser.Input.Pointer, _x: number, _y: number, e?: Phaser.Types.Input.EventData) => {
        e?.stopPropagation?.();
        if (this.tapped) return;
        this.tapped = true;
        this.onTap();
      },
    );

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
    this.img.setFlipX(toX < fromX);
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
