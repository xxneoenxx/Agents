# CineStar Chemnitz – Website

Produktionsreife Website für das **CineStar – Der Filmpalast am Roten Turm** in
Chemnitz. Mit Online-Ticketbuchung inkl. interaktiver Sitzplatzauswahl,
Telefon-Anbindung, stark animierten Widgets, Scroll-Animationen und
Google-Maps-Einbindung.

## Funktionen

- 🎟️ **Funktionierendes Buchungssystem** – mehrstufiges, animiertes Buchungsfenster:
  Film → Vorstellung → interaktive **Sitzplatzauswahl** → Daten → Bestätigung.
- 🪑 **Echte Sitzplatz-Sperrung** – Buchungen werden serverseitig in SQLite
  gespeichert; belegte Plätze sind sofort gesperrt (Schutz vor Doppelbuchung
  per DB-Transaktion). Preise werden serverseitig berechnet.
- 📞 **Telefon-Anbindung** – Click-to-Call-Buttons in Navbar, Hero,
  Buchungsfenster, Floating-Button und Footer.
- ✉️ **E-Mail-Bestätigungen** – an Gast und Kino (optional, per SMTP konfigurierbar).
- ✨ **Starke Animationen** – Parallax-Hero mit Scheinwerfer-Effekt, 3D-Tilt-
  Filmkarten, animiertes Buchungsfenster mit Schritt-Übergängen, Sitzplan mit
  Feder-Animationen, Lauftext, animierte Zähler und Scroll-Reveals.
- 🗺️ **Google Maps** – eingebettete Karte + „Route planen" (auch ohne API-Key).
- ♿ **Barrierearm & responsiv** – Tastatur/ESC, `prefers-reduced-motion`,
  ARIA-Rollen, SEO-Metadaten und Schema.org (`MovieTheater`).

## Technologie

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Framer Motion ·
better-sqlite3 · Nodemailer · Zod

## Lokale Entwicklung

```bash
cd cinema
npm install
cp .env.example .env.local   # optional: SMTP-Daten eintragen
npm run dev                  # http://localhost:3000
```

## Produktion

```bash
npm run build
npm run start
```

## Konfiguration

Alle Inhalte (Stammdaten, Filme, Vorstellungen, Saalplan, Features) werden zentral
in [`lib/cinema.ts`](lib/cinema.ts) gepflegt. Umgebungsvariablen siehe
[`.env.example`](.env.example).

> Hinweis: Filme & Vorstellungen sind beispielhaft gepflegt und werden für die
> nächsten Tage automatisch erzeugt. Für den Live-Betrieb können sie an die
> tatsächlichen Spielzeiten (bzw. ein Kassensystem) angebunden werden.

Buchungen werden in `data/bookings.db` (SQLite) gespeichert; das Verzeichnis
`data/` ist von Git ausgeschlossen.
