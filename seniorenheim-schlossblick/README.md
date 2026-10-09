# Seniorenheim Schlossblick Rochsburg — Landing Page

Eine Landing Page für das Seniorenheim Schlossblick Rochsburg
(Träger: BSVS Pflege- und Betreuungs gGmbH).

## Was hier drin ist

| Datei | Inhalt |
|---|---|
| `index.html` | Die komplette Seite — HTML, CSS, JavaScript und alle Grafiken in einer Datei |
| `impressum.html` | Impressum, Pflichtangaben als markierte Platzhalter |
| `datenschutz.html` | Datenschutzerklärung, beschreibt exakt das tatsächliche Verhalten der Seite |
| `MASTER-PROMPT.md` | Der wiederverwendbare Master-Prompt für das nächste Heim |
| `INHALTE-PRUEFEN.md` | Checkliste für das Kundengespräch und den Livegang |

## Ansehen

`index.html` doppelklicken. Mehr ist nicht nötig — die Seite braucht keinen Server,
keinen Build-Schritt und keine Installation.

Einzige Ausnahme sind die **Karten**: Aus einer lokalen Datei zeigt die Seite
statt der Live-Karte die gezeichnete Skizze (warum, steht unter „Karten").
Zum Ausprobieren im Ordner `python3 -m http.server` starten und
`http://localhost:8000` öffnen.

## Veröffentlichen

Die drei HTML-Dateien in ein beliebiges Webspace-Verzeichnis kopieren. Fertig.
Funktioniert auf jedem Hoster, auch auf dem billigsten Shared-Webspace.

**Vorher unbedingt `INHALTE-PRUEFEN.md` abarbeiten** — dort stehen die Punkte,
die nur der Träger beantworten kann, und die rechtlichen Pflichtangaben.

## Wie die Seite gebaut ist

**Keine Frameworks, keine externen Skripte.** Die einzige Bibliothek ist
Leaflet für die Karten, und die steckt in der Datei selbst, nicht auf einem CDN.
Von fremden Servern kommen genau zwei Dinge: die Schriften von Google Fonts (die
sollen vor dem Livegang weg, Punkt 8 der Checkliste) und die Karte von
OpenStreetMap (Punkt 9). Kein Cookie-Banner, kein Consent-Tool; was die Karte
lädt, beschreibt die Datenschutzerklärung in Abschnitt 8.

**Die Kamerafahrt** ist das Herzstück: eine einzige, ungeschnittene Einstellung vom
Blick über das Muldental bis auf die Gartenterrasse. Sechs Szenen liegen übereinander;
jede hat ihren Zoom-Mittelpunkt auf dem Portal, durch das die Kamera in die nächste
Szene fährt — Haustür, Durchgang, Fenster, Terrassentür. Gepinnt wird mit CSS
`position: sticky`; der Scroll-Fortschritt über die Sektion ist die Zeitachse.
Das sind rund 40 Zeilen JavaScript.

**Die Grafiken** sind handgezeichnete SVGs, keine Fotos und keine KI-Bilder. Sie
arbeiten mit Luftperspektive, einem durchgehenden Lichtmodell, Turbulenz-Texturen
für Laub und Putz, Tiefenschärfe im Vordergrund und einem Filmkorn-Overlay. Sie
skalieren auf jedem Display scharf und laden sofort.

**Barrierefreiheit** ist bei diesem Haus kein Beiwerk: Das Gebäude wurde 1999 von
Anfang an für blinde und sehbehinderte Bewohnerinnen und Bewohner gebaut. Die Seite
hält sich daran:

- Fließtext ab 19 px, Textschrift ist *Atkinson Hyperlegible* vom Braille Institute
- vollständig mit der Tastatur bedienbar, Fokusring überall sichtbar
- zwei Skip-Links: zum Inhalt und an der langen Bildstrecke vorbei
- Bedienfeld für Schriftgröße, Kontrast, Bewegung und Vorlesen
- bei `prefers-reduced-motion` wird die Kamerafahrt zur ruhigen Bildstrecke,
  Bild und Text abwechselnd — es geht kein Inhalt verloren
- kein horizontales Scrollen bei 390 px Breite und bei 200 % Zoom

## Etwas ändern

Alles steckt in `index.html`, in kommentierte Blöcke gegliedert. Die wichtigsten
Stellen:

- **Farben und Schriftgrößen** — `:root` ganz oben im `<style>`-Block
- **Länge der Kamerafahrt** — `--flight-len` (Standard 820vh, mobil 560vh)
- **Zoom-Mittelpunkte der Szenen** — `.scene--1` bis `.scene--6`
- **Leistungsbeträge der Pflegekasse** — Objekt `SGB` im Skriptabschnitt 8
- **Die Szenen selbst** — die sechs `<div class="scene">`-Blöcke im `<main>`

## Karten

Zwei Karten, eine Komponente: **„Lage"** im Abschnitt Das Haus (Heim und
Sehenswürdigkeiten) und **„Anfahrt"** im Kontakt, dort mit Ortsliste,
„Mein Standort" und Routenlinks zu Apple Karten und Google Maps.

