// Tiere und Monster: Kühe, Schweine, Schafe, Zombies, Skelette, Creeper.

import * as THREE from 'three';
import { makeCanvas, noise, px, rgb, paintBox } from './textures.js';
import { buildHumanoid, animateHumanoid, skinTexture } from './character.js';
import { mulberry32 } from './util.js';

const M = 1 / 16; // Modell-Pixel in Metern
const FACE_SHADE = [0.8, 0.8, 1, 0.55, 0.9, 0.7];

export const MOB_TYPES = {
  cow: { name: 'Kuh', hostile: false, hp: 10, speed: 1.0, w: 0.9, h: 1.4, drops: [['raw_beef', 1, 3], ['leather', 0, 2]] },
  pig: { name: 'Schwein', hostile: false, hp: 10, speed: 1.0, w: 0.9, h: 0.9, drops: [['raw_porkchop', 1, 3]] },
  sheep: { name: 'Schaf', hostile: false, hp: 8, speed: 1.0, w: 0.9, h: 1.3, drops: [['white_wool', 1, 1], ['raw_mutton', 1, 2]] },
  zombie: { name: 'Zombie', hostile: true, hp: 20, speed: 1.7, w: 0.6, h: 1.95, damage: 3, burns: true, drops: [['rotten_flesh', 0, 2]] },
  skeleton: { name: 'Skelett', hostile: true, hp: 20, speed: 1.6, w: 0.6, h: 1.95, damage: 3, ranged: true, burns: true, drops: [['bone', 0, 2], ['arrow', 0, 2]] },
  creeper: { name: 'Creeper', hostile: true, hp: 20, speed: 1.5, w: 0.6, h: 1.7, explode: true, drops: [['gunpowder', 0, 2]] },
};

// --- Texturen ---------------------------------------------------------------

function face(ctx, skin, eyes, extra) {
  noise(ctx, 0, 0, 16, 16, skin, 0.1, mulberry32(3));
  for (const [x, y, c] of eyes) {
    ctx.fillStyle = c;
    ctx.fillRect(x, y, 2, 2);
  }
  if (extra) extra(ctx);
}

const TEX = {
  cow_hide(ctx) {
    const rnd = mulberry32(11);
    noise(ctx, 0, 0, 16, 16, [70, 50, 35], 0.2, rnd);
    for (let i = 0; i < 4; i++) {
      const cx = rnd() * 16;
      const cy = rnd() * 16;
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (Math.hypot(x - cx, y - cy) < 2.5 + rnd()) px(ctx, x, y, rgb([235, 235, 235], 0.9 + rnd() * 0.1));
    }
  },
  cow_face: (ctx) =>
    face(ctx, [70, 50, 35], [[3, 4, '#fff'], [11, 4, '#fff'], [4, 4, '#111'], [11, 4, '#111']], (c) => {
      c.fillStyle = rgb([200, 170, 150]);
      c.fillRect(4, 10, 8, 5);
      c.fillStyle = '#333';
      c.fillRect(5, 11, 1, 2);
      c.fillRect(10, 11, 1, 2);
    }),
  pig_skin: (ctx) => noise(ctx, 0, 0, 16, 16, [240, 165, 165], 0.1, mulberry32(12)),
  pig_face: (ctx) =>
    face(ctx, [240, 165, 165], [[3, 5, '#fff'], [11, 5, '#fff'], [3, 5, '#111'], [12, 5, '#111']], (c) => {
      c.fillStyle = rgb([250, 190, 190]);
      c.fillRect(5, 9, 6, 4);
      c.fillStyle = rgb([150, 80, 80]);
      c.fillRect(6, 10, 1, 2);
      c.fillRect(9, 10, 1, 2);
    }),
  sheep_wool: (ctx) => noise(ctx, 0, 0, 16, 16, [235, 235, 230], 0.12, mulberry32(13)),
  sheep_face: (ctx) => face(ctx, [200, 180, 160], [[3, 6, '#fff'], [11, 6, '#fff'], [4, 6, '#111'], [11, 6, '#111']]),
  sheep_leg: (ctx) => noise(ctx, 0, 0, 16, 16, [200, 180, 160], 0.1, mulberry32(14)),
  creeper_skin(ctx) {
    const rnd = mulberry32(15);
    const tones = [[90, 180, 70], [60, 140, 50], [120, 200, 100], [40, 100, 40], [180, 220, 170]];
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) px(ctx, x, y, rgb(tones[Math.floor(rnd() * (rnd() < 0.1 ? 5 : 4))]));
  },
  creeper_face(ctx) {
    TEX.creeper_skin(ctx);
    ctx.fillStyle = '#111';
    ctx.fillRect(2, 4, 4, 4);
    ctx.fillRect(10, 4, 4, 4);
    ctx.fillRect(6, 8, 4, 4);
    ctx.fillRect(4, 10, 2, 5);
    ctx.fillRect(10, 10, 2, 5);
  },
};

