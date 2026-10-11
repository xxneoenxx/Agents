// Grundeinstellungen für StreetCraft Mittelsachsen.

// Ursprung des lokalen Koordinatensystems (ungefähr Mitte des Landkreises).
export const ORIGIN = { lat: 50.98, lng: 13.1 };

// Vereinfachte Grenze des Landkreises Mittelsachsen als [lat, lng]-Polygon.
// Nur eine Annäherung: an den Rändern kann es ein paar hundert Meter abweichen.
export const REGION_POLYGON = [
  [51.23, 13.08],
  [51.21, 13.22],
  [51.13, 13.27],
  [51.08, 13.36],
  [51.03, 13.42],
  [50.95, 13.48],
  [50.87, 13.52],
  [50.78, 13.6],
  [50.7, 13.62],
  [50.65, 13.48],
  [50.7, 13.38],
  [50.77, 13.27],
  [50.78, 13.13],
  [50.83, 13.0],
  [50.88, 12.93],
  [50.86, 12.78],
  [50.91, 12.66],
  [51.0, 12.68],
  [51.07, 12.72],
  [51.12, 12.83],
  [51.19, 12.88],
  [51.23, 13.0],
];

// Startorte (Marktplätze, dort gibt es fast immer Street View).
export const PLACES = [
  { id: 'freiberg', name: 'Freiberg (Obermarkt)', town: 'Freiberg', lat: 50.9172, lng: 13.3418, heading: 200 },
  { id: 'doebeln', name: 'Döbeln (Obermarkt)', town: 'Döbeln', lat: 51.122, lng: 13.117, heading: 90 },
  { id: 'mittweida', name: 'Mittweida (Markt)', town: 'Mittweida', lat: 50.9856, lng: 12.9811, heading: 0 },
  { id: 'rochlitz', name: 'Rochlitz (Markt)', town: 'Rochlitz', lat: 51.0466, lng: 12.8022, heading: 0 },
  { id: 'hainichen', name: 'Hainichen (Markt)', town: 'Hainichen', lat: 50.9703, lng: 13.1239, heading: 0 },
  { id: 'frankenberg', name: 'Frankenberg (Markt)', town: 'Frankenberg', lat: 50.9107, lng: 13.0381, heading: 0 },
  { id: 'floeha', name: 'Flöha (Zentrum)', town: 'Flöha', lat: 50.8564, lng: 13.0717, heading: 0 },
  { id: 'burgstaedt', name: 'Burgstädt (Markt)', town: 'Burgstädt', lat: 50.9172, lng: 12.8106, heading: 0 },
  { id: 'brand-erbisdorf', name: 'Brand-Erbisdorf (Markt)', town: 'Brand-Erbisdorf', lat: 50.8687, lng: 13.3229, heading: 0 },
  { id: 'leisnig', name: 'Leisnig (Markt)', town: 'Leisnig', lat: 51.1574, lng: 12.9283, heading: 0 },
  { id: 'oederan', name: 'Oederan (Markt)', town: 'Oederan', lat: 50.8606, lng: 13.1683, heading: 0 },
  { id: 'augustusburg', name: 'Augustusburg (Schloss)', town: 'Augustusburg', lat: 50.8124, lng: 13.1012, heading: 0 },
];

// Alte Bergbaugebiete: hier gibt es beim Graben Silbererz.
export const MINING_AREAS = [
  { lat: 50.917, lng: 13.342, radiusKm: 7 }, // Freiberg / Halsbrücke
  { lat: 50.869, lng: 13.323, radiusKm: 5 }, // Brand-Erbisdorf
];

export const CAMERA_HEIGHT = 2.5; // Kamerahöhe des Street-View-Autos in Metern
export const THIRD_PERSON_DISTANCE = 4.5; // Abstand der Figur vor der Kamera
export const REACH = 5; // Reichweite der Figur in Blöcken
export const CHUNK_SIZE = 16;
export const GEN_RADIUS_CHUNKS = 2;
export const DAY_LENGTH_SECONDS = 1200; // ein Minecraft-Tag = 20 Minuten
export const MAX_DIG_DEPTH = 32;
export const SAVE_KEY = 'streetcraft-save-v1';
export const API_KEY_STORAGE = 'streetcraft-gmaps-key';
export const SETTINGS_KEY = 'streetcraft-settings-v1';
export const SKIN_KEY = 'streetcraft-skin-v1';
