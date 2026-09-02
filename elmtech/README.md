# Elmtech Verbundelemente GmbH – Website

Produktionsreife Website für die **Elmtech Verbundelemente GmbH** (Frankenberg /
OT Sachsenburg) – Hersteller maßgefertigter Dämm- und Fassadenelemente. Mit
Rückruf-Buchungssystem, Telefon-Anbindung, stark animierten 3D-Widgets,
Scroll-Animationen und Google-Maps-Einbindung.

## Funktionen

- 📞 **Rückruf-Buchungssystem** – mehrstufiges, animiertes Fenster: Anliegen →
  Wunsch-Datum & Zeitfenster → Kontaktdaten → Bestätigung mit Referenznummer.
  Serverseitige Validierung (Zod), Werktag-/Slot-Prüfung, Kapazitätssteuerung
  und Speicherung in SQLite.
- ☎️ **Telefon-Anbindung** – Click-to-Call-Buttons in Navbar, Hero, Rückruf-Fenster,
  Floating-Button und Footer.
- ✉️ **E-Mail-Bestätigungen** – Benachrichtigung an Elmtech und (falls E-Mail
  angegeben) an den Kunden. Optional per SMTP konfigurierbar.
- ✨ **3D-Animationen & Widgets** – interaktives 3D-Verbundelement im Hero
  (Maus-Parallax), scroll-gesteuerter 3D-Schichtquerschnitt, 3D-Tilt-Produktkarten,
  animierte Zähler, Scroll-Reveals und Timeline.
- 🗺️ **Google Maps** – eingebettete Karte + „Route planen" (auch ohne API-Key),
  inkl. Werk- und Lieferadresse.
- ♿ **Barrierearm & responsiv** – Tastatur/ESC, `prefers-reduced-motion`, ARIA-Rollen,
  SEO-Metadaten und Schema.org (`Manufacturer`).

## Technologie

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Framer Motion ·
better-sqlite3 · Nodemailer · Zod

## Lokale Entwicklung

```bash
cd elmtech
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

Alle Inhalte (Stammdaten, Anwendungen, Produkte, Rückruf-Zeitfenster) werden zentral
in [`lib/elmtech.ts`](lib/elmtech.ts) gepflegt. Umgebungsvariablen siehe
[`.env.example`](.env.example).

> Hinweis: Die Produktreihen (ET-PRO 5000, ET-GLP P6B u. a.) und Kennzahlen sind
> beispielhaft hinterlegt und sollten vor dem Go-Live gegen die echten Elmtech-Angaben
> geprüft werden. Ohne SMTP-Konfiguration funktioniert der Rückruf weiterhin – die
> Anfrage wird gespeichert und bestätigt, es werden nur keine E-Mails versendet.

Rückruf-Anfragen werden in `data/callbacks.db` (SQLite) gespeichert; das Verzeichnis
`data/` ist von Git ausgeschlossen.
