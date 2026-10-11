// Minikarte und große Karte mit OpenStreetMap (Leaflet).

import { REGION_POLYGON } from './config.js';

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>';

function arrowIcon(L) {
  return L.divIcon({ className: 'map-player', html: '<div class="map-arrow"></div>', iconSize: [22, 22], iconAnchor: [11, 11] });
}

export class MiniMap {
  constructor(smallEl, bigEl) {
    this.smallEl = smallEl;
    this.bigEl = bigEl;
    this.L = window.L;
    this.ok = !!this.L;
    this.markers = [];
    if (!this.ok) smallEl.style.display = 'none';
  }

  init(lat, lng) {
    if (!this.ok) return;
    const L = this.L;
    this.small = L.map(this.smallEl, { zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, touchZoom: false }).setView([lat, lng], 17);
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(this.small);
    L.polygon(REGION_POLYGON, { color: '#e33', weight: 2, fill: false }).addTo(this.small);
    this.smallMarker = L.marker([lat, lng], { icon: arrowIcon(L), interactive: false }).addTo(this.small);

    this.big = L.map(this.bigEl, { zoomControl: true, keyboard: false }).setView([lat, lng], 13);
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(this.big);
    L.polygon(REGION_POLYGON, { color: '#e33', weight: 3, fillOpacity: 0.04 }).addTo(this.big);
    this.bigMarker = L.marker([lat, lng], { icon: arrowIcon(L), interactive: false }).addTo(this.big);
    this.spawnMarker = L.circleMarker([lat, lng], { radius: 6, color: '#fff', fillColor: '#2a7', fillOpacity: 1 }).bindTooltip('Spawnpunkt').addTo(this.big);
    this.big.on('click', (e) => this.onClick && this.onClick(e.latlng.lat, e.latlng.lng));
  }

  update(lat, lng, heading) {
    if (!this.small) return;
    this.small.setView([lat, lng], this.small.getZoom(), { animate: false });
    for (const m of [this.smallMarker, this.bigMarker]) {
      m.setLatLng([lat, lng]);
      const el = m.getElement && m.getElement();
      const arrow = el && el.querySelector('.map-arrow');
      if (arrow) arrow.style.transform = `rotate(${heading}deg)`;
    }
  }

  setSpawn(lat, lng) {
    if (this.spawnMarker) this.spawnMarker.setLatLng([lat, lng]);
  }

  showBig(lat, lng) {
    if (!this.big) return;
    setTimeout(() => {
      this.big.invalidateSize();
      this.big.setView([lat, lng], Math.max(this.big.getZoom(), 13));
    }, 30);
  }

  zoomSmall(delta) {
    if (this.small) this.small.setZoom(Math.max(13, Math.min(19, this.small.getZoom() + delta)));
  }
}
