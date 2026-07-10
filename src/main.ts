import Phaser from 'phaser';
import { registerSW } from 'virtual:pwa-register';
import { BootScene } from '@game/scenes/BootScene';
import { PreloadScene } from '@game/scenes/PreloadScene';
import { WorldScene } from '@game/scenes/WorldScene';
import { createHud } from '@ui/hud';
import { GameController } from '@core/game';
import { loadGame, saveGame } from '@core/save';
import { AudioManager } from '@game/systems/AudioManager';

// Einstiegspunkt: Spielstand laden (inkl. Offline-Einnahmen), Controller + Phaser
// starten, DOM-HUD aufbauen, Sound verdrahten, Loop treiben, autospeichern, PWA.

// Erst starten, wenn das DOM bereit ist. Als ES-Modul laeuft der Code ohnehin
// "deferred"; als klassisches Script (Einzeldatei/Safari) verhindert das den
// Zugriff auf noch nicht existierende Container.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

function boot(): void {
  const gameRoot = document.getElementById('game-root');
  const uiOverlay = document.getElementById('ui-overlay');
  if (!gameRoot || !uiOverlay) {
    throw new Error('DOM-Container (#game-root / #ui-overlay) nicht gefunden.');
  }

// Gespeicherten Zustand laden (falls vorhanden).
const loaded = loadGame();
const controller = new GameController(loaded?.state);

// Phaser-Konfiguration.
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: gameRoot,
  backgroundColor: '#FFC24B',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: '100%',
    height: '100%',
  },
  scene: [BootScene, PreloadScene, WorldScene],
  render: { antialias: true, pixelArt: false },
};

const phaserGame = new Phaser.Game(config);
phaserGame.registry.set('controller', controller);

// HTML-HUD.
const hud = createHud(uiOverlay, controller);

if (import.meta.env.DEV) {
  (window as unknown as { __game: GameController; __save: unknown }).__game = controller;
  (window as unknown as { __save: unknown }).__save = { saveGame, loadGame };
}

// --- Sound ----------------------------------------------------------------
const audio = new AudioManager(controller.isSoundOn());
controller.bus.on('soundChanged', (on) => audio.setEnabled(on));
controller.bus.on('stationStarted', () => audio.play('serve'));
controller.bus.on('stationPaid', () => audio.play('coin'));
controller.bus.on('upgradeChanged', () => audio.play('buy'));
controller.bus.on('restaurantChanged', () => audio.play('buy'));
controller.bus.on('prestiged', () => audio.play('levelup'));
controller.bus.on('investorDeal', () => audio.play('deal'));
// AudioContext erst nach der ersten Nutzergeste starten (Autoplay-Richtlinien).
window.addEventListener('pointerdown', () => audio.resume(), { once: true });

// Tastatur-Shortcut: "M" loest den Marketing-Boost aus.
window.addEventListener('keydown', (e) => {
  if ((e.key === 'm' || e.key === 'M') && !e.repeat) {
    controller.activateMarketing(performance.now());
  }
});

// --- Offline-Einnahmen ----------------------------------------------------
if (loaded) {
  const elapsed = Date.now() - loaded.savedAt;
  const result = controller.applyOffline(elapsed);
  if (result.earned > 0) controller.bus.emit('offlineEarnings', result);
}

// --- Spiel-Loop -----------------------------------------------------------
let lastHudMs = 0;
function frame(nowMs: number): void {
  controller.tick(nowMs);
  if (nowMs - lastHudMs >= 100) {
    hud.update(nowMs);
    lastHudMs = nowMs;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// --- Autospeichern --------------------------------------------------------
setInterval(() => saveGame(controller.getState()), 15_000);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveGame(controller.getState());
});
window.addEventListener('pagehide', () => saveGame(controller.getState()));

  // PWA-ServiceWorker registrieren (Auto-Update).
  registerSW({ immediate: true });
}
