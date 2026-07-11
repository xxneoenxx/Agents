import Phaser from 'phaser';
import { BALANCE } from '@data/balance';
import type { StationDef } from '@data/stations';
import type { RestaurantTheme } from '@data/restaurants';
import type { GameController } from '@core/game';
import { Vendor } from '@game/entities/Vendor';
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
  private vendors = new Map<
    string,
    { vendor: Vendor; x: number; y: number; hint: Phaser.GameObjects.Text }
  >();
  private tapZones: Phaser.GameObjects.Zone[] = [];
  private steamPool: Phaser.GameObjects.Ellipse[] = [];

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

    // Bedienpunkt am Eingang (vor dem ersten Stand); die Schlange reicht nach
    // rechts an der Theke entlang. So sind die Kunden ab dem ersten Stand sichtbar.
    const slotSpacing = 46;
    const serviceX = LEFT_MARGIN;
    this.spawner = new CustomerSpawner(
      this,
      {
        spawnX: serviceX + 12 * slotSpacing + 160, // von rechts hereinlaufen
        exitX: serviceX - 140, // nach links hinaus
        serviceX,
        laneY: this.laneY + 14,
        slotSpacing,
      },
      () => this.computeTuning(),
    );

    this.camControl = new CameraController(this, {
      minZoom: 0.5,
      maxZoom: 1.8,
      defaultZoom: 1,
      // Erster Stand VOLL im Bild (dort beginnt das Spiel) + Anfang der Schlange.
      focusX: LEFT_MARGIN + 130,
      focusY: this.laneY,
    });
    this.camControl.setBounds(0, 0, this.worldWidth, height);

    this.rebuildRestaurant();

    // Auf UI-/Zustandsereignisse reagieren.
    this.unsubs.push(this.controller.bus.on('cameraCenter', () => this.camControl.center()));
    this.unsubs.push(this.controller.bus.on('restaurantChanged', () => this.scene.restart()));

    // Kunden werden genau dann bedient, wenn die Wirtschaft auszahlt. Leicht
    // gedrosselt, damit hohe Zyklusraten die Schlange nicht "teleportieren".
    // Der Verkaeufer der auszahlenden Station macht eine Serve-Geste + Dampf.
    let lastServeMs = 0;
    this.unsubs.push(
      this.controller.bus.on('stationPaid', ({ id }) => {
        const entry = this.vendors.get(id);
        if (entry) {
          entry.vendor.serveGesture();
          this.puffSteam(entry.x + 12, entry.y - 46);
        }
        const now = this.time.now;
        if (now - lastServeMs < 150) return;
        lastServeMs = now;
        this.spawner.serveOne();
      }),
    );

    this.events.once('shutdown', () => this.cleanup());
    this.events.once('destroy', () => this.cleanup());
    this.scale.on('resize', this.handleResize, this);

    // Gelegentliche Ereignisse planen.
    this.scheduleInvestor();
    this.scheduleRush();
    this.scheduleCelebrity();
  }

  update(time: number, delta: number): void {
    const sig = this.currentSignature();
    if (sig !== this.layoutSignature) this.rebuildRestaurant();
    this.spawner.update(time, delta);

    // Verkaeufer arbeiten sichtbar, solange ihre Station produziert; der
    // Tipp-Hinweis erscheint an idlen Staenden ohne Manager.
    const stations = this.controller.currentRestaurant().stations;
    for (const st of stations) {
      const entry = this.vendors.get(st.id);
      if (!entry) continue;
      entry.vendor.setWorking(st.active);
      entry.hint.setVisible(st.owned > 0 && !st.manager && !st.active);
    }
  }

  // --- Zeichnen --------------------------------------------------------------

  // Strand-Kulisse: Himmel mit Sonne/Wolken, Meeresband mit Schaumlinien,
  // nasser Sandsaum und sandige Promenade. Die Lokale sind derselbe Dorfstrand
  // zu verschiedenen Tageszeiten (Theme-Farben aus data/restaurants.ts).
  private drawBackdrop(theme: RestaurantTheme): void {
    const { height } = this.scale;
    const w = this.worldWidth;
    const horizon = this.laneY - 30;
    const seaTop = horizon - 78;
    const wetH = 16;

    // Himmel + warmer Horizontdunst.
    this.add.rectangle(w / 2, seaTop / 2, w, seaTop, theme.wall).setDepth(0);
    this.add
      .rectangle(w / 2, seaTop - 20, w, 60, 0xfdebc8)
      .setAlpha(theme.deco === 'gourmet' ? 0.14 : 0.35)
      .setDepth(0);

    // Sonne (mittags hoch und hell, abends tief und blass wie ein Mond) --
    // nahe am Standard-Fokus, damit sie beim Start sichtbar ist.
    const sun =
      theme.deco === 'street' ? 0xffe08a : theme.deco === 'bistro' ? 0xffc46b : 0xf2e6c8;
    const sunY = theme.deco === 'street' ? 96 : theme.deco === 'bistro' ? 120 : 104;
    this.add.circle(LEFT_MARGIN + STALL_SPACING * 2.2, sunY, 34, sun).setAlpha(0.95).setDepth(0);

    // Weiche Wolken, ueber die gesamte Weltbreite verteilt.
    const cloudAlpha = theme.deco === 'gourmet' ? 0.18 : 0.85;
    let ci = 0;
    for (let cx = 120; cx < w; cx += 420) {
      const cy = 90 + ((ci * 37) % 70);
      const s = 0.65 + ((ci * 17) % 40) / 100;
      const c = this.add.container(cx, cy).setDepth(0).setAlpha(cloudAlpha);
      c.add(this.add.ellipse(0, 0, 74 * s, 24 * s, 0xffffff));
      c.add(this.add.ellipse(-24 * s, 6 * s, 46 * s, 18 * s, 0xffffff));
      c.add(this.add.ellipse(24 * s, 6 * s, 50 * s, 18 * s, 0xffffff));
      ci++;
    }

    // Meeresband mit Schaumlinien.
    const seaH = horizon - wetH - seaTop;
    this.add.rectangle(w / 2, seaTop + seaH / 2, w, seaH, theme.sea).setDepth(0);
    for (let i = 0; i < 3; i++) {
      const y = seaTop + 14 + i * (seaH / 3.2);
      for (let x = (i % 2) * 60; x < w; x += 120) {
        this.add
          .rectangle(x + 30, y, 52, 3, 0xbfedf5)
          .setAlpha(0.75)
          .setDepth(0);
      }
    }

    // Nasser Sandsaum + Promenade.
    this.add
      .rectangle(w / 2, horizon - wetH / 2, w, wetH, 0xd9bc85)
      .setDepth(0);
    this.add
      .rectangle(w / 2, (horizon + height) / 2, w, height - horizon, theme.floor)
      .setDepth(0);
    // Dezente Sand-Tupfen statt Fliesen.
    for (let x = 24; x < w; x += 72) {
      const y = horizon + 24 + ((x * 7) % 60);
      this.add.ellipse(x, y, 14, 5, 0x000000, 0.05).setDepth(0);
    }

    // Promenaden-Theke aus Holz.
    this.add
      .rectangle(w / 2, this.laneY - 16, w, 26, theme.counter)
      .setStrokeStyle(3, 0x6e4a2e)
      .setDepth(1);

    this.drawThemeDeco(theme);
  }

  // Themenspezifische Deko: Lichterkette oben + Boden-Deko je Stil.
  private drawThemeDeco(theme: RestaurantTheme): void {
    const w = this.worldWidth;

    // Lichterkette entlang der Promenade.
    const lightY = 26;
    this.add.rectangle(w / 2, lightY - 6, w, 2, 0x000000, 0.25).setDepth(0);
    let bulb = 0;
    for (let x = 40; x < w; x += 56) {
      const color = bulb % 2 === 0 ? theme.accent : 0xfff2c2;
      this.add.circle(x, lightY, 5, color).setDepth(0).setStrokeStyle(1.5, 0x3a2a1f, 0.3);
      bulb++;
    }

    // Boden-Deko je Stil.
    for (let x = 60; x < w; x += 210) {
      if (theme.deco === 'street') this.drawPalm(x, this.laneY + 46);
      else if (theme.deco === 'bistro') this.drawParasol(x, this.laneY + 42, theme.accent);
      else this.drawCandelabra(x, this.laneY + 42, theme.accent);
    }
  }

  // Strandpalme: gebogener Stamm aus versetzten Segmenten + Wedel-Ellipsen.
  private drawPalm(x: number, y: number): void {
    const p = this.add.container(x, y).setDepth(2);
    p.add(this.add.ellipse(4, 4, 34, 9, 0x000000, 0.12));
    // Stamm (leicht gebogen, ueberlappende Segmente ohne Luecken).
    for (let i = 0; i < 4; i++) {
      p.add(this.add.rectangle(i * 3, -6 - i * 13, 10 - i, 18, 0xa9754b));
    }
    p.add(this.add.rectangle(0, 0, 12, 6, 0x8a5a2b)); // Stammfuss
    // Wedel um die Krone.
    const crownX = 10;
    const crownY = -56;
    const fronds: [number, number, number][] = [
      [-22, -6, -0.5],
      [22, -6, 0.5],
      [-16, -16, -1.0],
      [16, -16, 1.0],
      [0, -20, 0],
    ];
    for (const [dx, dy, rot] of fronds) {
      p.add(
        this.add
          .ellipse(crownX + dx, crownY + dy, 34, 11, 0x3e9b5f)
          .setRotation(rot)
          .setStrokeStyle(1.5, 0x2c7343),
      );
    }
    // Kokosnuesse.
    p.add(this.add.circle(crownX - 4, crownY + 2, 3.5, 0x6e4a2e));
    p.add(this.add.circle(crownX + 5, crownY + 4, 3.5, 0x8a5a2b));
  }

  // Bistro-Tisch mit Sonnenschirm.
  private drawParasol(x: number, y: number, accent: number): void {
    const p = this.add.container(x, y).setDepth(2);
    p.add(this.add.ellipse(0, 12, 30, 8, 0x000000, 0.12));
    p.add(this.add.rectangle(0, 2, 18, 14, 0xfffdf7).setStrokeStyle(2, 0x3a2a1f)); // Tisch
    p.add(this.add.rectangle(0, -14, 3, 20, 0x8a5a2b)); // Stange
    p.add(this.add.triangle(0, -20, -20, 0, 20, 0, 0, -14, accent).setStrokeStyle(2, 0x3a2a1f)); // Schirm
  }

  // Goldener Kandelaber (Gourmet-Tempel).
  private drawCandelabra(x: number, y: number, accent: number): void {
    const p = this.add.container(x, y).setDepth(2);
    p.add(this.add.ellipse(0, 12, 24, 7, 0x000000, 0.15));
    p.add(this.add.rectangle(0, 0, 5, 26, accent).setStrokeStyle(2, 0x3a2a1f)); // Staender
    p.add(this.add.rectangle(0, -14, 22, 4, accent).setStrokeStyle(2, 0x3a2a1f)); // Arm
    for (const dx of [-9, 0, 9]) {
      p.add(this.add.rectangle(dx, -18, 3, 6, 0xfffdf7)); // Kerze
      p.add(this.add.circle(dx, -22, 3, 0xffa53d)); // Flamme
    }
  }

  private stallX(index: number): number {
    return LEFT_MARGIN + index * STALL_SPACING;
  }

  private rebuildRestaurant(): void {
    this.vendors.clear(); // Kinder werden mit removeAll(true) zerstoert
    this.tapZones.forEach((z) => z.destroy());
    this.tapZones = [];
    this.restaurantLayer.removeAll(true);
    const stations = this.controller.currentRestaurant().stations;

    this.defs.forEach((def, i) => {
      if (!this.controller.isUnlocked(i)) return;
      const st = stations[i];
      this.drawStall(this.stallX(i), def.id, def.emoji, def.name, st.owned > 0);
    });

    this.layoutSignature = this.currentSignature();
  }

  // Stand in Ebenen: Rueckwand (Regal/Dach/Schild) -> Verkaeufer -> Theke ->
  // Emoji/Name. So steht der Verkaeufer sichtbar HINTER der Theke. Die ganze
  // Huette ist ANTIPPBAR und startet einen Produktionszyklus (Servieren).
  private drawStall(
    x: number,
    stationId: string,
    emoji: string,
    name: string,
    owned: boolean,
  ): void {
    const baseY = this.laneY - 6;
    const stall = this.add.container(x, baseY);

    stall.add(this.add.image(0, 4, 'stall-back').setOrigin(0.5, 1).setDisplaySize(120, 104));

    // Verkaeufer hinter der Theke + Tipp-Hinweis (nur bei eroeffnetem Stand).
    if (owned) {
      const vendor = new Vendor(this, 18, 0, this.reducedMotion);
      stall.add(vendor);

      // Huepfender Hinweis, solange die Station idle ist (kein Manager, kein Zyklus).
      const hint = this.add
        .text(x, baseY - 116, '👆 Tippen!', {
          fontFamily: 'Nunito, Arial, sans-serif',
          fontSize: '15px',
          fontStyle: '900',
          color: '#3A2A1F',
          backgroundColor: '#FFFDF7',
          padding: { x: 8, y: 4 },
        })
        .setOrigin(0.5)
        .setDepth(9)
        .setVisible(false);
      if (!this.reducedMotion) {
        this.tweens.add({
          targets: hint,
          y: baseY - 124,
          duration: 420,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      }
      this.vendors.set(stationId, { vendor, x: x + 18, y: baseY, hint });

      // Antippen der Huette = servieren. WICHTIG: als Zone direkt auf Szenen-
      // Ebene, denn interaktive Container IN Containern empfangen in Phaser
      // keine Input-Events (bekannte Einschraenkung).
      const zone = this.add.zone(x, baseY - 48, 124, 108).setOrigin(0.5).setInteractive();
      zone.on('pointerdown', () => {
        this.controller.tapStation(stationId);
      });
      this.tapZones.push(zone);
    }

    stall.add(this.add.image(0, 4, 'stall-counter').setOrigin(0.5, 1).setDisplaySize(120, 104));

    // Gericht-Emoji auf dem Haengeschild.
    stall.add(this.add.text(0, -56, emoji, { fontSize: '26px' }).setOrigin(0.5));
    // Name auf der Theke.
    stall.add(
      this.add
        .text(0, -14, name, {
          fontFamily: 'Nunito, Arial, sans-serif',
          fontSize: '12px',
          fontStyle: '800',
          color: '#3A2A1F',
        })
        .setOrigin(0.5),
    );
    if (!owned) stall.setAlpha(0.55);
    this.restaurantLayer.add(stall);
    // Hinweis zuletzt anfuegen, damit er ueber der Huette liegt.
    const entry = this.vendors.get(stationId);
    if (entry) this.restaurantLayer.add(entry.hint);
  }

  // --- Dampf-Puffs (gepoolt) --------------------------------------------------

  private puffSteam(x: number, y: number): void {
    if (this.reducedMotion) return;
    let puff = this.steamPool.find((p) => !p.visible);
    if (!puff && this.steamPool.length < 12) {
      puff = this.add.ellipse(0, 0, 12, 10, 0xffffff, 0.85).setDepth(6);
      this.steamPool.push(puff);
    }
    if (!puff) return;
    puff.setPosition(x, y).setVisible(true).setAlpha(0.85).setScale(0.7);
    this.tweens.add({
      targets: puff,
      y: y - 26,
      alpha: 0,
      scale: 1.4,
      duration: 700,
      ease: 'Cubic.easeOut',
      onComplete: () => puff.setVisible(false),
    });
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

  private scheduleCelebrity(): void {
    const delay = Phaser.Math.Between(
      BALANCE.celebrity.everyMinMs,
      BALANCE.celebrity.everyMaxMs,
    );
    this.time.delayedCall(delay, () => {
      this.spawnCelebrityFigure();
      this.controller.startCelebrity(performance.now());
      this.scheduleCelebrity();
    });
  }

  // Sichtbare Promi-Figur (VIP-Kunde mit Stern), die durch die Szene laeuft.
  private spawnCelebrityFigure(): void {
    const cam = this.cameras.main;
    const y = this.laneY + 14;
    const left = cam.scrollX - 40;
    const right = cam.scrollX + cam.width / cam.zoom + 40;
    const fromRight = Math.random() < 0.5;
    const from = fromRight ? right : left;
    const to = fromRight ? left : right;

    const c = this.add.container(from, y).setDepth(9);
    const img = this.add
      .image(0, 0, 'customer1')
      .setOrigin(0.5, 1)
      .setDisplaySize(44, 60)
      .setTint(0xffe08a)
      .setFlipX(to < from);
    const star = this.add.text(0, -70, '⭐', { fontSize: '22px' }).setOrigin(0.5);
    const label = this.add
      .text(0, -84, 'VIP', {
        fontFamily: 'Nunito, Arial, sans-serif',
        fontSize: '12px',
        fontStyle: '900',
        color: '#7C5CFF',
      })
      .setOrigin(0.5);
    c.add([img, star, label]);

    if (!this.reducedMotion) {
      this.tweens.add({
        targets: star,
        scale: 1.3,
        duration: 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    const dist = Math.abs(to - from);
    this.tweens.add({
      targets: c,
      x: to,
      duration: Math.max(5000, dist / 0.06),
      ease: 'Linear',
      onComplete: () => c.destroy(),
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
