// HTML-HUD-Overlay: obere Leiste (Muenzen, Einkommen, Marketing-Boost),
// Kauf-Modus-Umschalter (x1/x10/Max) und das Stations-Panel mit Karten.
// Liest den Zustand ueber den GameController und ruft dessen Aktionen auf.

import { STATIONS } from '@data/stations';
import { formatNumber } from '@core/format';
import { milestoneMultiplier } from '@core/economy';
import type { GameController, BuyAmount } from '@core/game';

interface StationCard {
  root: HTMLDivElement;
  update: (nowMs: number) => void;
}

export interface Hud {
  update: (nowMs: number) => void;
}

// Formatiert Millisekunden als "12s".
function formatSeconds(ms: number): string {
  return `${Math.ceil(ms / 1000)}s`;
}

export function createHud(root: HTMLElement, game: GameController): Hud {
  root.innerHTML = '';

  // Aktueller Kauf-Modus (x1 / x10 / Max).
  let buyMode: BuyAmount = 1;

  // --- Obere Leiste ---------------------------------------------------------
  const top = document.createElement('div');
  top.className = 'hud-top';

  const coinsBox = document.createElement('div');
  coinsBox.className = 'hud-coins';
  const coinsValue = document.createElement('span');
  coinsValue.className = 'hud-coin';
  coinsBox.innerHTML = '<span aria-hidden="true">🪙</span> ';
  coinsBox.appendChild(coinsValue);

  const incomeValue = document.createElement('div');
  incomeValue.className = 'hud-income';

  const boostBtn = document.createElement('button');
  boostBtn.className = 'btn btn-boost';
  boostBtn.type = 'button';
  boostBtn.addEventListener('click', () => {
    game.activateMarketing(performance.now());
  });

  top.appendChild(coinsBox);
  top.appendChild(incomeValue);
  top.appendChild(boostBtn);

  // --- Weltsteuerung (Zentrier-Button) --------------------------------------
  const worldControls = document.createElement('div');
  worldControls.className = 'world-controls';
  const centerBtn = document.createElement('button');
  centerBtn.type = 'button';
  centerBtn.className = 'btn-round';
  centerBtn.title = 'Ansicht zentrieren';
  centerBtn.textContent = '🎯';
  centerBtn.addEventListener('click', () => game.bus.emit('cameraCenter', null));
  worldControls.appendChild(centerBtn);

  // --- Panel (unten) --------------------------------------------------------
  const panel = document.createElement('div');
  panel.className = 'panel';

  // Einklapp-Griff, um die lebendige Welt freizugeben.
  const handle = document.createElement('button');
  handle.type = 'button';
  handle.className = 'panel-handle';
  const handleLabel = document.createElement('span');
  handleLabel.textContent = 'Läden';
  const handleArrow = document.createElement('span');
  handleArrow.className = 'panel-arrow';
  handleArrow.textContent = '▾';
  handle.appendChild(handleLabel);
  handle.appendChild(handleArrow);
  handle.addEventListener('click', () => {
    const collapsed = panel.classList.toggle('collapsed');
    handleArrow.textContent = collapsed ? '▴' : '▾';
  });
  panel.appendChild(handle);

  // Kauf-Modus-Umschalter
  const buyModeBar = document.createElement('div');
  buyModeBar.className = 'buymode';
  const modes: { label: string; value: BuyAmount }[] = [
    { label: '×1', value: 1 },
    { label: '×10', value: 10 },
    { label: 'Max', value: 'max' },
  ];
  const modeButtons: { value: BuyAmount; el: HTMLButtonElement }[] = [];
  for (const m of modes) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'buymode-btn';
    b.textContent = m.label;
    b.addEventListener('click', () => {
      buyMode = m.value;
      modeButtons.forEach((mb) => mb.el.classList.toggle('active', mb.value === buyMode));
    });
    modeButtons.push({ value: m.value, el: b });
    buyModeBar.appendChild(b);
  }
  modeButtons[0].el.classList.add('active');

  const list = document.createElement('div');
  list.className = 'stations';

  panel.appendChild(buyModeBar);
  panel.appendChild(list);

  root.appendChild(top);
  root.appendChild(worldControls);
  root.appendChild(panel);

  // --- Stationskarten -------------------------------------------------------
  const cards: StationCard[] = STATIONS.map((def, index) =>
    createStationCard(def, index, game, () => buyMode),
  );
  cards.forEach((c) => list.appendChild(c.root));

  // --- Gesamt-Update --------------------------------------------------------
  function update(nowMs: number): void {
    const state = game.getState();
    coinsValue.textContent = formatNumber(state.coins);

    const perSec = game.incomePerSecond(nowMs);
    incomeValue.textContent = perSec > 0 ? `${formatNumber(perSec)} / Sek.` : '';

    const boost = game.getBoostInfo(nowMs);
    if (boost.active) {
      boostBtn.textContent = `Boost ×${boost.factor} · ${formatSeconds(boost.remainingMs)}`;
      boostBtn.classList.add('is-active');
      boostBtn.disabled = true;
    } else if (boost.onCooldown) {
      boostBtn.textContent = `Marketing · ${formatSeconds(boost.cooldownRemainingMs)}`;
      boostBtn.classList.remove('is-active');
      boostBtn.disabled = true;
    } else {
      boostBtn.textContent = '📣 Marketing';
      boostBtn.classList.remove('is-active');
      boostBtn.disabled = false;
    }

    for (const c of cards) c.update(nowMs);
  }

  update(performance.now());
  return { update };
}

