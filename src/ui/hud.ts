// HTML-HUD-Overlay: obere Leiste (Muenzen/Einkommen/Boost), Weltsteuerung und
// ein einklappbares Panel mit Tabs: Laeden (Stationen), Karte (Restaurants),
// Upgrades und Investoren (Prestige). Liest den Zustand ueber den GameController.

import { formatNumber } from '@core/format';
import { milestoneMultiplier } from '@core/economy';
import { clearSave } from '@core/save';
import type { GameController, BuyAmount } from '@core/game';
import type { InvestorDeal } from '@core/events';
import type { StationDef } from '@data/stations';

interface Pane {
  el: HTMLElement;
  update: (nowMs: number) => void;
}

export interface Hud {
  update: (nowMs: number) => void;
}

function formatSeconds(ms: number): string {
  return `${Math.ceil(ms / 1000)}s`;
}

function formatDuration(seconds: number): string {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h} Std. ${m} Min.`;
  if (m > 0) return `${m} Min.`;
  return `${s} Sek.`;
}

interface ModalAction {
  label: string;
  cls: string;
  onClick: () => void;
}

// Baut ein barrierefreies modales Overlay auf und gibt eine Schliessen-Funktion
// zurueck. Setzt Fokus in den Dialog, faengt Tab (Fokusfalle), schliesst mit
// Escape und gibt den Fokus danach an das ausloesende Element zurueck.
let modalTitleSeq = 0;
function showModal(
  host: HTMLElement,
  opts: { title: string; bodyHtml: string; actions: ModalAction[]; dismissable?: boolean },
): () => void {
  const opener = document.activeElement as HTMLElement | null;
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  const titleId = `modal-title-${++modalTitleSeq}`;
  const title = document.createElement('div');
  title.className = 'modal-title';
  title.id = titleId;
  title.textContent = opts.title;
  modal.setAttribute('aria-labelledby', titleId);
  const body = document.createElement('div');
  body.className = 'modal-body';
  body.innerHTML = opts.bodyHtml;
  const actions = document.createElement('div');
  actions.className = 'modal-actions';

  const close = (): void => {
    document.removeEventListener('keydown', onKey, true);
    backdrop.remove();
    opener?.focus?.();
  };

  const buttons: HTMLButtonElement[] = [];
  for (const a of opts.actions) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = a.cls;
    btn.textContent = a.label;
    btn.addEventListener('click', () => a.onClick());
    actions.appendChild(btn);
    buttons.push(btn);
  }

  // Tastatur: Escape schliesst, Tab bleibt im Dialog (Fokusfalle).
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && opts.dismissable !== false) {
      e.preventDefault();
      close();
    } else if (e.key === 'Tab' && buttons.length > 0) {
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };
  document.addEventListener('keydown', onKey, true);

  modal.append(title, body, actions);
  backdrop.appendChild(modal);
  if (opts.dismissable !== false) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });
  }
  host.appendChild(backdrop);
  buttons[0]?.focus();
  return close;
}

function makeButton(cls: string): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls;
  return b;
}

export function createHud(root: HTMLElement, game: GameController): Hud {
  root.innerHTML = '';
  let buyMode: BuyAmount = 1;

  // --- Obere Leiste ---------------------------------------------------------
  const top = document.createElement('div');
  top.className = 'hud-top';
  const coinsBox = document.createElement('div');
  coinsBox.className = 'hud-coins';
  coinsBox.innerHTML = '<span aria-hidden="true">🪙</span> ';
  const coinsValue = document.createElement('span');
  coinsValue.className = 'hud-coin';
  coinsBox.appendChild(coinsValue);
  const incomeValue = document.createElement('div');
  incomeValue.className = 'hud-income';
  const boostBtn = makeButton('btn btn-boost');
  boostBtn.setAttribute('aria-label', 'Marketing-Boost aktivieren');
  boostBtn.addEventListener('click', () => game.activateMarketing(performance.now()));
  coinsBox.setAttribute('aria-label', 'Münzen');
  top.append(coinsBox, incomeValue, boostBtn);

  // --- Weltsteuerung --------------------------------------------------------
  const worldControls = document.createElement('div');
  worldControls.className = 'world-controls';
  const centerBtn = makeButton('btn-round');
  centerBtn.title = 'Ansicht zentrieren';
  centerBtn.setAttribute('aria-label', 'Ansicht zentrieren');
  centerBtn.textContent = '🎯';
  centerBtn.addEventListener('click', () => game.bus.emit('cameraCenter', null));
  const settingsBtn = makeButton('btn-round');
  settingsBtn.title = 'Einstellungen';
  settingsBtn.setAttribute('aria-label', 'Einstellungen öffnen');
  settingsBtn.textContent = '⚙️';
  settingsBtn.addEventListener('click', () => openSettings());
  worldControls.append(centerBtn, settingsBtn);

  // --- Panel ----------------------------------------------------------------
  const panel = document.createElement('div');
  panel.className = 'panel';

  const handle = makeButton('panel-handle');
  handle.setAttribute('aria-label', 'Menü ein- oder ausklappen');
  handle.setAttribute('aria-expanded', 'true');
  const handleLabel = document.createElement('span');
  handleLabel.textContent = 'Menü';
  const handleArrow = document.createElement('span');
  handleArrow.className = 'panel-arrow';
  handleArrow.textContent = '▾';
  handle.append(handleLabel, handleArrow);
  handle.addEventListener('click', () => {
    const collapsed = panel.classList.toggle('collapsed');
    handleArrow.textContent = collapsed ? '▴' : '▾';
    handle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  });

  // Restaurant-Kopf: Name + Renovieren
  const header = document.createElement('div');
  header.className = 'resto-header';
  const restoName = document.createElement('div');
  restoName.className = 'resto-name';
  const renovateBtn = makeButton('btn btn-renovate');
  renovateBtn.addEventListener('click', () => game.renovate());
  header.append(restoName, renovateBtn);

  // Tab-Leiste
  const tabbar = document.createElement('div');
  tabbar.className = 'tabbar';
  tabbar.setAttribute('role', 'tablist');
  tabbar.setAttribute('aria-label', 'Menü-Bereiche');
  const content = document.createElement('div');
  content.className = 'pane-container';

  const panes: Record<string, Pane> = {
    stations: buildStationsPane(game, () => buyMode, (m) => (buyMode = m)),
    map: buildMapPane(game),
    upgrades: buildUpgradesPane(game),
    investors: buildInvestorsPane(game),
    achievements: buildAchievementsPane(game),
  };

  const tabs: { key: string; label: string }[] = [
    { key: 'stations', label: '🍔 Läden' },
    { key: 'map', label: '🗺️ Karte' },
    { key: 'upgrades', label: '⭐ Upgrades' },
    { key: 'investors', label: '💼 Investoren' },
    { key: 'achievements', label: '🏆 Ziele' },
  ];
  let activeTab = 'stations';
  const tabButtons: { key: string; el: HTMLButtonElement }[] = [];
  for (const t of tabs) {
    const b = makeButton('tab-btn');
    b.textContent = t.label;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', t.key === activeTab ? 'true' : 'false');
    b.addEventListener('click', () => {
      activeTab = t.key;
      for (const [key, pane] of Object.entries(panes)) {
        pane.el.style.display = key === activeTab ? '' : 'none';
      }
      tabButtons.forEach((tb) => {
        const on = tb.key === activeTab;
        tb.el.classList.toggle('active', on);
        tb.el.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      if (panel.classList.contains('collapsed')) {
        panel.classList.remove('collapsed');
        handleArrow.textContent = '▾';
        handle.setAttribute('aria-expanded', 'true');
      }
    });
    tabButtons.push({ key: t.key, el: b });
    tabbar.appendChild(b);
  }
  tabButtons[0].el.classList.add('active');

  for (const [key, pane] of Object.entries(panes)) {
    pane.el.style.display = key === activeTab ? '' : 'none';
    pane.el.setAttribute('role', 'tabpanel');
    content.appendChild(pane.el);
  }

  panel.append(handle, header, tabbar, content);
  root.append(top, worldControls, panel);

  // --- Modals ---------------------------------------------------------------
  function openSettings(confirmingReset = false): void {
    let close = (): void => {};
    close = showModal(root, {
      title: '⚙️ Einstellungen',
      bodyHtml:
        '<p class="modal-text">Bewegungsreduktion folgt automatisch der System­einstellung ' +
        '(<i>prefers-reduced-motion</i>).</p>',
      actions: [
        {
          label: `🔊 Sound: ${game.isSoundOn() ? 'An' : 'Aus'}`,
          cls: 'btn-secondary',
          onClick: () => {
            game.setSound(!game.isSoundOn());
            close();
            openSettings(false);
          },
        },
        confirmingReset
          ? {
              label: '⚠️ Wirklich löschen!',
              cls: 'btn-danger',
              onClick: () => {
                clearSave();
                game.hardReset();
                close();
              },
            }
          : {
              label: 'Spielstand zurücksetzen',
              cls: 'btn-danger',
              onClick: () => {
                close();
                openSettings(true);
              },
            },
        { label: 'Schließen', cls: 'btn-secondary', onClick: () => close() },
      ],
    });
  }

  // Willkommen zurueck (Offline-Einnahmen).
  game.bus.on('offlineEarnings', (p) => {
    if (p.earned <= 0) return;
    let close = (): void => {};
    close = showModal(root, {
      title: '👋 Willkommen zurück!',
      bodyHtml:
        `<p class="modal-text">Deine Manager haben in <b>${formatDuration(p.seconds)}</b> ` +
        `Abwesenheit <b class="coin-amount">${formatNumber(p.earned)} 🪙</b> verdient.` +
        (p.capped ? '<br><small>(auf die Offline-Obergrenze begrenzt)</small>' : '') +
        '</p>',
      actions: [{ label: 'Einsammeln', cls: 'btn-primary', onClick: () => close() }],
    });
  });

  // Investor-Deal.
  game.bus.on('investorDeal', (deal: InvestorDeal) => {
    let close = (): void => {};
    close = showModal(root, {
      title: '💼 Großinvestor',
      bodyHtml:
        '<p class="modal-text">Ein Großinvestor macht dir ein Angebot:</p>' +
        `<p class="deal-offer">${deal.label}</p>`,
      actions: [
        {
          label: 'Annehmen',
          cls: 'btn-primary',
          onClick: () => {
            game.acceptDeal(deal, performance.now());
            close();
          },
        },
        { label: 'Ablehnen', cls: 'btn-secondary', onClick: () => close() },
      ],
    });
  });

  // Toasts (Erfolge + Event-Benachrichtigungen). aria-live meldet sie Screenreadern.
  const toastHost = document.createElement('div');
  toastHost.className = 'toast-host';
  toastHost.setAttribute('role', 'status');
  toastHost.setAttribute('aria-live', 'polite');
  root.appendChild(toastHost);
  function showToast(icon: string, html: string): void {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${html}</span>`;
    toastHost.appendChild(toast);
    setTimeout(() => toast.classList.add('out'), 3200);
    setTimeout(() => toast.remove(), 3600);
  }
  game.bus.on('achievementUnlocked', (def) => {
    const reward = def.reward > 0 ? ` · +${formatNumber(def.reward)} 🪙` : '';
    showToast(def.icon, `<b>Ziel erreicht:</b> ${def.name}${reward}`);
    burstConfetti();
  });
  game.bus.on('notify', (n) => showToast(n.icon, `<b>${n.title}</b>`));

  // Konfetti-Feier (Renovierung/Freischaltung/Prestige/Erfolg).
  const confettiHost = document.createElement('div');
  confettiHost.className = 'confetti-host';
  confettiHost.setAttribute('aria-hidden', 'true');
  root.appendChild(confettiHost);
  const confettiColors = ['#ff5c5c', '#ffc72c', '#22b573', '#7c5cff', '#3aa0ff', '#ff8a3d'];
  function burstConfetti(): void {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    for (let i = 0; i < 28; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti';
      piece.style.background = confettiColors[i % confettiColors.length];
      confettiHost.appendChild(piece);
      const dx = (Math.random() * 2 - 1) * 180;
      const dy = 240 + Math.random() * 200;
      const rot = (Math.random() * 2 - 1) * 720;
      piece
        .animate(
          [
            { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
            { transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`, opacity: 0 },
          ],
          { duration: 1200 + Math.random() * 700, easing: 'cubic-bezier(.2,.6,.4,1)' },
        )
        .addEventListener('finish', () => piece.remove());
    }
  }
  game.bus.on('celebrate', () => burstConfetti());

  // Onboarding-Hinweis beim allerersten Start.
  if (!game.isOnboarded()) {
    const bubble = document.createElement('div');
    bubble.className = 'onboard-bubble';
    bubble.setAttribute('role', 'dialog');
    bubble.setAttribute('aria-label', 'Erste Schritte');
    const text = document.createElement('div');
    text.className = 'onboard-text';
    text.innerHTML =
      "👋 <b>Willkommen bei Bella's Food Empire!</b><br>" +
      'Tippe unten auf einen Laden, um zu <b>servieren</b> und Münzen zu verdienen. ' +
      'Kaufe <b>Einheiten</b> und stelle <b>Manager</b> ein, damit alles von allein läuft.';
    const okBtn = document.createElement('button');
    okBtn.type = 'button';
    okBtn.className = 'btn-primary';
    okBtn.textContent = "Los geht's!";
    bubble.append(text, okBtn);
    root.appendChild(bubble);

    let offTap = (): void => {};
    const dismiss = (): void => {
      game.setOnboarded();
      offTap();
      bubble.remove();
    };
    okBtn.addEventListener('click', dismiss);
    // Beim ersten Servieren automatisch schliessen.
    offTap = game.bus.on('stationStarted', dismiss);
    okBtn.focus();
  }

  // Beim Restaurantwechsel die Stationskarten neu aufbauen.
  game.bus.on('restaurantChanged', () => {
    (panes.stations as ReturnType<typeof buildStationsPane>).rebuild();
  });

  // Tastatur-Shortcuts 1..8: kaufen die jeweilige Station im aktiven Kauf-Modus.
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const n = Number(e.key);
    if (!Number.isInteger(n) || n < 1 || n > 8) return;
    const defs = game.currentStationDefs();
    const idx = n - 1;
    if (idx < defs.length && game.isUnlocked(idx)) {
      game.buyUnits(defs[idx].id, buyMode);
    }
  });

  // --- Gesamt-Update --------------------------------------------------------
  function update(nowMs: number): void {
    coinsValue.textContent = formatNumber(game.getState().coins);
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

    // Restaurant-Kopf
    const reno = game.getRenovationInfo();
    restoName.textContent = reno.name;
    if (reno.maxed) {
      renovateBtn.textContent = 'Voll ausgebaut';
      renovateBtn.disabled = true;
    } else {
      renovateBtn.innerHTML = `Renovieren<br><small>${formatNumber(reno.nextCost ?? 0)} 🪙</small>`;
      renovateBtn.disabled = game.getState().coins < (reno.nextCost ?? Infinity);
    }

    panes[activeTab].update(nowMs);
  }

  update(performance.now());
  return { update };
}

// --- Pane: Stationen --------------------------------------------------------

function buildStationsPane(
  game: GameController,
  getBuyMode: () => BuyAmount,
  setBuyMode: (m: BuyAmount) => void,
): Pane & { rebuild: () => void } {
  const el = document.createElement('div');
  el.className = 'pane';

  const buyModeBar = document.createElement('div');
  buyModeBar.className = 'buymode';
  const modes: { label: string; value: BuyAmount }[] = [
    { label: '×1', value: 1 },
    { label: '×10', value: 10 },
    { label: 'Max', value: 'max' },
  ];
  const modeButtons: { value: BuyAmount; el: HTMLButtonElement }[] = [];
  for (const m of modes) {
    const b = makeButton('buymode-btn');
    b.textContent = m.label;
    b.addEventListener('click', () => {
      setBuyMode(m.value);
      modeButtons.forEach((mb) => mb.el.classList.toggle('active', mb.value === getBuyMode()));
    });
    modeButtons.push({ value: m.value, el: b });
    buyModeBar.appendChild(b);
  }
  modeButtons[0].el.classList.add('active');

  const list = document.createElement('div');
  list.className = 'stations';
  el.append(buyModeBar, list);

  let cards: { root: HTMLElement; update: () => void }[] = [];

  function rebuild(): void {
    list.innerHTML = '';
    const defs = game.currentStationDefs();
    cards = defs.map((def, i) => createStationCard(def, i, defs, game, getBuyMode));
    cards.forEach((c) => list.appendChild(c.root));
  }
  rebuild();

  return {
    el,
    rebuild,
    update: () => cards.forEach((c) => c.update()),
  };
}

function createStationCard(
  def: StationDef,
  index: number,
  defs: StationDef[],
  game: GameController,
  getBuyMode: () => BuyAmount,
): { root: HTMLElement; update: () => void } {
  const card = document.createElement('div');
  card.className = 'card';

  const tapArea = makeButton('card-tap');
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
  info.append(nameEl, ownedEl);
  const progressWrap = document.createElement('div');
  progressWrap.className = 'card-progress';
  const progressFill = document.createElement('div');
  progressFill.className = 'card-progress-fill';
  progressWrap.appendChild(progressFill);
  tapArea.append(emoji, info, progressWrap);
  tapArea.addEventListener('click', () => game.tapStation(def.id));

  const actions = document.createElement('div');
  actions.className = 'card-actions';
  const buyBtn = makeButton('btn btn-buy');
  buyBtn.addEventListener('click', () => game.buyUnits(def.id, getBuyMode()));
  const managerBtn = makeButton('btn btn-manager');
  managerBtn.addEventListener('click', () => game.hireManager(def.id));
  actions.append(buyBtn, managerBtn);

  const lock = document.createElement('div');
  lock.className = 'card-lock';
  const prevName = index > 0 ? defs[index - 1].name : '';
  lock.textContent = `🔒 Erst „${prevName}" eröffnen`;

  card.append(tapArea, actions, lock);

  function update(): void {
    const st = game.currentRestaurant().stations[index];
    if (!st) return;
    const coins = game.getState().coins;
    const unlocked = game.isUnlocked(index);
    card.classList.toggle('locked', !unlocked);
    lock.style.display = unlocked ? 'none' : 'flex';
    if (!unlocked) return;

    const mult = milestoneMultiplier(st.owned);
    ownedEl.innerHTML =
      `Anzahl: <b>${st.owned}</b>` + (mult > 1 ? ` <span class="tag">×${mult}</span>` : '');
    progressFill.style.width = `${game.cycleProgress(def.id) * 100}%`;

    const mode = getBuyMode();
    const { count, cost } = game.costFor(def.id, mode);
    const affordable = count > 0 && coins >= cost - 1e-6;
    if (st.owned === 0) {
      buyBtn.innerHTML = `Eröffnen<br><small>${formatNumber(cost)} 🪙</small>`;
    } else {
      const label = mode === 'max' ? `Max (${count})` : `Kaufen ×${count}`;
      buyBtn.innerHTML = `${label}<br><small>${formatNumber(cost)} 🪙</small>`;
    }
    buyBtn.disabled = !affordable;

    if (st.manager) {
      managerBtn.innerHTML = 'Manager ✓';
      managerBtn.classList.add('hired');
      managerBtn.disabled = true;
    } else {
      managerBtn.classList.remove('hired');
      managerBtn.innerHTML = `Manager<br><small>${formatNumber(def.managerCost)} 🪙</small>`;
      managerBtn.disabled = !(st.owned > 0 && coins >= def.managerCost - 1e-6);
    }
    tapArea.classList.toggle('tappable', st.owned > 0 && !st.manager);
  }

  return { root: card, update };
}

// --- Pane: Karte (Restaurants) ---------------------------------------------

function buildMapPane(game: GameController): Pane {
  const el = document.createElement('div');
  el.className = 'pane map-pane';

  interface Row {
    root: HTMLElement;
    btn: HTMLButtonElement;
    badge: HTMLElement;
    id: string;
    update: () => void;
  }
  const rows: Row[] = game.listRestaurants().map((item) => {
    const root = document.createElement('div');
    root.className = 'map-row';
    const icon = document.createElement('div');
    icon.className = 'map-emoji';
    icon.textContent = item.emoji;
    const nameEl = document.createElement('div');
    nameEl.className = 'map-name';
    const badge = document.createElement('span');
    badge.className = 'map-badge';
    const btn = makeButton('btn btn-travel');
    btn.addEventListener('click', () => {
      const it = game.listRestaurants().find((r) => r.id === item.id)!;
      if (it.unlocked) game.travelTo(item.id);
      else game.unlockRestaurant(item.id);
    });
    nameEl.appendChild(badge);
    root.append(icon, nameEl, btn);

    const update = (): void => {
      const it = game.listRestaurants().find((r) => r.id === item.id)!;
      badge.textContent = it.name;
      root.classList.toggle('current', it.isCurrent);
      if (it.isCurrent) {
        btn.textContent = 'Hier ✓';
        btn.disabled = true;
      } else if (it.unlocked) {
        btn.textContent = 'Reisen';
        btn.disabled = false;
      } else {
        btn.innerHTML = `Eröffnen<br><small>${formatNumber(it.unlockCost)} 🪙</small>`;
        btn.disabled = game.getState().coins < it.unlockCost;
      }
    };
    return { root, btn, badge, id: item.id, update };
  });
  rows.forEach((r) => el.appendChild(r.root));

  return { el, update: () => rows.forEach((r) => r.update()) };
}

// --- Pane: Upgrades ---------------------------------------------------------

function buildUpgradesPane(game: GameController): Pane {
  const el = document.createElement('div');
  el.className = 'pane upgrades-pane';

  const rows = game.listUpgrades().map((item) => {
    const root = document.createElement('div');
    root.className = 'upgrade-row';
    const icon = document.createElement('div');
    icon.className = 'upgrade-emoji';
    icon.textContent = item.def.emoji;
    const info = document.createElement('div');
    info.className = 'upgrade-info';
    const name = document.createElement('div');
    name.className = 'upgrade-name';
    const desc = document.createElement('div');
    desc.className = 'upgrade-desc';
    desc.textContent = item.def.description;
    info.append(name, desc);
    const btn = makeButton('btn btn-buy');
    btn.addEventListener('click', () => game.buyUpgrade(item.def.id));
    root.append(icon, info, btn);

    const update = (): void => {
      const it = game.listUpgrades().find((u) => u.def.id === item.def.id)!;
      name.innerHTML = `${it.def.name} <span class="tag">Stufe ${it.level}/${it.def.maxLevel}</span>`;
      if (it.maxed) {
        btn.textContent = 'Max';
        btn.disabled = true;
      } else {
        btn.innerHTML = `Kaufen<br><small>${formatNumber(it.cost)} 🪙</small>`;
        btn.disabled = game.getState().coins < it.cost;
      }
    };
    return { root, update };
  });
  rows.forEach((r) => el.appendChild(r.root));

  return { el, update: () => rows.forEach((r) => r.update()) };
}

// --- Pane: Investoren (Prestige) -------------------------------------------

function buildInvestorsPane(game: GameController): Pane {
  const el = document.createElement('div');
  el.className = 'pane investors-pane';

  const summary = document.createElement('div');
  summary.className = 'investors-summary';
  const hint = document.createElement('p');
  hint.className = 'investors-hint';
  hint.textContent =
    'Investoren geben einen dauerhaften Umsatz-Bonus. Ein Neuanfang setzt Münzen, ' +
    'Restaurants und Upgrades zurück – deine Investoren bleiben.';
  const btn = makeButton('btn btn-prestige');
  let armed = false;

  btn.addEventListener('click', () => {
    if (!game.getPrestigeInfo().can) return;
    if (!armed) {
      armed = true;
      return;
    }
    game.prestige();
    armed = false;
  });

  el.append(summary, hint, btn);

  const update = (): void => {
    const p = game.getPrestigeInfo();
    summary.innerHTML =
      `<div class="inv-line"><span>Investoren</span><b>${formatNumber(p.investors)}</b></div>` +
      `<div class="inv-line"><span>Dauerbonus</span><b>×${p.multiplier.toFixed(2)}</b></div>` +
      `<div class="inv-line"><span>Jetzt neu</span><b>+${formatNumber(p.gain)}</b></div>`;
    if (!p.can) {
      armed = false;
      btn.textContent = p.gain > 0 ? 'Noch nicht genug Umsatz' : 'Keine neuen Investoren';
      btn.disabled = true;
    } else {
      btn.disabled = false;
      btn.textContent = armed
        ? `Wirklich? +${formatNumber(p.gain)} Investoren`
        : `Neuanfang für +${formatNumber(p.gain)} Investoren`;
    }
  };

  return { el, update };
}

// --- Pane: Ziele (Achievements) --------------------------------------------

function buildAchievementsPane(game: GameController): Pane {
  const el = document.createElement('div');
  el.className = 'pane achievements-pane';

  const rows = game.listAchievements().map((item) => {
    const root = document.createElement('div');
    root.className = 'ach-row';
    const icon = document.createElement('div');
    icon.className = 'ach-emoji';
    icon.textContent = item.def.icon;
    const info = document.createElement('div');
    info.className = 'ach-info';
    const name = document.createElement('div');
    name.className = 'ach-name';
    const desc = document.createElement('div');
    desc.className = 'ach-desc';
    desc.textContent = item.def.description;
    const bar = document.createElement('div');
    bar.className = 'ach-bar';
    const fill = document.createElement('div');
    fill.className = 'ach-bar-fill';
    bar.appendChild(fill);
    info.append(name, desc, bar);
    const status = document.createElement('div');
    status.className = 'ach-status';
    root.append(icon, info, status);

    const update = (): void => {
      const it = game.listAchievements().find((a) => a.def.id === item.def.id)!;
      const rewardTxt = it.def.reward > 0 ? ` (+${formatNumber(it.def.reward)} 🪙)` : '';
      name.innerHTML = `${it.def.name}<small class="ach-reward">${rewardTxt}</small>`;
      fill.style.width = `${Math.round(it.progress * 100)}%`;
      root.classList.toggle('done', it.done);
      status.textContent = it.done ? '✓' : `${Math.round(it.progress * 100)}%`;
    };
    return { root, update };
  });
  rows.forEach((r) => el.appendChild(r.root));

  return { el, update: () => rows.forEach((r) => r.update()) };
}
