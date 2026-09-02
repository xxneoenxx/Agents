// ---------------------------------------------------------------------------
// Zentrale Datenquelle für das Restaurant.
// Alle Inhalte (Kontakt, Öffnungszeiten, Speisen, Highlights) werden hier
// gepflegt, damit der Kunde Texte an EINER Stelle aktualisieren kann.
// ---------------------------------------------------------------------------

export const restaurant = {
  name: "Bauernhof zum Silberbergwerk",
  tagline: "Erlebnisrestaurant & Pension",
  foundedYear: 1996,
  description:
    "Seit 1996 verwöhnen wir unsere Gäste mit gut bürgerlicher Küche aus frischen, regionalen Zutaten – serviert in historischem Ambiente rund um das alte Silberbergwerk.",
  address: {
    street: "Herrnsdorfer Str. 32",
    zip: "09212",
    city: "Limbach-Oberfrohna",
    region: "Sachsen",
    country: "Deutschland",
  },
  contact: {
    // E.164-Format für tel:-Links
    phoneHref: "+49376095204",
    phoneDisplay: "037609 / 5204",
    phoneInternational: "+49 37609 5204",
    email: "info@bauernhof-silberbergwerk.de",
    website: "https://www.bauernhof-silberbergwerk.de",
  },
  geo: {
    lat: 50.866,
    lng: 12.7167,
  },
} as const;

export const fullAddress = `${restaurant.address.street}, ${restaurant.address.zip} ${restaurant.address.city}`;

export const mapsQuery = encodeURIComponent(
  `${restaurant.name}, ${fullAddress}`,
);

// --- Öffnungszeiten ---------------------------------------------------------
// day: 0 = Sonntag ... 6 = Samstag (entspricht Date.getDay()).
// ranges: Liste von Zeitfenstern in Minuten seit Mitternacht.

export type OpeningRange = { from: number; to: number };
export type OpeningDay = {
  day: number;
  label: string;
  short: string;
  ranges: OpeningRange[];
};

const t = (h: number, m = 0) => h * 60 + m;

export const openingHours: OpeningDay[] = [
  { day: 1, label: "Montag", short: "Mo", ranges: [] },
  { day: 2, label: "Dienstag", short: "Di", ranges: [{ from: t(17), to: t(22) }] },
  { day: 3, label: "Mittwoch", short: "Mi", ranges: [] },
  { day: 4, label: "Donnerstag", short: "Do", ranges: [{ from: t(17), to: t(22) }] },
  {
    day: 5,
    label: "Freitag",
    short: "Fr",
    ranges: [
      { from: t(11), to: t(14) },
      { from: t(17), to: t(22) },
    ],
  },
  { day: 6, label: "Samstag", short: "Sa", ranges: [{ from: t(11), to: t(24) }] },
  { day: 0, label: "Sonntag", short: "So", ranges: [{ from: t(11), to: t(21) }] },
];

export function formatRange(r: OpeningRange): string {
  const fmt = (mins: number) => {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };
  return `${fmt(r.from)}–${fmt(r.to)}`;
}

// Liefert den aktuellen Geöffnet-Status für eine gegebene Zeit.
export function getOpenStatus(now: Date): {
  isOpen: boolean;
  closesAt?: string;
  opensAt?: string;
  nextOpenLabel?: string;
} {
  const dayMap = new Map(openingHours.map((d) => [d.day, d]));
  const minutes = now.getHours() * 60 + now.getMinutes();
  const today = dayMap.get(now.getDay());

  if (today) {
    for (const r of today.ranges) {
      if (minutes >= r.from && minutes < r.to) {
        return { isOpen: true, closesAt: formatRange(r).split("–")[1] };
      }
    }
    // Heute noch ein späteres Zeitfenster?
    const upcoming = today.ranges.find((r) => r.from > minutes);
    if (upcoming) {
      return { isOpen: false, opensAt: formatRange(upcoming).split("–")[0], nextOpenLabel: "heute" };
    }
  }

  // Nächsten geöffneten Tag finden
  for (let i = 1; i <= 7; i++) {
    const d = dayMap.get((now.getDay() + i) % 7);
    if (d && d.ranges.length > 0) {
      return {
        isOpen: false,
        opensAt: formatRange(d.ranges[0]).split("–")[0],
        nextOpenLabel: i === 1 ? "morgen" : d.label,
      };
    }
  }
  return { isOpen: false };
}

