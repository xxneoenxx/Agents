import Phaser from 'phaser';

// Verkaeufer hinter der Theke eines Standes. Zustaende: idle (Steh-Frame,
// sanftes Atmen) und working (2-Frame-Ruehr-/Hackbewegung). Bei einer
// Auszahlung der eigenen Station macht er eine kurze Serve-Geste.

const WORK_FRAME_MS = 220;
const SPRITE_W = 40;
const SPRITE_H = 54;

export class Vendor extends Phaser.GameObjects.Container {
  private img: Phaser.GameObjects.Image;
  private working = false;
  private frameTimer?: Phaser.Time.TimerEvent;
  private breathTween?: Phaser.Tweens.Tween;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    private reducedMotion = false,
  ) {
    super(scene, x, y);
    this.img = scene.add
      .image(0, 0, 'chef')
      .setOrigin(0.5, 1)
      .setDisplaySize(SPRITE_W, SPRITE_H);
    this.add(this.img);
    scene.add.existing(this);
    this.startBreathing();
  }

  private setFrame(key: string): void {
    this.img.setTexture(key).setDisplaySize(SPRITE_W, SPRITE_H);
  }

  private startBreathing(): void {
    if (this.reducedMotion) return;
    this.breathTween = this.scene.tweens.add({
      targets: this.img,
      scaleY: this.img.scaleY * 1.02,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /** working = Station produziert gerade (Frame-Wechsel), sonst idle. */
  setWorking(on: boolean): void {
    if (this.working === on) return;
    this.working = on;
    if (on && !this.reducedMotion) {
      let toggle = false;
      this.setFrame('chef-work-a');
      this.frameTimer?.remove();
      this.frameTimer = this.scene.time.addEvent({
        delay: WORK_FRAME_MS,
        loop: true,
        callback: () => {
          toggle = !toggle;
          this.setFrame(toggle ? 'chef-work-b' : 'chef-work-a');
        },
      });
    } else {
      this.frameTimer?.remove();
      this.frameTimer = undefined;
      this.setFrame('chef');
    }
  }

  /** Kurzer Huepfer beim Servieren. */
  serveGesture(): void {
    if (this.reducedMotion) return;
    this.scene.tweens.add({
      targets: this.img,
      y: -5,
      duration: 110,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
  }

  destroy(fromScene?: boolean): void {
    this.frameTimer?.remove();
    this.breathTween?.remove();
    super.destroy(fromScene);
  }
}
