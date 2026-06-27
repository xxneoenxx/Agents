# Niemeier Fahrzeugwerke — Website

Produktionsreife Unternehmenswebsite der **Niemeier Fahrzeugwerke GmbH** (Lunzenau):
Tankfahrzeugbau, Metallbau und Nutzfahrzeug-Service. Mit interaktiver 3D-Hero-Szene,
durchgehenden Animationen und einem funktionierenden Buchungssystem inkl.
Telefonanbindung (Click-to-Call, Rückruf).

## Tech-Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** (Design-Tokens für die „gebürstetes Metall"-Optik)
- **React Three Fiber / three.js / drei** — prozeduraler 3D-Tankwagen im Hero
- **Framer Motion** — Widgets, Fenster, Scroll-Reveals, Counter
- **zod** — Validierung der API-Eingaben
- **Resend** — E-Mail-Versand für Buchungen & Rückrufe

## Schnellstart

```bash
npm install
cp .env.example .env.local   # Werte eintragen (siehe unten)
npm run dev                  # http://localhost:3000
```

Produktiv:

```bash
npm run build
npm run start
```

## Umgebungsvariablen (`.env.local`)

| Variable             | Zweck                                                            |
| -------------------- | --------------------------------------------------------------- |
| `RESEND_API_KEY`     | API-Key von [resend.com](https://resend.com) für den Mailversand |
| `BOOKING_TO_EMAIL`   | Empfänger der Anfragen (Standard: info@niemeier-fahrzeugwerke.eu) |
| `BOOKING_FROM_EMAIL` | Absender — muss eine bei Resend verifizierte Domain sein         |

> **Ohne `RESEND_API_KEY`** funktioniert das Formular weiterhin: Es validiert die
> Eingaben und bietet einen vorausgefüllten **`mailto:`-Fallback** an, sodass keine
> Anfrage verloren geht. Für den automatischen Versand bitte den Key hinterlegen.

## Buchungssystem & Telefonanbindung

- **Mehrstufiges Buchungsfenster** (Leistung → Fahrzeug → Termin → Kontakt → Übersicht),
  erreichbar über alle „Termin buchen"-Buttons.
- **Schwebendes Anruf-Widget** (unten rechts): direkt anrufen, Rückruf anfordern, Termin buchen.
- **API-Routen:** `POST /api/booking` und `POST /api/callback` — mit Validierung,
  Honeypot und einfachem Rate-Limit; versenden per Resend.
- `tel:`-Links durchgängig für Click-to-Call.

## Inhalte pflegen

- **Texte, Kontaktdaten, Listen:** zentral in [`content/site.ts`](content/site.ts).
- **Bilder:** zentral in [`content/images.ts`](content/images.ts).

### Echte Fotos einsetzen

Die Originalfotos der bestehenden Seite konnten in der Build-Umgebung nicht
automatisch geladen werden. Aktuell zeigen die Bild-Slots gekennzeichnete
Platzhalter. So tauschen Sie sie aus (ohne Code-Änderung):

1. Foto nach `public/images/` legen (z. B. `tankfahrzeug.jpg`).
2. In `content/images.ts` den `src` auf den neuen Pfad setzen (`/images/tankfahrzeug.jpg`)
   und `placeholder: false` setzen.

## Rechtliches

`/impressum` und `/datenschutz` sind mit den bekannten Firmendaten vorbefüllt.
Vor Veröffentlichung bitte durch den Mandanten prüfen und ergänzen lassen
(z. B. USt-IdNr., eingesetzte Hosting-/Mail-Dienste in der Datenschutzerklärung).

## Deployment

Empfohlen: **[Vercel](https://vercel.com)** (Next.js nativ). Repository verbinden,
die Umgebungsvariablen im Projekt setzen, deployen. Alternativ jeder Node-Host,
der `next start` ausführen kann.

## Projektstruktur

```
app/            # Seiten, Layout, API-Routen, robots/sitemap
components/
  hero/         # 3D-Szene (Canvas, Tankwagen) + Hero-Layout
  sections/     # Leistungen, Fertigung, Material, Service, Werk, Kontakt
  booking/      # Buchungsfenster + Kontext-Provider
  widgets/      # Anruf-Widget, Rückruf-Fenster
  ui/           # Button, Modal, Felder, Reveal, Counter …
  layout/       # Navbar, Footer, Rechts-Seiten-Rahmen
content/        # site.ts (Texte/Daten), images.ts (Bilder)
lib/            # E-Mail, Validierung (zod), mailto-Fallback, Rate-Limit
```
