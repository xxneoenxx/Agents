// Rezepte für Werkbank (3×3), Inventar (2×2) und Ofen.

const LOGS = ['oak_log', 'spruce_log'];
const COALS = ['coal', 'charcoal'];

export const RECIPES = [];

function shaped(pattern, key, id, count = 1) {
  RECIPES.push({ type: 'shaped', pattern, key, result: { id, count } });
}
function shapeless(ingredients, id, count = 1) {
  RECIPES.push({ type: 'shapeless', ingredients, result: { id, count } });
}

shapeless([LOGS], 'planks', 4);
shaped(['P', 'P'], { P: 'planks' }, 'stick', 4);
shaped(['PP', 'PP'], { P: 'planks' }, 'crafting_table');
shaped(['C', 'S'], { C: COALS, S: 'stick' }, 'torch', 4);
shaped(['CCC', 'C C', 'CCC'], { C: 'cobblestone' }, 'furnace');
shaped(['PPP', 'P P', 'PPP'], { P: 'planks' }, 'chest');
shaped(['WWW'], { W: 'wheat' }, 'bread');
shaped(['WWW', 'PPP'], { W: 'white_wool', P: 'planks' }, 'bed');
shaped(['BB', 'BB'], { B: 'brick' }, 'bricks');
shaped(['SS', 'SS'], { S: 'string' }, 'white_wool');
shaped([' I ', 'ITI', ' I '], { I: 'silver_ingot', T: 'torch' }, 'lantern');

const TOOL_MATERIALS = { wooden: 'planks', stone: 'cobblestone', iron: 'iron_ingot', diamond: 'diamond' };
for (const [mat, ing] of Object.entries(TOOL_MATERIALS)) {
  const key = { X: ing, S: 'stick' };
  shaped(['XXX', ' S ', ' S '], key, `${mat}_pickaxe`);
  shaped(['XX', 'XS', ' S'], key, `${mat}_axe`);
  shaped(['X', 'S', 'S'], key, `${mat}_shovel`);
  shaped(['X', 'X', 'S'], key, `${mat}_sword`);
  shaped(['XX', ' S', ' S'], key, `${mat}_hoe`);
}

export const SMELTING = {
  iron_ore: 'iron_ingot',
  gold_ore: 'gold_ingot',
  silver_ore: 'silver_ingot',
  sand: 'glass',
  cobblestone: 'stone',
  oak_log: 'charcoal',
  spruce_log: 'charcoal',
  raw_beef: 'steak',
  raw_porkchop: 'cooked_porkchop',
  raw_mutton: 'cooked_mutton',
  clay_ball: 'brick',
};

export const SMELT_TIME = 10; // Sekunden pro Gegenstand

function matches(want, id) {
  if (want == null) return id == null;
  if (id == null) return false;
  return Array.isArray(want) ? want.includes(id) : want === id;
}

// Raster (Liste von ids oder null, Breite w) auf die kleinste belegte Fläche zuschneiden.
function trim(grid, w) {
  const h = grid.length / w;
  let minX = w,
    minY = h,
    maxX = -1,
    maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (grid[y * w + x]) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX < 0) return null;
  const rows = [];
  for (let y = minY; y <= maxY; y++) {
    const row = [];
    for (let x = minX; x <= maxX; x++) row.push(grid[y * w + x]);
    rows.push(row);
  }
  return rows;
}

function matchShaped(recipe, rows, mirror) {
  const p = recipe.pattern;
  const pw = Math.max(...p.map((r) => r.length));
  if (p.length !== rows.length || pw !== rows[0].length) return false;
  for (let y = 0; y < p.length; y++) {
    for (let x = 0; x < pw; x++) {
      const px = mirror ? pw - 1 - x : x;
      const ch = p[y][px] || ' ';
      const want = ch === ' ' ? null : recipe.key[ch];
      if (!matches(want, rows[y][x])) return false;
    }
  }
  return true;
}

function matchShapeless(recipe, ids) {
  if (ids.length !== recipe.ingredients.length) return false;
  const left = [...ids];
  for (const want of recipe.ingredients) {
    const i = left.findIndex((id) => matches(want, id));
    if (i < 0) return false;
    left.splice(i, 1);
  }
  return true;
}

// grid: Liste von ids (oder null) mit Breite w (2 oder 3). Gibt { id, count } oder null zurück.
export function findRecipe(grid, w) {
  const rows = trim(grid, w);
  if (!rows) return null;
  const ids = grid.filter(Boolean);
  for (const r of RECIPES) {
    if (r.type === 'shaped') {
      if (matchShaped(r, rows, false) || matchShaped(r, rows, true)) return { ...r.result };
    } else if (matchShapeless(r, ids)) {
      return { ...r.result };
    }
  }
  return null;
}

export function smeltResult(id) {
  return SMELTING[id] || null;
}