function zombieSkin() {
  const [c, ctx] = makeCanvas(64, 64);
  const rnd = mulberry32(21);
  const skin = [90, 140, 75];
  paintBox(ctx, 'head', (f, x, y, w, h) => {
    noise(ctx, x, y, w, h, skin, 0.15, rnd);
    if (f === 'front') {
      ctx.fillStyle = '#111';
      ctx.fillRect(x + 1, y + 4, 2, 1);
      ctx.fillRect(x + 5, y + 4, 2, 1);
      ctx.fillStyle = rgb([60, 90, 50]);
      ctx.fillRect(x + 2, y + 6, 4, 1);
    }
    if (f === 'top' || f === 'back') noise(ctx, x, y, w, Math.min(h, 3), [50, 70, 40], 0.2, rnd);
  });
  paintBox(ctx, 'body', (f, x, y, w, h) => noise(ctx, x, y, w, h, [40, 150, 160], 0.2, rnd));
  for (const a of ['rightArm', 'leftArm']) {
    paintBox(ctx, a, (f, x, y, w, h) => {
      noise(ctx, x, y, w, h, skin, 0.15, rnd);
      if (f !== 'bottom' && f !== 'top') noise(ctx, x, y, w, 4, [40, 150, 160], 0.2, rnd);
    });
  }
  for (const l of ['rightLeg', 'leftLeg']) paintBox(ctx, l, (f, x, y, w, h) => noise(ctx, x, y, w, h, [60, 60, 140], 0.2, rnd));
  return c;
}

function skeletonSkin() {
  const [c, ctx] = makeCanvas(64, 64);
  const rnd = mulberry32(22);
  const bone = [200, 200, 195];
  for (const p of ['head', 'body', 'rightArm', 'leftArm', 'rightLeg', 'leftLeg']) {
    paintBox(ctx, p, (f, x, y, w, h) => {
      noise(ctx, x, y, w, h, bone, 0.12, rnd);
      if (p === 'body' && (f === 'front' || f === 'back')) for (let i = 1; i < h; i += 2) noise(ctx, x, y + i, w, 1, [60, 60, 60], 0.1, rnd);
      if (p === 'head' && f === 'front') {
        ctx.fillStyle = '#222';
        ctx.fillRect(x + 1, y + 3, 2, 2);
        ctx.fillRect(x + 5, y + 3, 2, 2);
        ctx.fillRect(x + 3, y + 5, 2, 1);
        ctx.fillRect(x + 1, y + 6, 6, 1);
      }
    });
  }
  return c;
}

// --- Modelle --------------------------------------------------------------

