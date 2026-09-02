// ---------------------------------------------------------------------------
// Zentrale Datenquelle für das CineStar Chemnitz.
// Filme, Vorstellungen, Saalplan und Stammdaten werden hier gepflegt.
// ---------------------------------------------------------------------------

export const cinema = {
  name: "CineStar Chemnitz",
  fullName: "CineStar – Der Filmpalast am Roten Turm",
  tagline: "Großes Kino mitten in Chemnitz",
  halls: 11,
  address: {
    street: "Neumarkt 2",
    zip: "09111",
    city: "Chemnitz",
    region: "Sachsen",
    extra: "Galerie Roter Turm · Obergeschoss",
  },
  contact: {
    phoneHref: "+493716663660",
    phoneDisplay: "0371 / 666 36 60",
    phoneInternational: "+49 371 6663660",
    email: "info@cinestar-chemnitz.de",
    website: "https://www.cinestar.de/chemnitz-kino-am-roten-turm",
  },
  geo: { lat: 50.8338774, lng: 12.9209646 },
  // Mo–So 13:30–23:00 Uhr
  openingHours: "Täglich 13:30 – 23:00 Uhr",
  boxOfficeNote:
    "Die Kassen öffnen 30 Minuten vor der ersten Vorstellung und schließen 15 Minuten nach Beginn der letzten Vorstellung.",
} as const;

export const fullAddress = `${cinema.address.street}, ${cinema.address.zip} ${cinema.address.city}`;
export const mapsQuery = encodeURIComponent(`CineStar Chemnitz, ${fullAddress}`);

// --- Erlebnis-Features (animierte Widgets) ---------------------------------

export const experiences = [
  {
    icon: "Volume2",
    title: "Dolby Atmos Sound",
    text: "Dreidimensionaler Klang, der dich mitten ins Geschehen versetzt.",
  },
  {
    icon: "Armchair",
    title: "Komfort-Loungesessel",
    text: "Großzügige, gepolsterte Sitze mit viel Beinfreiheit in jedem Saal.",
  },
  {
    icon: "Projector",
    title: "Gestochen scharfes Bild",
    text: "Moderne Digitalprojektion in brillanter 2D- und 3D-Qualität.",
  },
  {
    icon: "Popcorn",
    title: "Snacks & Bar",
    text: "Frisches Popcorn, Nachos und kühle Getränke direkt im Foyer.",
  },
] as const;

export const stats = [
  { value: 11, suffix: "", label: "Kinosäle" },
  { value: 1800, suffix: "+", label: "Sitzplätze" },
  { value: 40, suffix: "+", label: "Filme pro Woche" },
  { value: 4, suffix: ",6", label: "Sterne Bewertung" },
] as const;

// Wiederkehrende Aktionen des Hauses
export const events = [
  { tag: "Dienstag", title: "CineSneak", text: "Überraschungs-Preview vor dem offiziellen Start." },
  { tag: "Mittwoch", title: "CineLady", text: "Ladies-Night mit Sekt-Empfang und Film-Highlight." },
  { tag: "Donnerstag", title: "CineMen", text: "Männerabend mit Bier und großem Action-Kino." },
  { tag: "Wöchentlich", title: "CineExtra", text: "Sondervorstellungen, Previews und Eventkino." },
] as const;

// --- Filme ------------------------------------------------------------------

export type Movie = {
  id: string;
  title: string;
  genre: string;
  durationMin: number;
  fsk: 0 | 6 | 12 | 16 | 18;
  rating: number;
  synopsis: string;
  tags: string[];
  // Farbverlauf fürs Poster (keine externen Bilddateien nötig)
  gradient: [string, string];
  accent: string;
};

export const movies: Movie[] = [
  {
    id: "nebula-protocol",
    title: "Nebula Protocol",
    genre: "Science-Fiction · Action",
    durationMin: 142,
    fsk: 12,
    rating: 4.7,
    synopsis:
      "Als ein Forschungsteam am Rand des Sonnensystems ein uraltes Signal empfängt, beginnt ein Wettlauf gegen die Zeit – und gegen sich selbst.",
    tags: ["3D", "Dolby Atmos", "OV verfügbar"],
    gradient: ["#1e3a8a", "#0f172a"],
    accent: "#60a5fa",
  },
  {
    id: "herzschlag-momente",
    title: "Herzschlag-Momente",
    genre: "Drama · Romanze",
    durationMin: 118,
    fsk: 6,
    rating: 4.4,
    synopsis:
      "Zwei Fremde, eine verpasste Bahn und eine Nacht in Chemnitz, die alles verändert. Eine warmherzige Geschichte über zweite Chancen.",
    tags: ["Deutsch", "CineLady"],
    gradient: ["#9d174d", "#3b0764"],
    accent: "#f472b6",
  },
  {
    id: "die-letzte-fahrt",
    title: "Die letzte Fahrt",
    genre: "Action · Thriller",
    durationMin: 131,
    fsk: 16,
    rating: 4.6,
    synopsis:
      "Ein ausgebrannter Ex-Rennfahrer wird zu einem letzten Job gezwungen. Vollgas durch die Nacht, mit allem auf dem Spiel.",
    tags: ["Dolby Atmos", "CineMen"],
    gradient: ["#7c2d12", "#171717"],
    accent: "#fb923c",
  },
  {
    id: "wunderwald",
    title: "Wunderwald",
    genre: "Animation · Familie",
    durationMin: 96,
    fsk: 0,
    rating: 4.8,
    synopsis:
      "Im verzauberten Wunderwald muss die kleine Igeldame Fips ihren Mut beweisen, um den Frühling zu retten. Großes Vergnügen für die ganze Familie.",
    tags: ["2D", "Deutsch", "Familienfilm"],
    gradient: ["#166534", "#052e16"],
    accent: "#4ade80",
  },
  {
    id: "schattenspiel",
    title: "Schattenspiel",
    genre: "Mystery · Horror",
    durationMin: 109,
    fsk: 18,
    rating: 4.2,
    synopsis:
      "Eine Restauratorin entdeckt in einem alten Gemälde ein Geheimnis, das nicht ans Licht wollte. Manche Schatten haben einen eigenen Willen.",
    tags: ["Spätvorstellung", "OV verfügbar"],
    gradient: ["#374151", "#030712"],
    accent: "#a78bfa",
  },
  {
    id: "gipfelstuermer",
    title: "Gipfelstürmer",
    genre: "Abenteuer · Doku-Drama",
    durationMin: 124,
    fsk: 6,
    rating: 4.5,
    synopsis:
      "Die wahre Geschichte einer Seilschaft, die das Unmögliche wagt: die Erstbesteigung einer der gefährlichsten Wände der Alpen.",
    tags: ["3D", "Deutsch"],
    gradient: ["#0e7490", "#082f49"],
    accent: "#22d3ee",
  },
];

