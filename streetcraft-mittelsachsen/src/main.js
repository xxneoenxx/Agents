// StreetCraft Mittelsachsen – Hauptprogramm.

import { PLACES, CAMERA_HEIGHT, THIRD_PERSON_DISTANCE, REACH, GEN_RADIUS_CHUNKS, API_KEY_STORAGE, SETTINGS_KEY, SKIN_KEY } from './config.js';
import { toLocal, toLatLng, inRegion, headingVector, nearestTown, inMiningArea } from './geo.js';
import { clamp, normDeg, angleDiff } from './util.js';
import { getItem, itemName, breakTime, blockDrops, attackDamage } from './items.js';
import { Inventory, maxStack } from './inventory.js';
import { smeltResult, SMELT_TIME } from './crafting.js';
import { World, chunkOf } from './world.js';
import { Survival, DayCycle } from './survival.js';
import { Overlay } from './overlay.js';
import { PlayerCharacter } from './character.js';
import { Mobs } from './mobs.js';
import { UI } from './ui.js';
import { MiniMap } from './minimap.js';
import { GoogleStreetView, DemoStreetView } from './streetview.js';
import { lookupBiome, BIOME_NAMES } from './biome.js';
import { parseCommand, HELP } from './chat.js';
import { hasSave, loadSave, writeSave, deleteSave, exportSave, importSaveFile } from './save.js';
import { defaultSkinCanvas } from './textures.js';
import { sfx, setSoundEnabled } from './sound.js';

const $ = (id) => document.getElementById(id);
const DEFAULT_SETTINGS = { sensitivity: 0.15, hfov: 90, camHeight: CAMERA_HEIGHT, sound: true };

function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function loadSkin() {
  return new Promise((resolve) => {
    let url = null;
    try {
      url = localStorage.getItem(SKIN_KEY);
    } catch {
      /* egal */
    }
    if (!url) return resolve(defaultSkinCanvas());
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = img.height === 32 ? 32 : 64;
      c.getContext('2d').drawImage(img, 0, 0);
      resolve(c);
    };
    img.onerror = () => resolve(defaultSkinCanvas());
    img.src = url;
  });
}

// Skin-Datei prüfen und speichern. Gibt eine Fehlermeldung oder null zurück.
function storeSkinFile(file) {
  return new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        if (img.width !== 64 || (img.height !== 64 && img.height !== 32)) return resolve('Der Skin muss 64×64 oder 64×32 Pixel groß sein.');
        try {
          localStorage.setItem(SKIN_KEY, r.result);
        } catch {
          return resolve('Skin konnte nicht gespeichert werden.');
        }
        resolve(null);
      };
      img.onerror = () => resolve('Das ist kein gültiges Bild.');
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });
}

class Game {
  constructor() {
    this.settings = loadSettings();
    setSoundEnabled(this.settings.sound);
    this.keys = new Set();
    this.heading = 0;
    this.pitch = -8;
    this.thirdPerson = true;
    this.mining = { key: null, progress: 0, soundT: 0 };
    this.useCooldown = 0;
    this.attackCooldown = 0;
    this.breakCooldown = 0;
    this.moving = false;
    this.lastMove = 0;
    this.tween = null;
    this.dead = false;
    this.furnaces = new Set();
    this.tickTimer = 0;
    this.saveTimer = 0;
    this.biome = 'plains';
    this.fps = 0;
    this.craftGrid = null;
    this.recentPanos = [];
  }

  // --- Start ---------------------------------------------------------------

  async start({ backend, apiKey, placeId, gamemode, continueSave }) {
    const save = continueSave ? loadSave() : null;
    const place = PLACES.find((p) => p.id === placeId) || PLACES[0];
    const miningCheck = (x, z) => {
      const ll = toLatLng(x + 0.5, z + 0.5);
      return inMiningArea(ll.lat, ll.lng);
    };
    this.world = save ? World.fromJSON(save.world, { miningCheck }) : new World((Math.random() * 2 ** 32) >>> 0, { miningCheck });
    this.inv = save ? Inventory.fromJSON(save.inventory) : new Inventory();
    this.survival = Survival.fromJSON(save && save.survival);
    this.day = new DayCycle(save ? save.time : 1000);
    this.gamemode = save ? save.gamemode : gamemode;
    this.spawn = save ? save.spawn : { lat: place.lat, lng: place.lng, heading: place.heading };
    const startAt = save && !placeId ? save.player : save ? save.player : { lat: place.lat, lng: place.lng, heading: place.heading, pitch: -8 };
    this.heading = startAt.heading || 0;
    this.pitch = startAt.pitch ?? -8;
    for (const [key, b] of this.world.blocks) if (b.id === 'furnace') this.furnaces.add(key);

    this.canvas = $('overlay');
    this.overlay = new Overlay(this.canvas, this.world);
    this.character = new PlayerCharacter(this.overlay);
    this.character.setSkin(await loadSkin());
    this.mobs = new Mobs(this.overlay, this.world, this);
    this.ui = new UI(this);
    this.minimap = new MiniMap($('minimap'), $('bigmap-map'));
    this.minimap.onClick = (lat, lng) => this.mapClick(lat, lng);

    this.sv = backend === 'google' ? new GoogleStreetView($('sv'), apiKey) : new DemoStreetView($('sv'));
    if (backend === 'demo') this.overlay.enableDemoGround();
    await this.sv.init(startAt.lat, startAt.lng, this.heading, this.pitch);
    let pos = this.sv.getPosition();
    if (!pos || !inRegion(pos.lat, pos.lng)) pos = await this.sv.teleport(place.lat, place.lng);
    if (!pos) throw new Error('Kein Street View in der Nähe gefunden.');
    this.arrive(pos, true);
    this.minimap.init(pos.lat, pos.lng);
    this.minimap.setSpawn(this.spawn.lat, this.spawn.lng);
    this.bindInput();
    this.ui.chat(`Willkommen in Mittelsachsen! Modus: ${this.gamemode === 'creative' ? 'Kreativ' : 'Überleben'}. Hilfe mit /help`, 'info');
    if (backend === 'demo') this.ui.chat('Testmodus: ohne Google Street View, nur Wiese und Himmel.', 'info');
    if (!save && this.gamemode === 'survival') this.ui.chat('Tipp: Bäume fällen (Linksklick halten) → Holz → Werkbank bauen (E).', 'info');
    this.last = performance.now();
    requestAnimationFrame((t) => this.loop(t));
    window.addEventListener('beforeunload', () => this.save());
  }

