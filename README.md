# Bauernhof zum Silberbergwerk – Website

Produktionsreife Website für das **Erlebnisrestaurant & Pension „Bauernhof zum
Silberbergwerk“** in Limbach-Oberfrohna. Inklusive Online-Tischreservierung,
Telefon-Anbindung, animierten Widgets, Scroll-Animationen und Google-Maps-Einbindung.

## Funktionen

- 🍽️ **Online-Buchungssystem** – Tischreservierung mit serverseitiger Validierung,
  Kapazitätsprüfung und Speicherung in einer SQLite-Datenbank.
- 📞 **Telefon-Anbindung** – Click-to-Call-Buttons (Navbar, Hero, Floating-Button,
  Reservierungsbereich, Footer) für Reservierungen per Anruf.
- ✉️ **E-Mail-Bestätigungen** – automatische Mails an Gast und Restaurant
  (optional, per SMTP konfigurierbar).
- ✨ **Animationen** – Parallax-Hero, Scroll-Reveal-Effekte, animierte
  Zähler, Live-„Jetzt geöffnet“-Status und schwebende Aktions-Buttons.
- 🗺️ **Google Maps** – eingebettete Karte + „Route planen“-Button (funktioniert
  auch ohne API-Key).
- ♿ **Barrierearm & responsiv** – Tastaturbedienung, `prefers-reduced-motion`,
  semantisches HTML, SEO-Metadaten und Schema.org-Daten für Google.

## Technologie

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Framer Motion ·
better-sqlite3 · Nodemailer · Zod

## Lokale Entwicklung

```bash
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

Alle Inhalte (Kontakt, Öffnungszeiten, Speisekarte, Highlights) werden zentral
in [`lib/restaurant.ts`](lib/restaurant.ts) gepflegt.

Umgebungsvariablen siehe [`.env.example`](.env.example):

| Variable | Zweck |
| --- | --- |
| `SMTP_*` | E-Mail-Versand für Reservierungs-Bestätigungen (optional) |
| `MAIL_FROM`, `MAIL_TO` | Absender und Restaurant-Postfach |
| `NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY` | Optionaler Google-Maps-Embed-Key |

> Ohne SMTP-Konfiguration funktioniert die Reservierung weiterhin – die Anfrage
> wird gespeichert und dem Gast bestätigt, es werden nur keine E-Mails versendet.

## Reservierungsdaten

Eingehende Reservierungen werden in `data/reservations.db` (SQLite) gespeichert.
Das Verzeichnis `data/` ist von Git ausgeschlossen.
