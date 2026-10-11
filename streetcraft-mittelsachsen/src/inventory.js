// Inventar: 9 Hotbar-Plätze (0–8) + 27 Plätze im Rucksack (9–35).
// Ein Stapel ist { id, count, dmg? } oder null.

import { getItem } from './items.js';

export const HOTBAR_SIZE = 9;
export const INVENTORY_SIZE = 36;

export function maxStack(id) {
  const it = getItem(id);
  return it ? it.stack : 64;
}

export function cloneStack(s) {
  return s ? { ...s } : null;
}

function sameKind(a, b) {
  return a && b && a.id === b.id && !a.dmg && !b.dmg;
}

export class Inventory {
  constructor(size = INVENTORY_SIZE) {
    this.slots = new Array(size).fill(null);
    this.selected = 0;
  }

  get(i) {
    return this.slots[i];
  }

  set(i, stack) {
    this.slots[i] = stack && stack.count > 0 ? stack : null;
  }

  selectedStack() {
    return this.slots[this.selected];
  }

  selectedId() {
    const s = this.slots[this.selected];
    return s ? s.id : null;
  }

  // Fügt Gegenstände hinzu und gibt die Anzahl zurück, die nicht mehr gepasst hat.
  add(id, count = 1) {
    if (!getItem(id)) return count;
    const max = maxStack(id);
    let left = count;
    // Zuerst bestehende Stapel auffüllen.
    for (let i = 0; i < this.slots.length && left > 0; i++) {
      const s = this.slots[i];
      if (s && s.id === id && !s.dmg && s.count < max) {
        const n = Math.min(max - s.count, left);
        s.count += n;
        left -= n;
      }
    }
    // Dann leere Plätze belegen.
    for (let i = 0; i < this.slots.length && left > 0; i++) {
      if (!this.slots[i]) {
        const n = Math.min(max, left);
        this.slots[i] = { id, count: n };
        left -= n;
      }
    }
    return left;
  }

  count(id) {
    return this.slots.reduce((n, s) => n + (s && s.id === id ? s.count : 0), 0);
  }

  remove(id, count = 1) {
    if (this.count(id) < count) return false;
    let left = count;
    for (let i = this.slots.length - 1; i >= 0 && left > 0; i--) {
      const s = this.slots[i];
      if (s && s.id === id) {
        const n = Math.min(s.count, left);
        s.count -= n;
        left -= n;
        if (s.count <= 0) this.slots[i] = null;
      }
    }
    return true;
  }

  consumeSelected(n = 1) {
    const s = this.slots[this.selected];
    if (!s) return false;
    s.count -= n;
    if (s.count <= 0) this.slots[this.selected] = null;
    return true;
  }

  // Werkzeug abnutzen. Gibt true zurück, wenn es zerbrochen ist.
  damageSelected(amount = 1) {
    const s = this.slots[this.selected];
    if (!s) return false;
    const it = getItem(s.id);
    if (!it || !it.tool) return false;
    s.dmg = (s.dmg || 0) + amount;
    if (s.dmg >= it.tool.durability) {
      this.slots[this.selected] = null;
      return true;
    }
    return false;
  }

  clear() {
    this.slots.fill(null);
  }

  toJSON() {
    return { slots: this.slots.map(cloneStack), selected: this.selected };
  }

  static fromJSON(data) {
    const inv = new Inventory();
    if (data && Array.isArray(data.slots)) {
      data.slots.slice(0, INVENTORY_SIZE).forEach((s, i) => {
        inv.slots[i] = s && getItem(s.id) && s.count > 0 ? { ...s } : null;
      });
      inv.selected = Math.max(0, Math.min(HOTBAR_SIZE - 1, data.selected | 0));
    }
    return inv;
  }
}

// Klick auf einen Platz in einer Liste von Plätzen (Inventar, Truhe, Werkbank ...).
// button: 0 = links, 2 = rechts. Gibt den neuen Stapel am Mauszeiger zurück.
export function clickSlot(slots, index, cursor, button = 0) {
  const slot = slots[index];
  if (button === 2) {
    if (!cursor) {
      if (!slot) return null;
      const take = Math.ceil(slot.count / 2);
      const picked = { ...slot, count: take };
      slot.count -= take;
      if (slot.count <= 0) slots[index] = null;
      return picked;
    }
    if (!slot) {
      slots[index] = { ...cursor, count: 1 };
      return cursor.count > 1 ? { ...cursor, count: cursor.count - 1 } : null;
    }
    if (sameKind(slot, cursor) && slot.count < maxStack(slot.id)) {
      slot.count += 1;
      return cursor.count > 1 ? { ...cursor, count: cursor.count - 1 } : null;
    }
    slots[index] = cursor;
    return slot;
  }
  if (!cursor) {
    slots[index] = null;
    return slot || null;
  }
  if (!slot) {
    slots[index] = cursor;
    return null;
  }
  if (sameKind(slot, cursor)) {
    const max = maxStack(slot.id);
    const n = Math.min(max - slot.count, cursor.count);
    slot.count += n;
    const rest = cursor.count - n;
    return rest > 0 ? { ...cursor, count: rest } : null;
  }
  slots[index] = cursor;
  return slot;
}

// Shift-Klick: Stapel in einen anderen Bereich verschieben. Gibt den Rest zurück.
export function moveStackInto(stack, slots, from, to) {
  if (!stack) return null;
  const max = maxStack(stack.id);
  let left = stack.count;
  for (let i = from; i < to && left > 0; i++) {
    const s = slots[i];
    if (sameKind(s, stack) && s.count < max) {
      const n = Math.min(max - s.count, left);
      s.count += n;
      left -= n;
    }
  }
  for (let i = from; i < to && left > 0; i++) {
    if (!slots[i]) {
      slots[i] = { ...stack, count: Math.min(max, left) };
      left -= slots[i].count;
    }
  }
  return left > 0 ? { ...stack, count: left } : null;
}
