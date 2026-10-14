// Rüstung: Rüstungspunkte, Schadensminderung, Abnutzung (ohne DOM).

export const ARMOR_SLOTS = ['helmet', 'chestplate', 'leggings', 'boots'];
export const ARMOR_SLOT_NAMES = { helmet: 'Helm', chestplate: 'Brustpanzer', leggings: 'Hose', boots: 'Stiefel' };

// Rüstungspunkte und Haltbarkeit wie in Minecraft (Helm, Brust, Hose, Stiefel).
export const ARMOR_MATERIALS = {
  leather: { name: 'Leder', ingredient: 'leather', points: [1, 3, 2, 1], durability: [55, 80, 75, 65], color: [150, 90, 50] },
  gold: { name: 'Gold', ingredient: 'gold_ingot', points: [2, 5, 3, 1], durability: [77, 112, 105, 91], color: [250, 215, 70] },
  iron: { name: 'Eisen', ingredient: 'iron_ingot', points: [2, 6, 5, 2], durability: [165, 240, 225, 195], color: [215, 215, 215] },
  silver: { name: 'Silber', ingredient: 'silver_ingot', points: [2, 6, 5, 2], durability: [200, 290, 270, 235], color: [200, 212, 235] },
  diamond: { name: 'Diamant', ingredient: 'diamond', points: [3, 8, 6, 3], durability: [363, 528, 495, 429], color: [90, 225, 235] },
};

export const ARMOR_PATTERNS = {
  helmet: ['XXX', 'X X'],
  chestplate: ['X X', 'XXX', 'XXX'],
  leggings: ['XXX', 'X X', 'X X'],
  boots: ['X X', 'X X'],
};

// Gesamte Rüstungspunkte (max. 20).
export function armorPoints(slots, getItem) {
  let p = 0;
  for (const s of slots) {
    const it = s && getItem(s.id);
    if (it && it.armor) p += it.armor.points;
  }
  return Math.min(20, p);
}

// Schaden nach Rüstung (vereinfacht wie Minecraft ohne Härte: 4 % pro Punkt).
export function reducedDamage(damage, points) {
  return damage * (1 - Math.min(20, points) / 25);
}

// Abnutzung nach einem Treffer. Gibt die Namen zerbrochener Teile zurück.
export function wearArmor(slots, damage, getItem) {
  const broken = [];
  const wear = Math.max(1, Math.floor(damage / 4));
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    const it = s && getItem(s.id);
    if (!it || !it.armor) continue;
    s.dmg = (s.dmg || 0) + wear;
    if (s.dmg >= it.armor.durability) {
      broken.push(it.name);
      slots[i] = null;
    }
  }
  return broken;
}
