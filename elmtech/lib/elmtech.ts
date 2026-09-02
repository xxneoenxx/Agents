// ---------------------------------------------------------------------------
// Zentrale Datenquelle für die Elmtech Verbundelemente GmbH.
// Alle Inhalte (Stammdaten, Anwendungen, Produkte, Rückruf-Zeitfenster) werden
// hier gepflegt – so kann der Kunde Texte an EINER Stelle aktualisieren.
// ---------------------------------------------------------------------------

export const company = {
  name: "Elmtech Verbundelemente GmbH",
  short: "Elmtech",
  tagline: "Verbundelemente nach Maß",
  foundedYear: 1993,
  claim:
    "Seit 1993 fertigen wir maßgefertigte Dämm- und Fassadenelemente – präzise, langlebig und exakt auf Ihre Anforderung abgestimmt.",
  intro:
    "Als familiengeführter Spezialist in zweiter Generation entwickeln und produzieren wir Verbundelemente für Schallschutz, Einbruchschutz, Energieeffizienz und Brandschutz. Komplexe Blechbearbeitung und kundenspezifische Sonderkonstruktionen sind unsere Kernkompetenz.",
  // Werk / Sitz
  address: {
    street: "Schönborner Straße 37",
    zip: "09669",
    city: "Frankenberg",
    district: "OT Sachsenburg",
    region: "Sachsen",
  },
  // Abweichende Lieferadresse
  delivery: {
    street: "Am Wald 1",
    zip: "09661",
    city: "Rossau",
  },
  contact: {
    phoneHref: "+4937206578710",
    phoneDisplay: "037206 / 57 87 10",
    phoneInternational: "+49 37206 578710",
    faxDisplay: "037206 / 57 87 11",
    email: "info@elmtech.de",
    website: "https://www.elmtech.de",
  },
  management: "Dipl.-Ing. Rainer Baars, M.Sc. & Dipl.-Ing. Sebastian Baars",
  geo: { lat: 50.9216, lng: 13.0357 },
  businessHours: "Mo – Fr 07:00 – 16:00 Uhr",
} as const;

export const fullAddress = `${company.address.street}, ${company.address.zip} ${company.address.city} / ${company.address.district}`;
export const mapsQuery = encodeURIComponent(`Elmtech Verbundelemente GmbH, ${company.address.street}, ${company.address.zip} ${company.address.city}`);

// --- Anwendungen (animierte Widget-Kacheln) --------------------------------

export const applications = [
  {
    icon: "Ear",
    title: "Schallschutz",
    text: "Verbundelemente mit hohem Schalldämmmaß – für ruhige Räume selbst in lauter Umgebung.",
  },
  {
    icon: "ShieldCheck",
    title: "Einbruchschutz",
    text: "Widerstandsfähige Konstruktionen, die Sicherheit und Stabilität spürbar erhöhen.",
  },
  {
    icon: "Leaf",
    title: "Energieeffizienz",
    text: "Hervorragende Dämmwerte senken Energiekosten und verbessern die Bilanz Ihres Gebäudes.",
  },
  {
    icon: "Flame",
    title: "Brandschutz",
    text: "Geprüfte Materialaufbauten für anspruchsvolle Brandschutzanforderungen.",
  },
  {
    icon: "Maximize2",
    title: "Platzersparnis",
    text: "Schlanke Aufbauten mit maximaler Leistung – mehr nutzbare Fläche bei gleicher Wirkung.",
  },
  {
    icon: "Sparkles",
    title: "Besondere Oberflächen",
    text: "Von technisch bis edel: Oberflächen und Optiken nach Ihren gestalterischen Wünschen.",
  },
] as const;

// --- Schichtaufbau des Verbundelements (3D-Querschnitt) --------------------

