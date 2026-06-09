# Atelier Götz – Coiffeur & Barbier · Website

Statische, produktionsreife Marketing-Website (One-Pager) für den Friseur- und
Barbier-Salon **Atelier Götz** in Chemnitz. Gebaut mit **HTML5**, **Tailwind CSS**
(produktiv via Tailwind CLI gebaut) und **Vanilla JavaScript** – ganz ohne
bezahlte Abhängigkeiten oder API-Keys.

Das fertige Ergebnis sind reine statische Dateien, die bei jedem Hoster
(Netlify, Vercel, klassischer Webspace …) abgelegt werden können.

---

## Inhaltsverzeichnis

1. [Projektaufbau](#projektaufbau)
2. [Voraussetzungen](#voraussetzungen)
3. [Lokal starten](#lokal-starten)
4. [Build (CSS erzeugen)](#build-css-erzeugen)
5. [Deployment](#deployment)
6. [Inhalte anpassen](#inhalte-anpassen) ← **wichtig für den Salon**
7. [Barrierefreiheit, SEO & Performance](#barrierefreiheit-seo--performance)

---

## Projektaufbau

```
.
├── index.html            # Startseite (One-Pager mit allen Abschnitten + JSON-LD)
├── impressum.html        # Pflichtseite Impressum (Platzhalter, bitte ausfüllen)
├── datenschutz.html      # Pflichtseite Datenschutz (Platzhalter, bitte ausfüllen)
├── package.json          # Build-Skripte (build / watch)
├── tailwind.config.js    # Farben, Schriften, Theme – hier Design anpassen
├── src/
│   └── input.css         # Tailwind-Quelle (eigene Klassen) → wird zu styles.css
└── assets/
    ├── css/styles.css    # GENERIERT aus src/input.css (eingecheckt)
    ├── js/main.js        # Menü, Scroll-Reveal, Lightbox, Formular
    └── img/              # Bild-Platzhalter (SVG) – durch echte Fotos ersetzen
```

> **Hinweis:** `assets/css/styles.css` ist bewusst eingecheckt. Dadurch funktioniert
> die Seite sofort – auch ohne lokalen Build. Wer das Design ändert, muss
> anschließend neu bauen (siehe unten).

---

## Voraussetzungen

- [Node.js](https://nodejs.org/) (Version 18 oder neuer) – nur für den CSS-Build nötig.
  Zum reinen Anschauen/Hochladen der Seite ist Node **nicht** erforderlich.

Abhängigkeiten installieren (einmalig):

```bash
npm install
```

---

## Lokal starten

Da es eine statische Seite ist, genügt ein einfacher lokaler Server. Beispiele:

```bash
# Variante A: mit dem npm-Skript (nutzt "serve")
npm run serve

# Variante B: mit Python (falls installiert)
python3 -m http.server 8000
```

Danach im Browser z. B. `http://localhost:8000` öffnen.

> Reines Doppelklicken auf `index.html` funktioniert ebenfalls weitgehend –
> eingebettete Karte und absolute Pfade arbeiten über einen lokalen Server aber
> zuverlässiger.

---

## Build (CSS erzeugen)

Das CSS wird aus `src/input.css` + den verwendeten Klassen in den HTML-Dateien
erzeugt. **Nur nötig, wenn Design/Klassen geändert werden.**

```bash
# Einmalig, minifiziert (für Produktion):
npm run build

# Während der Entwicklung – baut bei jeder Änderung automatisch neu:
npm run watch
```

Ergebnis: `assets/css/styles.css`.

---

## Deployment

Es müssen lediglich die **statischen Dateien** hochgeladen werden – also der
gesamte Projektordner **ohne** `node_modules`. Achten Sie darauf, dass
`assets/css/styles.css` aktuell ist (ggf. vorher `npm run build` ausführen).

- **Netlify / Vercel:** Repository verbinden. Build-Command `npm run build`,
  Publish-/Output-Verzeichnis `.` (Projekt-Wurzel). Alternativ den Ordner einfach
  per Drag-&-Drop hochladen.
- **Klassischer Webspace (FTP):** Dateien `index.html`, `impressum.html`,
  `datenschutz.html` und den Ordner `assets/` in das Web-Wurzelverzeichnis
  (z. B. `httpdocs` / `public_html`) hochladen.

---

## Inhalte anpassen

Alle Texte stehen direkt in den HTML-Dateien. Hier die wichtigsten Stellen –
jeweils mit Datei und einem Suchbegriff zum schnellen Finden.

### 1. Telefonnummer
- **Anzuzeigende Nummer:** in `index.html` (und den Unterseiten) nach `0371 33502111` suchen.
- **Anruf-Link:** nach `tel:+4937133502111` suchen. Format: `+49` + Vorwahl ohne die
  führende 0 + Nummer.

### 2. Adresse & Öffnungszeiten
- **Adresse:** in `index.html` nach `Schloßteichstraße` suchen (kommt im Kontaktbereich
  und im Footer vor).
- **Öffnungszeiten:** in `index.html` nach `Öffnungszeiten` suchen. Aktuell als
  Platzhalter „Montag – Samstag: ab 09:00 Uhr". Dort die echten Zeiten eintragen.
- Diese Angaben zusätzlich im **JSON-LD** pflegen (siehe Punkt 6).

### 3. Preise
- In `index.html` im Abschnitt **Leistungen** nach `ab XX €` suchen. Jeder Treffer ist
  ein Preis-Platzhalter einer Leistungskarte – durch den echten Preis ersetzen
  (z. B. `ab 39 €`).

### 4. Leistungen (Karten)
- Im Abschnitt `<!-- 4. LEISTUNGEN -->` in `index.html`. Jede Leistung ist ein
  `<article class="card …">`-Block mit Titel, Beschreibung und Preis. Karten können
  kopiert, geändert oder entfernt werden.

### 5. Bilder austauschen
- Alle Bilder liegen in `assets/img/` als **SVG-Platzhalter**. Jede Verwendung im
  HTML ist mit `hier echtes Foto einsetzen` kommentiert.
- **Empfohlenes Vorgehen:** echte Fotos als `.jpg` (oder `.webp`) speichern und im
  jeweiligen `<img src="…">` den Pfad anpassen, z. B. `/assets/img/hero.jpg`.
  Wichtige Dateien:
  - `hero.svg` → großes Bild im Kopfbereich
  - `ueber-uns.svg` → Bild im Abschnitt „Über uns"
  - `gallery-1.svg` … `gallery-8.svg` → Galerie-Raster
  - `og-image.svg` → Vorschaubild beim Teilen in sozialen Netzwerken
- **Alt-Texte** (Bildbeschreibungen) im `alt="…"` jeweils an das echte Foto anpassen.
- Tipp: Bilder vor dem Hochladen komprimieren (z. B. mit [squoosh.app](https://squoosh.app)),
  damit die Seite schnell bleibt.

### 6. Bewertung & strukturierte Daten (SEO)
- Sichtbar im Hero- und Bewertungsbereich: nach `4,9` suchen.
- Für Suchmaschinen im **JSON-LD**: in `index.html` im `<head>` nach
  `application/ld+json` suchen. Dort `ratingValue`, `reviewCount`, Adresse,
  `telephone` und `openingHoursSpecification` pflegen.
- **Domain:** Im `<head>` von `index.html` die Beispiel-Domain
  `https://www.atelier-goetz-chemnitz.de/` (in `canonical`, Open-Graph- und
  JSON-LD-URLs) durch die echte Domain ersetzen.

### 7. Kontaktformular aktivieren (Formspree)
Das Formular ist „Formspree-ready" – ein kostenloser Dienst zum Empfangen von
Formular-Nachrichten per E-Mail, ganz ohne eigenen Server.

1. Auf [formspree.io](https://formspree.io) ein (kostenloses) Konto anlegen und ein
   neues Formular erstellen.
2. Die erhaltene **Form-ID** kopieren (sieht aus wie `xmyzabcd`).
3. In `index.html` nach `DEIN_FORM_ID` suchen und durch die echte ID ersetzen:
   `action="https://formspree.io/f/xyzabcd"`.

Solange dort noch `DEIN_FORM_ID` steht, zeigt das Formular beim Absenden einen
Hinweis an, statt eine Nachricht zu verschicken.

> Alternativ kann das `action`-Attribut auf einen beliebigen anderen Formular-Dienst
> oder ein eigenes Backend zeigen.

### 8. Karte (Standort)
- Im Kontaktbereich von `index.html` nach `openstreetmap` suchen. Die Koordinaten
  (`marker=50.8456%2C12.9192`) und der Kartenausschnitt (`bbox=…`) können bei Bedarf
  an die exakte Lage angepasst werden.

### 9. Social-Media-Links
- Im Footer von `index.html` nach `Link eintragen` suchen und die `href="#"` der
  Instagram-/Facebook-Icons durch die echten Profil-URLs ersetzen.

### 10. Impressum & Datenschutz
- `impressum.html` und `datenschutz.html` enthalten **rechtlich erforderliche
  Platzhalter**. Alle mit `[…]` markierten Felder ausfüllen und die Angaben vor
  Veröffentlichung rechtlich prüfen lassen (in Deutschland Pflicht).

### Farben & Schriften (Design)
- **Farben:** in `tailwind.config.js` unter `theme.extend.colors` (`cream`,
  `terracotta`, `sage`, `anthracite`).
- **Schriften:** in `tailwind.config.js` unter `fontFamily` **und** die Google-Fonts-
  `<link>`-Tags im `<head>` der HTML-Dateien.
- Nach Design-Änderungen: `npm run build` ausführen.

---

## Barrierefreiheit, SEO & Performance

- **Semantisches HTML**, Alt-Texte, Tastaturbedienung (Menü & Lightbox), sichtbare
  Fokus-Rahmen, gute Farbkontraste.
- **SEO:** aussagekräftige Title/Meta-Description, Open-Graph- & Twitter-Tags,
  strukturierte Daten (JSON-LD, Schema.org `HairSalon`).
- **Performance:** minifiziertes CSS, `loading="lazy"` für Bilder, keine schweren
  Bibliotheken, dezente Animationen, die `prefers-reduced-motion` respektieren.

> **Lighthouse-Tipp:** Für Top-Werte (90+) echte, komprimierte Bilder im `.webp`-Format
> verwenden und die Seite über HTTPS ausliefern.
