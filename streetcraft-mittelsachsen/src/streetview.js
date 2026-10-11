// Hintergrund: echtes Google Street View oder ein einfacher Testmodus ohne Google.

import { toLocal, toLatLng, headingVector } from './geo.js';

let mapsPromise = null;

// Lädt die Google Maps JavaScript API mit dem eigenen Schlüssel.
export function loadGoogleMaps(apiKey) {
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Google Maps hat nicht geantwortet (Zeitüberschreitung).')), 20000);
    window.gm_authFailure = () => {
      clearTimeout(timeout);
      reject(new Error('Google hat den API-Schlüssel abgelehnt. Ist die „Maps JavaScript API“ aktiviert und die Abrechnung eingerichtet?'));
    };
    window.__streetcraftMapsReady = () => {
      clearTimeout(timeout);
      resolve(window.google.maps);
    };
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async&language=de&region=DE&callback=__streetcraftMapsReady`;
    s.async = true;
    s.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Google Maps konnte nicht geladen werden (keine Internetverbindung?).'));
    };
    document.head.appendChild(s);
  });
  mapsPromise.catch(() => (mapsPromise = null));
  return mapsPromise;
}

export class GoogleStreetView {
  constructor(container, apiKey) {
    this.container = container;
    this.apiKey = apiKey;
    this.kind = 'google';
  }

  async init(lat, lng, heading, pitch) {
    const maps = await loadGoogleMaps(this.apiKey);
    const lib = await maps.importLibrary('streetView');
    this.lib = lib;
    this.service = new lib.StreetViewService();
    this.pano = new lib.StreetViewPanorama(this.container, {
      pov: { heading, pitch },
      zoom: 1,
      visible: true,
      disableDefaultUI: true,
      addressControl: false,
      linksControl: false,
      panControl: false,
      zoomControl: false,
      fullscreenControl: false,
      enableCloseButton: false,
      motionTracking: false,
      motionTrackingControl: false,
      clickToGo: false,
      disableDoubleClickZoom: true,
      scrollwheel: false,
      showRoadLabels: false,
      keyboardShortcuts: false,
      imageDateControl: false,
    });
    const found = await this.find(lat, lng, 300);
    if (!found) throw new Error('An diesem Ort gibt es kein Street View. Bitte einen anderen Startort wählen.');
    await this.goToPano(found.pano);
  }

  // Nächstes Street-View-Panorama zu einem Punkt suchen.
  async find(lat, lng, radius = 150) {
    try {
      const { data } = await this.service.getPanorama({
        location: { lat, lng },
        radius,
        source: this.lib.StreetViewSource ? this.lib.StreetViewSource.OUTDOOR : undefined,
        preference: this.lib.StreetViewPreference ? this.lib.StreetViewPreference.NEAREST : undefined,
      });
      return { pano: data.location.pano, lat: data.location.latLng.lat(), lng: data.location.latLng.lng() };
    } catch {
      return null;
    }
  }

  // Zu einem Panorama wechseln und warten, bis Position und Nachbarpunkte geladen sind.
  goToPano(panoId) {
    return new Promise((resolve) => {
      if (this.pano.getPano() === panoId) return resolve(this.getPosition());
      let done = false;
      let gotPos = false;
      let gotLinks = false;
      const listeners = [];
      const finish = () => {
        if (done) return;
        done = true;
        listeners.forEach((l) => l.remove());
        resolve(this.getPosition());
      };
      listeners.push(
        this.pano.addListener('position_changed', () => {
          gotPos = true;
          if (gotLinks) finish();
          else setTimeout(finish, 1500); // Nachbarpunkte kommen meist kurz danach
        }),
        this.pano.addListener('links_changed', () => {
          gotLinks = true;
          if (gotPos) finish();
        }),
      );
      setTimeout(finish, 6000);
      this.pano.setPano(panoId);
    });
  }

  currentPano() {
    return this.pano ? this.pano.getPano() : null;
  }

  getPosition() {
    const p = this.pano && this.pano.getPosition();
    return p ? { lat: p.lat(), lng: p.lng() } : null;
  }

  // Nachbarpunkte: [{ heading, pano }]
  links() {
    const l = (this.pano && this.pano.getLinks()) || [];
    return l.filter((x) => x && x.pano).map((x) => ({ heading: x.heading, pano: x.pano }));
  }

  setPov(heading, pitch) {
    if (this.pano) this.pano.setPov({ heading, pitch });
  }

  async teleport(lat, lng, radius = 250) {
    const found = await this.find(lat, lng, radius);
    if (!found) return null;
    return this.goToPano(found.pano);
  }
}

// Testmodus: kein Foto, nur Himmel und Wiese. Man läuft in 8-m-Schritten.
export class DemoStreetView {
  constructor(container) {
    this.container = container;
    this.kind = 'demo';
    this.step = 8;
  }

  async init(lat, lng) {
    this.container.classList.add('demo-bg');
    this.pos = { lat, lng };
  }

  currentPano() {
    return `${this.pos.lat.toFixed(6)},${this.pos.lng.toFixed(6)}`;
  }

  getPosition() {
    return { ...this.pos };
  }

  links() {
    const here = toLocal(this.pos.lat, this.pos.lng);
    const out = [];
    for (let h = 0; h < 360; h += 45) {
      const v = headingVector(h);
      const t = toLatLng(here.x + v.x * this.step, here.z + v.z * this.step);
      out.push({ heading: h, pano: `${t.lat},${t.lng}` });
    }
    return out;
  }

  async goToPano(pano) {
    const [lat, lng] = pano.split(',').map(Number);
    this.pos = { lat, lng };
    return this.getPosition();
  }

  setPov() {}

  async teleport(lat, lng) {
    this.pos = { lat, lng };
    return this.getPosition();
  }
}