export const layers = [
  {
    key: "outer",
    name: "Außenblech",
    desc: "Robuste Metalldeckschicht – wetterfest, formstabil und in vielen Oberflächen erhältlich.",
    color: "#c7ced6",
  },
  {
    key: "core",
    name: "Funktionskern",
    desc: "Hochwirksamer Dämm- und Funktionskern für Schall-, Wärme- und Brandschutz.",
    color: "#e0a23c",
  },
  {
    key: "inner",
    name: "Innenblech",
    desc: "Tragende Innenlage – präzise verarbeitet für maximale Verbundwirkung.",
    color: "#9aa5b1",
  },
] as const;

// --- Produktreihen (3D-Tilt-Karten) ----------------------------------------

export type Product = {
  id: string;
  name: string;
  category: string;
  highlight: string;
  description: string;
  specs: { label: string; value: string }[];
  tags: string[];
  gradient: [string, string];
  accent: string;
};

export const products: Product[] = [
  {
    id: "et-pro-5000",
    name: "ET-PRO 5000",
    category: "Schallschutz-Element",
    highlight: "bis 50 dB",
    description:
      "Hochleistungs-Schallschutzelement mit zweischaligem Aufbau für anspruchsvolle Lärmschutzanwendungen im Industrie- und Gewerbebau.",
    specs: [
      { label: "Schalldämmung", value: "bis 50 dB" },
      { label: "Deckschichten", value: "2× 2 mm Alu" },
      { label: "Einsatz", value: "Industrie & Gewerbe" },
    ],
    tags: ["Schallschutz", "Aluminium"],
    gradient: ["#1d4ed8", "#0b1220"],
    accent: "#60a5fa",
  },
  {
    id: "et-glp-p6b",
    name: "ET-GLP P6B",
    category: "Sicherheits-Element",
    highlight: "geprüft",
    description:
      "Einbruchhemmendes Verbundelement mit zertifiziertem Aufbau – ideal dort, wo Sicherheit und Design zusammenkommen müssen.",
    specs: [
      { label: "Schutzklasse", value: "geprüft (P6B)" },
      { label: "Aufbau", value: "mehrschichtig" },
      { label: "Einsatz", value: "Türen & Fassaden" },
    ],
    tags: ["Einbruchschutz", "Zertifiziert"],
    gradient: ["#0f766e", "#04140f"],
    accent: "#2dd4bf",
  },
  {
    id: "et-therm",
    name: "ET-THERM",
    category: "Dämm-Element",
    highlight: "Top-Dämmwerte",
    description:
      "Wärmedämmendes Fassadenelement mit ausgezeichneten U-Werten für energieeffizientes Bauen und Sanieren.",
    specs: [
      { label: "Funktion", value: "Wärmedämmung" },
      { label: "Dämmwert", value: "sehr hoch" },
      { label: "Einsatz", value: "Fassade & Sanierung" },
    ],
    tags: ["Energieeffizienz", "Fassade"],
    gradient: ["#b45309", "#180f04"],
    accent: "#fbbf24",
  },
  {
    id: "et-fire",
    name: "ET-FIRE",
    category: "Brandschutz-Element",
    highlight: "feuerhemmend",
    description:
      "Brandschutzelement mit geprüftem Materialaufbau für Anwendungen mit erhöhten Anforderungen an den vorbeugenden Brandschutz.",
    specs: [
      { label: "Funktion", value: "Brandschutz" },
      { label: "Aufbau", value: "nichtbrennbarer Kern" },
      { label: "Einsatz", value: "Wand & Decke" },
    ],
    tags: ["Brandschutz", "geprüft"],
    gradient: ["#b91c1c", "#170606"],
    accent: "#f87171",
  },
  {
    id: "et-design",
    name: "ET-DESIGN",
    category: "Fassaden-Element",
    highlight: "individuell",
    description:
      "Gestaltungselement mit edlen Oberflächen und freier Formgebung – für Architektur, die sichtbar Eindruck macht.",
    specs: [
      { label: "Oberfläche", value: "frei wählbar" },
      { label: "Formgebung", value: "individuell" },
      { label: "Einsatz", value: "Sichtfassade" },
    ],
    tags: ["Oberflächen", "Architektur"],
    gradient: ["#6d28d9", "#0d0820"],
    accent: "#a78bfa",
  },
  {
    id: "et-custom",
    name: "ET-CUSTOM",
    category: "Sonderkonstruktion",
    highlight: "nach Maß",
    description:
      "Kundenspezifische Sonderlösung: Wir entwickeln und fertigen das Verbundelement exakt nach Ihren Anforderungen und Maßen.",
    specs: [
      { label: "Fertigung", value: "auf Maß" },
      { label: "Blechbearbeitung", value: "komplex" },
      { label: "Beratung", value: "inklusive" },
    ],
    tags: ["Sonderbau", "Engineering"],
    gradient: ["#334155", "#070b11"],
    accent: "#94a3b8",
  },
];

