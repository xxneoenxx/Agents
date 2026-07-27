# Gestaltungsentscheidungen — LA BONTÀ

Jede Entscheidung hat einen Grund aus der Welt des Restaurants, nicht aus einem Katalog.

---

## Der Ausgangspunkt

Drei Dinge machen das Haus aus, und die Gestaltung folgt genau diesen dreien:

1. **Familienbetrieb** — der Ton ist herzlich und bodenständig, nicht Hochglanz.
2. **Restaurant *und* Eiscafé** — das eigene Logo führt „EIS · CAFE" gleichberechtigt neben
   „RISTORANTE ITALIANO". Der Doppelcharakter ist keine Erfindung des Relaunches, sondern
   bereits die eigene Marke. Er wird zum stärksten gestalterischen Mittel.
3. **Sächsischer Altbau trifft italienische Leichtigkeit** — die Spannung, aus der die
   Seite lebt.

---

## Palette

Abgeleitet **aus der Eisvitrine**, nicht aus der Landesflagge. Das ist eigen, hat einen Grund
in der Sache und verbindet beide Seiten des Betriebs.

| Token | Hex | Rolle |
|---|---|---|
| `--petrol-900` | `#0F2B2E` | Grundfläche der ganzen Seite |
| `--petrol-800` | `#14383C` | abgesetzte Flächen, Eingabefelder |
| `--creme` | `#F4EDE0` | Schrift auf dunkel |
| `--creme-dim` | `#C5BCA9` | Nebentexte |
| `--amarena` | `#8E1F3D` | Akzentflächen, Rubrikenlinien im Buch |
| `--amarena-hell` | `#E8899F` | Warnhinweise, Ruhetag, Kennzeichen |
| `--pistazie` | `#A8C66C` | Akzentschrift, Augenbrauen-Zeilen |
| `--pistazie-hell` | `#C8E09A` | Links im Fließtext |
| `--zitrone` | `#E8C547` | Hervorhebung, Bewertung, Fokusrahmen |

**Warum dunkles Petrol als Basis?** Weil es die Abendkarte trägt und weil erst eine
durchgehend dunkle Seite den hellen Bruch der Eis-Sektion wirken lässt. Auf einem hellen
Grundton wäre das Eis nur eine weitere Sektion — so ist es ein Ereignis.

**Warum Creme nie als Fläche?** Creme-Hintergrund plus Serif plus Terrakotta-Akzent ist der
generische Vorgabe-Look, den der Skill ausdrücklich verbietet. Creme bleibt deshalb
konsequent Schriftfarbe.

**Warum bleibt das Logo grün-weiß-rot?** Es ist die eingeführte Marke, Gäste erkennen sie
wieder. Das Klischee-Verbot zielt auf das *Farbschema der Seite*, nicht auf das Signet.
Die Flaggenfarben bleiben deshalb aufs Logo begrenzt und färben nichts anderes ein.

Alle Farbpaare sind rechnerisch gegen WCAG geprüft, nicht geschätzt — der niedrigste Wert
liegt bei 6,06:1, gefordert sind 4,5:1.

---

## Typografie

**Fraunces** (Display) + **Instrument Sans** (Fließtext), beide selbst gehostet.

Fraunces ist eine variable Serif mit den Achsen `SOFT` und `WONK`. Beide werden bewusst
hochgedreht (`SOFT 45`, `WONK 1`): Die Formen werden weicher und die eigenwilligen
Alternativzeichen schalten sich frei. Das ergibt einen warmen, handgemachten Ton — nah an
einer alten Speisekarte, aber ohne in „Bella Italia"-Kalligrafie zu kippen. **Das ist das
eine kalkulierte ästhetische Risiko des Projekts.**

Instrument Sans darunter ist bewusst zurückhaltend. Bei einer Karte mit 135 Positionen und
Pflichtangaben zählt Lesbarkeit mehr als Charakter.