function createStationCard(
  def: (typeof STATIONS)[number],
  index: number,
  game: GameController,
  getBuyMode: () => BuyAmount,
): StationCard {
  const card = document.createElement('div');
  card.className = 'card';

  // Klick auf die Karte (nicht auf Buttons) startet manuell einen Zyklus.
  const tapArea = document.createElement('button');
  tapArea.type = 'button';
  tapArea.className = 'card-tap';

  const emoji = document.createElement('div');
  emoji.className = 'card-emoji';
  emoji.textContent = def.emoji;

  const info = document.createElement('div');
  info.className = 'card-info';
  const nameEl = document.createElement('div');
  nameEl.className = 'card-name';
  nameEl.textContent = def.name;
  const ownedEl = document.createElement('div');
  ownedEl.className = 'card-owned';
  info.appendChild(nameEl);
  info.appendChild(ownedEl);

  // Fortschrittsbalken
  const progressWrap = document.createElement('div');
  progressWrap.className = 'card-progress';
  const progressFill = document.createElement('div');
  progressFill.className = 'card-progress-fill';
  progressWrap.appendChild(progressFill);

  tapArea.appendChild(emoji);
  tapArea.appendChild(info);
  tapArea.appendChild(progressWrap);
  tapArea.addEventListener('click', () => {
    game.tapStation(def.id);
  });

  // Aktionsleiste (Kaufen / Manager)
  const actions = document.createElement('div');
  actions.className = 'card-actions';

  const buyBtn = document.createElement('button');
  buyBtn.type = 'button';
  buyBtn.className = 'btn btn-buy';
  buyBtn.addEventListener('click', () => {
    game.buyUnits(def.id, getBuyMode());
  });

  const managerBtn = document.createElement('button');
  managerBtn.type = 'button';
  managerBtn.className = 'btn btn-manager';
  managerBtn.addEventListener('click', () => {
    game.hireManager(def.id);
  });

  actions.appendChild(buyBtn);
  actions.appendChild(managerBtn);

  // Sperr-Overlay fuer noch nicht freigeschaltete Stationen.
  const lock = document.createElement('div');
  lock.className = 'card-lock';
  const prevName = index > 0 ? STATIONS[index - 1].name : '';
  lock.textContent = `🔒 Erst „${prevName}" eröffnen`;

  card.appendChild(tapArea);
  card.appendChild(actions);
  card.appendChild(lock);

  function update(_nowMs: number): void {
    const state = game.getState();
    const st = state.stations[index];
    const unlocked = game.isUnlocked(index);

    card.classList.toggle('locked', !unlocked);
    lock.style.display = unlocked ? 'none' : 'flex';
    if (!unlocked) return;

    // Besitz + aktiver Meilenstein-Multiplikator
    const mult = milestoneMultiplier(st.owned);
    ownedEl.innerHTML =
      `Anzahl: <b>${st.owned}</b>` + (mult > 1 ? ` <span class="tag">×${mult}</span>` : '');

    // Fortschritt
    progressFill.style.width = `${game.cycleProgress(def.id) * 100}%`;

    // Kauf-Button
    const mode = getBuyMode();
    const { count, cost } = game.costFor(def.id, mode);
    const affordable = count > 0 && state.coins >= cost - 1e-6;
    if (st.owned === 0) {
      buyBtn.innerHTML = `Eröffnen<br><small>${formatNumber(cost)} 🪙</small>`;
    } else {
      const label = mode === 'max' ? `Max (${count})` : `Kaufen ×${count}`;
      buyBtn.innerHTML = `${label}<br><small>${formatNumber(cost)} 🪙</small>`;
    }
    buyBtn.disabled = !affordable;

    // Manager-Button
    if (st.manager) {
      managerBtn.innerHTML = 'Manager ✓';
      managerBtn.classList.add('hired');
      managerBtn.disabled = true;
    } else {
      managerBtn.classList.remove('hired');
      const canHire = st.owned > 0 && state.coins >= def.managerCost - 1e-6;
      managerBtn.innerHTML = `Manager<br><small>${formatNumber(def.managerCost)} 🪙</small>`;
      managerBtn.disabled = !canHire;
    }

    // Tippen nur sinnvoll ohne Manager und mit Einheit.
    tapArea.classList.toggle('tappable', st.owned > 0 && !st.manager);
  }

  return { root: card, update };
}
