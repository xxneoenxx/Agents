import Phaser from 'phaser';
import { registerSW } from 'virtual:pwa-register';
import { BootScene } from '@game/scenes/BootScene';
import { PreloadScene } from '@game/scenes/PreloadScene';
import { WorldScene } from '@game/scenes/WorldScene';
import { createHud } from '@ui/hud';

// Einstiegspunkt: Phaser starten, DOM-HUD aufbauen, PWA-ServiceWorker registrieren.

const gameRoot = document.getElementById('game-root');
const uiOverlay = document.getElementById('ui-overlay');

if (!gameRoot || !uiOverlay) {
  throw new Error('DOM-Container (#game-root / #ui-overlay) nicht gefunden.');
}

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

// Spiel starten.
new Phaser.Game(config);

// HTML-HUD ueber dem Canvas aufbauen.
createHud(uiOverlay);

// PWA-ServiceWorker registrieren (Auto-Update). Fehler still schlucken,
// damit der Dev-Betrieb ohne SW ungestoert laeuft.
registerSW({ immediate: true });
