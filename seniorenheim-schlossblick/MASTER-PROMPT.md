# Master-Prompt · Landing Page für ein Alten- und Pflegeheim

> **Wie du das hier benutzt:** Abschnitt 1 ausfüllen, dann den kompletten Text
> (Abschnitt 1 bis 11) als einen Prompt abschicken. Abschnitt 12 ist das ausgefüllte
> Beispiel für den Kunden Schlossblick Rochsburg — als Vorlage, wie tief die
> Recherche gehen soll.
>
> Der Prompt ist bewusst lang. Das ist der Punkt: Jede Zeile, die du hier nicht
> schreibst, erfindet das Modell selbst — und erfindet sie schlechter.

---

## 0 · Rolle und Anspruch

Du bist Art Director und Frontend-Entwickler in einer Person. Du baust eine
Landing Page für ein Alten- und Pflegeheim, die beim ersten Termin überzeugen muss.

Der Maßstab ist nicht „funktioniert" und nicht „sieht ordentlich aus", sondern:
**Ein Angehöriger, der drei Heimseiten nebeneinander offen hat, ruft bei diesem an.**

Drei Dinge, die diese Aufgabe von einer beliebigen Landing Page unterscheiden:

1. **Die Zielgruppe entscheidet unter Druck.** Meist sind es Töchter und Söhne
   zwischen 45 und 65, oft nach einem Sturz oder einer Klinikentlassung, oft mit
   schlechtem Gewissen. Sie brauchen Orientierung, keine Werbung.
2. **Die Seite wird von Menschen mit eingeschränktem Sehvermögen benutzt.** Das ist
   hier kein Sonderfall, sondern der Normalfall.
3. **Es geht um ein reales Unternehmen.** Jede erfundene Zahl ist ein Haftungsrisiko
   und ein verlorener Kunde.

---

## 1 · Kundenbriefing — HIER AUSFÜLLEN

```
Einrichtung .............. [Name genau wie im Handelsregister]
Träger ................... [Trägergesellschaft / Verein / Kommune]
Adresse .................. [Straße, PLZ, Ort, ggf. Ortsteil]
Telefon / Fax / E-Mail ... [...]
Website (Bestand) ........ [URL – als Quelle auswerten, nicht kopieren]

Kapazität ................ [Zahl der Plätze, Einzel-/Doppelzimmer, Etagen]
Zimmerausstattung ........ [Vorraum? eigenes Bad? Größe? Möbel mitbringen?]
Baujahr / Sanierung ...... [...]
Pflegeformen ............. [vollstationär / Kurzzeit / Verhinderung / Tagespflege]
Besondere Angebote ....... [Demenz, gerontopsychiatrisch, beatmet, ...]
Qualitätsergebnis ........ [Prüfnote, Datum, Prüfstelle]

ALLEINSTELLUNGSMERKMAL ... [Das EINE, was dieses Haus von den anderen im
                            Umkreis unterscheidet. Wenn du das nicht in einem
                            Satz sagen kannst, recherchiere weiter, bevor du
                            eine Zeile Code schreibst.]

Lage / Umgebung .......... [Landschaft, Sehenswürdigkeit, ÖPNV, Parkplätze]
Bildmaterial ............. [vorhanden? Rechte geklärt? sonst: SVG bauen]
Tonalität ................ [z. B. warm und sachlich, nie jovial, nie klinisch]
```

**Recherchepflicht vor dem ersten Codezeichen:** Website des Hauses, Pflegedatenbank
des Bundeslandes, BIVA-Heimverzeichnis, Pflegenavigator der Krankenkassen,
Branchenverzeichnisse. Jede Zahl mindestens aus einer Quelle belegen und die Quelle
mitschreiben.

---

## 2 · Die Wahrheitsregel

Das ist die Regel, die über allen anderen steht.

- **Nichts erfinden.** Keine Preise, keine Namen, keine Öffnungszeiten, keine
  Mitarbeiterzahlen, keine Bewertungen, keine Zitate von Angehörigen.
- Nicht belegte Inhalte kommen als **allgemein gehaltener Vorschlagstext** in die
  Seite (etwas, das jedes Haus so unterschreiben kann) und bekommen im Quelltext
  einen `TODO:`-Kommentar.
- Jeder `TODO:` landet zusätzlich in einer Datei **`INHALTE-PRUEFEN.md`** — als
  Checkliste, die man im Kundengespräch Punkt für Punkt durchgeht.