// --- Highlights / animierte Widgets ----------------------------------------

export const highlights = [
  {
    icon: "UtensilsCrossed",
    title: "Regionale Küche",
    text: "Fisch, Wild, Lamm, Rind & Geflügel von Produzenten aus der Region – frisch und saisonal zubereitet.",
  },
  {
    icon: "Beer",
    title: "Gemütlicher Biergarten",
    text: "An warmen Tagen genießen Sie Speisen und kühle Getränke unter freiem Himmel.",
  },
  {
    icon: "Disc3",
    title: "Bowlingstollen",
    text: "Unser historischer Stollen lädt zum Bowlen ein – ideal für Feiern und Firmenevents.",
  },
  {
    icon: "BedDouble",
    title: "Pension mit 13 Betten",
    text: "Bleiben Sie über Nacht: Einzel-, Doppel- und Dreibettzimmer, Frühstück inklusive.",
  },
] as const;

// --- Kennzahlen für animierte Zähler ---------------------------------------

export const stats = [
  { value: new Date().getFullYear() - restaurant.foundedYear, suffix: "+", label: "Jahre Erfahrung" },
  { value: 13, suffix: "", label: "Gästebetten" },
  { value: 100, suffix: "%", label: "Regionale Zutaten" },
  { value: 4, suffix: ",8", label: "Sterne Bewertung" },
] as const;

// --- Speisekarte (Auszug) ---------------------------------------------------

export type Dish = {
  name: string;
  description: string;
  price: string;
  tags?: string[];
};

export type MenuCategory = {
  id: string;
  title: string;
  dishes: Dish[];
};

export const menu: MenuCategory[] = [
  {
    id: "vorspeisen",
    title: "Vorspeisen & Suppen",
    dishes: [
      {
        name: "Herbstliche Kürbissuppe",
        description: "Cremige Suppe vom Hokkaido-Kürbis mit gerösteten Kernen und Kürbiskernöl.",
        price: "6,50 €",
        tags: ["vegetarisch"],
      },
      {
        name: "Sächsischer Kartoffelsalat mit Wiener",
        description: "Hausgemacht nach Familienrezept, mit knackigen Gurken.",
        price: "7,90 €",
      },
      {
        name: "Geräucherte Forellenfilets",
        description: "Auf Blattsalaten mit Meerrettich-Sahne und Bauernbrot.",
        price: "9,80 €",
      },
    ],
  },
  {
    id: "hauptspeisen",
    title: "Hauptgerichte",
    dishes: [
      {
        name: "Barbarie-Entenbrustfilet",
        description: "Zart geschmort, mit Wirsinggemüse und hausgemachten Wickelklößen.",
        price: "21,50 €",
        tags: ["Empfehlung"],
      },
      {
        name: "Knuspriges Schweineschnitzel",
        description: "Paniertes Schnitzel mit Pommes frites oder Bratkartoffeln und Salat.",
        price: "15,90 €",
      },
      {
        name: "Saftiges Putensteak „Bauernart“",
        description: "Mit Champignon-Rahmsauce, Kroketten und Marktgemüse.",
        price: "17,40 €",
      },
      {
        name: "Geschmorte Lammkeule",
        description: "In Rotweinjus mit Rosmarinkartoffeln und Bohnen im Speckmantel.",
        price: "23,90 €",
      },
      {
        name: "Gebratenes Zanderfilet",
        description: "Auf Blattspinat mit Salzkartoffeln und brauner Butter.",
        price: "20,80 €",
        tags: ["Fisch"],
      },
    ],
  },
  {
    id: "desserts",
    title: "Desserts",
    dishes: [
      {
        name: "Warmer Apfelstrudel",
        description: "Mit Vanilleeis und Sahne – wie bei Oma.",
        price: "6,90 €",
        tags: ["vegetarisch"],
      },
      {
        name: "Sächsische Quarkkeulchen",
        description: "Mit Zimtzucker und Apfelmus.",
        price: "6,40 €",
        tags: ["vegetarisch"],
      },
    ],
  },
];
