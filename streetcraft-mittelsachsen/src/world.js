// Blockwelt: gesetzte Blöcke, erzeugte Bäume, gegrabene Löcher im Boden.
// Ohne DOM, auch in Node testbar.

import { getItem } from './items.js';
import { hashFloat } from './util.js';
import { CHUNK_SIZE, MAX_DIG_DEPTH } from './config.js';

export function blockKey(x, y, z) {
  return `${x},${y},${z}`;
}
export function groundKey(x, z) {
  return `${x},${z}`;
}
export function chunkOf(x, z) {
  return { cx: Math.floor(x / CHUNK_SIZE), cz: Math.floor(z / CHUNK_SIZE) };
}

const TREE_DENSITY = { forest: 0.014, park: 0.006, plains: 0.0018, farmland: 0.001, river: 0.003, town: 0.0009, quarry: 0.0008 };

export class World {
  constructor(seed = 12345, opts = {}) {
    this.seed = seed >>> 0;
    this.blocks = new Map(); // key -> { id, data }
    this.edits = new Map(); // key -> { id, data } | null (vom Spieler geändert)
    this.ground = new Map(); // "x,z" -> { depth, farmland }
    this.chunkBiomes = new Map(); // "cx,cz" -> Biom
    this.generated = new Set();
    this.skippedTrees = new Set(); // Bäume, die direkt auf der Straße gelandet wären
    this.miningCheck = opts.miningCheck || (() => false);
    this.listeners = [];
  }

  onChange(fn) {
    this.listeners.push(fn);
  }

  emit(evt) {
    for (const fn of this.listeners) fn(evt);
  }

  getBlock(x, y, z) {
    return this.blocks.get(blockKey(x, y, z)) || null;
  }

  // Block setzen (id = null entfernt). edit=false für automatisch erzeugte Blöcke.
  setBlock(x, y, z, id, data = null, edit = true) {
    const key = blockKey(x, y, z);
    if (id) {
      const b = { id, data };
      this.blocks.set(key, b);
      if (edit) this.edits.set(key, b);
    } else {
      this.blocks.delete(key);
      if (edit) this.edits.set(key, null);
    }
    this.emit({ type: 'block', x, y, z, key });
  }

  // Nach Änderungen an block.data aufrufen, damit sie gespeichert werden.
  markEdited(x, y, z) {
    const key = blockKey(x, y, z);
    const b = this.blocks.get(key);
    if (b) this.edits.set(key, b);
  }

  isSolid(x, y, z) {
    if (y < 0) return true;
    const b = this.getBlock(x, y, z);
    if (!b) return false;
    const it = getItem(b.id);
    return !!(it && it.block && it.block.solid);
  }

  // Wie hoch ist der Stapel fester Blöcke ab dem Boden (für Mobs)?
  columnHeight(x, z) {
    let h = 0;
    while (h < 64 && this.isSolid(x, h, z)) h++;
    return h;
  }

  biomeAt(x, z) {
    const { cx, cz } = chunkOf(x, z);
    return this.chunkBiomes.get(`${cx},${cz}`) || 'plains';
  }