function quadruped(mats, faceMats, legMats, spec) {
  const group = new THREE.Group();
  const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w * M, h * M, d * M), m);
  const body = box(spec.body[0], spec.body[1], spec.body[2], mats);
  body.position.set(0, (spec.legH + spec.body[1] / 2) * M, 0);
  group.add(body);
  const headPivot = new THREE.Group();
  headPivot.position.set(0, spec.headY * M, (spec.body[2] / 2) * M);
  const head = box(spec.head[0], spec.head[1], spec.head[2], faceMats);
  head.position.set(0, 0, (spec.head[2] / 2 - 1) * M);
  headPivot.add(head);
  group.add(headPivot);
  const legs = [];
  const lx = spec.body[0] / 2 - 2;
  const lz = spec.body[2] / 2 - 3;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * lx * M, spec.legH * M, sz * lz * M);
    const leg = box(4, spec.legH, 4, legMats);
    leg.position.set(0, (-spec.legH / 2) * M, 0);
    pivot.add(leg);
    group.add(pivot);
    legs.push(pivot);
  }
  return { group, legs, head: headPivot };
}

function creeperModel(mats, faceMats) {
  const group = new THREE.Group();
  const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w * M, h * M, d * M), m);
  const body = box(8, 12, 4, mats);
  body.position.set(0, 12 * M, 0);
  const head = box(8, 8, 8, faceMats);
  head.position.set(0, 22 * M, 0);
  group.add(body, head);
  const legs = [];
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const pivot = new THREE.Group();
    pivot.position.set(sx * 2 * M, 6 * M, sz * 4 * M);
    const leg = box(4, 6, 4, mats);
    leg.position.set(0, -3 * M, 0);
    pivot.add(leg);
    group.add(pivot);
    legs.push(pivot);
  }
  return { group, legs };
}

// --- Verwaltung -----------------------------------------------------------

export class Mobs {
  constructor(overlay, world, game) {
    this.overlay = overlay;
    this.world = world;
    this.game = game;
    this.list = [];
    this.arrows = [];
    this.spawnTimer = 0;
    this.skinTex = {};
  }

  tex(texName) {
    return this.overlay.texture(`mob_${texName}`, () => {
      const [c, ctx] = makeCanvas();
      TEX[texName](ctx);
      return c;
    });
  }

  mats(texName) {
    const tex = this.tex(texName);
    return FACE_SHADE.map((s) => this.overlay.shaded({ map: tex }, s));
  }

  // Wie mats(), aber mit Gesicht auf der Vorderseite (+z).
  faceMats(skinName, faceName) {
    const m = this.mats(skinName);
    const i = m.length - 2;
    this.overlay.materials = this.overlay.materials.filter((x) => x !== m[i]);
    m[i] = this.overlay.shaded({ map: this.tex(faceName) }, FACE_SHADE[i]);
    return m;
  }

  build(type) {
    const all = [];
    const track = (arr) => {
      all.push(...arr);
      return arr;
    };
    let model;
    if (type === 'cow') {
      model = quadruped(track(this.mats('cow_hide')), track(this.faceMats('cow_hide', 'cow_face')), track(this.mats('cow_hide')), { body: [12, 10, 18], head: [8, 8, 6], headY: 20, legH: 12 });
    } else if (type === 'pig') {
      model = quadruped(track(this.mats('pig_skin')), track(this.faceMats('pig_skin', 'pig_face')), track(this.mats('pig_skin')), { body: [10, 8, 16], head: [8, 8, 8], headY: 12, legH: 6 });
    } else if (type === 'sheep') {
      model = quadruped(track(this.mats('sheep_wool')), track(this.faceMats('sheep_leg', 'sheep_face')), track(this.mats('sheep_leg')), { body: [12, 10, 16], head: [6, 6, 8], headY: 20, legH: 12 });
    } else if (type === 'creeper') {
      model = creeperModel(track(this.mats('creeper_skin')), track(this.faceMats('creeper_skin', 'creeper_face')));
    } else {
      if (!this.skinTex[type]) this.skinTex[type] = skinTexture(type === 'zombie' ? zombieSkin() : skeletonSkin());
      const mats = track(FACE_SHADE.map((s) => this.overlay.shaded({ map: this.skinTex[type], alphaTest: 0.5 }, s)));
      const h = buildHumanoid(mats, { limbW: type === 'skeleton' ? 2 : 4 });
      model = { group: h.group, parts: h.parts };
    }
    return { model, mats: all };
  }

