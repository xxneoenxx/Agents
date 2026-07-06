import Phaser from 'phaser';
import { STATIONS } from '@data/stations';
import type { GameController } from '@core/game';
import { ManagerFigure } from '@game/entities/ManagerFigure';
import { CustomerSpawner, type SpawnerTuning } from '@game/systems/CustomerSpawner';
import { CameraController } from '@game/systems/CameraController';

// WorldScene: die lebendige 2D-Welt. Zeichnet das Restaurant (Wand, Boden,
// Counter, Staende je freigeschalteter Station), platziert Manager-Figuren und
// betreibt den Kunden-Spawner sowie die Kamera. Alle Assets sind programmatisch
// (Placeholder-First); die Bedienung liegt im HTML-Overlay.

const LEFT_MARGIN = 150;
const STALL_SPACING = 210;
const RIGHT_MARGIN = 150;

export class WorldScene extends Phaser.Scene {
  private controller!: GameController;
  private spawner!: CustomerSpawner;
  private camControl!: CameraController;
  private restaurantLayer!: Phaser.GameObjects.Container;
  private reducedMotion = false;

  private laneY = 0;
  private worldWidth = 0;
  private layoutSignature = '';
  private unsubscribe?: () => void;

  constructor() {
    super({ key: 'WorldScene' });
  }

  create(): void {
    this.controller = this.registry.get('controller') as GameController;
    this.reducedMotion =
      typeof window !== 'undefined' &&
      !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const { height } = this.scale;
    this.laneY = height * 0.5;
    this.worldWidth = LEFT_MARGIN + (STATIONS.length - 1) * STALL_SPACING + RIGHT_MARGIN;

    this.cameras.main.setBackgroundColor(0xffc24b);
    this.drawBackdrop();

    // Ebene fuer Staende + Manager (wird bei Aenderungen neu aufgebaut).
    this.restaurantLayer = this.add.container(0, 0).setDepth(3);

    // Kunden-Spawner: Bedienpunkt links der Mitte, Schlange nach rechts.
    const serviceX = this.worldWidth * 0.42;
    this.spawner = new CustomerSpawner(
      this,
      {
        spawnX: this.worldWidth + 60,
        exitX: -60,
        serviceX,
        laneY: this.laneY + 14,
        slotSpacing: 46,
      },
      () => this.computeTuning(),
    );

    // Kamera: Standard-Fokus auf den Bedienbereich.
    this.camControl = new CameraController(this, {
      minZoom: 0.5,
      maxZoom: 1.8,
      defaultZoom: 1,
      focusX: serviceX,
      focusY: this.laneY,
    });
    this.camControl.setBounds(0, 0, this.worldWidth, height);

    this.rebuildRestaurant();

    // UI-Anfrage zum Zentrieren.
    const off = this.controller.bus.on('cameraCenter', () => this.camControl.center());
    this.unsubscribe = off;

    // Aufraeumen bei Szenenwechsel/Neustart (z. B. Resize).
    this.events.once('shutdown', () => this.cleanup());
    this.events.once('destroy', () => this.cleanup());

    this.scale.on('resize', this.handleResize, this);
  }

  update(time: number, delta: number): void {
    // Layout bei Freischaltung/Manager-Aenderung neu aufbauen.
    const sig = this.currentSignature();
    if (sig !== this.layoutSignature) this.rebuildRestaurant();

    this.spawner.update(time, delta);
  }

  // --- Zeichnen --------------------------------------------------------------

