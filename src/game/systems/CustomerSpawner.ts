import Phaser from 'phaser';
import { Customer, CUSTOMER_TINTS } from '@game/entities/Customer';

// Kunden-System: Spawn -> Warteschlange -> Bedienung -> Abgang, mit Objekt-
// Pooling (Kunden + Muenzen) fuer 60 fps. Rein visuell und von der Wirtschaft
// entkoppelt; die "Betriebsamkeit" (Spawn-/Bedientempo, Schlangenlaenge) wird
// von aussen geliefert und skaliert mit dem Spielfortschritt.

export interface SpawnerLayout {
  /** Startpunkt (rechts ausserhalb des Bildes). */
  spawnX: number;
  /** Ausgang (links ausserhalb des Bildes). */
  exitX: number;
  /** X des vordersten Warteplatzes (Bedienpunkt). */
  serviceX: number;
  /** Y der Laufspur/Warteschlange. */
  laneY: number;
  /** Abstand zwischen Warteplaetzen. */
  slotSpacing: number;
}

export interface SpawnerTuning {
  spawnIntervalMs: number;
  serveIntervalMs: number;
  maxQueue: number;
}

interface QueueEntry {
  c: Customer;
  arrived: boolean;
}

const MAX_ON_SCREEN = 22;
const MAX_COINS = 24;

export class CustomerSpawner {
  private customerPool: Customer[] = [];
  private coinPool: Phaser.GameObjects.Container[] = [];
  private queue: QueueEntry[] = [];
  private spawnAcc = 0;
  private serveAcc = 0;

  constructor(
    private scene: Phaser.Scene,
    private layout: SpawnerLayout,
    private getTuning: () => SpawnerTuning,
  ) {}

  update(_time: number, delta: number): void {
    const tuning = this.getTuning();
    this.spawnAcc += delta;
    this.serveAcc += delta;

    if (this.spawnAcc >= tuning.spawnIntervalMs) {
      this.spawnAcc = 0;
      this.trySpawn(tuning.maxQueue);
    }
    if (this.serveAcc >= tuning.serveIntervalMs) {
      this.serveAcc = 0;
      this.tryServe();
    }
  }

  private slotX(index: number): number {
    return this.layout.serviceX + index * this.layout.slotSpacing;
  }

  private activeCount(): number {
    let n = 0;
    for (const c of this.customerPool) if (c.inUse) n++;
    return n;
  }

  private obtainCustomer(): Customer | undefined {
    let c = this.customerPool.find((x) => !x.inUse);
    if (!c && this.customerPool.length < MAX_ON_SCREEN) {
      c = new Customer(this.scene);
      this.customerPool.push(c);
    }
    return c;
  }

  private trySpawn(maxQueue: number): void {
    if (this.queue.length >= maxQueue) return;
    if (this.activeCount() >= MAX_ON_SCREEN) return;
    const c = this.obtainCustomer();
    if (!c) return;

    const tint = CUSTOMER_TINTS[Phaser.Math.Between(0, CUSTOMER_TINTS.length - 1)];
    c.spawn(this.layout.spawnX, this.layout.laneY, tint);

    const entry: QueueEntry = { c, arrived: false };
    const slot = this.queue.length;
    this.queue.push(entry);
    c.walkTo(this.slotX(slot), this.layout.laneY, () => {
      entry.arrived = true;
      c.setWaiting();
    });
  }

  private tryServe(): void {
    const front = this.queue[0];
    if (!front || !front.arrived) return;

    this.queue.shift();
    // Bedienter Kunde verlaesst das Lokal nach links.
    front.c.walkTo(this.layout.exitX, this.layout.laneY, () => this.recycleCustomer(front.c));
    this.spawnCoin(front.c.x, this.layout.laneY - 34);

    // Uebrige ruecken einen Platz vor.
    this.queue.forEach((entry, i) => {
      entry.arrived = false;
      entry.c.walkTo(this.slotX(i), this.layout.laneY, () => {
        entry.arrived = true;
        entry.c.setWaiting();
      });
    });
  }

  private recycleCustomer(c: Customer): void {
    c.recycle();
  }

  // --- Muenzen (Juice) ------------------------------------------------------

  private obtainCoin(): Phaser.GameObjects.Container | undefined {
    let coin = this.coinPool.find((x) => !x.visible);
    if (!coin && this.coinPool.length < MAX_COINS) {
      coin = this.createCoin();
      this.coinPool.push(coin);
    }
    return coin;
  }

  private createCoin(): Phaser.GameObjects.Container {
    const coin = this.scene.add.container(0, 0);
    const disc = this.scene.add.circle(0, 0, 8, 0xffc72c).setStrokeStyle(2, 0xe0a800);
    const shine = this.scene.add.circle(-2, -2, 2.5, 0xffffff, 0.9);
    coin.add([disc, shine]);
    coin.setDepth(20).setVisible(false);
    return coin;
  }

  private spawnCoin(x: number, y: number): void {
    const coin = this.obtainCoin();
    if (!coin) return;
    coin.setPosition(x, y).setVisible(true).setAlpha(1).setScale(1);
    this.scene.tweens.add({
      targets: coin,
      y: y - 70,
      alpha: 0,
      scale: 1.3,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => coin.setVisible(false),
    });
  }

  /** Alle Objekte zerstoeren (Szenen-Shutdown). */
  destroy(): void {
    this.scene.tweens.killTweensOf(this.coinPool);
    this.customerPool.forEach((c) => c.destroy());
    this.coinPool.forEach((c) => c.destroy());
    this.customerPool = [];
    this.coinPool = [];
    this.queue = [];
  }
}
