// Leben, Hunger und Tageszeit (ohne DOM).

import { DAY_LENGTH_SECONDS } from './config.js';

export class Survival {
  constructor() {
    this.health = 20;
    this.hunger = 20;
    this.saturation = 5;
    this.exhaustion = 0;
    this.regenTimer = 0;
    this.starveTimer = 0;
  }

  addExhaustion(n) {
    this.exhaustion += n;
  }

  // Gibt Schaden durch Hunger zurück (0, wenn keiner).
  update(dt) {
    this.addExhaustion(dt * 0.012);
    while (this.exhaustion >= 4) {
      this.exhaustion -= 4;
      if (this.saturation > 0) this.saturation = Math.max(0, this.saturation - 1);
      else this.hunger = Math.max(0, this.hunger - 1);
    }
    let starve = 0;
    if (this.hunger >= 18 && this.health < 20) {
      this.regenTimer += dt;
      if (this.regenTimer >= 4) {
        this.regenTimer = 0;
        this.health = Math.min(20, this.health + 1);
        this.addExhaustion(6);
      }
    } else this.regenTimer = 0;
    if (this.hunger <= 0) {
      this.starveTimer += dt;
      if (this.starveTimer >= 4) {
        this.starveTimer = 0;
        if (this.health > 1) starve = 1;
      }
    } else this.starveTimer = 0;
    return starve;
  }

  canEat() {
    return this.hunger < 20;
  }

  eat(food) {
    this.hunger = Math.min(20, this.hunger + food.hunger);
    this.saturation = Math.min(this.hunger, this.saturation + food.saturation);
  }

  // Gibt true zurück, wenn der Spieler gestorben ist.
  damage(n) {
    this.health = Math.max(0, this.health - n);
    this.addExhaustion(0.1);
    return this.health <= 0;
  }

  reset() {
    Object.assign(this, new Survival());
  }

  toJSON() {
    return { health: this.health, hunger: this.hunger, saturation: this.saturation };
  }

  static fromJSON(d) {
    const s = new Survival();
    if (d) {
      s.health = d.health ?? 20;
      s.hunger = d.hunger ?? 20;
      s.saturation = d.saturation ?? 5;
    }
    return s;
  }
}

// Tageszeit in Minecraft-Ticks: 0 = Sonnenaufgang (6 Uhr), 6000 = Mittag, 18000 = Mitternacht.
export class DayCycle {
  constructor(time = 1000) {
    this.time = time;
  }

  update(dt) {
    this.time = (this.time + (dt * 24000) / DAY_LENGTH_SECONDS) % 24000;
  }

  isNight() {
    return this.time >= 12900 && this.time < 23100;
  }

  // Helligkeit 0.22 (Nacht) bis 1 (Tag) mit Dämmerung.
  brightness() {
    const t = this.time;
    const night = 0.22;
    if (t < 11800) return 1;
    if (t < 13200) return 1 - ((t - 11800) / 1400) * (1 - night);
    if (t < 22600) return night;
    return night + ((t - 22600) / 1400) * (1 - night);
  }

  clock() {
    const hours = (this.time / 1000 + 6) % 24;
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  skipNight() {
    this.time = 0;
  }
}
