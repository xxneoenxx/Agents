// Touch-Steuerung für Handy und Tablet (dort gibt es keinen Mauszeiger-Fang).
//
// Wischen = umsehen · kurz tippen = setzen/benutzen · lange drücken = abbauen/angreifen
// Steuerkreuz links = laufen · Knöpfe rechts = Inventar, Springen, Perspektive, Karte, Chat, Menü

import { clamp, normDeg } from './util.js';

export function isTouchDevice() {
  return (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || 'ontouchstart' in window;
}

const LONG_PRESS_MS = 350;
const TAP_MOVE_PX = 12;

export class TouchControls {
  constructor(game) {
    this.game = game;
    this.lookTouch = null;
    this.root = document.createElement('div');
    this.root.id = 'touch';
    this.root.innerHTML = `
      <div class="pad">
        <button data-move="0" class="up">▲</button>
        <button data-move="-90" class="left">◀</button>
        <button data-move="90" class="right">▶</button>
        <button data-move="180" class="down">▼</button>
      </div>
      <div class="actions">
        <button data-hold="mine" class="big">⛏</button>
        <button data-hold="use" class="big">✋</button>
        <button data-act="jump">⤒</button>
        <button data-act="inv">E</button>
        <button data-act="view">F5</button>
        <button data-act="map">🗺</button>
        <button data-act="chat">💬</button>
        <button data-act="pause">⏸</button>
      </div>`;
    document.getElementById('hud').appendChild(this.root);
    document.body.classList.add('touch-mode');
    this.bindButtons();
    this.bindLook();
    this.bindHotbar();
  }

  bindButtons() {
    const g = this.game;
    for (const b of this.root.querySelectorAll('button')) {
      b.addEventListener('contextmenu', (e) => e.preventDefault());
      const down = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (g.anyScreen() && b.dataset.act !== 'pause') return;
        b.classList.add('down');
        if (b.dataset.move != null) {
          this.heldMove = parseFloat(b.dataset.move);
          g.tryMove(this.heldMove);
        } else if (b.dataset.hold === 'mine') {
          g.leftDown = true;
          g.onLeftClick();
        } else if (b.dataset.hold === 'use') {
          g.rightDown = true;
          g.useCooldown = 0.3;
          g.use();
        } else this.action(b.dataset.act);
      };
      const up = (e) => {
        e.preventDefault();
        b.classList.remove('down');
        if (b.dataset.move != null) this.heldMove = null;
        if (b.dataset.hold === 'mine') g.leftDown = false;
        if (b.dataset.hold === 'use') g.rightDown = false;
      };
      b.addEventListener('touchstart', down, { passive: false });
      b.addEventListener('touchend', up, { passive: false });
      b.addEventListener('touchcancel', up, { passive: false });
    }
  }

  action(act) {
    const g = this.game;
    switch (act) {
      case 'jump':
        g.character.doJump();
        break;
      case 'inv':
        g.ui.openContainer(g.gamemode === 'creative' ? 'creative' : 'inventory');
        break;
      case 'view':
        g.thirdPerson = !g.thirdPerson;
        break;
      case 'map':
        g.openBigMap();
        break;
      case 'chat':
        g.ui.openChat('/');
        break;
      case 'pause':
        if (!g.dead) g.showPause(!document.getElementById('pause').classList.contains('open'));
        break;
    }
  }

  // Wischen auf dem Bild = umsehen; Tippen = benutzen; lange drücken = abbauen.
  bindLook() {
    const g = this.game;
    const canvas = g.canvas;
    canvas.addEventListener(
      'touchstart',
      (e) => {
        if (g.anyScreen() || this.lookTouch) return;
        const t = e.changedTouches[0];
        this.lookTouch = { id: t.identifier, x: t.clientX, y: t.clientY, sx: t.clientX, sy: t.clientY, moved: false, long: false };
        this.longTimer = setTimeout(() => {
          if (this.lookTouch && !this.lookTouch.moved) {
            this.lookTouch.long = true;
            g.leftDown = true;
            g.onLeftClick();
          }
        }, LONG_PRESS_MS);
        e.preventDefault();
      },
      { passive: false },
    );
    canvas.addEventListener(
      'touchmove',
      (e) => {
        const lt = this.lookTouch;
        if (!lt) return;
        for (const t of e.changedTouches) {
          if (t.identifier !== lt.id) continue;
          if (Math.hypot(t.clientX - lt.sx, t.clientY - lt.sy) > TAP_MOVE_PX) lt.moved = true;
          const s = g.settings.sensitivity * 1.6;
          // wie mit der Maus: nach rechts wischen = nach rechts drehen
          g.heading = normDeg(g.heading + (t.clientX - lt.x) * s);
          g.pitch = clamp(g.pitch - (t.clientY - lt.y) * s, -85, 85);
          lt.x = t.clientX;
          lt.y = t.clientY;
        }
        e.preventDefault();
      },
      { passive: false },
    );
    const end = (e) => {
      const lt = this.lookTouch;
      if (!lt) return;
      for (const t of e.changedTouches) {
        if (t.identifier !== lt.id) continue;
        clearTimeout(this.longTimer);
        if (lt.long) g.leftDown = false;
        else if (!lt.moved && !g.anyScreen()) g.use();
        this.lookTouch = null;
      }
    };
    canvas.addEventListener('touchend', end);
    canvas.addEventListener('touchcancel', end);
  }

  bindHotbar() {
    const hb = document.getElementById('hotbar');
    hb.addEventListener('touchstart', (e) => {
      const slot = e.target.closest('.slot');
      if (!slot) return;
      const i = [...hb.children].indexOf(slot);
      if (i >= 0) {
        this.game.inv.selected = i;
        this.game.ui.showItemName(this.game.inv.selectedId());
      }
      e.preventDefault();
    }, { passive: false });
  }

  // Steuerkreuz gedrückt halten = weiterlaufen (wird aus der Spielschleife aufgerufen).
  update() {
    const g = this.game;
    if (this.heldMove == null || g.moving || performance.now() - g.lastMove < 280) return;
    g.tryMove(this.heldMove);
  }
}
