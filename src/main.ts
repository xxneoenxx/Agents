import Phaser from 'phaser';
import { registerSW } from 'virtual:pwa-register';
import { BootScene } from '@game/scenes/BootScene';
import { PreloadScene } from '@game/scenes/PreloadScene';
import { WorldScene } from '@game/scenes/WorldScene';
import { createHud } from '@ui/hud';
import { GameController } from '@core/game';

// Einstiegspunkt: Zustand/Controller erzeugen, Phaser starten, DOM-HUD aufbauen,
// den Spiel-Loop treiben und den PWA-ServiceWorker registrieren.

const gameRoot = document.getElementById('game-root');
const uiOverlay = document.getElementById('ui-overlay');

if (!gameRoot || !uiOverlay) {
  throw new Error('DOM-Container (#game-root / #ui-overlay) nicht gefunden.');
}

// Zentraler Spiel-Controller (haelt Zustand + Loop-Logik, engine-unabhaengig).
const controller = new GameController();

// Phaser-Konfiguration. Skaliert responsiv auf die volle Flaeche.
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
  render: {
    antialias: true,
    pixelArt: false,
  },
};

const phaserGame = new Phaser.Game(config);
// Controller fuer die Szenen bereitstellen.
phaserGame.registry.set('controller', controller);

// HTML-HUD ueber dem Canvas aufbauen.
const hud = createHud(uiOverlay, controller);

// Im Dev-Modus den Controller zum Debuggen/Testen bereitstellen.
if (import.meta.env.DEV) {
  (window as unknown as { __game: GameController }).__game = controller;
}

// --- Spiel-Loop -----------------------------------------------------------
// Ein rAF-Loop treibt die Wirtschaftssimulation jeden Frame (mit Delta-Cap im
// Controller) und aktualisiert die HUD-Texte nur ~10x/Sekunde.
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

// PWA-ServiceWorker registrieren (Auto-Update).
registerSW({ immediate: true });