  spawn(type, x, z) {
    const def = MOB_TYPES[type];
    const { model, mats } = this.build(type);
    const y = this.world.columnHeight(Math.floor(x), Math.floor(z));
    const mob = {
      type,
      def,
      model,
      mats,
      x,
      y,
      z,
      heading: Math.random() * 360,
      hp: def.hp,
      vx: 0,
      vz: 0,
      walk: 0,
      phase: 0,
      timer: 0,
      moving: false,
      attackCd: 1,
      hurt: 0,
      fuse: 0,
      dying: 0,
      daylight: 5 + Math.random() * 15,
    };
    this.overlay.scene.add(model.group);
    this.list.push(mob);
    this.place(mob);
    return mob;
  }

  remove(mob) {
    this.overlay.scene.remove(mob.model.group);
    const set = new Set(mob.mats);
    this.overlay.materials = this.overlay.materials.filter((m) => !set.has(m));
    this.list = this.list.filter((m) => m !== mob);
  }

  clear() {
    for (const m of [...this.list]) this.remove(m);
    for (const a of this.arrows) this.overlay.scene.remove(a.mesh);
    this.arrows = [];
  }

  place(mob) {
    mob.model.group.position.set(mob.x, mob.y, mob.z);
    mob.model.group.rotation.y = Math.PI - (mob.heading * Math.PI) / 180;
    if (mob.dying > 0) mob.model.group.rotation.z = Math.min(1, mob.dying * 2.5) * (Math.PI / 2);
  }

  // Strahl gegen die Hitboxen der Mobs.
  raycast(o, d, maxDist) {
    let best = null;
    for (const mob of this.list) {
      if (mob.dying) continue;
      const hw = mob.def.w / 2;
      const min = [mob.x - hw, mob.y, mob.z - hw];
      const max = [mob.x + hw, mob.y + mob.def.h, mob.z + hw];
      const oo = [o.x, o.y, o.z];
      const dd = [d.x, d.y, d.z];
      let t0 = 0;
      let t1 = maxDist;
      let ok = true;
      for (let i = 0; i < 3 && ok; i++) {
        if (Math.abs(dd[i]) < 1e-9) {
          if (oo[i] < min[i] || oo[i] > max[i]) ok = false;
        } else {
          let a = (min[i] - oo[i]) / dd[i];
          let b = (max[i] - oo[i]) / dd[i];
          if (a > b) [a, b] = [b, a];
          t0 = Math.max(t0, a);
          t1 = Math.min(t1, b);
          if (t0 > t1) ok = false;
        }
      }
      if (ok && (!best || t0 < best.dist)) best = { type: 'mob', mob, dist: t0 };
    }
    return best;
  }

  hit(mob, dmg, fromX, fromZ) {
    if (mob.dying || mob.hurt > 0.25) return false;
    mob.hp -= dmg;
    mob.hurt = 0.5;
    const dx = mob.x - fromX;
    const dz = mob.z - fromZ;
    const len = Math.hypot(dx, dz) || 1;
    mob.vx = (dx / len) * 6;
    mob.vz = (dz / len) * 6;
    mob.flee = mob.def.hostile ? 0 : 4;
    if (mob.hp <= 0) mob.dying = 0.001;
    return true;
  }

  dropLoot(mob) {
    for (const [id, min, max] of mob.def.drops) {
      const n = min + Math.floor(Math.random() * (max - min + 1));
      if (n > 0) this.overlay.spawnDrop(id, n, mob.x, mob.y + 0.5, mob.z);
    }
  }