- **Kartenbilder** kommen von OpenStreetMap, die Bibliothek (Leaflet 1.9.4,
  BSD-Lizenz) ist eingebettet — Blöcke `KARTE:LIB-CSS`, `KARTE:CSS`,
  `KARTE:HAUS`, `KARTE:KONTAKT` und `KARTE:JS` in `index.html`.
- **Die Positionen:** Belegt war beim Bau nur das Schloss. Heim, Haltestellen,
  Kirche und Hängebrücke sucht die Karte selbst in OpenStreetMap (Overpass,
  als Rückfall Nominatim) und speichert sie 30 Tage im Browser. Was nicht
  gefunden wird, bekommt **keinen** Pin — geraten wird nichts.
- **Namen und Beschreibungen** der Orte stehen im HTML, in der Ortsliste im
  Kontakt (`data-ort`). Die Karte liest sie von dort.
- **Verhalten:** Die Karten laden erst, wenn man in ihre Nähe scrollt. Auf dem
  Telefon verschiebt man sie mit zwei Fingern — ein Finger scrollt weiter die
  Seite, sonst bliebe man in der Karte hängen. Am Rechner zoomt das Mausrad erst
  nach einem Klick in die Karte.
- **Rückfälle:** Ohne JavaScript, ohne Netz und im Druck steht die gezeichnete
  Skizze. Aus einer lokalen Datei ebenfalls: Der Browser schickt dann keine
  Herkunftsangabe mit, und die verlangen die Nutzungsregeln der OSM-Kachelserver.

**Vor dem Livegang festschreiben.** Seite über ihre Adresse öffnen, die
Browser-Konsole aufmachen und nach „Karte: Orte aus OpenStreetMap ermittelt"
suchen. Dort steht je Ort eine Zeile mit `lat` und `lon`. Pins auf der Karte
prüfen, dann die Werte in `index.html` in die Liste `var ORTE = [` eintragen
(beim Schloss steht das Muster). Sind alle Orte eingetragen, fragt die Seite
keine Suchdienste mehr ab; dann in der Datenschutzerklärung den zweiten Absatz
von Abschnitt 8 und den Karten-Zusatz in Abschnitt 5 streichen. Danach
`node vorschau/bauen.js`, damit die Vorschau mitzieht.

## Go-Live-Schalter

Die Seite liegt derzeit auf einer Vorschau-Adresse und ist für Suchmaschinen
gesperrt. Beim Umzug auf die echte Domain sind es **drei Handgriffe**:

**1 · Domain eintragen.** In allen Dateien den Platzhalter ersetzen:

```bash
grep -rl 'VORSCHAU-DOMAIN.example' . \
  | xargs sed -i 's|VORSCHAU-DOMAIN.example|ihre-domain.de|g'
```

**2 · Sperre lösen.** In `index.html`, `impressum.html` und `datenschutz.html`
jeweils die eine Zeile löschen, die so endet:

```html
<meta name="robots" content="noindex, nofollow"><!-- ← BEIM GO-LIVE LÖSCHEN -->
```

**3 · `robots.txt` umstellen.** Oberen Block löschen, unteren einkommentieren,
Sitemap-Adresse eintragen. Danach in `sitemap.xml` noch die `<lastmod>`-Daten
auf den Veröffentlichungstag setzen.

Prüfen lässt sich das Ergebnis mit dem Rich-Results-Test von Google
(strukturierte Daten) und dem Sharing Debugger von Facebook (Vorschaubild).

## Vorschaubild fürs Teilen

`og-image.jpg` ist das Bild, das bei WhatsApp, Facebook, LinkedIn oder Signal
erscheint, wenn jemand den Link verschickt. Es wird aus `og-card.html` gerendert:

```bash
npm install playwright && npx playwright install chromium
node og-render.js
```

