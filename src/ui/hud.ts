import { gameBus } from '@core/events';
import { formatCoins } from '@core/format';
import { BALANCE } from '@data/balance';

// Baut das HTML-HUD-Overlay ueber dem Canvas auf. In Phase 0 nur eine
// Platzhalter-Leiste (Muenz-Anzeige) und ein Hinweistext.
export function createHud(root: HTMLElement): void {
  root.innerHTML = '';

  // Obere Leiste mit Muenz-Anzeige.
  const topbar = document.createElement('div');
  topbar.className = 'hud-topbar';

  const badge = document.createElement('span');
  badge.className = 'hud-badge';
  badge.textContent = 'Phase 0';

  const coinLabel = document.createElement('span');
  coinLabel.innerHTML = '<span aria-hidden="true">🪙</span> ';

  const coinValue = document.createElement('span');
  coinValue.className = 'hud-coin';
  coinValue.textContent = formatCoins(BALANCE.startingCoins);

  coinLabel.appendChild(coinValue);
  topbar.appendChild(badge);
  topbar.appendChild(coinLabel);

  // Unterer Hinweis.
  const hint = document.createElement('div');
  hint.className = 'hud-hint';
  hint.textContent = 'Willkommen! Das Geruest laeuft. Der Kern-Loop kommt in Phase 1.';

  root.appendChild(topbar);
  root.appendChild(hint);

  // Muenz-Anzeige auf Aenderungen reagieren lassen (Vorbereitung fuer Phase 1).
  gameBus.on('coinsChanged', (coins) => {
    coinValue.textContent = formatCoins(coins);
  });
}