- Gesetzliche Beträge (SGB XI) dürfen genannt werden, aber nur mit sichtbarem
  **Stand-Datum** und in **einem einzigen Config-Objekt** im Code.
- Erfundene Geschäftsführer oder Registernummern im Impressum sind ein
  Abmahnrisiko. Dort stehen ausschließlich markierte Platzhalter.

---

## 3 · Gestaltung

**Zuerst entscheiden, dann bauen.** Benenne die vier Achsen ausdrücklich, bevor
du Code schreibst:

1. **Palette** — 5 bis 7 Hex-Werte, abgeleitet aus dem *tatsächlichen Ort*:
   Fluss, Gestein, Wald, Backstein, Küstenlicht. Nie aus einem Farbgenerator.
2. **Typografie** — eine charaktervolle Display-Schrift (sparsam eingesetzt) plus
   eine ruhige Textschrift. **Fließtext ab 19 px**, Zeilenhöhe ab 1.6.
   *Empfehlung Textschrift: `Atkinson Hyperlegible` — vom Braille Institute für
   Menschen mit Sehbehinderung entworfen. Bei dieser Zielgruppe ist das keine
   Spielerei, sondern das passende Werkzeug.*
3. **Layout** — wo bricht das Raster bewusst? Ein Bruch, nicht fünf.
4. **Signatur** — das EINE Element, an das man sich erinnert.

**Verboten, weil generisch:**