  // Erzeugt Bäume usw. für einen Chunk (nur einmal pro Sitzung).
  // avoid: Punkt { x, z }, in dessen Nähe keine Bäume entstehen (dort steht die Kamera).
  ensureChunk(cx, cz, biome, avoid = null) {
    const ck = `${cx},${cz}`;
    if (!this.chunkBiomes.has(ck)) this.chunkBiomes.set(ck, biome);
    if (this.generated.has(ck)) return false;
    this.generated.add(ck);
    const b = this.chunkBiomes.get(ck);
    const density = TREE_DENSITY[b] ?? 0.002;
    const trees = [];
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      for (let lz = 0; lz < CHUNK_SIZE; lz++) {
        const x = cx * CHUNK_SIZE + lx;
        const z = cz * CHUNK_SIZE + lz;
        if (hashFloat(this.seed, x, z, 7) >= density) continue;
        if (trees.some((t) => Math.abs(t.x - x) < 4 && Math.abs(t.z - z) < 4)) continue;
        const tk = `${x},${z}`;
        if (avoid && Math.hypot(avoid.x - x, avoid.z - z) < 7) this.skippedTrees.add(tk);
        if (this.skippedTrees.has(tk)) continue;
        trees.push({ x, z });
        const spruceChance = b === 'forest' ? 0.45 : 0.12;
        if (hashFloat(this.seed, x, z, 8) < spruceChance) this.growSpruce(x, 0, z, false);
        else this.growOak(x, 0, z, false);
      }
    }
    return true;
  }

  placeGenerated(x, y, z, id, edit) {
    const key = blockKey(x, y, z);
    if (!edit && this.edits.has(key)) return;
    if (this.blocks.has(key) && id.endsWith('leaves')) return;
    this.setBlock(x, y, z, id, null, edit);
  }

  growOak(x, y, z, edit = true) {
    const h = 4 + Math.floor(hashFloat(this.seed, x, z, 9) * 3);
    const top = y + h;
    for (let dy = top - 2; dy <= top + 1; dy++) {
      const r = dy <= top - 1 ? 2 : 1;
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          const corner = Math.abs(dx) === r && Math.abs(dz) === r;
          if (corner && (dy === top + 1 || hashFloat(this.seed, x + dx, dy, z + dz) < 0.5)) continue;
          if (dx === 0 && dz === 0 && dy < top) continue;
          this.placeGenerated(x + dx, dy, z + dz, 'oak_leaves', edit);
        }
      }
    }
    for (let i = 0; i < h; i++) this.setLog(x, y + i, z, 'oak_log', edit);
  }

  growSpruce(x, y, z, edit = true) {
    const h = 6 + Math.floor(hashFloat(this.seed, x, z, 10) * 3);
    const top = y + h;
    let r = 1;
    for (let dy = top; dy >= y + 2; dy--) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dz = -r; dz <= r; dz++) {
          if (Math.abs(dx) + Math.abs(dz) > r + (r > 1 ? 1 : 0)) continue;
          if (dx === 0 && dz === 0) continue;
          this.placeGenerated(x + dx, dy, z + dz, 'spruce_leaves', edit);
        }
      }
      r = r === 1 ? 2 : 1;
      if (dy < y + 4) r = 1;
    }
    this.placeGenerated(x, top + 1, z, 'spruce_leaves', edit);
    for (let i = 0; i <= h; i++) this.setLog(x, y + i, z, 'spruce_log', edit);
  }

  setLog(x, y, z, id, edit) {
    const key = blockKey(x, y, z);
    if (!edit && this.edits.has(key)) return;
    this.setBlock(x, y, z, id, null, edit);
  }

  // --- Boden ------------------------------------------------------------

  groundState(x, z) {
    return this.ground.get(groundKey(x, z)) || { depth: 0, farmland: false };
  }

  // Material in einer bestimmten Tiefe (0 = Oberfläche).
  groundLayer(x, z, depth) {
    if (depth >= MAX_DIG_DEPTH) return 'bedrock';
    const biome = this.biomeAt(x, z);
    const r = hashFloat(this.seed, x, z, depth, 99);
    if (depth === 0) {
      if (biome === 'town') return 'cobblestone';
      if (biome === 'river') return 'sand';
      if (biome === 'quarry') return 'gravel';
      return 'grass';
    }
    if (depth <= 2) {
      if (biome === 'river') return r < 0.3 ? 'clay' : r < 0.6 ? 'gravel' : 'sand';
      if (biome === 'quarry') return 'stone';
      return depth === 2 && r < 0.15 ? 'gravel' : 'dirt';
    }
    let t = 0;
    if (depth >= 16 && r < (t += 0.006)) return 'diamond_ore';
    if (depth >= 10 && r < (t += 0.012)) return 'gold_ore';
    if (depth >= 5 && this.miningCheck(x, z) && r < (t += 0.06)) return 'silver_ore';
    if (depth >= 4 && r < (t += 0.045)) return 'iron_ore';
    if (r < (t += 0.075)) return 'coal_ore';
    return 'stone';
  }

  // Was liegt gerade oben im Loch?
  groundTop(x, z) {
    const g = this.groundState(x, z);
    if (g.farmland) return 'farmland';
    return this.groundLayer(x, z, g.depth);
  }

  // Eine Schicht abgraben. Gibt die abgebaute Block-id zurück (oder null).
  digGround(x, z) {
    const g = { ...this.groundState(x, z) };
    const mat = g.farmland ? 'farmland' : this.groundLayer(x, z, g.depth);
    if (mat === 'bedrock') return null;
    if (g.farmland) g.farmland = false;
    g.depth += 1;
    this.ground.set(groundKey(x, z), g);
    this.emit({ type: 'ground', x, z });
    return mat;
  }

  // Loch wieder zuschütten (z. B. Block in ein Loch setzen).
  fillGround(x, z) {
    const g = { ...this.groundState(x, z) };
    if (g.depth <= 0) return false;
    g.depth -= 1;
    g.farmland = false;
    this.ground.set(groundKey(x, z), g);
    this.emit({ type: 'ground', x, z });
    return true;
  }

  tillGround(x, z) {
    const g = this.groundState(x, z);
    const top = this.groundTop(x, z);
    if (top !== 'grass' && top !== 'dirt') return false;
    if (this.getBlock(x, 0, z)) return false;
    this.ground.set(groundKey(x, z), { ...g, farmland: true });
    this.emit({ type: 'ground', x, z });
    return true;
  }

  // --- Strahlverfolgung (DDA) -------------------------------------------
  // Gibt den ersten getroffenen Block oder Boden zurück.
  raycast(o, d, maxDist) {
    let x = Math.floor(o.x);
    let y = Math.floor(o.y);
    let z = Math.floor(o.z);
    const stepX = Math.sign(d.x);
    const stepY = Math.sign(d.y);
    const stepZ = Math.sign(d.z);
    const tDX = stepX ? Math.abs(1 / d.x) : Infinity;
    const tDY = stepY ? Math.abs(1 / d.y) : Infinity;
    const tDZ = stepZ ? Math.abs(1 / d.z) : Infinity;
    let tMX = stepX > 0 ? (x + 1 - o.x) * tDX : stepX < 0 ? (o.x - x) * tDX : Infinity;
    let tMY = stepY > 0 ? (y + 1 - o.y) * tDY : stepY < 0 ? (o.y - y) * tDY : Infinity;
    let tMZ = stepZ > 0 ? (z + 1 - o.z) * tDZ : stepZ < 0 ? (o.z - z) * tDZ : Infinity;
    let t = 0;
    let normal = { x: 0, y: 0, z: 0 };
    const startBlock = y >= 0 && this.getBlock(x, y, z);
    if (startBlock) return { type: 'block', x, y, z, normal, dist: 0, block: startBlock };
    for (let i = 0; i < 256; i++) {
      if (tMX < tMY && tMX < tMZ) {
        x += stepX;
        t = tMX;
        tMX += tDX;
        normal = { x: -stepX, y: 0, z: 0 };
      } else if (tMY < tMZ) {
        y += stepY;
        t = tMY;
        tMY += tDY;
        normal = { x: 0, y: -stepY, z: 0 };
      } else {
        z += stepZ;
        t = tMZ;
        tMZ += tDZ;
        normal = { x: 0, y: 0, z: -stepZ };
      }
      if (t > maxDist) return null;
      if (y < 0) return { type: 'ground', x, y: -1, z, normal, dist: t };
      const b = this.getBlock(x, y, z);
      if (b) return { type: 'block', x, y, z, normal, dist: t, block: b };
    }
    return null;
  }

  // Alle Blöcke in einem Quadrat um (x, z).
  *blocksNear(x, z, radius) {
    for (const [key, b] of this.blocks) {
      const [bx, by, bz] = key.split(',').map(Number);
      if (Math.abs(bx - x) <= radius && Math.abs(bz - z) <= radius) yield { x: bx, y: by, z: bz, ...b };
    }
  }

  // --- Speichern -------------------------------------------------------
  toJSON() {
    return {
      seed: this.seed,
      edits: [...this.edits].map(([k, b]) => (b ? [k, b.id, b.data] : [k, null])),
      ground: [...this.ground].map(([k, g]) => [k, g.depth, g.farmland ? 1 : 0]),
      biomes: [...this.chunkBiomes],
      skipped: [...this.skippedTrees],
    };
  }

  static fromJSON(data, opts = {}) {
    const w = new World(data && data.seed != null ? data.seed : 12345, opts);
    if (!data) return w;
    for (const [k, b] of data.biomes || []) w.chunkBiomes.set(k, b);
    for (const k of data.skipped || []) w.skippedTrees.add(k);
    for (const [k, depth, farm] of data.ground || []) w.ground.set(k, { depth, farmland: !!farm });
    for (const [k, id, d] of data.edits || []) {
      if (id && !getItem(id)) continue;
      const b = id ? { id, data: d ?? null } : null;
      w.edits.set(k, b);
      if (b) w.blocks.set(k, b);
    }
    return w;
  }
}
