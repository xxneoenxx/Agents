// Alle Blöcke und Gegenstände des Spiels (ohne DOM, auch in Node nutzbar).

export const TIERS = { hand: 0, wood: 1, stone: 2, iron: 3, diamond: 4 };

const ITEMS = {};

function def(id, props) {
  ITEMS[id] = { id, stack: 64, kind: 'item', ...props };
}

// Blöcke ---------------------------------------------------------------
// hardness: Härte (Sekunden-Basis), tool: passendes Werkzeug, minTier: nötige Werkzeugstufe für Drops.
function block(id, name, b, extra = {}) {
  def(id, {
    name,
    kind: 'block',
    block: {
      hardness: 1,
      tool: null,
      minTier: 0,
      shape: 'cube',
      solid: true,
      transparent: false,
      tex: { all: id },
      ...b,
    },
    ...extra,
  });
}

block('grass', 'Grasblock', { hardness: 0.6, tool: 'shovel', tex: { top: 'grass_top', side: 'grass_side', bottom: 'dirt' }, drop: 'dirt' });
block('dirt', 'Erde', { hardness: 0.5, tool: 'shovel' });
block('farmland', 'Ackerboden', { hardness: 0.6, tool: 'shovel', tex: { top: 'farmland', side: 'dirt', bottom: 'dirt' }, drop: 'dirt' });
block('sand', 'Sand', { hardness: 0.5, tool: 'shovel' });
block('clay', 'Tonerde', { hardness: 0.6, tool: 'shovel', drop: { id: 'clay_ball', count: 4 } });
block('gravel', 'Kies', { hardness: 0.6, tool: 'shovel', drop: 'gravel' });
block('stone', 'Stein', { hardness: 1.5, tool: 'pickaxe', minTier: 1, drop: 'cobblestone' });
block('cobblestone', 'Bruchstein', { hardness: 2, tool: 'pickaxe', minTier: 1 });
block('bedrock', 'Grundgestein', { hardness: -1 });
block('coal_ore', 'Steinkohle', { hardness: 3, tool: 'pickaxe', minTier: 1, drop: 'coal' });
block('iron_ore', 'Eisenerz', { hardness: 3, tool: 'pickaxe', minTier: 2 });
block('silver_ore', 'Silbererz', { hardness: 3, tool: 'pickaxe', minTier: 2 });
block('gold_ore', 'Golderz', { hardness: 3, tool: 'pickaxe', minTier: 3 });
block('diamond_ore', 'Diamanterz', { hardness: 3, tool: 'pickaxe', minTier: 3, drop: 'diamond' });
block('oak_log', 'Eichenstamm', { hardness: 2, tool: 'axe', tex: { top: 'oak_log_top', side: 'oak_log', bottom: 'oak_log_top' } });
block('spruce_log', 'Fichtenstamm', { hardness: 2, tool: 'axe', tex: { top: 'spruce_log_top', side: 'spruce_log', bottom: 'spruce_log_top' } });
block('planks', 'Holzbretter', { hardness: 2, tool: 'axe' });
block('oak_leaves', 'Eichenlaub', { hardness: 0.2, transparent: true, alphaTest: true, drop: 'leaves' });
block('spruce_leaves', 'Fichtennadeln', { hardness: 0.2, transparent: true, alphaTest: true, drop: 'leaves' });
block('glass', 'Glas', { hardness: 0.3, transparent: true, drop: null });
block('bricks', 'Ziegelsteine', { hardness: 2, tool: 'pickaxe', minTier: 1 });
block('white_wool', 'Wolle', { hardness: 0.8 });
block('crafting_table', 'Werkbank', { hardness: 2.5, tool: 'axe', tex: { top: 'crafting_table_top', side: 'crafting_table_side', bottom: 'planks', front: 'crafting_table_front' }, use: 'crafting' });
block('furnace', 'Ofen', { hardness: 3.5, tool: 'pickaxe', minTier: 1, tex: { top: 'furnace_top', side: 'furnace_side', bottom: 'furnace_top', front: 'furnace_front' }, use: 'furnace', facing: true });
block('chest', 'Truhe', { hardness: 2.5, tool: 'axe', shape: 'chest', tex: { top: 'chest_top', side: 'chest_side', bottom: 'chest_top', front: 'chest_front' }, use: 'chest', facing: true });
block('torch', 'Fackel', { hardness: 0, shape: 'torch', solid: false, transparent: true, light: true });
block('lantern', 'Bergmannslampe', { hardness: 1, tool: 'pickaxe', shape: 'lantern', solid: false, transparent: true, light: true });
block('oak_sapling', 'Setzling', { hardness: 0, shape: 'cross', solid: false, transparent: true, plant: 'tree' });
block('wheat_crop', 'Weizenpflanze', { hardness: 0, shape: 'cross', solid: false, transparent: true, plant: 'crop', drop: 'crop' }, { hidden: true });
block('bed', 'Bett', { hardness: 0.2, shape: 'bed', tex: { top: 'bed_top', side: 'bed_side', bottom: 'planks' }, use: 'bed' });

// Werkzeuge --------------------------------------------------------------
const MATERIALS = [
  { key: 'wooden', name: 'Holz', tier: 1, speed: 2, durability: 59, dmg: 0 },
  { key: 'stone', name: 'Stein', tier: 2, speed: 4, durability: 131, dmg: 1 },
  { key: 'iron', name: 'Eisen', tier: 3, speed: 6, durability: 250, dmg: 2 },
  { key: 'diamond', name: 'Diamant', tier: 4, speed: 8, durability: 1561, dmg: 3 },
];
const TOOL_TYPES = [
  { type: 'pickaxe', name: 'spitzhacke', baseDmg: 2 },
  { type: 'axe', name: 'axt', baseDmg: 3 },
  { type: 'shovel', name: 'schaufel', baseDmg: 2 },
  { type: 'sword', name: 'schwert', baseDmg: 4 },
  { type: 'hoe', name: 'hacke', baseDmg: 1 },
];
for (const m of MATERIALS) {
  for (const t of TOOL_TYPES) {
    def(`${m.key}_${t.type}`, {
      name: `${m.name}${t.name}`,
      kind: 'tool',
      stack: 1,
      tool: { type: t.type, tier: m.tier, speed: m.speed, durability: m.durability, damage: t.baseDmg + m.dmg, material: m.key },
    });
  }
}