// --- Kennzahlen für animierte Zähler ---------------------------------------

export const stats = [
  { value: new Date().getFullYear() - company.foundedYear, suffix: "", label: "Jahre Erfahrung" },
  { value: 2, suffix: ".", label: "Generation Familienbetrieb" },
  { value: 6, suffix: "", label: "Anwendungsbereiche" },
  { value: 100, suffix: "%", label: "Fertigung in Sachsen" },
] as const;

// --- Unternehmensgeschichte (Timeline) -------------------------------------

export const milestones = [
  { year: "1993", title: "Gründung", text: "Rainer Baars gründet Elmtech in Seifersbach und spezialisiert sich auf Verbundelemente." },
  { year: "seither", title: "Stetiges Wachstum", text: "Elmtech entwickelt sich zu einem führenden Hersteller maßgefertigter Dämm- und Fassadenelemente in Deutschland." },
  { year: "2011", title: "Umzug nach Sachsenburg", text: "Für mehr Produktionskapazität bezieht das Unternehmen den heutigen Standort in Frankenberg / OT Sachsenburg." },
  { year: "heute", title: "Zweite Generation", text: "Das Familienunternehmen wird in zweiter Generation geführt – mit Erfahrung, Präzision und Innovationsgeist." },
] as const;

// --- Rückruf-Service (Buchungssystem) --------------------------------------

export const callbackTopics = [
  "Schallschutz",
  "Einbruchschutz",
  "Energieeffizienz",
  "Brandschutz",
  "Sonderkonstruktion",
  "Allgemeine Anfrage",
] as const;

export type CallbackTopic = (typeof callbackTopics)[number];

export const callbackWindows = [
  { id: "08-10", label: "08:00 – 10:00 Uhr" },
  { id: "10-12", label: "10:00 – 12:00 Uhr" },
  { id: "13-15", label: "13:00 – 15:00 Uhr" },
  { id: "15-16", label: "15:00 – 16:00 Uhr" },
] as const;

export type CallbackWindowId = (typeof callbackWindows)[number]["id"];

// Maximale Rückrufe pro Zeitfenster (einfache Kapazitätssteuerung).
export const MAX_CALLBACKS_PER_WINDOW = 6;

// Anzahl der zur Auswahl angebotenen Werktage.
export const CALLBACK_DAYS = 14;

export function isBusinessDay(d: Date): boolean {
  const day = d.getDay();
  return day >= 1 && day <= 5;
}

export function toDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

// Liefert die nächsten Werktage (ohne heute) als Datums-Strings.
export function upcomingBusinessDays(count = CALLBACK_DAYS, from?: Date): string[] {
  const start = from ? new Date(from) : new Date();
  start.setHours(0, 0, 0, 0);
  const days: string[] = [];
  let cursor = 1;
  while (days.length < count) {
    const d = new Date(start);
    d.setDate(start.getDate() + cursor);
    if (isBusinessDay(d)) days.push(toDateString(d));
    cursor++;
  }
  return days;
}

export function windowLabel(id: string): string {
  return callbackWindows.find((w) => w.id === id)?.label ?? id;
}

export function formatLongDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date(y, m - 1, d));
}
