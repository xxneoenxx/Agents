# Imbiss Asia & Döner · Website

Statische, produktionsreife Website (One-Pager) für **Imbiss Asia & Döner** in Lunzenau.
Gebaut mit **HTML5**, **Tailwind CSS** (produktiv via Tailwind CLI gebaut) und
**Vanilla JavaScript** – ohne bezahlte Abhängigkeiten und ohne API-Keys.

Das Ergebnis sind reine statische Dateien, die bei jedem Hoster (Netlify, Vercel,
klassischer Webspace …) abgelegt werden können.

---

## Inhaltsverzeichnis
1. [Projektaufbau](#projektaufbau)
2. [Voraussetzungen](#voraussetzungen)
3. [Lokal starten](#lokal-starten)
4. [Build (CSS erzeugen)](#build-css-erzeugen)
5. [Vorschau-Datei](#vorschau-datei)
6. [Deployment](#deployment)
7. [Inhalte anpassen](#inhalte-anpassen) ← **wichtig**
8. [Barrierefreiheit, SEO & Performance](#barrierefreiheit-seo--performance)

---

## Projektaufbau
```
.
├── index.html            # Startseite (One-Pager + JSON-LD)
├── impressum.html        # Pflichtseite Impressum (Platzhalter, bitte ausfüllen)
├── datenschutz.html      # Pflichtseite Datenschutz (Platzhalter, bitte ausfüllen)
├── vorschau.html         # Eigenständige Einzeldatei-Vorschau (per npm run preview)
├── package.json          # Build-Skripte
├── tailwind.config.js    # Farben, Schriften, Theme
├── src/input.css         # Tailwind-Quelle → wird zu styles.css
├── tools/
│   ├── gen-art.js        # erzeugt die SVG-Platzhalter-Illustrationen
│   └── build-preview.js  # erzeugt die eigenständige vorschau.html
└── assets/
    ├── css/styles.css    # GENERIERT (eingecheckt, läuft ohne Build)
    ├── js/main.js        # Menü, Scroll-Reveal, Lightbox
    └── img/              # Bild-Platzhalter (SVG) – durch echte Fotos ersetzen
```

> **Hinweis:** `assets/css/styles.css` ist bewusst eingecheckt. Dadurch funktioniert
> die Seite sofort – auch ohne lokalen Build.

---

## Voraussetzungen
- [Node.js](https://nodejs.org/) Version 18+ – nur für den CSS-Build nötig.
  Zum reinen Anschauen/Hochladen ist Node **nicht** erforderlich.

```bash
npm install
```

---

## Lokal starten
```bash
npm run serve            # lokaler Server (npx serve)
# oder
python3 -m http.server 8000
```
Dann im Browser z. B. `http://localhost:8000` öffnen.

---

## Build (CSS erzeugen)
Nur nötig, wenn Design/Klassen geändert werden.
```bash
npm run build            # einmalig, minifiziert
npm run watch            # baut bei jeder Änderung automatisch
```
Ergebnis: `assets/css/styles.css`.

---

## Vorschau-Datei
`npm run preview` erzeugt eine **eigenständige** `vorschau.html`, in der CSS, JavaScript
und Bilder eingebettet sind. Diese eine Datei lässt sich überall per Doppelklick öffnen
(auch auf dem Handy) – ideal zum Herzeigen. Für den echten Upload bitte `index.html`
verwenden.

---

## Deployment
Nur die statischen Dateien hochladen (ohne `node_modules`). Vorher ggf. `npm run build`.
- **Netlify / Vercel:** Build-Command `npm run build`, Publish-Verzeichnis `.` – oder den
  Ordner per Drag-&-Drop hochladen.
- **Webspace (FTP):** `index.html`, `impressum.html`, `datenschutz.html` und den Ordner
  `assets/` ins Web-Wurzelverzeichnis (`httpdocs` / `public_html`) laden.

---

## Inhalte anpassen
Alle Texte stehen direkt in den HTML-Dateien. Wichtige Stellen mit Suchbegriff:

### 1. Telefonnummer
- **Anzeige:** in `index.html` nach `037383 80688` suchen.
- **Anruf-Link:** nach `tel:+493738380688` suchen (Format `+49` + Nummer ohne führende 0).

### 2. Adresse & Öffnungszeiten
- **Adresse:** nach `Markt 20` suchen (Kontaktbereich + Footer).
- **Öffnungszeiten:** nach `10:30` suchen. Aktuell „Mo–Fr 10:30–19:30 Uhr, Sa & So
  geschlossen". Auch im **JSON-LD** (siehe Punkt 6) pflegen.

### 3. Speisekarte: Gerichte & Preise
- Im Abschnitt `<!-- 5. SPEISEKARTE -->` in `index.html`.
- **Preise** sind Beispielwerte. Such-Tipp: nach `€` suchen und Werte ersetzen.
- Gerichte sind `<li class="menu-item">`-Zeilen (Name, Beschreibung, Preis) bzw. die drei
  „Beliebte Gerichte"-Karten oben. Zeilen können kopiert, geändert oder gelöscht werden.
- **Wichtig:** Der kleine Hinweis „Alle Gerichte & Preise sind Beispielangaben …" unter der
  Überschrift sollte vor Veröffentlichung **entfernt** werden (nach diesem Text suchen).

### 4. Bilder austauschen
- Alle Bilder liegen in `assets/img/` als **SVG-Platzhalter** (Illustrationen). Jede
  Verwendung im HTML ist mit `echtes Foto des Inhabers einsetzen` kommentiert, inkl.
  empfohlenem Seitenverhältnis.
- **Vorgehen:** echte Fotos als `.jpg` (oder `.webp`) speichern und im jeweiligen
  `<img src="…">` den Pfad anpassen. Wichtige Dateien & empfohlene Seitenverhältnisse:
  - `hero.jpg` (≈ 4:3) – großes Bild oben
  - `ueber-uns.jpg` (≈ 6:5) – Über-uns-Bereich
  - `fruehlingsrolle.jpg`, `doener-bratnudeln.jpg`, `bratreis.jpg` (≈ 9:7) – beliebte Gerichte
  - `gallery-1.jpg` … `gallery-6.jpg` (quadratisch) – Galerie
  - `og-image.jpg` – Vorschaubild beim Teilen
- **Responsive Bilder (optional, empfohlen):** für scharfe, schnelle Bilder kann statt
  `<img>` ein `<picture>` mit mehreren Größen genutzt werden, z. B.:
  ```html
  <img src="/assets/img/hero-1280.jpg"
       srcset="/assets/img/hero-800.jpg 800w, /assets/img/hero-1280.jpg 1280w, /assets/img/hero-1920.jpg 1920w"
       sizes="(min-width: 1024px) 50vw, 100vw"
       alt="…" width="1600" height="1200" loading="lazy" class="…">
  ```
- **Alt-Texte** im `alt="…"` jeweils an das echte Foto anpassen.
- Tipp: Fotos vor dem Hochladen komprimieren (z. B. [squoosh.app](https://squoosh.app)).

### 5. Bewertung (4,6 ★)
- Sichtbar im Hero- und Bewertungsbereich: nach `4,6` suchen. Die Bewertung ist klar als
  Google-Bewertung gekennzeichnet. **Hinweis:** Im JSON-LD ist **bewusst kein**
  `aggregateRating` hinterlegt (keine erfundene Auszeichnung).

### 6. SEO / strukturierte Daten
- Im `<head>` von `index.html` nach `application/ld+json` suchen. Dort Adresse,
  `telephone`, `openingHoursSpecification`, `servesCuisine` und `geo` (50.9621 / 12.7556)
  pflegen.
- **Domain:** Die Beispiel-Domain `https://www.imbiss-asia-doener-lunzenau.de/` (in
  `canonical`, Open-Graph- und JSON-LD-URLs) durch die echte Domain ersetzen.

### 7. Lieferdienst-Link
- Im Kontaktbereich nach `Liefergebiet & Bestellung (Link eintragen)` suchen und das
  `href="#"` durch den echten Bestell-/Lieferdienst-Link ersetzen.

### 8. Karte (Standort)
- Im Kontaktbereich ist die Google-Maps-Karte als `<iframe>` eingebunden (kein API-Key
  nötig). Adresse in der `src`-URL bei Bedarf anpassen.

### 9. Social-Media-Links
- Im Footer nach `Link eintragen` suchen und die `href="#"` der Icons durch die echten
  Profil-URLs ersetzen.

### 10. Impressum & Datenschutz
- `impressum.html` und `datenschutz.html` enthalten rechtlich erforderliche Platzhalter.
  Alle mit `[…]` markierten Felder ausfüllen und vor Veröffentlichung rechtlich prüfen lassen.

### Farben & Schriften (Design)
- **Farben:** in `tailwind.config.js` unter `theme.extend.colors` (`cream`, `charcoal`,
  `brand` = Rot, `ember` = Orange).
- **Schriften:** in `tailwind.config.js` unter `fontFamily` **und** die Google-Fonts-
  `<link>`-Tags im `<head>`. Nach Änderungen `npm run build` ausführen.

---

## Barrierefreiheit, SEO & Performance
- Semantisches HTML, Alt-Texte, Tastaturbedienung (Menü & Lightbox), sichtbare Fokus-Rahmen,
  gute Kontraste.
- SEO: Title/Meta-Description, Open-Graph- & Twitter-Tags, JSON-LD (Schema.org `Restaurant`).
- Performance: minifiziertes CSS, `loading="lazy"` für Bilder, keine schweren Bibliotheken,
  dezente Animationen, die `prefers-reduced-motion` respektieren.

> **Lighthouse-Tipp:** Für Top-Werte (90+) echte, komprimierte Bilder (`.webp`) verwenden
> und die Seite über HTTPS ausliefern.
