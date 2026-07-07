import Phaser from 'phaser';
import { BALANCE } from '@data/balance';
import type { StationDef } from '@data/stations';
import type { GameController } from '@core/game';
import { ManagerFigure } from '@game/entities/ManagerFigure';
import { Investor } from '@game/entities/Investor';
import { CustomerSpawner, type SpawnerTuning } from '@game/systems/CustomerSpawner';
import { CameraController } from '@game/systems/CameraController';

// WorldScene: die lebendige 2D-Welt des AKTUELLEN Restaurants. Zeichnet Wand,
// Boden, Counter und einen Stand je freigeschalteter Station im jeweiligen
// Theme, platziert Manager-Figuren und betreibt Kunden-Spawner + Kamera. Bei
// Restaurantwechsel/Renovierung wird die Szene neu initialisiert.

const LEFT_MARGIN = 150;
const STALL_SPACING = 210;
const RIGHT_MARGIN = 150;

export class WorldScene extends Phaser.Scene {
  private controller!: GameController;
  private spawner!: CustomerSpawner;
  private camControl!: CameraController;
  private restaurantLayer!: Phaser.GameObjects.Container;
  private reducedMotion = false;

  private defs: StationDef[] = [];
  private laneY = 0;
  private worldWidth = 0;
  private layoutSignature = '';
  private unsubs: (() => void)[] = [];
  private investor?: Investor;

  constructor() {
    super({ key: 'WorldScene' });
  }

  create(): void {
    this.controller = this.registry.get('controller') as GameController;
    this.reducedMotion =
      typeof window !== 'undefined' &&
      !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    this.defs = this.controller.currentStationDefs();
    const theme = this.controller.currentRestaurantDef().theme;

    const { height } = this.scale;
    this.laneY = height * 0.5;
    this.worldWidth = LEFT_MARGIN + (this.defs.length - 1) * STALL_SPACING + RIGHT_MARGIN;

    this.cameras.main.setBackgroundColor(theme.wall);
    this.drawBackdrop(theme);

    this.restaurantLayer = this.add.container(0, 0).setDepth(3);

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

    this.camControl = new CameraController(this, {
      minZoom: 0.5,
      maxZoom: 1.8,
      defaultZoom: 1,
      focusX: serviceX,
      focusY: this.laneY,
    });
    this.camControl.setBounds(0, 0, this.worldWidth, height);

    this.rebuildRestaurant();

    // Auf UI-/Zustandsereignisse reagieren.
    this.unsubs.push(this.controller.bus.on('cameraCenter', () => this.camControl.center()));
    this.unsubs.push(this.controller.bus.on('restaurantChanged', () => this.scene.restart()));

    this.events.once('shutdown', () => this.cleanup());
    this.events.once('destroy', () => this.cleanup());
    this.scale.on('resize', this.handleResize, this);

    // Gelegentliche Ereignisse planen.
    this.scheduleInvestor();
    this.scheduleRush();
  }

  update(time: number, delta: number): void {
    const sig = this.currentSignature();
    if (sig !== this.layoutSignature) this.rebuildRestaurant();
    this.spawner.update(time, delta);
  }

  // --- Zeichnen --------------------------------------------------------------

  private drawBackdrop(theme: { wall: number; floor: number; counter: number }): void {
    const { height } = this.scale;
    const w = this.worldWidth;
    const horizon = this.laneY - 30;

    this.add.rectangle(w / 2, horizon / 2, w, horizon, theme.wall).setDepth(0);

    // Wanddeko: dezente Fenster/Bilder.
    for (let x = 90; x < w; x += 260) {
      this.add
        .rectangle(x, horizon * 0.42, 70, 54, 0xffffff, 0.14)
        .setStrokeStyle(3, 0x000000, 0.08)
        .setDepth(0);
    }

    // Boden mit abwechselnden Fliesen-Streifen.
    this.add
      .rectangle(w / 2, (horizon + height) / 2, w, height - horizon, theme.floor)
      .setDepth(0);
    const tileW = 64;
    for (let x = 0; x < w; x += tileW * 2) {
      this.add
        .rectangle(x + tileW / 2, (horizon + height) / 2, tileW, height - horizon, 0x000000, 0.05)
        .setDepth(0);
    }
    this.add.rectangle(w / 2, horizon, w, 6, 0x000000, 0.12).setDepth(0);

    // Deko-Pflanzen entlang des Bodens.
    for (let x = 60; x < w; x += 210) {
      this.drawPlant(x, this.laneY + 40);
    }

    this.add
      .rectangle(w / 2, this.laneY - 16, w, 26, theme.counter)
      .setStrokeStyle(3, 0x3a2a1f)
      .setDepth(1);
  }

  // Kleine Topfpflanze als Deko.
  private drawPlant(x: number, y: number): void {
    const p = this.add.container(x, y).setDepth(2);
    p.add(this.add.rectangle(0, 6, 20, 16, 0xcc7a45).setStrokeStyle(2, 0x3a2a1f));
    p.add(this.add.circle(-6, -6, 9, 0x3fae57));
    p.add(this.add.circle(6, -4, 10, 0x54c46a));
    p.add(this.add.circle(0, -14, 9, 0x3fae57));
  }

