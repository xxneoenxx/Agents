// three.js-Ebene über Street View: Blöcke, Löcher, Markierung, Drops, Partikel.

import * as THREE from 'three';
import { getItem } from './items.js';
import { blockTextureCanvas, faceTexture, crackCanvas, itemIconCanvas, makeCanvas } from './textures.js';

const VIEW_RADIUS = 56;
// Minecraft-artige feste Schattierung je Seite: +x, -x, +y, -y, +z, -z
const FACE_SHADE = [0.8, 0.8, 1, 0.55, 0.9, 0.7];

export class Overlay {
  constructor(canvas, world) {
    this.world = world;
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, preserveDrawingBuffer: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.autoClear = false;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.05, 400);
    this.camera.rotation.order = 'YXZ';
    this.handScene = new THREE.Scene();
    this.handCamera = new THREE.PerspectiveCamera(70, 1, 0.01, 10);
    this.brightness = 1;
    this.materials = []; // alle Materialien, die bei Nacht dunkler werden
    this.texCache = new Map();
    this.matCache = new Map();
    this.blockMeshes = new Map();
    this.groundMeshes = new Map();
    this.drops = [];
    this.particles = [];
    this.center = { x: 0, z: 0 };
    this.unitBox = new THREE.BoxGeometry(1, 1, 1);
    this.unitBox.translate(0.5, 0.5, 0.5);
    this.planeGeo = new THREE.PlaneGeometry(1, 1);