// Nahrung ----------------------------------------------------------------
function food(id, name, hunger, saturation) {
  def(id, { name, kind: 'food', food: { hunger, saturation } });
}
food('apple', 'Apfel', 4, 2.4);
food('bread', 'Brot', 5, 6);
food('raw_beef', 'Rohes Rindfleisch', 3, 1.8);
food('steak', 'Steak', 8, 12.8);
food('raw_porkchop', 'Rohes Schweinefleisch', 3, 1.8);
food('cooked_porkchop', 'Gebratenes Schweinefleisch', 8, 12.8);
food('raw_mutton', 'Rohes Hammelfleisch', 2, 1.2);
food('cooked_mutton', 'Gebratenes Hammelfleisch', 6, 9.6);
food('rotten_flesh', 'Verrottetes Fleisch', 4, 0.8);

// Sonstige Gegenstände --------------------------------------------------
def('stick', { name: 'Stock', fuel: 5 });
def('coal', { name: 'Kohle', fuel: 80 });
def('charcoal', { name: 'Holzkohle', fuel: 80 });
def('iron_ingot', { name: 'Eisenbarren' });
def('gold_ingot', { name: 'Goldbarren' });
def('silver_ingot', { name: 'Silberbarren' });
def('diamond', { name: 'Diamant' });
def('flint', { name: 'Feuerstein' });
def('clay_ball', { name: 'Ton' });
def('brick', { name: 'Ziegel' });
def('wheat', { name: 'Weizen' });
def('seeds', { name: 'Weizenkörner', places: 'wheat_crop' });
def('bone', { name: 'Knochen' });
def('string', { name: 'Faden' });
def('gunpowder', { name: 'Schwarzpulver' });
def('leather', { name: 'Leder' });
def('arrow', { name: 'Pfeil' });

// Brennwerte (Sekunden im Ofen)
for (const id of ['oak_log', 'spruce_log', 'planks', 'crafting_table', 'chest']) ITEMS[id].fuel = 15;
ITEMS.oak_sapling.fuel = 5;
for (const t of TOOL_TYPES) ITEMS[`wooden_${t.type}`].fuel = 10;

export function getItem(id) {
  return ITEMS[id] || null;
}

export function allItems() {
  return Object.values(ITEMS);
}

export function isBlock(id) {
  return !!(ITEMS[id] && ITEMS[id].block);
}

export function itemName(id) {
  return ITEMS[id] ? ITEMS[id].name : id;
}

// Wie lange dauert es (in Sekunden), einen Block mit einem Werkzeug abzubauen?
// Gibt Infinity zurück, wenn der Block unzerstörbar ist.
export function breakTime(blockId, toolId) {
  const b = ITEMS[blockId] && ITEMS[blockId].block;
  if (!b) return 0;
  if (b.hardness < 0) return Infinity;
  if (b.hardness === 0) return 0.05;
  const tool = toolId && ITEMS[toolId] ? ITEMS[toolId].tool : null;
  const matches = tool && b.tool && tool.type === b.tool;
  const speed = matches ? tool.speed : 1;
  const harvest = canHarvest(blockId, toolId);
  return (b.hardness * (harvest ? 1.5 : 5)) / speed;
}

// Bekommt man beim Abbauen etwas?
export function canHarvest(blockId, toolId) {
  const b = ITEMS[blockId] && ITEMS[blockId].block;
  if (!b) return false;
  if (!b.minTier) return true;
  const tool = toolId && ITEMS[toolId] ? ITEMS[toolId].tool : null;
  return !!(tool && tool.type === b.tool && tool.tier >= b.minTier);
}

// Was fällt beim Abbauen heraus? rand: Zufallsfunktion [0,1).
export function blockDrops(blockId, toolId, data, rand = Math.random) {
  const b = ITEMS[blockId] && ITEMS[blockId].block;
  if (!b || !canHarvest(blockId, toolId)) return [];
  if (b.drop === null) return [];
  if (b.drop === 'leaves') {
    const out = [];
    if (rand() < 0.08) out.push({ id: 'oak_sapling', count: 1 });
    if (blockId === 'oak_leaves' && rand() < 0.04) out.push({ id: 'apple', count: 1 });
    if (rand() < 0.03) out.push({ id: 'stick', count: 1 });
    return out;
  }
  if (b.drop === 'crop') {
    const stage = (data && data.stage) || 0;
    if (stage >= 7) return [{ id: 'wheat', count: 1 }, { id: 'seeds', count: 1 + Math.floor(rand() * 3) }];
    return [{ id: 'seeds', count: 1 }];
  }
  if (b.drop === 'gravel') {
    return rand() < 0.1 ? [{ id: 'flint', count: 1 }] : [{ id: 'gravel', count: 1 }];
  }
  if (b.drop && typeof b.drop === 'object') return [{ ...b.drop }];
  return [{ id: b.drop || blockId, count: 1 }];
}

// Schaden einer Hand / eines Gegenstands gegen Mobs.
export function attackDamage(itemId) {
  const it = itemId && ITEMS[itemId];
  return it && it.tool ? it.tool.damage : 1;
}