// --- Vorstellungen ----------------------------------------------------------

export type Showtime = {
  id: string;
  movieId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  hall: number;
  format: string;
  priceCents: number;
};

const BASE_TIMES = ["14:00", "16:30", "18:00", "20:15", "22:30"];

// Erzeugt deterministisch Vorstellungen für die nächsten `days` Tage.
export function generateShowtimes(days = 5, fromDate?: Date): Showtime[] {
  const start = fromDate ? new Date(fromDate) : new Date();
  start.setHours(0, 0, 0, 0);
  const result: Showtime[] = [];

  for (let d = 0; d < days; d++) {
    const day = new Date(start);
    day.setDate(start.getDate() + d);
    const dateStr = toDateString(day);

    movies.forEach((movie, mi) => {
      // Jeder Film läuft an 2–3 Zeiten pro Tag, leicht versetzt.
      const offset = (mi + d) % BASE_TIMES.length;
      const slots = [
        BASE_TIMES[offset],
        BASE_TIMES[(offset + 2) % BASE_TIMES.length],
        ...(mi % 2 === 0 ? [BASE_TIMES[(offset + 3) % BASE_TIMES.length]] : []),
      ];
      const uniqueSlots = Array.from(new Set(slots)).sort();

      uniqueSlots.forEach((time, si) => {
        const is3D = movie.tags.includes("3D") && si === 0;
        result.push({
          id: `${movie.id}_${dateStr}_${time.replace(":", "")}`,
          movieId: movie.id,
          date: dateStr,
          time,
          hall: ((mi + si) % cinema.halls) + 1,
          format: is3D ? "3D" : "2D",
          priceCents: is3D ? 1390 : 1090,
        });
      });
    });
  }
  return result;
}

export function toDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("de-DE", {
    style: "currency",
    currency: "EUR",
  });
}

export function getMovie(id: string): Movie | undefined {
  return movies.find((m) => m.id === id);
}

// Sucht eine Vorstellung anhand ihrer ID (für die serverseitige Preisprüfung).
// Es wird ein ausreichend großes Zeitfenster regeneriert.
export function findShowtime(id: string): Showtime | undefined {
  return generateShowtimes(14).find((s) => s.id === id);
}

export function seatPriceCents(base: number, type: SeatType): number {
  return base + SEAT_SURCHARGE_CENTS[type];
}

// Anzahl der Tage, die im Buchungssystem angeboten werden.
export const BOOKING_DAYS = 5;

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h} Std. ${m} Min.`;
}

// --- Saalplan ---------------------------------------------------------------
// Einheitliches Layout für alle Säle (Demo). Reihen A–J, hintere Reihen Premium.

export type SeatType = "standard" | "premium" | "wheelchair";
export type Seat = { id: string; row: string; col: number; type: SeatType };

export const SEAT_ROWS = ["A", "B", "C", "D", "E", "F", "G", "H", "J"];
const SEATS_PER_ROW = 14;
// Gang nach Spalte 7 (Sitze 1-7 | 8-14)
export const AISLE_AFTER_COL = 7;

export function buildSeatLayout(): Seat[][] {
  return SEAT_ROWS.map((row, ri) => {
    const seats: Seat[] = [];
    for (let c = 1; c <= SEATS_PER_ROW; c++) {
      let type: SeatType = "standard";
      // Die hinteren drei Reihen sind Premium.
      if (ri >= SEAT_ROWS.length - 3) type = "premium";
      // Zwei Rollstuhlplätze in der ersten Reihe außen.
      if (row === "A" && (c === 1 || c === SEATS_PER_ROW)) type = "wheelchair";
      seats.push({ id: `${row}${c}`, row, col: c, type });
    }
    return seats;
  });
}

export const SEAT_SURCHARGE_CENTS: Record<SeatType, number> = {
  standard: 0,
  premium: 200,
  wheelchair: 0,
};

export const SEAT_TYPE_LABEL: Record<SeatType, string> = {
  standard: "Standard",
  premium: "Premium (+2,00 €)",
  wheelchair: "Rollstuhlplatz",
};