  trySpawn(ctx) {
    const passive = this.list.filter((m) => !m.def.hostile).length;
    const hostile = this.list.length - passive;
    const a = Math.random() * Math.PI * 2;
    const dist = 10 + Math.random() * 18;
    const x = ctx.player.x + Math.cos(a) * dist;
    const z = ctx.player.z + Math.sin(a) * dist;
    if (ctx.night && hostile < 6 && !ctx.peaceful) {
      const r = Math.random();
      this.spawn(r < 0.45 ? 'zombie' : r < 0.75 ? 'skeleton' : 'creeper', x, z);
    } else if (!ctx.night && passive < 5) {
      const biome = this.world.biomeAt(Math.floor(x), Math.floor(z));
      if (biome === 'town' && Math.random() < 0.7) return;
      const r = Math.random();
      this.spawn(r < 0.4 ? 'cow' : r < 0.7 ? 'pig' : 'sheep', x, z);
    }
  }

  update(dt, ctx) {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = ctx.night ? 4 : 8;
      this.trySpawn(ctx);
    }
    for (const mob of [...this.list]) this.updateMob(mob, dt, ctx);
    this.updateArrows(dt, ctx);
  }

  updateMob(mob, dt, ctx) {
    const def = mob.def;
    if (mob.dying > 0) {
      mob.dying += dt;
      this.place(mob);
      if (mob.dying > 0.6) {
        this.overlay.spawnPuff(mob.x, mob.y, mob.z);
        this.dropLoot(mob);
        this.remove(mob);
      }
      return;
    }
    const dx = ctx.player.x - mob.x;
    const dz = ctx.player.z - mob.z;
    const dist = Math.hypot(dx, dz);
    if (dist > 72) return this.remove(mob);

    // Untote verbrennen bei Tag.
    if (def.burns && !ctx.night) {
      mob.daylight -= dt;
      if (mob.daylight <= 0) {
        this.overlay.spawnPuff(mob.x, mob.y, mob.z, 0xff8a20);
        return this.remove(mob);
      }
    }

    mob.attackCd -= dt;
    mob.timer -= dt;
    if (mob.flee > 0) mob.flee -= dt;
    let speed = 0;
    const chase = def.hostile && !ctx.peaceful && dist < 18;
    if (chase) {
      mob.heading = ((Math.atan2(dx, -dz) * 180) / Math.PI + 360) % 360;
      speed = def.speed;
      if (def.ranged) {
        if (dist < 7) {
          mob.heading = (mob.heading + 180) % 360;
          speed = def.speed * 0.8;
        } else if (dist < 14) speed = 0;
        if (dist < 16 && mob.attackCd <= 0) {
          mob.attackCd = 2.5;
          this.shoot(mob, ctx.player);
        }
      } else if (def.explode) {
        if (dist < 2.8) {
          speed = 0;
          mob.fuse += dt;
          if (mob.fuse >= 1.5) {
            this.game.explode(mob.x, mob.y + 0.8, mob.z, 3);
            this.remove(mob);
            return;
          }
        } else mob.fuse = Math.max(0, mob.fuse - dt);
      } else if (dist < 1.5) {
        speed = 0;
        if (mob.attackCd <= 0) {
          mob.attackCd = 1;
          this.game.damagePlayer(def.damage, mob.x, mob.z, def.name);
        }
      }
    } else if (mob.flee > 0) {
      mob.heading = ((Math.atan2(-dx, dz) * 180) / Math.PI + 360) % 360;
      speed = def.speed * 1.8;
    } else {
      if (mob.timer <= 0) {
        mob.timer = 2 + Math.random() * 5;
        mob.moving = Math.random() < 0.55;
        mob.heading = Math.random() * 360;
      }
      speed = mob.moving ? def.speed * 0.6 : 0;
    }

    // Bewegung mit einfacher Kollision (eine Stufe hoch geht).
    const h = (mob.heading * Math.PI) / 180;
    const mx = Math.sin(h) * speed * dt + mob.vx * dt;
    const mz = -Math.cos(h) * speed * dt + mob.vz * dt;
    mob.vx *= Math.max(0, 1 - dt * 6);
    mob.vz *= Math.max(0, 1 - dt * 6);
    const nx = mob.x + mx;
    const nz = mob.z + mz;
    const targetH = this.world.columnHeight(Math.floor(nx), Math.floor(nz));
    if (targetH - mob.y <= 1.01) {
      mob.x = nx;
      mob.z = nz;
    } else if (!chase) {
      mob.heading = (mob.heading + 90 + Math.random() * 180) % 360;
    }
    const groundH = this.world.columnHeight(Math.floor(mob.x), Math.floor(mob.z));
    mob.y += (groundH - mob.y) * Math.min(1, dt * 10);
    const moving = speed > 0 || Math.abs(mob.vx) + Math.abs(mob.vz) > 0.3;
    mob.walk += ((moving ? 1 : 0) - mob.walk) * Math.min(1, dt * 6);
    mob.phase += dt * 8 * mob.walk;

    // Animation
    const m = mob.model;
    if (m.parts) animateHumanoid(m.parts, mob.phase, mob.walk, 0, mob.type === 'zombie' || (mob.type === 'skeleton' && chase));
    if (m.legs) {
      const a = Math.sin(mob.phase) * 0.7 * mob.walk;
      m.legs.forEach((leg, i) => (leg.rotation.x = i % 3 === 0 ? a : -a));
    }
    if (mob.hurt > 0) mob.hurt -= dt;
    const flash = mob.fuse > 0 && Math.floor(mob.fuse * 8) % 2 === 0;
    for (const mat of mob.mats) {
      this.overlay.applyBrightness(mat);
      if (mob.hurt > 0) mat.color.multiply(new THREE.Color(1, 0.4, 0.4));
      else if (flash) mat.color.setScalar(1.6);
    }
    if (mob.fuse > 0) m.group.scale.setScalar(1 + mob.fuse * 0.08);
    this.place(mob);
  }

  shoot(mob, player) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.5), new THREE.MeshBasicMaterial({ color: 0x8a6a3a }));
    const from = new THREE.Vector3(mob.x, mob.y + 1.5, mob.z);
    const to = new THREE.Vector3(player.x, 1.2, player.z);
    const dir = to.clone().sub(from).normalize();
    // Etwas ungenau zielen
    dir.x += (Math.random() - 0.5) * 0.08;
    dir.z += (Math.random() - 0.5) * 0.08;
    dir.normalize();
    mesh.position.copy(from);
    mesh.lookAt(from.clone().add(dir));
    this.overlay.scene.add(mesh);
    this.arrows.push({ mesh, pos: from, vel: dir.multiplyScalar(18), life: 2.5, dmg: 2 + Math.floor(Math.random() * 3) });
  }

  updateArrows(dt, ctx) {
    this.arrows = this.arrows.filter((a) => {
      a.life -= dt;
      a.vel.y -= 2 * dt;
      a.pos.addScaledVector(a.vel, dt);
      a.mesh.position.copy(a.pos);
      a.mesh.lookAt(a.pos.clone().add(a.vel));
      const hitPlayer = Math.hypot(a.pos.x - ctx.player.x, a.pos.z - ctx.player.z) < 0.6 && a.pos.y > 0 && a.pos.y < 2;
      if (hitPlayer) this.game.damagePlayer(a.dmg, a.pos.x - a.vel.x, a.pos.z - a.vel.z, 'Skelett');
      const blocked = this.world.isSolid(Math.floor(a.pos.x), Math.floor(a.pos.y), Math.floor(a.pos.z));
      if (hitPlayer || blocked || a.life <= 0) {
        this.overlay.scene.remove(a.mesh);
        return false;
      }
      return true;
    });
  }
}
