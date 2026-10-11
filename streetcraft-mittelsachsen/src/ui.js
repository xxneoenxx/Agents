// Oberfläche: Hotbar, Herzen, Hunger, Chat, Inventar-, Werkbank-, Ofen- und Truhen-Fenster.

import { getItem, itemName, allItems } from './items.js';
import { itemIconURL, hudIcons } from './textures.js';
import { clickSlot, moveStackInto, maxStack } from './inventory.js';
import { findRecipe, smeltResult, SMELT_TIME } from './crafting.js';

const $ = (id) => document.getElementById(id);

export class UI {
  constructor(game) {
    this.game = game;
    this.cursor = null;
    this.container = null;
    this.icons = hudIcons();
    this.hotbarSig = '';
    this.statSig = '';
    this.actionTimer = 0;
    this.nameTimer = 0;
    this.buildHotbar();
    this.buildStats();
    document.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this.positionFloating();
    });
  }

  // --- HUD -----------------------------------------------------------------

  buildHotbar() {
    const hb = $('hotbar');
    hb.innerHTML = '';
    this.hotbarSlots = [];
    for (let i = 0; i < 9; i++) {
      const s = document.createElement('div');
      s.className = 'slot';
      hb.appendChild(s);
      this.hotbarSlots.push(s);
    }
  }

  buildStats() {
    this.heartEls = [];
    this.foodEls = [];
    for (let i = 0; i < 10; i++) {
      const h = document.createElement('img');
      $('hearts').appendChild(h);
      this.heartEls.push(h);
      const f = document.createElement('img');
      $('food').appendChild(f);
      this.foodEls.push(f);
    }
  }

  slotHTML(stack) {
    if (!stack) return '';
    const it = getItem(stack.id);
    let html = `<img src="${itemIconURL(stack.id)}" alt="">`;
    if (stack.count > 1) html += `<span class="count">${stack.count}</span>`;
    if (it && it.tool && stack.dmg) {
      const f = 1 - stack.dmg / it.tool.durability;
      const col = `hsl(${Math.round(f * 120)},90%,45%)`;
      html += `<span class="dura"><span style="width:${Math.round(f * 100)}%;background:${col}"></span></span>`;
    }
    return html;
  }

  updateHUD() {
    const g = this.game;
    const inv = g.inv;
    const sig = inv.slots.slice(0, 9).map((s) => (s ? `${s.id}:${s.count}:${s.dmg || 0}` : '-')).join('|') + `#${inv.selected}`;
    if (sig !== this.hotbarSig) {
      this.hotbarSig = sig;
      this.hotbarSlots.forEach((el, i) => {
        el.innerHTML = this.slotHTML(inv.slots[i]);
        el.classList.toggle('selected', i === inv.selected);
      });
    }
    const s = g.survival;
    const creative = g.gamemode === 'creative';
    const ssig = `${creative}|${s.health}|${s.hunger}`;
    if (ssig !== this.statSig) {
      this.statSig = ssig;
      $('stats').style.visibility = creative ? 'hidden' : 'visible';
      this.heartEls.forEach((el, i) => {
        const v = s.health - i * 2;
        el.src = v >= 2 ? this.icons.heartFull : v === 1 ? this.icons.heartHalf : this.icons.heartEmpty;
      });
      this.foodEls.forEach((el, i) => {
        const v = s.hunger - i * 2;
        el.src = v >= 2 ? this.icons.foodFull : v === 1 ? this.icons.foodHalf : this.icons.foodEmpty;
      });
      $('hearts').classList.toggle('low', s.health <= 4);
    }
  }

  tick(dt) {
    if (this.actionTimer > 0) {
      this.actionTimer -= dt;
      if (this.actionTimer <= 0) $('actionbar').style.opacity = 0;
    }
    if (this.nameTimer > 0) {
      this.nameTimer -= dt;
      if (this.nameTimer <= 0) $('itemname').style.opacity = 0;
    }
    if (this.container && this.container.type === 'furnace') this.renderFurnaceProgress();
  }

  actionbar(text, seconds = 2.5) {
    const el = $('actionbar');
    el.textContent = text;
    el.style.opacity = 1;
    this.actionTimer = seconds;
  }

  showItemName(id) {
    const el = $('itemname');
    el.textContent = id ? itemName(id) : '';
    el.style.opacity = id ? 1 : 0;
    this.nameTimer = 2;
  }

  chat(text, cls = '') {
    const log = $('chatlog');
    const line = document.createElement('div');
    line.className = `line ${cls}`;
    line.textContent = text;
    log.appendChild(line);
    while (log.children.length > 60) log.removeChild(log.firstChild);
    log.scrollTop = log.scrollHeight;
    setTimeout(() => line.classList.add('old'), 9000);
  }

  setPlace(text) {
    $('place').textContent = text;
  }

  setDebug(text) {
    $('debug').textContent = text;
  }

  toggleDebug() {
    $('debug').classList.toggle('hidden');
  }

  hurtFlash() {
    const el = $('hurt');
    el.style.transition = 'none';
    el.style.opacity = 0.5;
    requestAnimationFrame(() => {
      el.style.transition = 'opacity 0.5s';
      el.style.opacity = 0;
    });
  }

  setNight(alpha) {
    $('night').style.opacity = alpha.toFixed(3);
  }

  // --- Chat-Eingabe ----------------------------------------------------------

  openChat(prefix = '') {
    const box = $('chatinput');
    box.style.display = 'block';
    box.value = prefix;
    $('chatlog').classList.add('open');
    setTimeout(() => box.focus(), 0);
  }

  closeChat() {
    const box = $('chatinput');
    box.style.display = 'none';
    box.blur();
    $('chatlog').classList.remove('open');
  }

  chatOpen() {
    return $('chatinput').style.display === 'block';
  }

  // --- Fenster (Inventar, Werkbank, Ofen, Truhe) -----------------------------

  // type: 'inventory' | 'crafting' | 'furnace' | 'chest' | 'creative'
  openContainer(type, opts = {}) {
    const g = this.game;
    const c = { type, sections: [], block: opts.block || null };
    if (type === 'inventory' || type === 'crafting') {
      const size = type === 'crafting' ? 3 : 2;
      g.craftGrid = new Array(size * size).fill(null);
      c.grid = g.craftGrid;
      c.gridW = size;
      c.title = type === 'crafting' ? 'Werkbank' : 'Inventar';
    } else if (type === 'furnace') {
      c.data = opts.block.data;
      c.title = 'Ofen';
    } else if (type === 'chest') {
      c.data = opts.block.data;
      c.title = 'Truhe';
    } else if (type === 'creative') {
      c.title = 'Kreativ-Inventar';
      c.palette = allItems()
        .filter((it) => !it.hidden)
        .map((it) => it.id);
      c.filter = '';
    }
    this.container = c;
    $('container').classList.add('open');
    this.renderContainer();
  }

  closeContainer() {
    const g = this.game;
    const c = this.container;
    if (!c) return;
    // Zutaten und Mauszeiger zurück ins Inventar
    const giveBack = (stack) => {
      if (!stack) return;
      const left = g.inv.add(stack.id, stack.count);
      if (left > 0) g.dropStack({ ...stack, count: left });
    };
    if (c.grid) c.grid.forEach(giveBack);
    if (this.cursor) giveBack(this.cursor);
    this.cursor = null;
    g.craftGrid = null;
    if (c.block) g.world.markEdited(c.block.x, c.block.y, c.block.z);
    this.container = null;
    $('container').classList.remove('open');
    $('tooltip').style.display = 'none';
    this.positionFloating();
  }

  slotEl(stack, onClick, extraClass = '') {
    const el = document.createElement('div');
    el.className = `slot ${extraClass}`;
    el.innerHTML = this.slotHTML(stack);
    el.addEventListener('mousedown', (e) => {
      e.preventDefault();
      onClick(e.button, e.shiftKey);
      this.renderContainer();
    });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('mouseenter', () => this.showTooltip(stack));
    el.addEventListener('mouseleave', () => this.showTooltip(null));
    return el;
  }

  grid(slots, from, to, cols, onClick) {
    const el = document.createElement('div');
    el.className = 'slotgrid';
    el.style.gridTemplateColumns = `repeat(${cols}, var(--slot))`;
    for (let i = from; i < to; i++) el.appendChild(this.slotEl(slots[i], (b, shift) => onClick(i, b, shift)));
    return el;
  }

  playerInventory(onShift) {
    const g = this.game;
    const wrap = document.createElement('div');
    wrap.className = 'player-inv';
    const click = (i, b, shift) => {
      if (shift) {
        const stack = g.inv.slots[i];
        if (!stack) return;
        g.inv.slots[i] = null;
        const rest = onShift ? onShift(stack, i) : i < 9 ? moveStackInto(stack, g.inv.slots, 9, 36) : moveStackInto(stack, g.inv.slots, 0, 9);
        if (rest) g.inv.slots[i] = rest;
        return;
      }
      this.cursor = clickSlot(g.inv.slots, i, this.cursor, b);
    };
    wrap.appendChild(this.grid(g.inv.slots, 9, 36, 9, click));
    const hb = this.grid(g.inv.slots, 0, 9, 9, click);
    hb.classList.add('hotbar-row');
    wrap.appendChild(hb);
    return wrap;
  }

  renderContainer() {
    const c = this.container;
    const inner = $('container-inner');
    inner.innerHTML = '';
    if (!c) return;
    const g = this.game;
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = c.title;
    inner.appendChild(title);
    const top = document.createElement('div');
    top.className = 'container-top';
    inner.appendChild(top);

    if (c.grid) {
      if (c.type === 'inventory') {
        const preview = document.createElement('div');
        preview.className = 'skin-preview';
        preview.innerHTML = `${g.gamemode === 'creative' ? 'Kreativ' : 'Überleben'}<br>❤ ${g.survival.health / 2} · 🍗 ${g.survival.hunger / 2}`;
        top.appendChild(preview);
      }
      top.appendChild(
        this.grid(c.grid, 0, c.grid.length, c.gridW, (i, b, shift) => {
          if (shift) {
            const st = c.grid[i];
            if (st) {
              c.grid[i] = null;
              const left = g.inv.add(st.id, st.count);
              if (left) c.grid[i] = { ...st, count: left };
            }
            return;
          }
          this.cursor = clickSlot(c.grid, i, this.cursor, b);
        }),
      );
      const arrow = document.createElement('div');
      arrow.className = 'arrow';
      arrow.textContent = '➜';
      top.appendChild(arrow);
      const result = findRecipe(c.grid.map((s) => (s ? s.id : null)), c.gridW);
      top.appendChild(this.slotEl(result, (b, shift) => this.takeCraftResult(shift), 'result'));
    } else if (c.type === 'chest') {
      const items = c.data.items;
      top.appendChild(
        this.grid(items, 0, 27, 9, (i, b, shift) => {
          if (shift) {
            const st = items[i];
            if (!st) return;
            items[i] = null;
            const left = g.inv.add(st.id, st.count);
            if (left) items[i] = { ...st, count: left };
            return;
          }
          this.cursor = clickSlot(items, i, this.cursor, b);
        }),
      );
    } else if (c.type === 'furnace') {
      const items = c.data.items;
      const col = document.createElement('div');
      col.className = 'furnace-col';
      col.appendChild(this.slotEl(items[0], (b, shift) => this.furnaceSlot(0, b, shift)));
      const flame = document.createElement('div');
      flame.className = 'flame';
      flame.id = 'furnace-flame';
      col.appendChild(flame);
      col.appendChild(this.slotEl(items[1], (b, shift) => this.furnaceSlot(1, b, shift)));
      top.appendChild(col);
      const arrow = document.createElement('div');
      arrow.className = 'arrow progress';
      arrow.innerHTML = '<span id="furnace-progress"></span>➜';
      top.appendChild(arrow);
      top.appendChild(this.slotEl(items[2], (b, shift) => this.furnaceSlot(2, b, shift), 'result'));
      this.furnaceSig = JSON.stringify(items);
    } else if (c.type === 'creative') {
      const search = document.createElement('input');
      search.className = 'search';
      search.placeholder = 'Suchen …';
      search.value = c.filter;
      search.addEventListener('input', () => {
        c.filter = search.value;
        this.renderContainer();
        const s = inner.querySelector('.search');
        s.focus();
        s.setSelectionRange(s.value.length, s.value.length);
      });
      search.addEventListener('keydown', (e) => e.stopPropagation());
      inner.insertBefore(search, top);
      const f = c.filter.toLowerCase();
      const ids = c.palette.filter((id) => !f || id.includes(f) || itemName(id).toLowerCase().includes(f));
      const pal = ids.map((id) => ({ id, count: 1 }));
      const el = this.grid(pal, 0, pal.length, 9, (i, b, shift) => {
        const id = pal[i].id;
        if (this.cursor) {
          this.cursor = null; // in die Palette legen = löschen
          return;
        }
        if (shift) g.inv.add(id, maxStack(id));
        else this.cursor = { id, count: b === 2 ? 1 : maxStack(id) };
      });
      el.classList.add('palette');
      top.appendChild(el);
    }

    const onShift =
      c.type === 'chest'
        ? (stack) => moveStackInto(stack, c.data.items, 0, 27)
        : c.type === 'furnace'
          ? (stack) => {
              const target = smeltResult(stack.id) ? 0 : getItem(stack.id).fuel ? 1 : -1;
              if (target < 0) return stack;
              return moveStackInto(stack, c.data.items, target, target + 1);
            }
          : null;
    inner.appendChild(this.playerInventory(onShift));
    if (c.type === 'furnace') this.renderFurnaceProgress();
    this.positionFloating();
  }

  takeCraftResult(shift) {
    const c = this.container;
    const g = this.game;
    const craftOnce = () => {
      const r = findRecipe(c.grid.map((s) => (s ? s.id : null)), c.gridW);
      if (!r) return null;
      for (let i = 0; i < c.grid.length; i++) {
        if (c.grid[i]) {
          c.grid[i].count -= 1;
          if (c.grid[i].count <= 0) c.grid[i] = null;
        }
      }
      g.onCrafted(r.id);
      return r;
    };
    if (shift) {
      for (let n = 0; n < 64; n++) {
        const r = findRecipe(c.grid.map((s) => (s ? s.id : null)), c.gridW);
        if (!r) break;
        const test = g.inv.toJSON();
        if (g.inv.add(r.id, r.count) > 0) {
          g.inv.slots = test.slots;
          break;
        }
        g.inv.slots = test.slots;
        craftOnce();
        g.inv.add(r.id, r.count);
      }
      return;
    }
    const r = findRecipe(c.grid.map((s) => (s ? s.id : null)), c.gridW);
    if (!r) return;
    if (!this.cursor) {
      this.cursor = craftOnce();
    } else if (this.cursor.id === r.id && !this.cursor.dmg && this.cursor.count + r.count <= maxStack(r.id)) {
      craftOnce();
      this.cursor.count += r.count;
    }
  }

  furnaceSlot(i, b, shift) {
    const items = this.container.data.items;
    const g = this.game;
    if (shift) {
      const st = items[i];
      if (!st) return;
      items[i] = null;
      const left = g.inv.add(st.id, st.count);
      if (left) items[i] = { ...st, count: left };
      return;
    }
    if (i === 2) {
      const st = items[2];
      if (!st) return;
      if (!this.cursor) {
        this.cursor = st;
        items[2] = null;
      } else if (this.cursor.id === st.id && this.cursor.count + st.count <= maxStack(st.id)) {
        this.cursor.count += st.count;
        items[2] = null;
      }
      return;
    }
    this.cursor = clickSlot(items, i, this.cursor, b);
  }

  renderFurnaceProgress() {
    const d = this.container && this.container.data;
    const p = $('furnace-progress');
    const f = $('furnace-flame');
    if (!d || !p || !f) return;
    p.style.width = `${Math.round(((d.cook || 0) / SMELT_TIME) * 100)}%`;
    f.style.opacity = d.burn > 0 ? 0.3 + 0.7 * (d.burn / (d.burnMax || 1)) : 0.1;
    // Inhalte können sich durch den Ofen ändern
    const sig = JSON.stringify(d.items);
    if (sig !== this.furnaceSig) {
      this.furnaceSig = sig;
      this.renderContainer();
    }
  }

  showTooltip(stack) {
    const t = $('tooltip');
    if (!stack || !this.container) {
      t.style.display = 'none';
      return;
    }
    const it = getItem(stack.id);
    let text = itemName(stack.id);
    if (it && it.tool) text += `\nSchaden: ${it.tool.damage}  Haltbarkeit: ${it.tool.durability - (stack.dmg || 0)}/${it.tool.durability}`;
    if (it && it.food) text += `\nSättigung: +${it.food.hunger / 2} 🍗`;
    t.textContent = text;
    t.style.display = 'block';
    this.positionFloating();
  }

  positionFloating() {
    const cs = $('cursor-stack');
    if (this.cursor && this.container) {
      cs.innerHTML = this.slotHTML(this.cursor);
      cs.style.display = 'block';
      cs.style.left = `${this.mouseX - 20}px`;
      cs.style.top = `${this.mouseY - 20}px`;
    } else cs.style.display = 'none';
    const t = $('tooltip');
    t.style.left = `${(this.mouseX || 0) + 16}px`;
    t.style.top = `${(this.mouseY || 0) - 10}px`;
  }

  // --- Menüs -----------------------------------------------------------------

  showScreen(id, on) {
    $(id).classList.toggle('open', on);
  }
}