  private stallX(index: number): number {
    return LEFT_MARGIN + index * STALL_SPACING;
  }

  private rebuildRestaurant(): void {
    this.restaurantLayer.removeAll(true);
    const stations = this.controller.currentRestaurant().stations;

    this.defs.forEach((def, i) => {
      if (!this.controller.isUnlocked(i)) return;
      const st = stations[i];
      this.drawStall(this.stallX(i), def.emoji, def.name, st.owned > 0);
      if (st.manager) {
        this.restaurantLayer.add(
          new ManagerFigure(this, this.stallX(i) + 34, this.laneY + 2, this.reducedMotion),
        );
      }
    });

    this.layoutSignature = this.currentSignature();
  }

  private drawStall(x: number, emoji: string, name: string, owned: boolean): void {
    const baseY = this.laneY - 28;
    const stall = this.add.container(x, baseY);
    stall.add(this.add.rectangle(0, -34, 96, 62, 0xfffdf7).setStrokeStyle(3, 0x3a2a1f));
    stall.add(this.add.text(0, -40, emoji, { fontSize: '30px' }).setOrigin(0.5));

    // Gestreifte Markise mit Bogen-Unterkante.
    const awningW = 112;
    const stripes = 7;
    const stripeW = awningW / stripes;
    stall.add(this.add.rectangle(0, -70, awningW, 18, 0xffffff).setStrokeStyle(3, 0x3a2a1f));
    for (let s = 0; s < stripes; s++) {
      if (s % 2 === 0) continue;
      const sx = -awningW / 2 + stripeW * s + stripeW / 2;
      stall.add(this.add.rectangle(sx, -70, stripeW, 16, 0xff5c5c));
      stall.add(this.add.triangle(sx, -60, -stripeW / 2, 0, stripeW / 2, 0, 0, 8, 0xff5c5c));
    }
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

  // --- Ereignisse: Investor & Rush Hour -------------------------------------

  private scheduleInvestor(): void {
    const delay = Phaser.Math.Between(BALANCE.investor.appearMinMs, BALANCE.investor.appearMaxMs);
    this.time.delayedCall(delay, () => {
      this.spawnInvestor();
      this.scheduleInvestor();
    });
  }

  private spawnInvestor(): void {
    if (this.investor) return; // nur einer zur Zeit
    const cam = this.cameras.main;
    const y = this.laneY - 46;
    const left = cam.scrollX - 40;
    const right = cam.scrollX + cam.width / cam.zoom + 40;
    // Zufaellige Laufrichtung.
    const fromRight = Math.random() < 0.5;
    const from = fromRight ? right : left;
    const to = fromRight ? left : right;

    const inv = new Investor(
      this,
      () => {
        const deal = this.controller.generateInvestorDeal();
        this.controller.bus.emit('investorDeal', deal);
        this.clearInvestor();
      },
      this.reducedMotion,
    );
    this.investor = inv;
    inv.walkAcross(from, to, y, () => this.clearInvestor());
  }

  private clearInvestor(): void {
    this.investor?.stopAndDestroy();
    this.investor = undefined;
  }

  private scheduleRush(): void {
    const delay = Phaser.Math.Between(BALANCE.rush.everyMinMs, BALANCE.rush.everyMaxMs);
    this.time.delayedCall(delay, () => {
      this.controller.startRush(performance.now());
      this.scheduleRush();
    });
  }

  // --- Betriebsamkeit --------------------------------------------------------

  private computeTuning(): SpawnerTuning {
    const stations = this.controller.currentRestaurant().stations;
    let managers = 0;
    let unlocked = 0;
    stations.forEach((st, i) => {
      if (this.controller.isUnlocked(i)) unlocked++;
      if (st.manager) managers++;
    });
    const rush = this.controller.isRushActive(performance.now());
    const rushSpawn = rush ? 0.35 : 1;
    return {
      spawnIntervalMs: Phaser.Math.Clamp((1100 / (1 + managers * 0.6)) * rushSpawn, 180, 1100),
      serveIntervalMs: Phaser.Math.Clamp(1300 / (1 + managers * 0.7), 220, 1300),
      maxQueue: Phaser.Math.Clamp(3 + unlocked + (rush ? 4 : 0), 3, 14),
    };
  }

  private currentSignature(): string {
    const r = this.controller.currentRestaurant();
    let mask = `${r.id}:${r.level}|`;
    r.stations.forEach((st, i) => {
      mask += (this.controller.isUnlocked(i) ? 'u' : '.') + (st.manager ? 'm' : '.');
      mask += st.owned > 0 ? 'o' : '.';
    });
    return mask;
  }

  // --- Lebenszyklus ----------------------------------------------------------

  private handleResize(gameSize: Phaser.Structs.Size): void {
    this.cameras.resize(gameSize.width, gameSize.height);
    this.scene.restart();
  }

  private cleanup(): void {
    this.unsubs.forEach((off) => off());
    this.unsubs = [];
    this.clearInvestor();
    this.spawner?.destroy();
    this.camControl?.destroy();
    this.scale.off('resize', this.handleResize, this);
  }
}
