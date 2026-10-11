// Untergrund aus OpenStreetMap: Wald, Feld, Stadt, Fluss, Steinbruch ...

import { PLACES } from './config.js';
import { distanceMeters } from './geo.js';

const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
const CACHE_KEY = 'streetcraft-biomes-v1';
const cache = new Map();
const pending = new Map();
let offline = false;

try {
  const saved = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
  for (const [k, v] of Object.entries(saved)) cache.set(k, v);
} catch {
  /* kein localStorage */
}

function persist() {
  try {
    const obj = Object.fromEntries([...cache].slice(-400));
    localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
  } catch {
    /* egal */
  }
}

// OSM-Tags auf ein Biom abbilden. Reihenfolge = Vorrang.
export function biomeFromTags(areaTags, nearWater) {
  const has = (k, vals) => areaTags.some((t) => vals.includes(t[k]));
  if (has('landuse', ['quarry'])) return 'quarry';
  if (nearWater || has('natural', ['water', 'wetland']) || areaTags.some((t) => t.water)) return 'river';
  if (has('landuse', ['forest']) || has('natural', ['wood'])) return 'forest';
  if (has('leisure', ['park', 'garden', 'nature_reserve']) || has('landuse', ['grass', 'recreation_ground', 'cemetery', 'village_green'])) return 'park';
  if (has('landuse', ['residential', 'commercial', 'retail', 'industrial', 'construction', 'railway', 'garages'])) return 'town';
  if (has('landuse', ['farmland', 'orchard', 'vineyard', 'allotments', 'farmyard'])) return 'farmland';
  return 'plains';
}

// Ersatz, wenn OpenStreetMap nicht erreichbar ist.
function fallbackBiome(lat, lng) {
  const near = PLACES.some((p) => distanceMeters({ lat, lng }, p) < 1200);
  return near ? 'town' : 'plains';
}

async function query(lat, lng) {
  const q = `[out:json][timeout:15];
is_in(${lat},${lng})->.a;
(area.a[landuse];area.a[natural];area.a[leisure];);
out tags;
(way(around:35,${lat},${lng})[waterway~"^(river|stream|canal)$"];way(around:35,${lat},${lng})[natural=water];);
out tags 1;`;
  for (const url of ENDPOINTS) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 9000);
      const res = await fetch(url, { method: 'POST', body: `data=${encodeURIComponent(q)}`, headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) continue;
      const json = await res.json();
      const areas = json.elements.filter((e) => e.type === 'area').map((e) => e.tags || {});
      const water = json.elements.some((e) => e.type === 'way');
      return biomeFromTags(areas, water);
    } catch {
      /* nächsten Server versuchen */
    }
  }
  return null;
}

// Biom für eine Position (zwischengespeichert in ~150-m-Zellen).
export async function lookupBiome(lat, lng) {
  const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
  if (cache.has(key)) return cache.get(key);
  if (offline) return fallbackBiome(lat, lng);
  if (pending.has(key)) return pending.get(key);
  const p = query(lat, lng).then((b) => {
    pending.delete(key);
    if (!b) {
      offline = true;
      setTimeout(() => (offline = false), 60000);
      return fallbackBiome(lat, lng);
    }
    cache.set(key, b);
    persist();
    return b;
  });
  pending.set(key, p);
  return p;
}

export const BIOME_NAMES = {
  forest: 'Wald',
  park: 'Park',
  plains: 'Wiese',
  farmland: 'Feld',
  river: 'Flussufer',
  town: 'Stadt',
  quarry: 'Steinbruch',
};
