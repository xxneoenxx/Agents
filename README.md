# Krebs Tanksysteme – Website

Produktionsreife Website für **Krebs Tanksysteme** (Tankbau-Demontage-Service, Fachbetrieb nach WHG)
mit 3D-Hero-Animation, durchgängigen Scroll-/Widget-Animationen, mehrstufigem Anfrage-/
Buchungsformular (E-Mail-Versand) und Klick-zum-Anrufen-Telefonanbindung.

## Tech-Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** (Design-Tokens in `tailwind.config.ts`)
- **three.js / @react-three/fiber / @react-three/drei** – 3D-Hero-Szene
- **Framer Motion** – Scroll-/UI-Animationen
- **react-hook-form** + **zod** – Formularvalidierung (Schema in `src/lib/booking-schema.ts`)
- **Resend** – E-Mail-Versand der Anfragen (optional; Demo-Modus ohne Key)

## Schnellstart

```bash
npm install
cp .env.example .env.local   # Werte eintragen (siehe unten)
npm run dev                  # http://localhost:3000
```

Production:

```bash
npm run build
npm run start
```

## Umgebungsvariablen (`.env.local`)

| Variable               | Zweck                                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------------------- |
| `RESEND_API_KEY`       | API-Key von [resend.com](https://resend.com). **Ohne Key: Demo-Modus** (Anfragen werden nur geloggt). |
| `BOOKING_TO_EMAIL`     | Empfängeradresse für eingehende Anfragen.                                                              |
| `BOOKING_FROM_EMAIL`   | Verifizierte Absenderadresse (Domain in Resend hinterlegen).                                           |
| `NEXT_PUBLIC_SITE_URL` | Öffentliche Basis-URL (SEO, Sitemap, OpenGraph).                                                       |

## 🔧 Vor Go-Live anzupassen (Platzhalter)

Alle firmenspezifischen Daten liegen zentral in **`src/config/site.ts`**.
Mit `PLATZHALTER` markierte Werte bitte durch echte Daten ersetzen; `verifiziert` markierte Werte
(aus öffentlicher Recherche) gegenlesen lassen:

- **E-Mail-Adresse** (`email`) – aktuell angenommen, bitte bestätigen
- **Öffnungszeiten** (`hours`) – Platzhalter
- **WhatsApp-Nummer** (`whatsapp`) – Platzhalter
- **Social-Links** (`social`)
- **Logo/Markenfarben** – Farben in `tailwind.config.ts` (`steel`, `amber`, `teal`)
- **Referenzbilder** – aktuell keine echten Bilder eingebunden
- **Rechtstexte**: `src/app/impressum/page.tsx` und `src/app/datenschutz/page.tsx`
  enthalten gelb markierte Platzhalter (Inhaber, USt-IdNr., Zertifikatsnummer, Hosting-Anbieter,
  Stand-Datum). **Vor Veröffentlichung rechtlich prüfen lassen.**

Verifizierte Eckdaten (öffentliche Recherche, vom Kunden zu bestätigen):
Thalheimer Straße 1, 09390 Gornsdorf · Tel. 037296 887055 · Mobil 0171 4863938 ·
Fachbetrieb nach WHG, TÜV-Süd-überwacht.

## Projektstruktur

```
src/
├─ app/
│  ├─ layout.tsx            # Fonts, SEO-Metadaten, JSON-LD
│  ├─ page.tsx              # One-Page-Komposition
│  ├─ globals.css
│  ├─ api/booking/route.ts  # E-Mail-Versand (Resend) + Demo-Fallback + Rate-Limit
│  ├─ impressum/page.tsx    # Pflichtseite (Platzhalter)
│  ├─ datenschutz/page.tsx  # Pflichtseite (Platzhalter)
│  ├─ robots.ts · sitemap.ts
├─ components/
│  ├─ three/HeroScene.tsx   # 3D-Hero (R3F), dynamisch ssr:false geladen
│  ├─ sections/*            # Header, Hero, Services, Process, WhyUs, Faq, BookingForm, Contact, Footer
│  ├─ ui/*                  # Button, Reveal, SectionHeading, Counter, Icon, StickyCallButton
│  ├─ legal/LegalShell.tsx
│  └─ seo/JsonLd.tsx
├─ config/  site.ts · services.ts   # Single Source of Truth
├─ hooks/   useReducedMotion.ts · useScrollProgress.ts
└─ lib/     booking-schema.ts · zod-resolver.ts · utils.ts
```

## Barrierefreiheit & Performance

- 3D-Szene wird per `next/dynamic` (`ssr:false`) lazy geladen; bei
  `prefers-reduced-motion` erscheint ein eleganter statischer Fallback.
- Tastaturbedienung, sichtbarer Fokusring, ARIA-Labels, „Zum Inhalt springen“-Link.
- DPR-Clamping + `AdaptiveDpr` für die 3D-Szene; prozedurale Umgebungsbeleuchtung (keine externen
  HDRI-Assets nötig).

## Deployment (Vercel)

1. Repository mit Vercel verbinden (Framework wird als „Next.js“ erkannt).
2. Umgebungsvariablen aus `.env.example` im Vercel-Projekt hinterlegen.
3. Deployen. Für E-Mail-Versand die Resend-Domain verifizieren.

## Buchungssystem – Hinweis

Es gibt **keine eigene Datenbank**: Anfragen werden per E-Mail versendet (Wunsch des Kunden).
Validierung läuft client- **und** serverseitig über dasselbe zod-Schema. Spam-Schutz via Honeypot
und einfaches Rate-Limit pro Server-Instanz.