Neu rendern, sobald die Schriften lokal eingebunden sind — sonst steht die Karte
in der Systemschrift statt in Fraunces.

## Schriften lokal ausliefern

Neben der Karte der einzige Abruf von fremden Servern. Die vollständige
Anleitung steht als Kommentar oben im `<style>`-Block von `index.html`; kurz
gefasst:

1. `Fraunces` und `Atkinson Hyperlegible` herunterladen (beide SIL Open Font
   License, Self-Hosting ausdrücklich erlaubt)
2. `.woff2`-Dateien nach `fonts/` legen
3. Den `<link>` auf Google Fonts und die beiden `preconnect`-Zeilen löschen
4. Den vorbereiteten `@font-face`-Block einkommentieren
5. Abschnitt 7 der Datenschutzerklärung auf die Self-Hosting-Variante umstellen

Danach kommt von fremden Servern nur noch die Karte.

## Drucken

Die Seite hat eine eigene Druckfassung: Kontakt und Eckdaten zuerst, ein Bild
statt der Bildstrecke, die Skizzen statt der Live-Karten, FAQ aufgeklappt,
alles Interaktive ausgeblendet, Links mit ausgeschriebener Adresse. Angehörige drucken solche Seiten wirklich aus —
meist, um die Nummer am Küchentisch liegen zu haben.

## Fotos einsetzen

Die sechs Szenen der Bildstrecke sind **echte `<img>`-Elemente** mit den
Zeichnungen als Rückfallebene. Legst du eine Datei mit dem passenden Namen in
`fotos/`, ersetzt sie die Zeichnung sofort — die Kamerafahrt zoomt das Foto
genauso wie vorher die Grafik, und der Hinweis „Illustration · Fotos folgen"
oben links verschwindet automatisch.

```
fotos/01-tal.jpg          Das Haus in der Landschaft
fotos/02-haus.jpg         Das Haus von der Schloßstraße
fotos/03-foyer.jpg        Foyer mit Empfang
fotos/04-zimmer.jpg       Ein Bewohnerzimmer
fotos/05-speisesaal.jpg   Speisesaal
fotos/06-garten.jpg       Terrasse und Garten
```

Querformat 16:9, mindestens 1920 × 1080, JPEG unter 400 KB. Motive, Lichtwahl
und die rechtlichen Hinweise stehen in `fotos/README.md`.

**Keine Code-Änderung nötig.** Auch einzelne Fotos funktionieren: Wo eines
liegt, erscheint es; wo keines liegt, bleibt die Zeichnung.

## Vorschau für den Kundentermin

Im Ordner `vorschau/` liegen **beide Entwürfe** als je eine in sich geschlossene
Datei, dazu eine Auswahlseite:

```
vorschau/index.html                    Auswahlseite
vorschau/variante-a-landingpage.html   Die glänzende Landingpage-Fassung
vorschau/variante-b-heimseite.html     Die nüchterne Heimseiten-Fassung
vorschau/ANLEITUNG.md                  Wie du sie aufs iPhone bekommst
```

Unten in jeder Fassung liegt eine Leiste mit dem Namen des Entwurfs und einem
Umschalter zur anderen Variante.

**Auf dem iPhone:** Safari kann keine lokalen Dateien öffnen. Der verlässliche
Weg ist ein Link — Ordner `vorschau` auf `app.netlify.com/drop` ziehen, kein
Konto nötig, Adresse erscheint sofort. Als Rückfall ohne Netz lassen sich die
Dateien per AirDrop übertragen und in der Dateien-App antippen; ob die
Schnellvorschau dort die Kamerafahrt zeigt, hängt an der iOS-Version. Beide
Dateien sind darauf vorbereitet und bleiben ohne JavaScript vollständig lesbar
— aus der Fahrt wird dann eine ruhige Bildstrecke, aus der Karte die Skizze.
**Die Live-Karten und „Mein Standort" gibt es nur über den Link.**

Details stehen in `vorschau/ANLEITUNG.md`.

**Neu erzeugen** nach Änderungen an der Website:

```bash
node vorschau/bauen.js
```

Variante A kommt dabei aus dem Git-Verlauf (Stand `4fe2596`) und bleibt
dadurch die Fassung von damals. Sie bekommt nur Funktionskorrekturen: die
echten Zahlen im Abschnitt Das Haus (vorher stand dort in der Dateivorschau
überall 0) und die Karten, die das Skript aus `index.html` übernimmt.
Außerdem kopiert es Impressum und Datenschutzerklärung in den Ordner.
