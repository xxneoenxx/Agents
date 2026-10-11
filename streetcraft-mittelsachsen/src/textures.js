// Prozedurale Pixeltexturen im Minecraft-Stil (alles selbst gezeichnet).

import { mulberry32, hash32, clamp } from './util.js';
import { getItem } from './items.js';

export function makeCanvas(w = 16, h = 16) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

function rngFor(name) {
  let h = 0;
  for (const ch of name) h = hash32(h, ch.charCodeAt(0));
  return mulberry32(h);
}

export function rgb(c, f = 1, a = 1) {
  const r = clamp(Math.round(c[0] * f), 0, 255);
  const g = clamp(Math.round(c[1] * f), 0, 255);
  const b = clamp(Math.round(c[2] * f), 0, 255);
  return a === 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`;
}

export function px(ctx, x, y, col) {
  ctx.fillStyle = col;
  ctx.fillRect(x, y, 1, 1);
}

export function noise(ctx, x0, y0, w, h, base, variance, rnd) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) px(ctx, x, y, rgb(base, 1 + (rnd() - 0.5) * variance));
  }
}

// --- Blocktexturen -------------------------------------------------------

const C = {
  dirt: [134, 96, 67],
  grass: [95, 159, 53],
  stone: [125, 125, 125],
  sand: [219, 207, 163],
  oakBark: [109, 85, 50],
  oakWood: [182, 146, 94],
  spruceBark: [58, 37, 16],
  spruceWood: [130, 96, 58],
  planks: [162, 130, 78],
};

function cobble(ctx, rnd, base, mortar) {
  const pts = Array.from({ length: 8 }, () => [rnd() * 16, rnd() * 16, 0.8 + rnd() * 0.4]);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      let d1 = Infinity,
        d2 = Infinity,
        best = 0;
      pts.forEach(([px_, py_], i) => {
        for (const ox of [-16, 0, 16]) {
          for (const oy of [-16, 0, 16]) {
            const d = Math.hypot(x - px_ - ox, y - py_ - oy);
            if (d < d1) {
              d2 = d1;
              d1 = d;
              best = i;
            } else if (d < d2) d2 = d;
          }
        }
      });
      if (d2 - d1 < 1.1) px(ctx, x, y, rgb(mortar, 0.9 + rnd() * 0.15));
      else px(ctx, x, y, rgb(base, pts[best][2] * (0.92 + rnd() * 0.16) * (d1 < 2 ? 1.08 : 1)));
    }
  }
}

function ore(ctx, rnd, color) {
  noise(ctx, 0, 0, 16, 16, C.stone, 0.18, rnd);
  for (let i = 0; i < 5; i++) {
    const cx = 2 + Math.floor(rnd() * 12);
    const cy = 2 + Math.floor(rnd() * 12);
    const n = 2 + Math.floor(rnd() * 3);
    for (let j = 0; j < n; j++) {
      const x = cx + Math.floor(rnd() * 3) - 1;
      const y = cy + Math.floor(rnd() * 3) - 1;
      px(ctx, x, y, rgb(color, 0.85 + rnd() * 0.3));
      if (rnd() < 0.4) px(ctx, x + 1, y, rgb(color, 0.6));
    }
  }
}

function logSide(ctx, rnd, bark) {
  for (let x = 0; x < 16; x++) {
    const col = 0.8 + rnd() * 0.35;
    for (let y = 0; y < 16; y++) px(ctx, x, y, rgb(bark, col * (0.9 + rnd() * 0.15)));
  }
}

function logTop(ctx, rnd, bark, wood) {
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const r = Math.max(Math.abs(x - 7.5), Math.abs(y - 7.5));
      if (r > 6.5) px(ctx, x, y, rgb(bark, 0.9 + rnd() * 0.2));
      else px(ctx, x, y, rgb(wood, (Math.floor(r) % 2 ? 0.85 : 1) * (0.95 + rnd() * 0.1)));
    }
  }
}

function planks(ctx, rnd, base = C.planks) {
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const row = Math.floor(y / 4);
      const seam = (x + row * 5) % 16 === 0;
      const line = y % 4 === 3;
      px(ctx, x, y, rgb(base, line || seam ? 0.7 : 0.92 + rnd() * 0.14));
    }
  }
}

function leaves(ctx, rnd, base) {
  ctx.clearRect(0, 0, 16, 16);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (rnd() < 0.22) continue;
      px(ctx, x, y, rgb(base, 0.7 + rnd() * 0.5));
    }
  }
}

function wheat(ctx, rnd, stage) {
  ctx.clearRect(0, 0, 16, 16);
  const t = stage / 7;
  const green = [70, 150, 40];
  const gold = [210, 180, 70];
  const col = green.map((g, i) => g + (gold[i] - g) * t);
  const h = 3 + Math.round(t * 11);
  for (const sx of [2, 5, 8, 11, 14]) {
    for (let y = 15; y > 15 - h; y--) px(ctx, sx + ((y + sx) % 3 === 0 ? 1 : 0), y, rgb(col, 0.85 + rnd() * 0.3));
    if (stage >= 6) {
      px(ctx, sx, 15 - h, rgb(gold, 1.1));
      px(ctx, sx + 1, 16 - h, rgb(gold, 0.9));
    }
  }
}

const GEN = {
  dirt(ctx, rnd) {
    noise(ctx, 0, 0, 16, 16, C.dirt, 0.25, rnd);
    for (let i = 0; i < 10; i++) px(ctx, Math.floor(rnd() * 16), Math.floor(rnd() * 16), rgb(C.dirt, 0.65));
  },
  grass_top(ctx, rnd) {
    noise(ctx, 0, 0, 16, 16, C.grass, 0.3, rnd);
  },
  grass_side(ctx, rnd) {
    GEN.dirt(ctx, rnd);
    for (let x = 0; x < 16; x++) {
      const h = 3 + (rnd() < 0.4 ? 1 : 0) + (rnd() < 0.15 ? 1 : 0);
      for (let y = 0; y < h; y++) px(ctx, x, y, rgb(C.grass, 0.8 + rnd() * 0.3));
    }
  },
  farmland(ctx, rnd) {
    noise(ctx, 0, 0, 16, 16, [96, 64, 42], 0.2, rnd);
    for (let y = 0; y < 16; y += 4) for (let x = 0; x < 16; x++) px(ctx, x, y, rgb([70, 45, 30], 0.9 + rnd() * 0.2));
  },
  sand(ctx, rnd) {
    noise(ctx, 0, 0, 16, 16, C.sand, 0.12, rnd);
  },
  clay(ctx, rnd) {
    noise(ctx, 0, 0, 16, 16, [160, 166, 179], 0.1, rnd);
  },
  gravel(ctx, rnd) {
    const tones = [[130, 125, 122], [100, 96, 95], [150, 140, 130], [115, 105, 100], [80, 78, 78]];
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) px(ctx, x, y, rgb(tones[Math.floor(rnd() * tones.length)]));
  },
  stone(ctx, rnd) {
    noise(ctx, 0, 0, 16, 16, C.stone, 0.18, rnd);
  },
  cobblestone(ctx, rnd) {
    cobble(ctx, rnd, [128, 128, 128], [70, 70, 70]);
  },
  bedrock(ctx, rnd) {
    const tones = [[40, 40, 40], [85, 85, 85], [120, 120, 120], [60, 60, 60]];
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) px(ctx, x, y, rgb(tones[Math.floor(rnd() * tones.length)]));
  },
  coal_ore: (ctx, rnd) => ore(ctx, rnd, [25, 25, 25]),
  iron_ore: (ctx, rnd) => ore(ctx, rnd, [216, 175, 147]),
  silver_ore: (ctx, rnd) => ore(ctx, rnd, [235, 238, 248]),
  gold_ore: (ctx, rnd) => ore(ctx, rnd, [252, 238, 75]),
  diamond_ore: (ctx, rnd) => ore(ctx, rnd, [93, 236, 245]),
  oak_log: (ctx, rnd) => logSide(ctx, rnd, C.oakBark),
  oak_log_top: (ctx, rnd) => logTop(ctx, rnd, C.oakBark, C.oakWood),
  spruce_log: (ctx, rnd) => logSide(ctx, rnd, C.spruceBark),
  spruce_log_top: (ctx, rnd) => logTop(ctx, rnd, C.spruceBark, C.spruceWood),
  planks: (ctx, rnd) => planks(ctx, rnd),
  oak_leaves: (ctx, rnd) => leaves(ctx, rnd, [60, 135, 40]),
  spruce_leaves: (ctx, rnd) => leaves(ctx, rnd, [40, 92, 55]),
  glass(ctx, rnd) {
    ctx.clearRect(0, 0, 16, 16);
    const frame = 'rgba(220,240,255,0.95)';
    for (let i = 0; i < 16; i++) {
      px(ctx, i, 0, frame);
      px(ctx, i, 15, frame);
      px(ctx, 0, i, frame);
      px(ctx, 15, i, frame);
    }
    for (let i = 0; i < 4; i++) px(ctx, 3 + i, 6 - i, 'rgba(255,255,255,0.8)');
    for (let i = 0; i < 3; i++) px(ctx, 9 + i, 12 - i, 'rgba(255,255,255,0.7)');
    ctx.fillStyle = 'rgba(200,230,255,0.12)';
    ctx.fillRect(1, 1, 14, 14);
    void rnd;
  },
  bricks(ctx, rnd) {
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const row = Math.floor(y / 4);
        const mortar = y % 4 === 3 || (x + (row % 2) * 4) % 8 === 7;
        px(ctx, x, y, mortar ? rgb([190, 180, 170], 0.9 + rnd() * 0.15) : rgb([150, 74, 58], 0.85 + rnd() * 0.3));
      }
    }
  },
  white_wool(ctx, rnd) {
    noise(ctx, 0, 0, 16, 16, [234, 236, 236], 0.1, rnd);
  },
  crafting_table_top(ctx, rnd) {
    planks(ctx, rnd, [150, 110, 60]);
    ctx.fillStyle = rgb([90, 60, 30]);
    ctx.fillRect(0, 0, 16, 1);
    ctx.fillRect(0, 15, 16, 1);
    ctx.fillRect(0, 0, 1, 16);
    ctx.fillRect(15, 0, 1, 16);
    ctx.fillRect(1, 7, 14, 1);
    ctx.fillRect(7, 1, 1, 14);
  },
  crafting_table_side(ctx, rnd) {
    planks(ctx, rnd);
    ctx.fillStyle = rgb([100, 70, 40]);
    ctx.fillRect(0, 0, 16, 3);
    ctx.fillStyle = rgb([150, 150, 150]);
    ctx.fillRect(3, 5, 1, 6); // Säge
    ctx.fillRect(4, 5, 3, 1);
    ctx.fillRect(10, 5, 3, 2); // Hammer
    ctx.fillStyle = rgb([110, 80, 40]);
    ctx.fillRect(11, 7, 1, 5);
  },
  crafting_table_front(ctx, rnd) {
    GEN.crafting_table_side(ctx, rnd);
  },
  furnace_top(ctx, rnd) {
    noise(ctx, 0, 0, 16, 16, [118, 118, 118], 0.15, rnd);
  },
  furnace_side(ctx, rnd) {
    noise(ctx, 0, 0, 16, 16, [110, 110, 110], 0.18, rnd);
    ctx.fillStyle = rgb([80, 80, 80]);
    ctx.fillRect(0, 0, 16, 1);
    ctx.fillRect(0, 15, 16, 1);
  },
  furnace_front(ctx, rnd) {
    GEN.furnace_side(ctx, rnd);
    ctx.fillStyle = rgb([30, 30, 30]);
    ctx.fillRect(4, 8, 8, 5);
    ctx.fillStyle = rgb([70, 70, 70]);
    ctx.fillRect(3, 4, 10, 2);
  },
  furnace_front_lit(ctx, rnd) {
    GEN.furnace_front(ctx, rnd);
    for (let x = 4; x < 12; x++) for (let y = 10; y < 13; y++) px(ctx, x, y, rnd() < 0.5 ? '#ffb030' : '#ff6a10');
  },
  chest_side(ctx, rnd) {
    noise(ctx, 0, 0, 16, 16, [160, 110, 50], 0.15, rnd);
    ctx.fillStyle = rgb([80, 50, 20]);
    ctx.fillRect(0, 0, 16, 1);
    ctx.fillRect(0, 15, 16, 1);
    ctx.fillRect(0, 0, 1, 16);
    ctx.fillRect(15, 0, 1, 16);
    ctx.fillRect(0, 5, 16, 1);
  },
  chest_front(ctx, rnd) {
    GEN.chest_side(ctx, rnd);
    ctx.fillStyle = rgb([200, 200, 200]);
    ctx.fillRect(7, 4, 2, 4);
    ctx.fillStyle = rgb([60, 60, 60]);
    ctx.fillRect(7, 7, 2, 1);
  },
  chest_top(ctx, rnd) {
    noise(ctx, 0, 0, 16, 16, [160, 110, 50], 0.15, rnd);
    ctx.fillStyle = rgb([80, 50, 20]);
    ctx.strokeStyle = rgb([80, 50, 20]);
    ctx.fillRect(0, 0, 16, 1);
    ctx.fillRect(0, 15, 16, 1);
    ctx.fillRect(0, 0, 1, 16);
    ctx.fillRect(15, 0, 1, 16);
  },
  bed_top(ctx, rnd) {
    noise(ctx, 0, 0, 16, 16, [165, 35, 35], 0.15, rnd);
    noise(ctx, 1, 1, 14, 4, [240, 240, 240], 0.06, rnd);
  },
  bed_side(ctx, rnd) {
    noise(ctx, 0, 0, 16, 16, [165, 35, 35], 0.15, rnd);
    ctx.fillStyle = rgb([235, 235, 235]);
    ctx.fillRect(0, 0, 16, 2);
  },
  oak_sapling(ctx, rnd) {
    ctx.clearRect(0, 0, 16, 16);
    ctx.fillStyle = rgb(C.oakBark);
    ctx.fillRect(7, 9, 2, 7);
    for (let i = 0; i < 40; i++) {
      const a = rnd() * Math.PI * 2;
      const r = rnd() * 5;
      px(ctx, Math.round(8 + Math.cos(a) * r), Math.round(6 + Math.sin(a) * r * 0.8), rgb([60, 140, 40], 0.7 + rnd() * 0.5));
    }
  },
  lantern(ctx, rnd) {
    noise(ctx, 0, 0, 16, 16, [255, 200, 90], 0.25, rnd);
    ctx.fillStyle = rgb([50, 55, 65]);
    ctx.fillRect(0, 0, 16, 2);
    ctx.fillRect(0, 14, 16, 2);
    ctx.fillRect(0, 0, 2, 16);
    ctx.fillRect(14, 0, 2, 16);
  },
};
for (let s = 0; s <= 7; s++) GEN[`wheat_${s}`] = (ctx, rnd) => wheat(ctx, rnd, s);

const texCache = new Map();
export function blockTextureCanvas(name) {
  if (texCache.has(name)) return texCache.get(name);
  const [c, ctx] = makeCanvas();
  const gen = GEN[name] || GEN.stone;
  gen(ctx, rngFor(name));
  texCache.set(name, c);
  return c;
}

// Welche Textur gehört auf welche Seite eines Blocks?
// face: 'top' | 'bottom' | 'side' | 'front'
export function faceTexture(blockId, face, data) {
  const it = getItem(blockId);
  if (blockId === 'wheat_crop') return `wheat_${Math.min(7, (data && data.stage) || 0)}`;
  if (!it || !it.block) return 'stone';
  const t = it.block.tex || {};
  if (blockId === 'furnace' && face === 'front' && data && data.burn > 0) return 'furnace_front_lit';
  return t[face] || (face === 'front' ? t.side : null) || t.side || t.all || blockId;
}

// Risse beim Abbauen (Stufe 0–9).
const crackCache = [];
export function crackCanvas(stage) {
  if (crackCache[stage]) return crackCache[stage];
  const [c, ctx] = makeCanvas();
  const rnd = mulberry32(1234);
  const lines = 2 + stage * 3;
  for (let i = 0; i < lines; i++) {
    let x = 8 + Math.floor(rnd() * 4) - 2;
    let y = 8 + Math.floor(rnd() * 4) - 2;
    const len = 2 + Math.floor(rnd() * (2 + stage));
    for (let j = 0; j < len; j++) {
      px(ctx, x & 15, y & 15, 'rgba(0,0,0,0.75)');
      x += Math.floor(rnd() * 3) - 1;
      y += Math.floor(rnd() * 3) - 1;
    }
  }
  crackCache[stage] = c;
  return c;
}

// --- Gegenstand-Symbole (32×32) -----------------------------------------

const TOOL_COLORS = {
  wooden: [150, 115, 65],
  stone: [135, 135, 135],
  iron: [225, 225, 225],
  diamond: [80, 225, 235],
};
const HANDLE = [115, 82, 42];

// s = entlang des Stiels (unten links → oben rechts), p = quer dazu.
function toolShape(type, s, p) {
  switch (type) {
    case 'pickaxe':
      return s >= 9.6 - 0.07 * p * p && s <= 11.8 - 0.07 * p * p && Math.abs(p) <= 6.2 ? 'm' : null;
    case 'axe':
      return s >= 7.5 && s <= 12 && p >= -4.6 && p <= 0.5 && s - p * 0.3 <= 13 ? 'm' : null;
    case 'shovel':
      return s >= 9 && s <= 13.6 && Math.abs(p) <= 2.3 - Math.max(0, s - 12.4) ? 'm' : null;
    case 'hoe':
      return s >= 10 && s <= 12 && p >= -4.4 && p <= 0.6 ? 'm' : null;
    case 'sword':
      if (s >= 4.5 && s <= 16.5 && Math.abs(p) <= 1.2) return 'm';
      if (s >= 3.2 && s < 4.5 && Math.abs(p) <= 3.2) return 'g';
      return null;
    default:
      return null;
  }
}

function drawTool(ctx, type, mat) {
  const col = TOOL_COLORS[mat];
  const handleLen = type === 'sword' ? 3.2 : 13.5;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - 2;
      const dy = y + 0.5 - 14;
      const s = (dx - dy) / Math.SQRT2;
      const p = (dx + dy) / Math.SQRT2;
      const part = toolShape(type, s, p);
      if (part === 'm') px(ctx, x, y, rgb(col, 0.8 + 0.35 * (p < 0 ? 1 : 0.6) - (Math.abs(p) > 4 ? 0.15 : 0)));
      else if (part === 'g') px(ctx, x, y, rgb([90, 70, 40]));
      else if (s >= 0 && s <= handleLen && Math.abs(p) <= 0.75) px(ctx, x, y, rgb(HANDLE, p < 0 ? 1.1 : 0.8));
    }
  }
}

function blob(ctx, cx, cy, rx, ry, col, opts = {}) {
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const nx = (x + 0.5 - cx) / rx;
      const ny = (y + 0.5 - cy) / ry;
      const d = nx * nx + ny * ny;
      if (d > 1) continue;
      let f = 1.05 - (nx + ny) * 0.18;
      if (d > 0.72) f *= 0.72;
      px(ctx, x, y, rgb(col, f));
    }
  }
  if (opts.highlight) px(ctx, Math.round(cx - rx / 2), Math.round(cy - ry / 2), 'rgba(255,255,255,0.85)');
}

function ingot(ctx, col) {
  for (let y = 6; y < 12; y++) {
    const inset = y < 9 ? 9 - y : 0;
    for (let x = 2 + inset; x < 14 - (y < 9 ? 0 : y - 8); x++) px(ctx, x, y, rgb(col, y < 9 ? 1.1 : y === 11 ? 0.65 : 0.85));
  }
}

function diagonalLine(ctx, from, to, width, colFn) {
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const dx = x + 0.5 - 2;
      const dy = y + 0.5 - 14;
      const s = (dx - dy) / Math.SQRT2;
      const p = (dx + dy) / Math.SQRT2;
      if (s >= from && s <= to && Math.abs(p) <= width) px(ctx, x, y, colFn(s, p));
    }
  }
}

const ICON_DRAW = {
  stick: (ctx) => diagonalLine(ctx, 1, 15, 0.75, (s, p) => rgb(HANDLE, p < 0 ? 1.1 : 0.8)),
  coal: (ctx) => blob(ctx, 8, 8.5, 5.5, 5, [40, 40, 40], { highlight: true }),
  charcoal: (ctx) => blob(ctx, 8, 8.5, 5.5, 5, [55, 45, 35], { highlight: true }),
  iron_ingot: (ctx) => ingot(ctx, [220, 220, 220]),
  gold_ingot: (ctx) => ingot(ctx, [250, 220, 70]),
  silver_ingot: (ctx) => ingot(ctx, [205, 215, 235]),
  brick: (ctx) => ingot(ctx, [170, 85, 60]),
  diamond(ctx) {
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const d = Math.abs(x + 0.5 - 8) + Math.abs(y + 0.5 - 8) * 1.15;
        if (d <= 6.5) px(ctx, x, y, rgb([90, 230, 240], d > 5 ? 0.6 : 1 + (x < 8 && y < 8 ? 0.15 : 0)));
      }
    }
    px(ctx, 6, 6, '#fff');
  },
  flint: (ctx) => blob(ctx, 8, 9, 4.5, 5.5, [70, 70, 75], { highlight: true }),
  clay_ball: (ctx) => blob(ctx, 8, 8.5, 5, 4.5, [160, 166, 179], { highlight: true }),
  wheat(ctx) {
    for (const [x0, h] of [[5, 11], [8, 13], [11, 10]]) {
      for (let y = 15; y > 15 - h; y--) px(ctx, x0 + ((15 - y) > h - 4 ? 1 : 0), y, rgb([210, 180, 70], 0.8 + (y % 2) * 0.3));
    }
  },
  seeds(ctx) {
    for (const [x, y] of [[5, 6], [9, 5], [7, 9], [11, 9], [4, 11], [8, 12], [12, 12]]) {
      px(ctx, x, y, rgb([90, 160, 50]));
      px(ctx, x + 1, y, rgb([60, 110, 35]));
    }
  },
  bone(ctx) {
    diagonalLine(ctx, 3, 13, 0.9, () => rgb([235, 230, 210]));
    blob(ctx, 3.3, 12.7, 1.6, 1.6, [235, 230, 210]);
    blob(ctx, 12.7, 3.3, 1.6, 1.6, [235, 230, 210]);
  },
  string(ctx) {
    for (let x = 2; x < 14; x++) px(ctx, x, Math.round(8 + Math.sin(x * 0.9) * 3), rgb([240, 240, 240]));
  },
  gunpowder(ctx) {
    const rnd = mulberry32(5);
    for (let i = 0; i < 45; i++) {
      const a = rnd() * Math.PI * 2;
      const r = rnd() * 5;
      px(ctx, Math.round(8 + Math.cos(a) * r), Math.round(9 + Math.sin(a) * r * 0.7), rgb([80, 80, 80], 0.6 + rnd() * 0.8));
    }
  },
  leather: (ctx) => blob(ctx, 8, 8, 6, 5, [150, 85, 45]),
  arrow(ctx) {
    diagonalLine(ctx, 2, 14, 0.6, () => rgb(HANDLE));
    blob(ctx, 13, 3, 1.6, 1.6, [160, 160, 160]);
    blob(ctx, 3, 13, 1.6, 1.6, [240, 240, 240]);
  },
  apple(ctx) {
    blob(ctx, 8, 9.5, 5.5, 5, [210, 30, 30], { highlight: true });
    px(ctx, 8, 3, rgb([90, 60, 30]));
    px(ctx, 8, 4, rgb([90, 60, 30]));
    px(ctx, 9, 3, rgb([60, 150, 40]));
    px(ctx, 10, 3, rgb([60, 150, 40]));
  },
  bread(ctx) {
    blob(ctx, 8, 9, 6.5, 3.8, [200, 150, 80]);
    for (const x of [5, 8, 11]) px(ctx, x, 7, rgb([150, 100, 50]));
  },
  raw_beef: (ctx) => meat(ctx, [220, 90, 90]),
  steak: (ctx) => meat(ctx, [130, 75, 40]),
  raw_porkchop: (ctx) => meat(ctx, [240, 150, 150]),
  cooked_porkchop: (ctx) => meat(ctx, [190, 130, 80]),
  raw_mutton: (ctx) => meat(ctx, [200, 70, 70]),
  cooked_mutton: (ctx) => meat(ctx, [150, 90, 50]),
  rotten_flesh: (ctx) => blob(ctx, 8, 9, 5.5, 4.5, [110, 120, 60]),
  torch(ctx) {
    ctx.fillStyle = rgb(HANDLE);
    ctx.fillRect(7, 6, 2, 9);
    ctx.fillStyle = '#ffd040';
    ctx.fillRect(7, 3, 2, 3);
    ctx.fillStyle = '#ff8a20';
    ctx.fillRect(7, 5, 2, 1);
  },
};

function meat(ctx, col) {
  blob(ctx, 7.5, 8.5, 5.5, 4.5, col, { highlight: true });
  px(ctx, 12, 11, rgb([240, 235, 220]));
  px(ctx, 13, 12, rgb([240, 235, 220]));
}

function isoCube(ctx, blockId) {
  const top = blockTextureCanvas(faceTexture(blockId, 'top'));
  const left = blockTextureCanvas(faceTexture(blockId, 'front'));
  const right = blockTextureCanvas(faceTexture(blockId, 'side'));
  const it = getItem(blockId);
  const shape = it.block.shape;
  const hgt = shape === 'bed' ? 0.56 : shape === 'chest' ? 0.88 : 1;
  const sideH = 15 * hgt;
  const yOff = 15 - sideH;
  // oben
  ctx.setTransform(0.875, -0.4375, 0.875, 0.4375, 2, 9 + yOff);
  ctx.drawImage(top, 0, 0);
  // links (Vorderseite)
  ctx.setTransform(0.875, 0.4375, 0, sideH / 16, 2, 9 + yOff);
  ctx.drawImage(left, 0, 0);
  ctx.fillStyle = 'rgba(0,0,0,0.2)';
  ctx.fillRect(0, 0, 16, 16);
  // rechts
  ctx.setTransform(0.875, -0.4375, 0, sideH / 16, 16, 16 + yOff);
  ctx.drawImage(right, 0, 0);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(0, 0, 16, 16);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

const iconCache = new Map();
export function itemIconCanvas(id) {
  if (iconCache.has(id)) return iconCache.get(id);
  const [c, ctx] = makeCanvas(32, 32);
  const it = getItem(id);
  if (it && it.tool) {
    const [s, sctx] = makeCanvas(16, 16);
    drawTool(sctx, it.tool.type, it.tool.material);
    ctx.drawImage(s, 0, 0, 32, 32);
  } else if (ICON_DRAW[id]) {
    const [s, sctx] = makeCanvas(16, 16);
    ICON_DRAW[id](sctx);
    ctx.drawImage(s, 0, 0, 32, 32);
  } else if (it && it.block && ['cross', 'lantern'].includes(it.block.shape)) {
    ctx.drawImage(blockTextureCanvas(faceTexture(id, 'side')), 0, 0, 32, 32);
  } else if (it && it.block) {
    isoCube(ctx, id);
  } else {
    const [s, sctx] = makeCanvas(16, 16);
    blob(sctx, 8, 8, 5, 5, [200, 0, 200]);
    ctx.drawImage(s, 0, 0, 32, 32);
  }
  iconCache.set(id, c);
  return c;
}

const urlCache = new Map();
export function itemIconURL(id) {
  if (!urlCache.has(id)) urlCache.set(id, itemIconCanvas(id).toDataURL());
  return urlCache.get(id);
}

// --- HUD-Symbole ----------------------------------------------------------

const HEART = ['.##...##.', '#rr#.#rr#', '#rrr#rrr#', '#rrrrrrr#', '.#rrrrr#.', '..#rrr#..', '...#r#...', '....#....'];
const FOOD = ['....###..', '...#mmm#.', '..#mmmmm#', '..#mmmmm#', '...#mmm#.', '..#b###..', '.#b#.....', '#bb#.....', '.##......'];

function patternURL(pattern, colors, halfEmpty) {
  const w = pattern[0].length;
  const [c, ctx] = makeCanvas(w, pattern.length);
  pattern.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      let col = colors[ch];
      if (halfEmpty === 'all' && ch !== '#') col = colors.empty;
      if (halfEmpty === 'right' && ch !== '#' && x >= Math.ceil(w / 2)) col = colors.empty;
      if (halfEmpty === 'left' && ch !== '#' && x < Math.floor(w / 2)) col = colors.empty;
      px(ctx, x, y, col);
    });
  });
  if (!halfEmpty || halfEmpty === 'right') px(ctx, 1, 1, colors.shine || colors[Object.keys(colors)[0]]);
  return c.toDataURL();
}

export function hudIcons() {
  const heart = { '#': '#1a0505', r: '#e0262b', empty: '#3a1a1a', shine: '#ffb0b0' };
  const food = { '#': '#2a1505', m: '#b8642a', b: '#f0ead8', empty: '#3a2a1a' };
  return {
    heartFull: patternURL(HEART, heart),
    heartHalf: patternURL(HEART, heart, 'right'),
    heartEmpty: patternURL(HEART, heart, 'all'),
    foodFull: patternURL(FOOD, food),
    foodHalf: patternURL(FOOD, food, 'left'),
    foodEmpty: patternURL(FOOD, food, 'all'),
  };
}

// --- Skins ----------------------------------------------------------------

// Abwicklung einer Box im Minecraft-Skin-Format.
export function boxUV(u, v, w, h, d) {
  return {
    top: [u + d, v, w, d],
    bottom: [u + d + w, v, w, d],
    right: [u, v + d, d, h],
    front: [u + d, v + d, w, h],
    left: [u + d + w, v + d, d, h],
    back: [u + d + w + d, v + d, w, h],
  };
}

export const SKIN_PARTS = {
  head: { uv: [0, 0], size: [8, 8, 8] },
  body: { uv: [16, 16], size: [8, 12, 4] },
  rightArm: { uv: [40, 16], size: [4, 12, 4] },
  leftArm: { uv: [32, 48], size: [4, 12, 4], legacy: [40, 16] },
  rightLeg: { uv: [0, 16], size: [4, 12, 4] },
  leftLeg: { uv: [16, 48], size: [4, 12, 4], legacy: [0, 16] },
};

export function paintBox(ctx, part, fn) {
  const { uv, size } = SKIN_PARTS[part];
  const faces = boxUV(uv[0], uv[1], size[0], size[1], size[2]);
  for (const [face, [x, y, w, h]] of Object.entries(faces)) fn(face, x, y, w, h);
}

// Eigener Standard-Skin: ein Freiberger Bergmann in Habit mit Schachthut.
export function defaultSkinCanvas() {
  const [c, ctx] = makeCanvas(64, 64);
  const rnd = mulberry32(99);
  const skin = [226, 176, 136];
  const black = [32, 32, 38];
  paintBox(ctx, 'head', (face, x, y, w, h) => {
    noise(ctx, x, y, w, h, skin, 0.06, rnd);
    if (face === 'top') noise(ctx, x, y, w, h, black, 0.15, rnd);
    else if (face !== 'bottom') {
      noise(ctx, x, y, w, 2, black, 0.15, rnd);
      if (face === 'back') noise(ctx, x, y + 2, w, 3, [70, 45, 25], 0.15, rnd);
      else if (face !== 'front') noise(ctx, x, y + 2, 2, 2, [70, 45, 25], 0.15, rnd);
    }
    if (face === 'front') {
      px(ctx, x + 3, y + 1, '#e8c040'); // Schlägel und Eisen
      px(ctx, x + 4, y + 1, '#e8c040');
      px(ctx, x + 1, y + 4, '#ffffff');
      px(ctx, x + 2, y + 4, '#2a5aa0');
      px(ctx, x + 5, y + 4, '#2a5aa0');
      px(ctx, x + 6, y + 4, '#ffffff');
      for (let i = 2; i < 6; i++) px(ctx, x + i, y + 6, rgb([80, 50, 30]));
    }
  });
  paintBox(ctx, 'body', (face, x, y, w, h) => {
    noise(ctx, x, y, w, h, black, 0.15, rnd);
    if (face === 'front') {
      for (let i = 1; i < 11; i += 2) px(ctx, x + 3, y + i, '#e8c040');
      noise(ctx, x, y + 8, w, 1, [90, 60, 30], 0.1, rnd);
    }
    if (face === 'back') noise(ctx, x + 1, y + 8, w - 2, 4, [110, 70, 35], 0.2, rnd); // Arschleder
  });
  for (const arm of ['rightArm', 'leftArm']) {
    paintBox(ctx, arm, (face, x, y, w, h) => {
      noise(ctx, x, y, w, h, black, 0.15, rnd);
      if (face === 'bottom') noise(ctx, x, y, w, h, skin, 0.06, rnd);
      else if (face !== 'top') noise(ctx, x, y + h - 3, w, 3, skin, 0.06, rnd);
    });
  }
  for (const leg of ['rightLeg', 'leftLeg']) {
    paintBox(ctx, leg, (face, x, y, w, h) => {
      noise(ctx, x, y, w, h, [225, 225, 218], 0.08, rnd);
      if (face === 'bottom') noise(ctx, x, y, w, h, [25, 25, 25], 0.1, rnd);
      else if (face !== 'top') noise(ctx, x, y + h - 3, w, 3, [25, 25, 25], 0.1, rnd);
    });
  }
  return c;
}