- Creme-Hintergrund (≈ #F4F1EA) + Hochkontrast-Serif + Terrakotta (≈ #D97757)
- Fast-Schwarz mit einer grellen Acid-Akzentfarbe
- Zeitungs-Layout mit Haarlinien und 0 px Radius
- **Und für diese Branche zusätzlich:** Stockfoto-Ästhetik mit lachenden Senioren
  vor weißem Hintergrund, Pastell-Rosa/Hellblau („Seniorenheim-Beige"),
  Herz-und-Hand-Logos, Serifenlose in Hellgrau auf Weiß.

Mindestens **ein bewusstes ästhetisches Risiko** pro Projekt. Benenne es.

---

## 4 · Die Kamerafahrt (das Signatur-Element)

Eine einzige, **ungeschnittene** scroll-gesteuerte Einstellung vom Ortsbild bis
ins Innere des Hauses. Kein Diaschau-Gefühl, keine harten Schnitte.

| Zeit | Szene | Inhalt |
|------|-------|--------|
| 0 | Ort | Das Haus in seiner Landschaft, mit dem ortsbildprägenden Merkmal |
| 1 | Haus | Fassade, Eingang, Rampe, Handläufe, ÖPNV-Anbindung |
| 2 | Foyer | Ankommen: schwellenlos, hell, Orientierung |
| 3 | Zimmer | Das Bewohnerzimmer mit allem, was verifiziert ist |
| 4 | Gemeinschaft | Speisesaal oder Aufenthaltsbereich |
| 5 | Draußen | Garten, Terrasse, Außenanlage — Ende der Fahrt |

**Technik der Verkettung:**

- Jede Szene liegt absolut übereinander und hat einen eigenen
  `transform-origin` — gesetzt auf das **Portal**, durch das die Kamera in die
  nächste Szene fährt (Tür, Fenster, Durchgang).
- Eine Szene skaliert über ihre Lebensdauer **beschleunigend** von 1 auf ca. 2.6
  und blendet am Ende aus. Die nächste blendet **bei Skalierung ≥ 1** darunter auf.
- **Kritisch:** eine einfliegende Szene darf nie kleiner als 1 skaliert sein.
  Sonst sieht man ringsum die alte Szene — der Effekt ist sofort kaputt.
- Gepinnt wird mit CSS `position: sticky`, nicht mit JS. Der Scroll-Fortschritt
  über die Sektion ist die Zeitachse.
- Pro Szene eine Untertitel-Karte mit **einem belegten Fakt**.

---

## 5 · Fotorealismus ohne Fotos

Wenn kein Bildmaterial vorliegt: SVG-Szenen bauen — aber als **Matte Painting**,
nicht als Flat-Illustration. Sechs Techniken, alle sechs anwenden:

1. **Luftperspektive** — 6 bis 8 Tiefenebenen. Ferne Ebenen entsättigt, aufgehellt,
   leicht unscharf. Nahe Ebenen gesättigt und scharf. Dunstbänder dazwischen.
2. **Ein Lichtmodell für die ganze Szene** — eine Sonnenrichtung, konsequent
   durchgehalten. Jede Fläche hat eine Licht- und eine Schattenseite, jedes Objekt
   einen gerichteten weichen Schlagschatten.
3. **Keine flachen Füllungen** — alles mit Mehrstopp-Verläufen. `feTurbulence` +
   `feDisplacementMap` für Laub- und Putzkanten, damit keine Vektorblasen entstehen.
4. **Tiefenschärfe** — unscharfe Vordergrundelemente als Rahmen (Zweige, Gräser).
   Fokuswechsel über Opacity-Crossfade zwischen vorgerenderten Unschärfestufen,
   **niemals** über animierte Filterwerte.
5. **Licht sichtbar machen** — warm leuchtende Fenster mit Bloom, Lichtpfützen auf
   Innenböden, Bounce-Light an Wänden, Kontaktschatten an jeder Möbelkante.
6. **Korn** — ein feines `fractalNoise`-Overlay mit `mix-blend-mode: overlay` über
   die ganze Bühne. Das ist der Schritt, der am meisten „Foto" macht.

**Innenräume in echter Ein-Punkt-Perspektive:** Decke, zwei Seitenwände, Rückwand,
Boden als Polygone auf einen gemeinsamen Fluchtpunkt. Bodenfugen laufen auf diesen
Punkt zu. Die Rückwand trägt das Portal zur nächsten Szene.

**Harte Performance-Regel:** Filter werden einmal statisch gerendert. Animiert
werden ausschließlich `transform` und `opacity`.

---

## 6 · Widgets

Mindestens fünf, alle tastaturbedienbar, alle flüssig animiert:

- **Platzanfrage** — mehrstufig, Fortschrittsanzeige, Live-Validierung,
  Fokusführung zwischen den Schritten, Zusammenfassung vor dem Absenden.
  Versand per `mailto:` — kein Backend, keine Datenweitergabe, kein Auftragsverarbeiter.
- **Besichtigungsplaner** — Wunschtermin → `.ics`-Datei im Browser erzeugt + vorbefüllte Mail.
- **Leistungs-Finder Pflegegrad** — die gesetzlichen SGB-XI-Beträge, mit Stand-Datum
  und dem ausdrücklichen Hinweis, dass der Eigenanteil hausspezifisch ist.
  **Nie** Hauspreise erfinden.
- **Zimmer-Umschalter** — Einzel-/Doppelzimmer mit wechselndem Grundriss.
- **Karte mit Umgebung** — OpenStreetMap über Leaflet, die Bibliothek in die
  Datei eingebettet (kein CDN). Eigene Marker für Heim, Haltestellen und
  Sehenswürdigkeiten, daneben eine Ortsliste als vollwertige Textalternative
  (antippen → Karte fliegt hin). „Mein Standort" nur auf Knopfdruck, Routenlinks
  zu Apple Karten und Google Maps. **Auf dem Telefon verschiebt man die Karte mit
  zwei Fingern, am Rechner zoomt das Mausrad erst nach einem Klick** — sonst
  kapert sie die Kamerafahrt. Eine gezeichnete Lageskizze bleibt als Rückfall
  (ohne JavaScript, ohne Netz, im Druck, aus einer lokalen Datei).
  Koordinaten nur belegt oder aus OSM ermittelt, **nie geschätzt**, und vor dem
  Livegang festschreiben. Die Datenschutzerklärung benennt Kachelserver und
  Suchdienste; ob die Karte ohne Zwei-Klick-Lösung lädt, entscheidet der Kunde.
- **Barrierefreiheits-Panel** — Schriftgröße, Kontrast, Bewegung aus, Vorlesen.
  Einstellungen in `localStorage`.
- **FAQ** — echtes Disclosure-Pattern über `grid-template-rows: 0fr → 1fr`.

---

## 7 · Barrierefreiheit — Pflichtenheft

Nicht „möglichst", sondern Abnahmekriterium:

- WCAG 2.2 **AA** durchgehend, Fließtext **AAA** anstreben.
- Semantisches HTML: `header`, `nav`, `main`, `section`, `footer`, saubere
  Überschriftenhierarchie ohne Sprünge.
- Skip-Link zum Inhalt. **Und ein zweiter Skip-Link, der die Kamerafahrt
  überspringt** — eine 800 vh lange gepinnte Sektion ist für Tastaturnutzer sonst
  eine Falle.
- Jedes Szenen-SVG bekommt `role="img"` und ein `aria-label`, das die Szene
  wirklich beschreibt.
- `:focus-visible` mit mindestens 3 px Kontur, nie `outline: none`.
- Formularfehler mit `aria-invalid`, `aria-describedby`, `aria-live` — und der
  Fokus springt auf das erste fehlerhafte Feld.
- **`prefers-reduced-motion` vollständig bedienen:** die Kamerafahrt wird zur
  ruhig gestapelten Bildstrecke, Bild und Untertitel abwechselnd (`display: contents`
  plus `order` verschränkt die Container). Kein Inhalt geht verloren.
- Kein Autofokus beim Laden.
- Bei 200 % Zoom kein horizontales Scrollen.
- Tap-Ziele mindestens 44 × 44 px.

---

## 8 · Technik

- **Eine einzige `index.html`**, HTML + CSS + JS + SVG inline. Sie lässt sich per
  Doppelklick öffnen, als Datei mailen und auf jeden Hoster ziehen. Für einen
  Pitch ist das mehr wert als eine Ordnerstruktur.
- **Keine externen Bibliotheken.** Die Kamerafahrt ist eine Zeitachse — das sind
  40 Zeilen Vanilla-JS. GSAP, Lenis und Co. sind hier Ballast und zusätzlich
  ein DSGVO-Thema, sobald sie vom CDN kommen. Einzige Ausnahme ist die Karte:
  Leaflet, eingebettet statt vom CDN.
- **Keine Requests an fremde Server** außer den Kartenbildern. Schriften lokal
  ausliefern. Wenn in der Pitch-Fassung noch Google Fonts eingebunden sind, muss
  das in `INHALTE-PRUEFEN.md` als Punkt vor dem Livegang stehen, und die
  Datenschutzerklärung muss es benennen.
- **Inhalt nie nur im Skript.** Zahlen, die hochzählen, stehen als echte Zahl im
  HTML. Das Skript zählt nur, wenn die Zahl ins Bild kommt, und setzt am Ende
  per Zeitgeber garantiert den Endwert. Steht im HTML eine 0, bleibt sie in jeder
  Dateivorschau stehen, in der die Animation nicht läuft.
- IntersectionObserver für Reveals, `requestAnimationFrame` für alles Scroll-Gebundene.
- Nur `transform` und `opacity` animieren.
- Zusätzlich: `impressum.html` und `datenschutz.html` als Gerüst mit markierten
  Platzhaltern — kein Livegang ohne sie.

---

## 9 · Inhaltsaufbau

```
Kopfzeile        sticky, Telefonnummer als dickes Tap-to-Call-Ziel
Hero             über der ersten Szene, Nutzenversprechen in einem Satz,
                 zwei CTAs, drei belegte Vertrauensfakten
Kamerafahrt      sechs Szenen (Abschnitt 4)
Hausvorstellung  Konzept, Lage mit Karte, Geschichte + Zahlen, die hochzählen
Wohnen           Zimmerarten mit Grundriss-Umschalter
Leistungen       Karten-Raster, jede Karte ein belegtes Angebot
Alleinstellung   die eigene Sektion für das, was nur dieses Haus hat
Alltag           ein Tag im Haus, ohne erfundene Uhrzeiten
Widget-Zone      Anfrage + Rechner + Terminplaner
Kontakt          Adresse, Telefon, Karte mit Ortsliste und Routenlinks, FAQ
Fußzeile         Träger, Rechtslinks
```

**Textregeln:** Sie-Ansprache. Kurze Sätze. Keine Superlative. Keine
Pflegefachsprache ohne Erklärung. Nichts Beschönigendes — wer eine Heimseite liest,
hat meist gerade eine schwere Entscheidung vor sich und merkt sofort, wenn ihm
etwas verkauft wird.

---

## 10 · Selbstprüfung vor der Abgabe

Führe diese Prüfungen wirklich aus, statt sie zu behaupten:

1. Seite im Browser rendern und an **jeder** Stufe der Kamerafahrt einen Screenshot
   ansehen. Deckt jede einfliegende Szene den Rahmen vollständig ab?
2. Bei 390 px Breite: horizontaler Überlauf **= 0**. Mit `scrollWidth` messen,
   nicht mit dem Auge. `overflow-x: hidden` versteckt den Fehler, behebt ihn nicht.
3. Bei 200 % Zoom: horizontaler Überlauf **= 0**.
4. 15-mal Tab drücken und die Reihenfolge protokollieren. Ist der Fokusring überall
   sichtbar?
5. Mit `prefers-reduced-motion: reduce` laden: ist **kein** Inhalt unsichtbar?
6. Kontrast jeder Text/Hintergrund-Kombination rechnerisch prüfen.
7. Konsole auf Fehler prüfen — in allen drei Modi.

---

## 11 · Definition of Done

- [ ] Alle Fakten belegt, alle offenen Punkte in `INHALTE-PRUEFEN.md`
- [ ] Kamerafahrt ohne sichtbaren Rand, ohne Ruckler, ohne Sprung
- [ ] Mobil 390 px und 200 % Zoom je 0 px Überlauf
- [ ] Vollständig mit Tastatur bedienbar, Fokus immer sichtbar
- [ ] `prefers-reduced-motion` verliert keinen Inhalt
- [ ] Kontraste AA, Fließtext möglichst AAA
- [ ] Keine Konsolenfehler
- [ ] Impressum und Datenschutz vorhanden, Platzhalter markiert
- [ ] Palette, Schriftpaarung und Signatur sind benannt und begründet
- [ ] Die Seite sieht **an keiner Stelle** unfertig aus

---

## 12 · Ausgefülltes Beispiel — Schlossblick Rochsburg

```
Einrichtung .......... Seniorenheim Schlossblick Rochsburg
Träger ............... BSVS Pflege- und Betreuungs gGmbH
Adresse .............. Schloßstraße 17, 09328 Lunzenau OT Rochsburg
Telefon / Fax ........ 037383 830 / 037383 83400
E-Mail / Web ......... kontakt@sh-schlossblick.de · www.sh-schlossblick.de

Kapazität ............ 44 Einzelzimmer + 8 Doppelzimmer (60 Plätze), zwei Wohnetagen
Zimmerausstattung .... je eigener Vorraum und eigenes Bad mit WC
Baujahr .............. Neubau 1999
Qualitätsergebnis .... Gesamtergebnis der Qualitätsprüfung „sehr gut"

ALLEINSTELLUNGSMERKMAL
  Das Haus wurde 1999 von Anfang an für das integrative Zusammenleben blinder,
  sehbehinderter und sehender Bewohnerinnen und Bewohner konzipiert. Komplett
  barrierefrei, taktile Orientierungshilfen im ganzen Haus, Personal speziell
  für die Arbeit mit blinden und sehbehinderten Menschen geschult.
  (Der Träger geht auf den Blinden- und Sehbehindertenverband Sachsen zurück.)

Lage ................. Tal der Zwickauer Mulde, Blick auf Schloss Rochsburg,
                       Bushaltestelle direkt vor dem Haus
Bildmaterial ......... keines mit geklärten Rechten → SVG-Szenen gebaut
Tonalität ............ warm, ruhig, sachlich; nie jovial, nie klinisch
```

**Daraus abgeleitete Gestaltung:**

| Achse | Entscheidung | Begründung |
|---|---|---|
| Palette | Petrol `#2B6A73`, Lindengrün `#6E9A57`, Honiggold `#D9A441` auf Porzellan `#F8FAF9` | Fluss und Schiefer, Garten, Sandstein im Abendlicht — direkt aus dem Muldental |
| Display | Fraunces | warmer, menschlicher Serif; keine Klinik-Grotesk |
| Text | Atkinson Hyperlegible | vom Braille Institute für sehbehinderte Leser entworfen — inhaltlich wie technisch die richtige Wahl |
| Signatur | die ungeschnittene Kamerafahrt vom Talblick bis auf die Gartenterrasse | macht den Namen „Schlossblick" in drei Sekunden begreifbar |
| Risiko | eine 820 vh lange gepinnte Bildstrecke gleich nach dem Hero | ungewöhnlich für die Branche — deshalb bleibt sie im Kopf. Abgesichert durch Skip-Link und vollwertige Reduced-Motion-Fassung |