Beide liegen als Variable Font lokal in `assets/fonts/` (zusammen 151 KB) und werden per
`@font-face` eingebunden — **nicht** über die Google-Fonts-CDN, weil dabei die IP-Adresse
jedes Besuchers an Google ginge.

---

## Die drei Effekte

Strikt drei, keiner mehr. Reveals und dezenter Parallax zählen als Grundausstattung.

### 1 · Live-Öffnungsstatus (Muster H) — im Hero, ohne Scrollen sichtbar

Beantwortet die häufigste Gästefrage sofort. **Nützlich statt dekorativ** — das ist der
Grund, warum dieser Effekt einen der drei Plätze bekommt und nicht etwas Hübscheres.

Gerechnet wird immer in `Europe/Berlin`, nie in der Zeitzone des Besuchers. Sonst zeigt die
Seite jemandem, der aus dem Urlaub anfragt, einen falschen Status. `AUSNAHMEN` in
`hours.js` nimmt Feiertage auf, sobald die Regelung geklärt ist.

### 2 · Speisekarte als aufklappbares Buch (Muster G) — eigene Seite

Das Schaustück. Man blättert in einer Karte, statt eine Webseite herunterzuscrollen — das
passt zum traditionsreichen Haus. Umgesetzt mit StPageFlip, frei blätterbar per Maus,
Wischgeste und Tastatur.

**Zwei getrennte Bücher:** eines für Speisen (Abend / Mittag / Eis umschaltbar), eines für
Getränke. Wer die Weinkarte sucht, soll nicht durch 60 Speisen blättern müssen.

Die Listenansicht im HTML ist die **einzige Datenquelle**; die Buchseiten werden daraus
geklont und durch echte Messung umbrochen, nicht nach fester Stückzahl. Dadurch können
Liste und Buch nie auseinanderlaufen, und ohne JavaScript bleibt die Karte vollständig
lesbar. Unter 760 px wird das Buch gar nicht erst gebaut.

### 3 · Farbwechsel in der Eis-Sektion (Muster I) + Durchfärbung als Signatur

Die Eis-Sektion ist der helle Bruch in einer dunklen Seite. Beim Durchscrollen wechselt
ihre Fläche durch die Farben der Eisvitrine.

**Die Signatur:** Dieselbe Farbe blutet über `--gelato` und `--gelato-ink` in Navigation,
Markenzeichen und Anruf-Knopf durch. Beim Scrollen fühlt es sich an, als führe man durch
die Vitrine. Das macht aus Effekt 3 das Erinnerungsstück, statt einen vierten Effekt zu
erfinden.

Fläche und Schrift kommen immer als **geprüftes Paar** — deshalb kann der Anruf-Knopf die
wechselnde Farbe gefahrlos mittragen. Eine automatische Prüfung misst das bei jedem
Testlauf nach; ein früher Fehler an genau dieser Stelle hatte den Knopf auf 1,06:1
gedrückt und praktisch unsichtbar gemacht.

**Ausdrücklich nicht verwendet:** Three.js-Partikel-Hero (zu kalt und technisch für ein
Familienrestaurant), gepinntes horizontales Scrollen, Marquee.

---

## Was bewusst fehlt

- **Keine Fotos.** Es lag kein verwendbares eigenes Bildmaterial vor, und Stock-Bilder
  waren technisch nicht beschaffbar. Jede Sektion ist deshalb so gebaut, dass sie ohne
  Bild vollständig funktioniert. Bildplätze haben festes Seitenverhältnis und sind
  gestaltete Flächen, keine grauen Kästen.
- **Keine eingebettete Karte.** Eine Google-Maps-Einbettung überträgt die Besucher-IP
  ungefragt. Stattdessen Textwegbeschreibung und ein Link, der erst auf Klick lädt.
- **Keine CDN.** GSAP, Lenis und StPageFlip liegen lokal. Damit löst die Seite null
  Anfragen an Dritte aus — nachgewiesen im Testlauf.