  // Ankunft an einem neuen Street-View-Punkt.
  arrive(pos, instant = false) {
    this.latlng = pos;
    const l = toLocal(pos.lat, pos.lng);
    const to = { x: l.x, z: l.z };
    if (instant || !this.camPos) this.camPos = { ...to };
    else this.tween = { from: { ...this.camPos }, to, t: 0, dur: 0.55 };
    this.panoPos = to;
    this.recentPanos.push(to);
    if (this.recentPanos.length > 80) this.recentPanos.shift();
    this.overlay.recenter(l.x, l.z);
    this.clearTreesAt(to);
    this.loadChunks(pos, to);
    if (this.minimap) this.minimap.update(pos.lat, pos.lng, this.heading);
  }

  loadChunks(pos, center) {
    lookupBiome(pos.lat, pos.lng).then((biome) => {
      if (this.panoPos !== center) return;
      this.biome = biome;
      const { cx, cz } = chunkOf(Math.floor(center.x), Math.floor(center.z));
      for (let dx = -GEN_RADIUS_CHUNKS; dx <= GEN_RADIUS_CHUNKS; dx++) {
        for (let dz = -GEN_RADIUS_CHUNKS; dz <= GEN_RADIUS_CHUNKS; dz++) this.world.ensureChunk(cx + dx, cz + dz, biome, center);
      }
      this.clearTreesAt(center);
    });
  }

  // Erzeugte Bäume direkt am Kamerastandort (auf der Straße) entfernen.
  clearTreesAt(c) {
    const w = this.world;
    for (let x = Math.floor(c.x) - 3; x <= Math.floor(c.x) + 3; x++) {
      for (let z = Math.floor(c.z) - 3; z <= Math.floor(c.z) + 3; z++) {
        const b = w.getBlock(x, 0, z);
        if (!b || !b.id.endsWith('_log') || w.edits.has(`${x},0,${z}`)) continue;
        for (let dx = -3; dx <= 3; dx++) {
          for (let dz = -3; dz <= 3; dz++) {
            for (let y = 0; y < 12; y++) {
              const t = w.getBlock(x + dx, y, z + dz);
              if (!t) continue;
              const isTrunk = dx === 0 && dz === 0 && t.id.endsWith('_log');
              if ((isTrunk || t.id.endsWith('_leaves')) && !w.edits.has(`${x + dx},${y},${z + dz}`)) w.setBlock(x + dx, y, z + dz, null);
            }
          }
        }
      }
    }
  }

  // --- Positionen ------------------------------------------------------------

  camHeight() {
    return this.settings.camHeight;
  }

  cameraPos() {
    return { x: this.camPos.x, y: this.camHeight(), z: this.camPos.z };
  }

  playerPos() {
    if (!this.thirdPerson) return { x: this.camPos.x, y: 0, z: this.camPos.z };
    const v = headingVector(this.heading);
    const x = this.camPos.x + v.x * THIRD_PERSON_DISTANCE;
    const z = this.camPos.z + v.z * THIRD_PERSON_DISTANCE;
    const h = this.world.columnHeight(Math.floor(x), Math.floor(z));
    return { x, y: h <= 1 ? h : 0, z };
  }

  // --- Bewegung ----------------------------------------------------------------

  async tryMove(offset) {
    if (this.moving || this.dead || this.anyScreen()) return;
    const want = normDeg(this.heading + offset);
    let best = null;
    let bestDiff = 60;
    for (const l of this.sv.links()) {
      const d = Math.abs(angleDiff(l.heading, want));
      if (d < bestDiff) {
        bestDiff = d;
        best = l;
      }
    }
    this.lastMove = performance.now();
    if (!best) {
      this.ui.actionbar('Hier geht es nicht weiter – dreh dich zur Straße.');
      return;
    }
    this.moving = true;
    const prev = this.sv.currentPano();
    try {
      const pos = await this.sv.goToPano(best.pano);
      if (!pos || !inRegion(pos.lat, pos.lng)) {
        await this.sv.goToPano(prev);
        this.ui.actionbar('Hier endet Mittelsachsen! Du kannst den Landkreis nicht verlassen.', 3.5);
        return;
      }
      if (this.gamemode === 'survival') this.survival.addExhaustion(0.08);
      this.character.walkAmount = 1;
      sfx.step();
      this.arrive(pos);
    } finally {
      this.moving = false;
      this.lastMove = performance.now();
    }
  }

  async teleport(lat, lng, heading) {
    if (!inRegion(lat, lng)) {
      this.ui.chat('Dieser Ort liegt nicht in Mittelsachsen.', 'error');
      return false;
    }
    this.ui.actionbar('Suche Street View …', 5);
    const pos = await this.sv.teleport(lat, lng, 400);
    if (!pos || !inRegion(pos.lat, pos.lng)) {
      this.ui.actionbar('Dort gibt es kein Street View.', 3);
      return false;
    }
    if (heading != null) this.heading = heading;
    this.mobs.clear();
    this.arrive(pos, true);
    this.ui.actionbar(nearestTown(pos.lat, pos.lng), 2);
    return true;
  }

  mapClick(lat, lng) {
    if (this.gamemode !== 'creative') {
      this.ui.actionbar('Teleport per Karte nur im Kreativmodus (oder mit /tp).', 3);
      return;
    }
    this.closeBigMap();
    this.teleport(lat, lng);
  }

  // --- Eingabe ---------------------------------------------------------------

  anyScreen() {
    return !!(this.ui.container || this.ui.chatOpen() || $('pause').classList.contains('open') || $('bigmap').classList.contains('open') || this.dead);
  }

  locked() {
    return document.pointerLockElement === this.canvas;
  }

