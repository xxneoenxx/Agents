// Chat-Befehle wie in Minecraft. parseCommand ist ohne DOM testbar.

import { allItems, getItem } from './items.js';
import { findPlace } from './geo.js';
import { PLACES } from './config.js';

export const HELP = [
  '/tp <ort> – zu einem Ort springen (z. B. /tp freiberg)',
  '/tp <breite> <länge> – zu Koordinaten springen',
  '/orte – alle Orte anzeigen',
  '/time set day|night|<zahl> – Uhrzeit setzen',
  '/gamemode survival|creative – Spielmodus wechseln (auch /gm 0 und /gm 1)',
  '/give <gegenstand> [anzahl] – Gegenstand geben (nur Kreativ)',
  '/items – Namen aller Gegenstände',
  '/spawn – zum Spawnpunkt',
  '/kill – neu starten',
  '/clear – Inventar leeren',
];

function findItem(q) {
  const s = q.toLowerCase();
  return allItems().find((it) => it.id === s || it.name.toLowerCase() === s) || allItems().find((it) => it.id.includes(s) || it.name.toLowerCase().includes(s)) || null;
}

// Gibt { action, ... } oder { error } zurück.
export function parseCommand(text) {
  const parts = text.trim().replace(/^\//, '').split(/\s+/);
  const cmd = (parts.shift() || '').toLowerCase();
  switch (cmd) {
    case 'help':
    case 'hilfe':
    case '?':
      return { action: 'help' };
    case 'orte':
      return { action: 'message', text: PLACES.map((p) => p.id).join(', ') };
    case 'items':
      return { action: 'message', text: allItems().filter((i) => !i.hidden).map((i) => i.id).join(', ') };
    case 'tp':
    case 'teleport': {
      if (parts.length >= 2 && !isNaN(parseFloat(parts[0])) && !isNaN(parseFloat(parts[1]))) {
        return { action: 'tp', lat: parseFloat(parts[0]), lng: parseFloat(parts[1]) };
      }
      const p = findPlace(parts.join(' '));
      if (!p) return { error: `Unbekannter Ort. Bekannt: ${PLACES.map((x) => x.id).join(', ')}` };
      return { action: 'tp', lat: p.lat, lng: p.lng, heading: p.heading, name: p.name };
    }
    case 'time': {
      const v = (parts[0] === 'set' ? parts[1] : parts[0]) || '';
      const map = { day: 1000, tag: 1000, noon: 6000, mittag: 6000, night: 13500, nacht: 13500, midnight: 18000 };
      const t = map[v.toLowerCase()] ?? parseInt(v, 10);
      if (isNaN(t)) return { error: 'Benutzung: /time set day|night|<0-24000>' };
      return { action: 'time', time: ((t % 24000) + 24000) % 24000 };
    }
    case 'gamemode':
    case 'gm': {
      const v = (parts[0] || '').toLowerCase();
      if (['1', 'c', 'creative', 'kreativ'].includes(v)) return { action: 'gamemode', mode: 'creative' };
      if (['0', 's', 'survival', 'überleben', 'ueberleben'].includes(v)) return { action: 'gamemode', mode: 'survival' };
      return { error: 'Benutzung: /gamemode survival|creative' };
    }
    case 'give': {
      if (!parts.length) return { error: 'Benutzung: /give <gegenstand> [anzahl]' };
      let count = 1;
      if (parts.length > 1 && /^\d+$/.test(parts[parts.length - 1])) count = parseInt(parts.pop(), 10);
      const it = findItem(parts.join(' ').replace(/^minecraft:/, ''));
      if (!it || !getItem(it.id)) return { error: 'Unbekannter Gegenstand. Liste mit /items' };
      return { action: 'give', id: it.id, count: Math.max(1, Math.min(count, 64 * 36)) };
    }
    case 'spawn':
      return { action: 'spawn' };
    case 'kill':
      return { action: 'kill' };
    case 'clear':
      return { action: 'clear' };
    default:
      return { error: `Unbekannter Befehl „/${cmd}“. Hilfe mit /help` };
  }
}
