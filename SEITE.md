# Mc Döner — Website

Einseitige Website für **Mc Döner, Kellerberg 12, 09212 Limbach-Oberfrohna**.

Einfach `index.html` im Browser öffnen (am besten über einen lokalen Server,
z. B. `python3 -m http.server`, damit die Schriften sauber laden).

## Aufbau

```
index.html                  die ganze Seite
assets/css/site.css         Gestaltung (Design-Tokens ganz oben)
assets/js/site.js           Öffnungsstatus + Scroll-Animationen
assets/fonts/               Archivo + Instrument Sans (lokal, SIL OFL)
assets/vendor/              GSAP, ScrollTrigger, Lenis (lokal)
assets/img/                 hier eigene Fotos ablegen
```

**Alles liegt lokal.** Die Seite lädt nichts von fremden Servern nach —
keine Google Fonts, kein CDN, keine Stockfoto-Dienste. Sie funktioniert damit
auch offline, ist schneller und datenschutzfreundlich. Einzige Ausnahme: die
eingebettete OpenStreetMap-Karte im Abschnitt „Finden".

## Gestaltung

Konzept **„Leuchtkasten"** — der beleuchtete Schaukasten eines Imbisses am
Abend. Bernstein-Gelb als Grundton, warmes Schwarzbraun als Tinte, Glut-Rot
als Akzent. Jeder Abschnitt ist eine eigene Farbfläche.

Alle Farben und Abstände stehen als Tokens in `:root` (`assets/css/site.css`,
Abschnitt 2) — dort ändern, nicht im einzelnen Bauteil.

Das Signatur-Element ist der **Drehspieß im Hero**: komplett in CSS gebaut
(Verläufe + Zylinder-Schattierung), kein Bild. Er dreht sich dauerhaft und
wird beim Scrollen schneller.

## Was noch eingetragen werden muss

### 1. Preise

Im Abschnitt „Auswahl" steht bei jedem Gericht `Preis im Laden`, weil mir die
echten Preise nicht vorlagen. In `index.html` einfach ersetzen:

```html
<span class="karte-preis">Preis im Laden</span>   <!-- vorher -->
<span class="karte-preis">6,50 €</span>           <!-- nachher -->
```

Sollen gar keine Preise online stehen, die `<span class="karte-preis">…</span>`
Zeilen ersatzlos löschen — das Layout hält das aus.

### 2. Eigene Fotos

Die Tafeln in der Galerie und die Illustration im Abschnitt „Handwerk" sind
bewusst **gezeichnete Grafiken statt Stockfotos**: fremde Fotos von fremden
Dönern wären für einen Laden mit eigenem Spieß die schlechtere Wahl.

Sobald eigene Fotos da sind, Datei nach `assets/img/` legen und am jeweiligen
Element eine CSS-Variable setzen — das Foto legt sich über die Grafik,
Format und Beschriftung bleiben:

```html
<figure class="gal-stueck gal-stueck--a t-senf" style="--foto:url('assets/img/spiess.jpg')">
```

Gleiches gilt für die Illustration im Abschnitt „Handwerk":

```html
<div class="platte__flaeche" data-parallax="-0.07" style="--foto:url('assets/img/laden.jpg')">
```

Empfohlen: quer ca. 1600 × 1200 px, hoch ca. 1200 × 1600 px, als JPG.

### 3. Angaben prüfen

Diese Angaben stammen aus der Vorlage und sollten vor dem Livegang einmal
gegengelesen werden — ich konnte sie nicht überprüfen:

- 4,9 Sterne bei über 550 Google-Bewertungen (auch im JSON-LD hinterlegt)
- die drei Zitate im Abschnitt „Stimmen"
- „Kostenlose Straßenparkplätze · Parkplatz Esche-Museum ca. 260 m"
- „Sitzplätze und Außenbereich gibt es auch"
- Öffnungszeiten Mo–Sa 11–21 Uhr, Sonntag geschlossen

Ändern sich die Öffnungszeiten, müssen **drei Stellen** angepasst werden:
die Liste in `index.html` (`<ul class="zeiten">`), das JSON-LD im `<head>`
und die Konstanten `AUF`, `ZU`, `AUF_TAGE` oben in `assets/js/site.js`.

### 4. Für den Livegang

- `<link rel="canonical">` im `<head>` auf die echte Domain setzen
- Impressum und Datenschutzerklärung ergänzen (in Deutschland Pflicht) und
  in der Fußzeile verlinken
- ein Vorschaubild für Social Media (`og:image`) ergänzen

## Technisches

**Öffnungsstatus** — die Kopfzeile und der Hero zeigen live, ob gerade offen
ist, inklusive Restzeit. Gerechnet wird immer in **Europe/Berlin** über
`Intl.DateTimeFormat`, unabhängig davon, wie die Uhr des Besuchers steht.
Aktualisiert sich alle 30 Sekunden.

**Animationen** — GSAP + ScrollTrigger, weich gescrollt mit Lenis:
Masken-Einstieg der Headline, Reveals, Parallax, hochzählende Zahlen, ein
vom Scroll-Tempo getriebenes Laufband und die auf Desktop gepinnte, horizontal
laufende Galerie.

**Abgesichert:**

- ohne JavaScript ist die Seite vollständig lesbar und bedienbar
- `prefers-reduced-motion: reduce` schaltet alle Bewegung ab, Inhalte bleiben
- Tastaturfokus ist überall sichtbar, Sprunglink zum Inhalt vorhanden
- getestet in Chromium auf 1440 px und 390 px, ohne Konsolenfehler und
  ohne waagerechtes Scrollen