  lock() {
    try {
      const p = this.canvas.requestPointerLock();
      if (p && p.catch) p.catch(() => {});
    } catch {
      /* Browser verweigert – Klick nötig */
    }
  }

  unlock() {
    this.expectUnlock = true;
    if (document.pointerLockElement) document.exitPointerLock();
  }

  bindInput() {
    this.canvas.addEventListener('mousedown', (e) => {
      if (this.anyScreen()) return;
      if (!this.locked()) {
        this.lock();
        return;
      }
      if (e.button === 0) {
        this.leftDown = true;
        this.onLeftClick();
      } else if (e.button === 2) {
        this.rightDown = true;
        this.useCooldown = 0.25;
        this.use();
      }
    });
    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.leftDown = false;
      if (e.button === 2) this.rightDown = false;
    });
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    $('clickhint').addEventListener('click', () => this.lock());
    document.addEventListener('pointerlockchange', () => {
      const locked = this.locked();
      if (!locked) {
        this.leftDown = false;
        this.rightDown = false;
        this.keys.clear();
        if (!this.expectUnlock && !this.anyScreen()) this.showPause(true);
      }
      this.expectUnlock = false;
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.locked()) return;
      const s = this.settings.sensitivity;
      this.heading = normDeg(this.heading + e.movementX * s);
      this.pitch = clamp(this.pitch - e.movementY * s, -85, 85);
    });
    document.addEventListener(
      'wheel',
      (e) => {
        if (!this.locked()) return;
        const d = Math.sign(e.deltaY);
        this.inv.selected = (this.inv.selected + d + 9) % 9;
        this.ui.showItemName(this.inv.selectedId());
      },
      { passive: true },
    );
    document.addEventListener('keydown', (e) => this.onKeyDown(e));
    document.addEventListener('keyup', (e) => this.keys.delete(e.code));
    $('chatinput').addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') {
        const text = e.target.value.trim();
        this.ui.closeChat();
        if (text) this.submitChat(text);
        this.lock();
      } else if (e.key === 'Escape') {
        this.ui.closeChat();
        this.lock();
      }
    });
    this.bindMenus();
  }

  onKeyDown(e) {
    const code = e.code;
    if (code === 'F3' || code === 'F5' || code === 'Tab') e.preventDefault();
    if (this.ui.container) {
      if (code === 'KeyE' || code === 'Escape') {
        this.ui.closeContainer();
        this.lock();
      }
      return;
    }
    if ($('bigmap').classList.contains('open')) {
      if (code === 'KeyM' || code === 'Escape') this.closeBigMap();
      return;
    }
    if ($('pause').classList.contains('open') || this.dead) return;
    if (e.repeat && ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) return;
    this.keys.add(code);
    if (code.startsWith('Digit') && code !== 'Digit0') {
      this.inv.selected = parseInt(code.slice(5), 10) - 1;
      this.ui.showItemName(this.inv.selectedId());
    }
    switch (code) {
      case 'KeyW':
      case 'ArrowUp':
        this.tryMove(0);
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.tryMove(180);
        break;
      case 'KeyA':
        this.tryMove(-90);
        break;
      case 'KeyD':
        this.tryMove(90);
        break;
      case 'ArrowLeft':
        this.heading = normDeg(this.heading - 15);
        break;
      case 'ArrowRight':
        this.heading = normDeg(this.heading + 15);
        break;
      case 'KeyE':
        this.unlock();
        this.ui.openContainer(this.gamemode === 'creative' ? 'creative' : 'inventory');
        break;
      case 'KeyT':
      case 'Enter':
        e.preventDefault();
        this.unlock();
        this.ui.openChat('');
        break;
      case 'Slash':
      case 'NumpadDivide':
        e.preventDefault();
        this.unlock();
        this.ui.openChat('/');
        break;
      case 'KeyQ':
        this.dropSelected(e.ctrlKey);
        break;
      case 'F5':
        this.thirdPerson = !this.thirdPerson;
        break;
      case 'F3':
        this.ui.toggleDebug();
        break;
      case 'KeyM':
        this.openBigMap();
        break;
      case 'Space':
        this.character.doJump();
        break;
      case 'Equal':
      case 'NumpadAdd':
        this.minimap.zoomSmall(1);
        break;
      case 'Minus':
      case 'NumpadSubtract':
        this.minimap.zoomSmall(-1);
        break;
    }
  }

  // Bewegungstasten gedrückt halten = weiterlaufen
  handleHeldKeys() {
    if (this.moving || performance.now() - this.lastMove < 280) return;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) this.tryMove(0);
    else if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) this.tryMove(180);
    else if (this.keys.has('KeyA')) this.tryMove(-90);
    else if (this.keys.has('KeyD')) this.tryMove(90);
  }

  // --- Menüs -----------------------------------------------------------------

  bindMenus() {
    $('btn-resume').addEventListener('click', () => {
      this.showPause(false);
      this.lock();
    });
    $('btn-export').addEventListener('click', () => exportSave(this.saveData()));
    $('btn-import').addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      try {
        const data = await importSaveFile(f);
        writeSave(data);
        this.skipSave = true;
        location.reload();
      } catch (err) {
        alert(err.message);
      }
    });
    $('btn-mainmenu').addEventListener('click', () => {
      this.save();
      this.skipSave = true;
      location.reload();
    });
    $('btn-respawn').addEventListener('click', () => this.respawn());
    $('bigmap-close').addEventListener('click', () => this.closeBigMap());
    const bindRange = (id, key, fmt) => {
      const el = $(id);
      const out = $(`${id}-val`);
      el.value = this.settings[key];
      out.textContent = fmt(this.settings[key]);
      el.addEventListener('input', () => {
        this.settings[key] = parseFloat(el.value);
        out.textContent = fmt(this.settings[key]);
        this.saveSettings();
      });
    };
    bindRange('set-sens', 'sensitivity', (v) => v.toFixed(2));
    bindRange('set-fov', 'hfov', (v) => `${v}°`);
    bindRange('set-camh', 'camHeight', (v) => `${v.toFixed(1)} m`);
    const snd = $('set-sound');
    snd.checked = this.settings.sound;
    snd.addEventListener('change', () => {
      this.settings.sound = snd.checked;
      setSoundEnabled(snd.checked);
      this.saveSettings();
    });
    $('set-skin').addEventListener('change', async (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const err = await storeSkinFile(f);
      if (err) alert(err);
      else this.character.setSkin(await loadSkin());
    });
    $('set-skin-reset').addEventListener('click', () => {
      try {
        localStorage.removeItem(SKIN_KEY);
      } catch {
        /* egal */
      }
      this.character.setSkin(defaultSkinCanvas());
    });
  }

  saveSettings() {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch {
      /* egal */
    }
  }

  showPause(on) {
    this.ui.showScreen('pause', on);
    if (on) this.save();
  }

  openBigMap() {
    if (!this.minimap.ok) {
      this.ui.actionbar('Karte nicht verfügbar (Leaflet konnte nicht geladen werden).');
      return;
    }
    this.unlock();
    this.ui.showScreen('bigmap', true);
    this.minimap.showBig(this.latlng.lat, this.latlng.lng);
  }

  closeBigMap() {
    this.ui.showScreen('bigmap', false);
    this.lock();
  }

  // --- Chat ------------------------------------------------------------------

  submitChat(text) {
    if (!text.startsWith('/')) {
      this.ui.chat(`<Du> ${text}`);
      return;
    }
    const r = parseCommand(text);
    if (r.error) return this.ui.chat(r.error, 'error');
    switch (r.action) {
      case 'help':
        HELP.forEach((h) => this.ui.chat(h, 'info'));
        break;
      case 'message':
        this.ui.chat(r.text, 'info');
        break;
      case 'tp':
        this.teleport(r.lat, r.lng, r.heading).then((ok) => ok && this.ui.chat(`Teleportiert${r.name ? ` nach ${r.name}` : ''}.`, 'info'));
        break;
      case 'time':
        this.day.time = r.time;
        this.ui.chat(`Uhrzeit gesetzt: ${this.day.clock()}`, 'info');
        break;
      case 'gamemode':
        this.gamemode = r.mode;
        if (r.mode === 'creative') this.mobs.list.filter((m) => m.def.hostile).forEach((m) => this.mobs.remove(m));
        this.ui.chat(`Spielmodus: ${r.mode === 'creative' ? 'Kreativ' : 'Überleben'}`, 'info');
        break;
      case 'give':
        if (this.gamemode !== 'creative') return this.ui.chat('/give geht nur im Kreativmodus.', 'error');
        this.inv.add(r.id, r.count);
        this.ui.chat(`${r.count} × ${itemName(r.id)} erhalten.`, 'info');
        break;
      case 'spawn':
        this.teleport(this.spawn.lat, this.spawn.lng, this.spawn.heading);
        break;
      case 'kill':
        this.die('Du hast aufgegeben.');
        break;
      case 'clear':
        this.inv.clear();
        this.ui.chat('Inventar geleert.', 'info');
        break;
    }
  }

  // --- Abbauen, Angreifen, Benutzen -------------------------------------------

  heldTool() {
    const s = this.inv.selectedStack();
    return s && getItem(s.id) && getItem(s.id).tool ? s.id : null;
  }

  updateTarget() {
    const ray = this.overlay.viewRay();
    const maxD = REACH + (this.thirdPerson ? THIRD_PERSON_DISTANCE : 0) + (this.camHeight() - 1.6);
    const w = this.world.raycast(ray.o, ray.d, maxD);
    const m = this.mobs.raycast(ray.o, ray.d, maxD);
    this.target = m && (!w || m.dist < w.dist) ? m : w;
  }

  targetKey(t) {
    if (!t) return null;
    return t.type === 'block' ? `b${t.x},${t.y},${t.z}` : t.type === 'ground' ? `g${t.x},${t.z}` : null;
  }

  targetMaterial(t) {
    if (t.type === 'block') return t.block.id;
    return this.world.groundTop(t.x, t.z);
  }

  onLeftClick() {
    this.character.doSwing();
    const t = this.target;
    if (t && t.type === 'mob' && this.attackCooldown <= 0) {
      const pp = this.playerPos();
      const dmg = attackDamage(this.inv.selectedId());
      if (this.mobs.hit(t.mob, dmg, pp.x, pp.z)) {
        sfx.hit();
        this.attackCooldown = 0.35;
        if (this.gamemode === 'survival') {
          this.survival.addExhaustion(0.1);
          const tool = this.heldTool();
          if (tool && this.inv.damageSelected(getItem(tool).tool.type === 'sword' ? 1 : 2)) this.toolBroke();
        }
      }
    }
  }

  updateMining(dt) {
    this.breakCooldown -= dt;
    const t = this.target;
    if (!this.leftDown || !t || t.type === 'mob') {
      this.mining.key = null;
      this.mining.progress = 0;
      return;
    }
    if (this.gamemode === 'creative') {
      if (this.breakCooldown <= 0) {
        this.breakTarget(t);
        this.breakCooldown = 0.22;
      }
      return;
    }
    const key = this.targetKey(t);
    if (key !== this.mining.key) this.mining = { key, progress: 0, soundT: 0 };
    const time = breakTime(this.targetMaterial(t), this.heldTool());
    if (!isFinite(time)) {
      this.ui.actionbar('Grundgestein kann man nicht abbauen.');
      return;
    }
    this.mining.progress += dt / time;
    this.mining.soundT -= dt;
    if (this.mining.soundT <= 0) {
      this.mining.soundT = 0.25;
      sfx.dig();
      this.character.doSwing();
    }
    if (this.mining.progress >= 1) {
      this.breakTarget(t);
      this.mining = { key: null, progress: 0, soundT: 0 };
    }
  }

  breakTarget(t) {
    const survival = this.gamemode === 'survival';
    const tool = this.heldTool();
    let mat;
    const cx = t.x + 0.5;
    const cz = t.z + 0.5;
    let cy;
    if (t.type === 'block') {
      const b = this.world.getBlock(t.x, t.y, t.z);
      if (!b) return;
      mat = b.id;
      cy = t.y + 0.5;
      if (survival) {
        for (const d of blockDrops(mat, tool, b.data)) this.overlay.spawnDrop(d.id, d.count, cx, cy, cz);
      }
      if (b.data && b.data.items) for (const s of b.data.items) if (s) this.overlay.spawnDrop(s.id, s.count, cx, cy, cz, s.dmg);
      this.world.setBlock(t.x, t.y, t.z, null);
      this.furnaces.delete(`${t.x},${t.y},${t.z}`);
      this.breakUnsupported(t.x, t.y + 1, t.z);
    } else {
      mat = this.world.digGround(t.x, t.z);
      if (!mat) {
        this.ui.actionbar('Grundgestein! Tiefer geht es nicht.');
        return;
      }
      cy = 0.3;
      if (survival) for (const d of blockDrops(mat, tool, null)) this.overlay.spawnDrop(d.id, d.count, cx, cy, cz);
      this.breakUnsupported(t.x, 0, t.z);
      const depth = this.world.groundState(t.x, t.z).depth;
      this.ui.actionbar(`Schachttiefe: ${depth} m – darunter: ${itemName(this.world.groundTop(t.x, t.z))}`, 2);
    }
    this.overlay.spawnParticles(mat, t.x, t.type === 'block' ? t.y : -0.6, t.z);
    sfx.breakBlock();
    if (survival) {
      this.survival.addExhaustion(0.005);
      const it = getItem(mat);
      if (tool && it && it.block && it.block.hardness > 0 && this.inv.damageSelected(1)) this.toolBroke();
    }
  }

  // Pflanzen und Fackeln fallen ab, wenn darunter nichts mehr ist.
  breakUnsupported(x, y, z) {
    const b = this.world.getBlock(x, y, z);
    if (!b) return;
    const it = getItem(b.id);
    if (!it || !['cross', 'torch'].includes(it.block.shape)) return;
    if (this.gamemode === 'survival') for (const d of blockDrops(b.id, null, b.data)) this.overlay.spawnDrop(d.id, d.count, x + 0.5, y + 0.5, z + 0.5);
    this.world.setBlock(x, y, z, null);
  }

  toolBroke() {
    this.ui.actionbar('Dein Werkzeug ist zerbrochen!');
    sfx.hurt();
  }

  use() {
    const t = this.target;
    const held = this.inv.selectedStack();
    const it = held ? getItem(held.id) : null;
    const survival = this.gamemode === 'survival';
    this.character.doSwing();

    // 1. Blöcke benutzen
    if (t && t.type === 'block' && !this.keys.has('ShiftLeft')) {
      const b = t.block;
      const bdef = getItem(b.id).block;
      const info = { x: t.x, y: t.y, z: t.z, data: b.data };
      if (bdef.use === 'crafting') {
        this.unlock();
        this.ui.openContainer('crafting');
        return;
      }
      if (bdef.use === 'chest') {
        if (!b.data || !b.data.items) b.data = { ...(b.data || {}), items: new Array(27).fill(null) };
        info.data = b.data;
        this.world.markEdited(t.x, t.y, t.z);
        this.unlock();
        this.ui.openContainer('chest', { block: info });
        return;
      }
      if (bdef.use === 'furnace') {
        if (!b.data || !b.data.items) b.data = { ...(b.data || {}), items: [null, null, null], burn: 0, burnMax: 0, cook: 0 };
        info.data = b.data;
        this.world.markEdited(t.x, t.y, t.z);
        this.furnaces.add(`${t.x},${t.y},${t.z}`);
        this.unlock();
        this.ui.openContainer('furnace', { block: info });
        return;
      }
      if (bdef.use === 'bed') {
        this.sleep();
        return;
      }
    }

    // 2. Essen
    if (it && it.food) {
      if (survival && !this.survival.canEat()) {
        this.ui.actionbar('Du bist satt.');
        return;
      }
      if (survival) {
        this.survival.eat(it.food);
        this.inv.consumeSelected();
      }
      sfx.eat();
      this.ui.actionbar(`${it.name} gegessen`);
      return;
    }
    if (!t || t.type === 'mob') return;

    // 3. Hacke: Ackerboden machen
    if (it && it.tool && it.tool.type === 'hoe') {
      let ok = false;
      if (t.type === 'ground') ok = this.world.tillGround(t.x, t.z);
      else if (['grass', 'dirt'].includes(t.block.id) && !this.world.getBlock(t.x, t.y + 1, t.z)) {
        this.world.setBlock(t.x, t.y, t.z, 'farmland');
        ok = true;
      }
      if (ok) {
        sfx.dig();
        if (survival && this.inv.damageSelected(1)) this.toolBroke();
      }
      return;
    }

    // 4. Samen auf Ackerboden
    if (it && it.places) {
      let p = null;
      if (t.type === 'ground' && this.world.groundTop(t.x, t.z) === 'farmland') p = { x: t.x, y: 0, z: t.z };
      else if (t.type === 'block' && t.block.id === 'farmland' && t.normal.y === 1) p = { x: t.x, y: t.y + 1, z: t.z };
      if (!p || this.world.getBlock(p.x, p.y, p.z)) {
        this.ui.actionbar('Samen brauchen Ackerboden (mit der Hacke auf Gras).');
        return;
      }
      this.world.setBlock(p.x, p.y, p.z, it.places, { stage: 0 });
      if (survival) this.inv.consumeSelected();
      sfx.place();
      return;
    }

    // 5. Block setzen
    if (!it || !it.block) return;
    const bdef = it.block;
    if (t.type === 'ground' && this.world.groundState(t.x, t.z).depth > 0 && bdef.shape === 'cube' && bdef.solid && !bdef.transparent && !bdef.use) {
      this.world.fillGround(t.x, t.z);
      if (survival) this.inv.consumeSelected();
      sfx.place();
      return;
    }
    const p = t.type === 'ground' ? { x: t.x, y: 0, z: t.z } : { x: t.x + t.normal.x, y: t.y + t.normal.y, z: t.z + t.normal.z };
    if (p.y < 0 || p.y > 60 || this.world.getBlock(p.x, p.y, p.z)) return;
    const pp = this.playerPos();
    const cam = this.cameraPos();
    const inCell = (q) => Math.floor(q.x) === p.x && Math.floor(q.z) === p.z;
    if (bdef.solid && ((inCell(pp) && p.y <= 1) || (inCell(cam) && Math.floor(cam.y) === p.y))) return;
    for (const m of this.mobs.list) if (bdef.solid && inCell(m) && p.y >= Math.floor(m.y) && p.y < m.y + m.def.h) return;
    const below = p.y === 0 ? this.world.groundTop(p.x, p.z) : this.world.getBlock(p.x, p.y - 1, p.z) && this.world.getBlock(p.x, p.y - 1, p.z).id;
    if (bdef.plant === 'tree' && !['grass', 'dirt', 'farmland'].includes(below)) {
      this.ui.actionbar('Setzlinge brauchen Erde oder Gras.');
      return;
    }
    let data = null;
    if (bdef.facing || bdef.use === 'chest' || bdef.use === 'furnace') {
      const desired = normDeg(this.heading + 180);
      data = { facing: Math.round(((540 - desired) % 360) / 90) % 4 };
      if (bdef.use === 'chest') data.items = new Array(27).fill(null);
      if (bdef.use === 'furnace') Object.assign(data, { items: [null, null, null], burn: 0, burnMax: 0, cook: 0 });
    }
    this.world.setBlock(p.x, p.y, p.z, held.id, data);
    if (held.id === 'furnace') this.furnaces.add(`${p.x},${p.y},${p.z}`);
    if (survival) this.inv.consumeSelected();
    sfx.place();
  }

  sleep() {
    this.spawn = { lat: this.latlng.lat, lng: this.latlng.lng, heading: this.heading };
    this.minimap.setSpawn(this.spawn.lat, this.spawn.lng);
    if (!this.day.isNight()) {
      this.ui.actionbar('Spawnpunkt gesetzt. Schlafen kannst du nur nachts.', 3);
      return;
    }
    const pp = this.playerPos();
    if (this.mobs.list.some((m) => m.def.hostile && Math.hypot(m.x - pp.x, m.z - pp.z) < 10)) {
      this.ui.actionbar('Du kannst jetzt nicht schlafen, es sind Monster in der Nähe.', 3);
      return;
    }
    const fade = $('sleepfade');
    fade.classList.add('on');
    setTimeout(() => {
      this.day.skipNight();
      this.mobs.list.filter((m) => m.def.hostile).forEach((m) => this.mobs.remove(m));
      fade.classList.remove('on');
      this.ui.actionbar('Guten Morgen, Mittelsachsen!', 3);
    }, 1500);
  }

  onCrafted(id) {
    sfx.pop();
    if (id === 'crafting_table') this.ui.chat('Tipp: Werkbank in die Hotbar legen, setzen (Rechtsklick) und benutzen.', 'info');
  }

  // --- Gegenstände -----------------------------------------------------------

  dropSelected(all) {
    const s = this.inv.selectedStack();
    if (!s) return;
    const n = all ? s.count : 1;
    this.dropStack({ ...s, count: n });
    s.count -= n;
    if (s.count <= 0) this.inv.slots[this.inv.selected] = null;
  }

  dropStack(stack) {
    const pp = this.playerPos();
    const v = headingVector(this.heading);
    const d = this.overlay.spawnDrop(stack.id, stack.count, pp.x + v.x * 0.6, pp.y + 1.3, pp.z + v.z * 0.6, stack.dmg);
    d.vx = v.x * 4;
    d.vz = v.z * 4;
    d.pickupDelay = 1.5;
  }

  // Gegenstände in der Nähe fliegen zur Figur (man kann in Street View ja nicht frei hinlaufen).
  pickupDrops(dt) {
    const pp = this.playerPos();
    const target = { x: pp.x, y: pp.y + 0.9, z: pp.z };
    for (const d of [...this.overlay.drops]) {
      if (d.age > 300) {
        this.overlay.removeDrop(d);
        continue;
      }
      if (d.age < (d.pickupDelay || 0.4) || this.dead) continue;
      const dx = target.x - d.x;
      const dy = target.y - d.y;
      const dz = target.z - d.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist > 8 || !this.inventoryFits(d)) {
        d.magnet = false;
        continue;
      }
      if (dist > 0.7) {
        d.magnet = true;
        const step = Math.min(dist, (4 + d.age * 6) * dt);
        d.x += (dx / dist) * step;
        d.y += (dy / dist) * step;
        d.z += (dz / dist) * step;
        continue;
      }
      let left;
      if (d.dmg) {
        const idx = this.inv.slots.findIndex((s) => !s);
        this.inv.slots[idx] = { id: d.id, count: 1, dmg: d.dmg };
        left = 0;
      } else left = this.inv.add(d.id, d.count);
      sfx.pop();
      if (left === 0) this.overlay.removeDrop(d);
      else {
        d.count = left;
        d.magnet = false;
      }
    }
  }

  inventoryFits(d) {
    if (this.inv.slots.some((s) => !s)) return true;
    return !d.dmg && this.inv.slots.some((s) => s && s.id === d.id && !s.dmg && s.count < maxStack(d.id));
  }

  // --- Schaden, Tod, Explosion ----------------------------------------------

  damagePlayer(amount, fromX, fromZ, source) {
    if (this.gamemode === 'creative' || this.dead) return;
    const died = this.survival.damage(amount);
    this.ui.hurtFlash();
    sfx.hurt();
    const by = { Zombie: 'einem Zombie', Skelett: 'einem Skelett', Creeper: 'einem Creeper' };
    if (died) this.die(source === 'Hunger' ? 'Du bist verhungert.' : `Du wurdest von ${by[source] || source} getötet.`);
  }

  die(message) {
    if (this.dead) return;
    this.dead = true;
    this.survival.health = 0;
    const pp = this.playerPos();
    if (this.gamemode === 'survival') {
      for (const s of this.inv.slots) if (s) this.overlay.spawnDrop(s.id, s.count, pp.x, pp.y + 1, pp.z, s.dmg);
      this.inv.clear();
    }
    $('death-msg').textContent = message;
    this.unlock();
    this.ui.showScreen('death', true);
  }

  async respawn() {
    this.ui.showScreen('death', false);
    this.survival.reset();
    this.dead = false;
    await this.teleport(this.spawn.lat, this.spawn.lng, this.spawn.heading);
    this.lock();
  }

  explode(x, y, z, power) {
    sfx.explode();
    this.overlay.spawnPuff(x, y - 0.5, z, 0x9a9a9a, 40);
    const r = power * 0.85;
    for (let dx = -3; dx <= 3; dx++) {
      for (let dy = -3; dy <= 3; dy++) {
        for (let dz = -3; dz <= 3; dz++) {
          const bx = Math.floor(x) + dx;
          const by = Math.floor(y) + dy;
          const bz = Math.floor(z) + dz;
          if (by < 0 || Math.hypot(bx + 0.5 - x, by + 0.5 - y, bz + 0.5 - z) > r) continue;
          const b = this.world.getBlock(bx, by, bz);
          if (!b || b.id === 'bedrock') continue;
          if (Math.random() < 0.3) for (const d of blockDrops(b.id, 'diamond_pickaxe', b.data)) this.overlay.spawnDrop(d.id, d.count, bx + 0.5, by + 0.5, bz + 0.5);
          this.world.setBlock(bx, by, bz, null);
        }
      }
    }
    const pp = this.playerPos();
    const d = Math.hypot(pp.x - x, pp.z - z);
    if (d < power * 2) this.damagePlayer(Math.round((1 - d / (power * 2)) * 7 * power), x, z, 'Creeper');
    for (const m of [...this.mobs.list]) {
      const md = Math.hypot(m.x - x, m.z - z);
      if (md < power * 2) this.mobs.hit(m, Math.round((1 - md / (power * 2)) * 7 * power), x, z);
    }
  }

  // --- Ofen, Pflanzen --------------------------------------------------------

  updateFurnaces(dt) {
    for (const key of [...this.furnaces]) {
      const b = this.world.blocks.get(key);
      if (!b || b.id !== 'furnace') {
        this.furnaces.delete(key);
        continue;
      }
      const d = b.data;
      if (!d || !d.items) continue;
      const [input, fuel, out] = d.items;
      const result = input && smeltResult(input.id);
      const canOut = !!result && (!out || (out.id === result && out.count < maxStack(result)));
      if (d.burn > 0) d.burn = Math.max(0, d.burn - dt);
      if (d.burn <= 0 && canOut && fuel && getItem(fuel.id).fuel) {
        d.burn = d.burnMax = getItem(fuel.id).fuel;
        fuel.count -= 1;
        if (fuel.count <= 0) d.items[1] = null;
      }
      if (d.burn > 0 && canOut) {
        d.cook = (d.cook || 0) + dt;
        if (d.cook >= SMELT_TIME) {
          d.cook = 0;
          input.count -= 1;
          if (input.count <= 0) d.items[0] = null;
          if (out) out.count += 1;
          else d.items[2] = { id: result, count: 1 };
        }
      } else d.cook = Math.max(0, (d.cook || 0) - dt * 2);
      const lit = d.burn > 0;
      if (lit !== !!d.lit) {
        d.lit = lit;
        const [x, y, z] = key.split(',').map(Number);
        this.overlay.syncBlock(x, y, z);
      }
    }
  }

  randomTicks() {
    const c = this.camPos;
    for (const b of this.world.blocksNear(c.x, c.z, 48)) {
      if (b.id === 'wheat_crop') {
        const stage = (b.data && b.data.stage) || 0;
        if (stage < 7 && Math.random() < 0.05) {
          const blk = this.world.getBlock(b.x, b.y, b.z);
          blk.data = { stage: stage + 1 };
          this.world.markEdited(b.x, b.y, b.z);
          this.overlay.syncBlock(b.x, b.y, b.z);
        }
      } else if (b.id === 'oak_sapling' && Math.random() < 0.015) {
        this.world.setBlock(b.x, b.y, b.z, null);
        this.world.growOak(b.x, b.y, b.z, true);
      }
    }
  }

  // --- Speichern -------------------------------------------------------------

  saveData() {
    return {
      version: 1,
      savedAt: new Date().toISOString(),
      world: this.world.toJSON(),
      inventory: this.inv.toJSON(),
      survival: this.survival.toJSON(),
      time: this.day.time,
      gamemode: this.gamemode,
      spawn: this.spawn,
      player: { lat: this.latlng.lat, lng: this.latlng.lng, heading: this.heading, pitch: this.pitch },
    };
  }

  save() {
    if (this.skipSave || !this.world || !this.latlng) return;
    if (!writeSave(this.saveData())) this.ui.chat('Speichern fehlgeschlagen (Speicher voll?). Nutze „Exportieren“ im Menü.', 'error');
  }

  // --- Hauptschleife -----------------------------------------------------------

  loop(now) {
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.fps = this.fps * 0.95 + (1 / Math.max(dt, 0.001)) * 0.05;
    try {
      this.step(dt, now / 1000);
    } catch (err) {
      console.error(err);
    }
    requestAnimationFrame((t) => this.loop(t));
  }

  step(dt, time) {
    // Kamera weich zum neuen Panorama gleiten lassen
    if (this.tween) {
      const tw = this.tween;
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.dur);
      const e = k * k * (3 - 2 * k);
      this.camPos = { x: tw.from.x + (tw.to.x - tw.from.x) * e, z: tw.from.z + (tw.to.z - tw.from.z) * e };
      if (k >= 1) this.tween = null;
    }
    if (this.locked()) this.handleHeldKeys();
    if (this.sv.kind === 'google' && (this.heading !== this.lastPov?.h || this.pitch !== this.lastPov?.p)) {
      this.sv.setPov(this.heading, this.pitch);
      this.lastPov = { h: this.heading, p: this.pitch };
    }

    this.overlay.setCamera(this.cameraPos(), this.heading, this.pitch, this.settings.hfov);
    this.updateTarget();
    this.attackCooldown -= dt;
    if (!this.anyScreen()) {
      this.updateMining(dt);
      if (this.rightDown) {
        this.useCooldown -= dt;
        if (this.useCooldown <= 0) {
          this.useCooldown = 0.25;
          this.use();
        }
      }
    }
    this.overlay.setTarget(this.anyScreen() ? null : this.target, this.mining.progress);

    // Zeit, Licht, Hunger
    this.day.update(dt);
    const b = this.day.brightness();
    this.overlay.setBrightness(b);
    this.ui.setNight((1 - b) * 0.95);
    if (this.gamemode === 'survival' && !this.dead) {
      const starve = this.survival.update(dt);
      if (starve) this.damagePlayer(starve, 0, 0, 'Hunger');
    }

    const pp = this.playerPos();
    this.mobs.update(dt, { player: pp, night: this.day.isNight(), peaceful: this.gamemode === 'creative' });
    this.character.setHeld(this.inv.selectedId());
    this.character.update(dt, pp, this.heading, this.pitch, !!this.tween, this.thirdPerson);
    this.updateFurnaces(dt);
    this.pickupDrops(dt);
    this.overlay.update(dt, time);

    this.tickTimer += dt;
    if (this.tickTimer >= 1) {
      this.tickTimer = 0;
      this.randomTicks();
      this.minimap.update(this.latlng.lat, this.latlng.lng, this.heading);
    }
    this.saveTimer += dt;
    if (this.saveTimer >= 30) {
      this.saveTimer = 0;
      this.save();
    }

    // Oberfläche
    this.ui.tick(dt);
    this.ui.updateHUD();
    $('clickhint').style.display = !this.locked() && !this.anyScreen() && !$('pause').classList.contains('open') ? 'flex' : 'none';
    this.ui.setPlace(`${nearestTown(this.latlng.lat, this.latlng.lng)} · ${BIOME_NAMES[this.biome] || ''} · ${this.day.clock()} Uhr`);
    if (!$('debug').classList.contains('hidden')) this.ui.setDebug(this.debugText());
    this.overlay.render(!this.thirdPerson);
  }

  debugText() {
    const c = this.camPos;
    const t = this.target;
    const tt = !t ? '–' : t.type === 'mob' ? `${t.mob.def.name} (${t.mob.hp} HP)` : `${t.type} ${t.x} ${t.y} ${t.z} ${itemName(this.targetMaterial(t))}`;
    return [
      `StreetCraft Mittelsachsen  ${Math.round(this.fps)} fps`,
      `Breite/Länge: ${this.latlng.lat.toFixed(6)}, ${this.latlng.lng.toFixed(6)}`,
      `XYZ: ${c.x.toFixed(1)} / ${this.camHeight().toFixed(1)} / ${c.z.toFixed(1)}`,
      `Blick: ${this.heading.toFixed(0)}° / ${this.pitch.toFixed(0)}°  FOV ${this.settings.hfov}°`,
      `Biom: ${BIOME_NAMES[this.biome]}  Panorama: ${this.sv.currentPano()}`,
      `Ziel: ${tt}`,
      `Mobs: ${this.mobs.list.length}  Blöcke: ${this.world.blocks.size}  Drops: ${this.overlay.drops.length}`,
      `Zeit: ${Math.floor(this.day.time)} (${this.day.clock()})`,
    ].join('\n');
  }
}

