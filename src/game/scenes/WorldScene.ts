import Phaser from 'phaser';
import { formatNumber } from '@core/format';
import type { GameController } from '@core/game';
import type { GameEvents } from '@core/events';

// WorldScene: die Spielwelt (Phase 1: Platzhalter-Kulisse + "Juice").
// Zeigt Himmel, Boden und den Stand; bei jeder Auszahlung steigt ein
// Muenz-Popup auf. Die eigentliche Bedienung liegt im HTML-Overlay.
export class WorldScene extends Phaser.Scene {
  private unsubscribe?: () => void;
  private reducedMotion = false;
  private lastPopMs = 0;

  constructor() {
    super({ key: 'WorldScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    this.reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // Kulisse (programmatisch, keine externen Assets).
    this.add.rectangle(width / 2, height / 2, width, height, 0xffc24b);
    this.add
      .rectangle(width / 2, height * 0.72, width, height * 0.55, 0xff8a3d)
      .setAlpha(0.5)
      .setOrigin(0.5, 1);
    this.add.circle(width - 64, 72, 40, 0xffe08a).setAlpha(0.9);

    const groundY = height * 0.72;
    this.add.rectangle(width / 2, (groundY + height) / 2, width, height - groundY, 0x8fce6a);
    this.add.rectangle(width / 2, groundY, width, 6, 0x6fae4c);

    this.drawStand(width / 2, groundY);

    this.add
      .text(width / 2, height * 0.1, "Bella's Food Empire", {
        fontFamily: 'Nunito, Arial, sans-serif',
        fontSize: '28px',
        fontStyle: '900',
        color: '#3A2A1F',
      })
      .setOrigin(0.5);

    // Auf Auszahlungen mit einem Muenz-Popup reagieren.
    const controller = this.registry.get('controller') as GameController | undefined;
    if (controller) {
      const handler = (payload: GameEvents['stationPaid']) => this.onPaid(payload.amount);
      this.unsubscribe = controller.bus.on('stationPaid', handler);
    }

    // Aufraeumen beim Szenenwechsel/Neustart.
    this.events.once('shutdown', () => this.unsubscribe?.());
    this.events.once('destroy', () => this.unsubscribe?.());

    this.scale.on('resize', this.handleResize, this);
  }

  private drawStand(cx: number, baseY: number): void {
    const stand = this.add.container(cx, baseY);
    stand.add(this.add.rectangle(0, -50, 120, 80, 0xfffdf7).setStrokeStyle(4, 0x3a2a1f));
    stand.add(this.add.rectangle(0, -96, 140, 22, 0xff5c5c).setStrokeStyle(4, 0x3a2a1f));
    stand.add(this.add.rectangle(0, -12, 130, 16, 0xffc72c).setStrokeStyle(4, 0x3a2a1f));
    stand.add(this.add.text(0, -54, '🍋', { fontSize: '34px' }).setOrigin(0.5));
  }

  // Steigendes "+Betrag"-Muenz-Popup. Gedrosselt, damit viele Auszahlungen nicht
  // zu Effekt-Overkill fuehren.
  private onPaid(amount: number): void {
    const now = this.time.now;
    if (now - this.lastPopMs < 120) return;
    this.lastPopMs = now;

    const { width, height } = this.scale;
    const x = width / 2 + Phaser.Math.Between(-50, 50);
    const y = height * 0.32;
    const label = this.add
      .text(x, y, `+${formatNumber(amount)}`, {
        fontFamily: 'Nunito, Arial, sans-serif',
        fontSize: '20px',
        fontStyle: '900',
        color: '#FFC72C',
        stroke: '#3A2A1F',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    if (this.reducedMotion) {
      // Ohne Bewegung: kurz anzeigen und entfernen.
      this.time.delayedCall(500, () => label.destroy());
      return;
    }

    this.tweens.add({
      targets: label,
      y: y - 60,
      alpha: 0,
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => label.destroy(),
    });
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    this.cameras.resize(gameSize.width, gameSize.height);
    this.scene.restart();
  }
}
