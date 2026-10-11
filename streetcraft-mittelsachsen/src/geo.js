// Umrechnung zwischen geografischen Koordinaten und lokalen Metern.
// Lokales System: x = Osten, y = oben, z = Süden (Norden ist -z, wie in three.js).

import { ORIGIN, REGION_POLYGON, PLACES, MINING_AREAS } from './config.js';

const M_PER_DEG_LAT = 110574;
const M_PER_DEG_LNG = 111320 * Math.cos((ORIGIN.lat * Math.PI) / 180);

export function toLocal(lat, lng) {
  return {
    x: (lng - ORIGIN.lng) * M_PER_DEG_LNG,
    z: -(lat - ORIGIN.lat) * M_PER_DEG_LAT,
  };
}

export function toLatLng(x, z) {
  return {
    lat: ORIGIN.lat - z / M_PER_DEG_LAT,
    lng: ORIGIN.lng + x / M_PER_DEG_LNG,
  };
}

// Blickrichtung (Grad im Uhrzeigersinn ab Norden) als Einheitsvektor in x/z.
export function headingVector(headingDeg) {
  const h = (headingDeg * Math.PI) / 180;
  return { x: Math.sin(h), z: -Math.cos(h) };
}

// Richtung von a nach b als Kompasswinkel in Grad.
export function headingBetween(a, b) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  return ((Math.atan2(dx, -dz) * 180) / Math.PI + 360) % 360;
}

// Entfernung zweier lat/lng-Punkte in Metern (für kurze Strecken genau genug).
export function distanceMeters(a, b) {
  const p = toLocal(a.lat, a.lng);
  const q = toLocal(b.lat, b.lng);
  return Math.hypot(p.x - q.x, p.z - q.z);
}

// Strahlverfahren: liegt der Punkt im Polygon?
export function pointInPolygon(lat, lng, poly = REGION_POLYGON) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i];
    const [yj, xj] = poly[j];
    const hit = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

export function inRegion(lat, lng) {
  return pointInPolygon(lat, lng, REGION_POLYGON);
}

// Blockzelle (ganzzahlig) für einen Punkt in Metern.
export function cellOf(x, y, z) {
  return { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) };
}

// Name des nächstgelegenen Ortes (oder "Mittelsachsen").
export function nearestTown(lat, lng, maxKm = 4) {
  let best = null;
  let bestD = Infinity;
  for (const p of PLACES) {
    const d = distanceMeters({ lat, lng }, p);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best && bestD <= maxKm * 1000 ? best.town : 'Mittelsachsen';
}

export function inMiningArea(lat, lng) {
  return MINING_AREAS.some((a) => distanceMeters({ lat, lng }, a) <= a.radiusKm * 1000);
}

export function findPlace(query) {
  const q = query
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .trim();
  return PLACES.find((p) => p.id === q || p.id.startsWith(q) || p.town.toLowerCase() === query.toLowerCase().trim()) || null;
}