// --- Startbildschirm -----------------------------------------------------------

function initStartScreen() {
  const sel = $('start-place');
  for (const p of PLACES) {
    const o = document.createElement('option');
    o.value = p.id;
    o.textContent = p.name;
    sel.appendChild(o);
  }
  const keyInput = $('start-key');
  try {
    keyInput.value = localStorage.getItem(API_KEY_STORAGE) || '';
  } catch {
    /* egal */
  }
  const saved = hasSave();
  $('btn-continue').style.display = saved ? '' : 'none';
  if (saved) {
    const s = loadSave();
    $('save-info').textContent = s && s.savedAt ? `Gespeichert: ${new Date(s.savedAt).toLocaleString('de-DE')}` : '';
  }
  $('start-skin').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const err = await storeSkinFile(f);
    $('start-error').textContent = err || 'Skin gespeichert ✔';
  });

  const run = async (backend, continueSave) => {
    const key = keyInput.value.trim();
    if (backend === 'google' && !key) {
      $('start-error').textContent = 'Bitte deinen Google-Maps-API-Schlüssel eintragen (siehe Anleitung) – oder den Testmodus nutzen.';
      return;
    }
    if (!continueSave && hasSave() && !confirm('Neue Welt starten? Der bisherige Spielstand wird überschrieben.')) return;
    if (!continueSave) deleteSave();
    try {
      if ($('start-remember').checked && key) localStorage.setItem(API_KEY_STORAGE, key);
      if (!$('start-remember').checked) localStorage.removeItem(API_KEY_STORAGE);
    } catch {
      /* egal */
    }
    $('start-error').textContent = '';
    $('loading').classList.add('open');
    $('hud').classList.add('on'); // vor dem Start sichtbar, damit die Minikarte ihre Größe kennt
    const game = new Game();
    window.streetcraft = game;
    try {
      await game.start({
        backend,
        apiKey: key,
        placeId: continueSave ? null : sel.value,
        gamemode: $('start-mode').value,
        continueSave,
      });
      $('start').classList.remove('open');
    } catch (err) {
      console.error(err);
      $('start-error').textContent = err.message || String(err);
      game.skipSave = true;
      setTimeout(() => location.reload(), 4000);
      $('start-error').textContent += ' (Seite wird neu geladen …)';
    } finally {
      $('loading').classList.remove('open');
    }
  };
  const backend = () => ($('start-demo').checked ? 'demo' : 'google');
  $('btn-play').addEventListener('click', () => run(backend(), false));
  $('btn-continue').addEventListener('click', () => run(backend(), true));
  if (new URLSearchParams(location.search).has('demo')) $('start-demo').checked = true;
}

initStartScreen();