  private drawBackdrop(): void {
    const { height } = this.scale;
    const w = this.worldWidth;
    const horizon = this.laneY - 30;

    // Wand (warmer Verlauf, angedeutet durch zwei Rechtecke).
    this.add.rectangle(w / 2, horizon / 2, w, horizon, 0xffd27a).setDepth(0);
    this.add
      .rectangle(w / 2, horizon, w, horizon * 0.5, 0xff8a3d)
      .setAlpha(0.25)
      .setOrigin(0.5, 1)
      .setDepth(0);

    // Boden.
    this.add
      .rectangle(w / 2, (horizon + height) / 2, w, height - horizon, 0x8fce6a)
      .setDepth(0);
    this.add.rectangle(w / 2, horizon, w, 6, 0x6fae4c).setDepth(0);

    // Counter (durchgehende Theke), auf der die Staende sitzen.
    this.add
      .rectangle(w / 2, this.laneY - 16, w, 26, 0xfffdf7)
      .setStrokeStyle(3, 0x3a2a1f)
      .setDepth(1);
  }

  private stallX(index: number): number {
    return LEFT_MARGIN + index * STALL_SPACING;
  }

  private rebuildRestaurant(): void {
    this.restaurantLayer.removeAll(true);

    STATIONS.forEach((def, i) => {
      if (!this.controller.isUnlocked(i)) return;
      const st = this.controller.getState().stations[i];
      const owned = st.owned > 0;
      this.drawStall(this.stallX(i), def.emoji, def.name, owned);

      // Manager-Figur, wenn eingestellt.
      if (st.manager) {
        const mgr = new ManagerFigure(
          this,
          this.stallX(i) + 34,
          this.laneY + 2,
          this.reducedMotion,
        );
        this.restaurantLayer.add(mgr);
      }
    });

    this.layoutSignature = this.currentSignature();
  }

  private drawStall(x: number, emoji: string, name: string, owned: boolean): void {
    const baseY = this.laneY - 28;
    const stall = this.add.container(x, baseY);

    // Bude
    stall.add(this.add.rectangle(0, -34, 96, 62, 0xfffdf7).setStrokeStyle(3, 0x3a2a1f));
    // Dach
    stall.add(this.add.rectangle(0, -70, 112, 18, 0xff5c5c).setStrokeStyle(3, 0x3a2a1f));
    // Schild-Emoji
    stall.add(this.add.text(0, -40, emoji, { fontSize: '30px' }).setOrigin(0.5));
    // Name
    stall.add(
      this.add
        .text(0, -2, name, {
          fontFamily: 'Nunito, Arial, sans-serif',
          fontSize: '12px',
          fontStyle: '800',
          color: '#3A2A1F',
        })
        .setOrigin(0.5),
    );

    if (!owned) stall.setAlpha(0.55);
    this.restaurantLayer.add(stall);
  }

  // --- Betriebsamkeit --------------------------------------------------------

  private computeTuning(): SpawnerTuning {
    const state = this.controller.getState();
    let managers = 0;
    let unlocked = 0;
    state.stations.forEach((st, i) => {
      if (this.controller.isUnlocked(i)) unlocked++;
      if (st.manager) managers++;
    });
    return {
      spawnIntervalMs: Phaser.Math.Clamp(1100 / (1 + managers * 0.6), 260, 1100),
      serveIntervalMs: Phaser.Math.Clamp(1300 / (1 + managers * 0.7), 260, 1300),
      maxQueue: Phaser.Math.Clamp(3 + unlocked, 3, 10),
    };
  }

  private currentSignature(): string {
    const state = this.controller.getState();
    let unlocked = 0;
    let managerMask = '';
    state.stations.forEach((st, i) => {
      if (this.controller.isUnlocked(i)) unlocked++;
      managerMask += st.manager ? '1' : '0';
      managerMask += st.owned > 0 ? 'o' : '.';
    });
    return `${unlocked}|${managerMask}`;
  }

  // --- Lebenszyklus ----------------------------------------------------------

  private handleResize(gameSize: Phaser.Structs.Size): void {
    this.cameras.resize(gameSize.width, gameSize.height);
    this.scene.restart();
  }

  private cleanup(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.spawner?.destroy();
    this.camControl?.destroy();
    this.scale.off('resize', this.handleResize, this);
  }
}