    this.buildHighlight();
    world.onChange((e) => {
      if (e.type === 'block') this.syncBlock(e.x, e.y, e.z);
      else if (e.type === 'ground') this.syncGroundAround(e.x, e.z);
    });
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.aspect = w / h;
    this.camera.aspect = this.aspect;
    this.handCamera.aspect = this.aspect;
    this.camera.updateProjectionMatrix();
    this.handCamera.updateProjectionMatrix();
  }

  // --- Materialien ------------------------------------------------------

  texture(name, canvasFn) {
    if (this.texCache.has(name)) return this.texCache.get(name);
    const tex = new THREE.CanvasTexture(canvasFn ? canvasFn() : blockTextureCanvas(name));
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = false;
    this.texCache.set(name, tex);
    return tex;
  }

  // Material mit fester Seitenschattierung, das bei Nacht abgedunkelt wird.
  shaded(opts, shade = 1, glow = false) {
    const m = new THREE.MeshBasicMaterial(opts);
    m.userData.base = m.color.clone();
    m.userData.shade = shade;
    m.userData.glow = glow;
    this.applyBrightness(m);
    this.materials.push(m);
    return m;
  }

  applyBrightness(m) {
    const b = m.userData.glow ? 1 : this.brightness;
    m.color.copy(m.userData.base).multiplyScalar(m.userData.shade * b);
  }

  setBrightness(b) {
    if (Math.abs(b - this.brightness) < 0.005) return;
    this.brightness = b;
    for (const m of this.materials) this.applyBrightness(m);
    if (this.demoGround) {
      const day = new THREE.Color(0x87b8eb);
      const night = new THREE.Color(0x0b1430);
      this.scene.background = night.lerp(day, (b - 0.22) / 0.78);
    }
  }

  // Testmodus ohne Street View: Himmel und eine Wiese mit Blockraster.
  enableDemoGround() {
    const tex = new THREE.CanvasTexture(blockTextureCanvas('grass_top'));
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(300, 300);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestMipmapNearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    this.demoGround = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), this.shaded({ map: tex }, 0.9));
    this.demoGround.rotation.x = -Math.PI / 2;
    this.demoGround.renderOrder = -3;
    this.scene.add(this.demoGround);
    this.scene.background = new THREE.Color(0x87b8eb);
  }

  blockMaterials(id, data) {
    const it = getItem(id);
    const names = {
      top: faceTexture(id, 'top', data),
      bottom: faceTexture(id, 'bottom', data),
      side: faceTexture(id, 'side', data),
      front: faceTexture(id, 'front', data),
    };
    const key = `${id}|${names.top}|${names.bottom}|${names.side}|${names.front}`;
    if (this.matCache.has(key)) return this.matCache.get(key);
    const b = it.block;
    const opts = (name) => ({
      map: this.texture(name),
      transparent: !!b.transparent && !b.alphaTest,
      alphaTest: b.alphaTest ? 0.5 : 0,
      side: b.transparent ? THREE.DoubleSide : THREE.FrontSide,
      depthWrite: !(b.transparent && !b.alphaTest),
    });
    const faces = [names.side, names.side, names.top, names.bottom, names.front, names.side];
    const mats = faces.map((n, i) => this.shaded(opts(n), FACE_SHADE[i], !!b.light));
    this.matCache.set(key, mats);
    return mats;
  }

  // --- Blöcke -------------------------------------------------------------

  makeBlockObject(id, data) {
    const it = getItem(id);
    const shape = it.block.shape;
    if (shape === 'cross') {
      const mat = this.blockMaterials(id, data)[0];
      const g = new THREE.Group();
      for (const r of [Math.PI / 4, -Math.PI / 4]) {
        const p = new THREE.Mesh(this.planeGeo, mat);
        p.rotation.y = r;
        p.position.set(0.5, 0.5, 0.5);
        g.add(p);
      }
      return g;
    }
    if (shape === 'torch') {
      const g = new THREE.Group();
      if (!this.torchParts) {
        this.torchParts = {
          stickGeo: new THREE.BoxGeometry(0.125, 0.55, 0.125),
          flameGeo: new THREE.BoxGeometry(0.14, 0.16, 0.14),
          stickMat: this.shaded({ color: 0x73522a }, 1, true),
          flameMat: this.shaded({ color: 0xffd040 }, 1, true),
        };
      }
      const t = this.torchParts;
      const stick = new THREE.Mesh(t.stickGeo, t.stickMat);
      stick.position.set(0.5, 0.275, 0.5);
      const flame = new THREE.Mesh(t.flameGeo, t.flameMat);
      flame.position.set(0.5, 0.62, 0.5);
      g.add(stick, flame, this.glowSprite(0.5, 0.65, 0.5, 2.2));
      return g;
    }
    if (shape === 'lantern') {
      const g = new THREE.Group();
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.4), this.blockMaterials(id, data));
      m.position.set(0.5, 0.25, 0.5);
      g.add(m, this.glowSprite(0.5, 0.3, 0.5, 3));
      return g;
    }
    let geo = this.unitBox;
    if (shape === 'chest' || shape === 'bed') {
      if (!this.shapeGeos) {
        const chest = new THREE.BoxGeometry(0.875, 0.875, 0.875);
        chest.translate(0.5, 0.4375, 0.5);
        const bed = new THREE.BoxGeometry(1, 0.5625, 1);
        bed.translate(0.5, 0.28125, 0.5);
        this.shapeGeos = { chest, bed };
      }
      geo = this.shapeGeos[shape];
    }
    const mesh = new THREE.Mesh(geo, this.blockMaterials(id, data));
    if (it.block.facing && data && data.facing != null) {
      // Vorderseite (+z) in Richtung des Spielers drehen, um die Blockmitte.
      const g = new THREE.Group();
      mesh.position.set(-0.5, 0, -0.5);
      g.add(mesh);
      const inner = new THREE.Group();
      inner.position.set(0.5, 0, 0.5);
      inner.rotation.y = (data.facing * Math.PI) / 2;
      inner.add(g);
      const outer = new THREE.Group();
      outer.add(inner);
      return outer;
    }
    return mesh;
  }

  glowSprite(x, y, z, size) {
    if (!this.glowMat) {
      const tex = this.texture('glow', () => {
        const [c, ctx] = makeCanvas(64, 64);
        const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        g.addColorStop(0, 'rgba(255,210,120,0.75)');
        g.addColorStop(0.4, 'rgba(255,170,60,0.25)');
        g.addColorStop(1, 'rgba(255,150,40,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 64, 64);
        return c;
      });
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      this.glowMat = new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    }
    const s = new THREE.Sprite(this.glowMat);
    s.position.set(x, y, z);
    s.scale.set(size, size, 1);
    s.userData.isGlow = true;
    return s;
  }

  // Leuchtschein ist nachts stärker.
  updateGlow() {
    if (this.glowMat) this.glowMat.opacity = Math.min(1, 0.25 + (1 - this.brightness) * 1.2);
  }

  syncBlock(x, y, z) {
    const key = `${x},${y},${z}`;
    const old = this.blockMeshes.get(key);
    if (old) {
      this.scene.remove(old);
      this.blockMeshes.delete(key);
    }
    const b = this.world.getBlock(x, y, z);
    if (!b || !getItem(b.id)) return;
    if (Math.abs(x - this.center.x) > VIEW_RADIUS || Math.abs(z - this.center.z) > VIEW_RADIUS) return;
    const obj = this.makeBlockObject(b.id, b.data);
    obj.position.set(x, y, z);
    obj.userData.blockId = b.id;
    this.scene.add(obj);
    this.blockMeshes.set(key, obj);
  }

  groundMat(tex, shade) {
    const key = `ground|${tex}|${shade.toFixed(2)}`;
    if (!this.matCache.has(key)) {
      // Löcher werden vor allem anderen gezeichnet und "schneiden" so den Boden aus.
      this.matCache.set(key, this.shaded({ map: this.texture(tex), depthTest: false, depthWrite: false }, shade));
    }
    return this.matCache.get(key);
  }

  // Gegrabenes Loch: Boden + Schachtwände mit den echten Gesteinsschichten.
  syncGround(x, z) {
    const key = `${x},${z}`;
    const old = this.groundMeshes.get(key);
    if (old) {
      this.scene.remove(old);
      this.groundMeshes.delete(key);
    }
    const g = this.world.groundState(x, z);
    if (!g.depth && !g.farmland) return;
    if (Math.abs(x - this.center.x) > VIEW_RADIUS || Math.abs(z - this.center.z) > VIEW_RADIUS) return;
    const vd = Math.min(g.depth, 4); // sichtbare Tiefe
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    const top = this.world.groundTop(x, z);
    const floorShade = g.farmland ? 0.95 : Math.max(0.2, 0.75 - g.depth * 0.04);
    const floor = new THREE.Mesh(this.planeGeo, this.groundMat(faceTexture(top, 'top'), floorShade));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0.5, -vd + 0.001, 0.5);
    floor.renderOrder = -2;
    group.add(floor);
    // Wände: nur dort, wo das Nachbarfeld flacher ist.
    const sides = [
      { dx: 0, dz: -1, pos: [0.5, 0, 0.001], rot: 0 },
      { dx: 0, dz: 1, pos: [0.5, 0, 0.999], rot: Math.PI },
      { dx: -1, dz: 0, pos: [0.001, 0, 0.5], rot: Math.PI / 2 },
      { dx: 1, dz: 0, pos: [0.999, 0, 0.5], rot: -Math.PI / 2 },
    ];
    for (const sd of sides) {
      const nd = Math.min(this.world.groundState(x + sd.dx, z + sd.dz).depth, 4);
      for (let k = nd; k < vd; k++) {
        const layer = this.world.groundLayer(x, z, k);
        const wall = new THREE.Mesh(this.planeGeo, this.groundMat(faceTexture(layer, 'side'), Math.max(0.25, 0.65 - k * 0.1)));
        wall.position.set(sd.pos[0], -k - 0.5, sd.pos[2]);
        wall.rotation.y = sd.rot;
        wall.renderOrder = -1;
        group.add(wall);
      }
    }
    this.scene.add(group);
    this.groundMeshes.set(key, group);
  }

  // Nachbarn neu zeichnen, weil sich ihre Wände ändern können.
  syncGroundAround(x, z) {
    for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) this.syncGround(x + dx, z + dz);
  }

  // Alles im Umkreis neu aufbauen (nach einem Ortswechsel).
  recenter(x, z) {
    this.center = { x, z };
    if (this.demoGround) this.demoGround.position.set(Math.round(x), 0, Math.round(z));
    for (const [, m] of this.blockMeshes) this.scene.remove(m);
    for (const [, m] of this.groundMeshes) this.scene.remove(m);
    this.blockMeshes.clear();
    this.groundMeshes.clear();
    for (const b of this.world.blocksNear(x, z, VIEW_RADIUS)) this.syncBlock(b.x, b.y, b.z);
    for (const key of this.world.ground.keys()) {
      const [gx, gz] = key.split(',').map(Number);
      if (Math.abs(gx - x) <= VIEW_RADIUS && Math.abs(gz - z) <= VIEW_RADIUS) this.syncGround(gx, gz);
    }
  }

  // --- Markierung & Risse --------------------------------------------------

  buildHighlight() {
    const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.004, 1.004, 1.004));
    this.highlight = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.7 }));
    this.highlight.visible = false;
    this.scene.add(this.highlight);
    const sq = new THREE.EdgesGeometry(new THREE.PlaneGeometry(1, 1));
    this.groundHighlight = new THREE.LineSegments(sq, new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.8 }));
    this.groundHighlight.rotation.x = -Math.PI / 2;
    this.groundHighlight.visible = false;
    this.scene.add(this.groundHighlight);
    this.crackMats = [];
    for (let i = 0; i < 10; i++) {
      this.crackMats.push(
        new THREE.MeshBasicMaterial({
          map: this.texture(`crack_${i}`, () => crackCanvas(i)),
          transparent: true,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -4,
        }),
      );
    }
    this.crack = new THREE.Mesh(new THREE.BoxGeometry(1.01, 1.01, 1.01), this.crackMats[0]);
    this.crack.visible = false;
    this.scene.add(this.crack);
    const gc = new THREE.PlaneGeometry(1, 1);
    this.groundCrack = new THREE.Mesh(gc, this.crackMats[0]);
    this.groundCrack.rotation.x = -Math.PI / 2;
    this.groundCrack.visible = false;
    this.scene.add(this.groundCrack);
  }

  setTarget(hit, progress) {
    this.highlight.visible = false;
    this.groundHighlight.visible = false;
    this.crack.visible = false;
    this.groundCrack.visible = false;
    if (!hit || hit.type === 'mob') return;
    const stage = Math.min(9, Math.floor(progress * 10));
    if (hit.type === 'block') {
      this.highlight.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
      this.highlight.visible = true;
      if (progress > 0) {
        this.crack.material = this.crackMats[stage];
        this.crack.position.copy(this.highlight.position);
        this.crack.visible = true;
      }
    } else if (hit.type === 'ground') {
      const floorY = -Math.min(this.world.groundState(hit.x, hit.z).depth, 4) + 0.02;
      this.groundHighlight.position.set(hit.x + 0.5, floorY, hit.z + 0.5);
      this.groundHighlight.visible = true;
      if (progress > 0) {
        this.groundCrack.material = this.crackMats[stage];
        this.groundCrack.position.set(hit.x + 0.5, floorY + 0.005, hit.z + 0.5);
        this.groundCrack.visible = true;
      }
    }
  }

  // --- Gegenstände am Boden & Partikel ---------------------------------------

  itemObject(id, size = 0.25) {
    const it = getItem(id);
    if (it && it.block && !['cross', 'torch', 'lantern'].includes(it.block.shape)) {
      const geo = new THREE.BoxGeometry(size, size, size);
      return new THREE.Mesh(geo, this.blockMaterials(id, null));
    }
    const mat = this.itemMaterial(id);
    const m = new THREE.Mesh(this.planeGeo, mat);
    m.scale.setScalar(size * 1.8);
    return m;
  }

  itemMaterial(id) {
    const key = `icon|${id}`;
    if (!this.matCache.has(key)) {
      const tex = this.texture(key, () => itemIconCanvas(id));
      this.matCache.set(key, this.shaded({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide }, 1));
    }
    return this.matCache.get(key);
  }

  spawnDrop(id, count, x, y, z, dmg) {
    const obj = this.itemObject(id);
    obj.position.set(x, y, z);
    this.scene.add(obj);
    const drop = { id, count, dmg, obj, x, y, z, vx: (Math.random() - 0.5) * 2, vy: 3, vz: (Math.random() - 0.5) * 2, age: 0 };
    this.drops.push(drop);
    return drop;
  }

  removeDrop(drop) {
    this.scene.remove(drop.obj);
    this.drops = this.drops.filter((d) => d !== drop);
  }

  spawnParticles(blockId, x, y, z) {
    const mats = getItem(blockId) && getItem(blockId).block ? this.blockMaterials(blockId, null) : null;
    if (!mats) return;
    const geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    for (let i = 0; i < 10; i++) {
      const m = new THREE.Mesh(geo, mats[2]);
      m.position.set(x + 0.2 + Math.random() * 0.6, y + 0.2 + Math.random() * 0.6, z + 0.2 + Math.random() * 0.6);
      this.scene.add(m);
      this.particles.push({ m, vx: (Math.random() - 0.5) * 3, vy: Math.random() * 3, vz: (Math.random() - 0.5) * 3, life: 0.6 + Math.random() * 0.4 });
    }
  }

  spawnPuff(x, y, z, color = 0xdddddd, n = 14) {
    const geo = new THREE.BoxGeometry(0.15, 0.15, 0.15);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 });
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x + (Math.random() - 0.5), y + Math.random() * 1.5, z + (Math.random() - 0.5));
      this.scene.add(m);
      this.particles.push({ m, vx: (Math.random() - 0.5) * 2, vy: 0.5 + Math.random() * 1.5, vz: (Math.random() - 0.5) * 2, life: 0.8, float: true });
    }
  }

  update(dt, time) {
    for (const d of this.drops) {
      d.age += dt;
      if (!d.magnet && (d.vy !== 0 || d.y > 0.15)) {
        d.vy -= 12 * dt;
        d.x += d.vx * dt;
        d.z += d.vz * dt;
        d.y += d.vy * dt;
        const floor = this.world.columnHeight(Math.floor(d.x), Math.floor(d.z)) + 0.15;
        if (d.y < floor && d.vy <= 0) {
          d.y = floor;
          d.vy = 0;
          d.vx = 0;
          d.vz = 0;
        }
      }
      d.obj.position.set(d.x, d.y + Math.sin(time * 3 + d.age) * 0.06, d.z);
      d.obj.rotation.y = time * 1.5 + d.age;
    }
    this.particles = this.particles.filter((p) => {
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.m);
        return false;
      }
      if (!p.float) p.vy -= 12 * dt;
      p.m.position.x += p.vx * dt;
      p.m.position.y = Math.max(0.05, p.m.position.y + p.vy * dt);
      p.m.position.z += p.vz * dt;
      return true;
    });
    this.updateGlow();
  }

  // --- Kamera ---------------------------------------------------------------

  // hfov: waagerechtes Sichtfeld in Grad (wie bei Street View).
  setCamera(pos, headingDeg, pitchDeg, hfov) {
    this.camera.position.set(pos.x, pos.y, pos.z);
    this.camera.rotation.set((pitchDeg * Math.PI) / 180, (-headingDeg * Math.PI) / 180, 0, 'YXZ');
    const vfov = (2 * Math.atan(Math.tan((hfov * Math.PI) / 360) / this.aspect) * 180) / Math.PI;
    if (Math.abs(this.camera.fov - vfov) > 0.01) {
      this.camera.fov = vfov;
      this.camera.updateProjectionMatrix();
    }
  }

  // Blickstrahl durch die Bildschirmmitte.
  viewRay() {
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(this.camera.rotation);
    return { o: { x: this.camera.position.x, y: this.camera.position.y, z: this.camera.position.z }, d: { x: dir.x, y: dir.y, z: dir.z } };
  }

  render(showHand) {
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    if (showHand) {
      this.renderer.clearDepth();
      this.renderer.render(this.handScene, this.handCamera);
    }
  }
}
