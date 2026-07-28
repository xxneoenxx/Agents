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

**Konsequent schwarz-weiß.** Die einzige Farbe der ganzen Seite steckt in der Eis-Sektion.

| Token | Hex | Rolle |
|---|---|---|
| `--schwarz-900` | `#0B0B0B` | Grundfläche der ganzen Seite |
| `--schwarz-800` | `#161615` | abgesetzte Flächen, Eingabefelder |
| `--weiss` | `#F7F6F3` | Schrift, Knopfflächen, Akzent |
| `--weiss-dim` | `#A6A4A0` | Nebentexte, Zweitrangiges |
| `--linie` | `rgba(247,246,243,.15)` | Trennlinien und Rahmen |

**Warum kein Reinschwarz und kein Reinweiß?** `#000` auf `#FFF` wirkt hart und klinisch.
Beide Werte sind minimal ins Warme gerückt — gerade so viel, dass die Fläche ruhig wirkt
und zu den Eissorten passt, wenn sie auftauchen. Ein Neutral, das gewählt ist, nicht geerbt.

**Warum die Eis-Sektion Farbe behält.** Wäre auch sie grau, verlöre Effekt 3 seinen Sinn und
der Doppelcharakter Restaurant/Eiscafé seinen sichtbaren Träger. Vor Schwarz-Weiß wirkt der
Farbeinbruch ungleich stärker als vorher vor Petrol: Man scrollt durch eine strenge,
monochrome Seite — und fällt mitten hinein in die Eisvitrine.

**Farbe kann keinen Zustand mehr tragen.** Der Öffnungsstatus zeigt „geöffnet" deshalb als
gefüllten Punkt und „geschlossen" als hohlen Ring. Das ist für farbenblinde Gäste eindeutig,
was eine Grün-Rot-Ampel nie war. Dasselbe Prinzip in der Wochentabelle: Der heutige Tag
steht in Weiß und halbfett, alles andere gedämpft — Gewicht statt Farbe.

**Links haben keine eigene Farbe mehr.** Die Unterstreichung übernimmt die Kennzeichnung
vollständig; beim Überfahren wird sie dicker statt bunt.

Alle Paare sind rechnerisch geprüft, nicht geschätzt: Weiß auf Schwarz erreicht 18,2:1,
gedämpftes Weiß 7,9:1, die schwächste Eissorten-Kombination 6,06:1. Eine Prüfung misst
zusätzlich **jedes** Textelement aller fünf Seiten im laufenden Browser — 396 Stück,
alle über der Anforderung.

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

**Die Karte ist ein Buch, kein Knopf, der eines öffnet.** Sie erscheint auf jedem Gerät
sofort als Buch. Unter 760 px blättert sie als **Einzelseite** statt als Doppelseite —
zwei Seiten nebeneinander wären auf einem Handy nur rund 170 px breit und damit
unlesbar. Bei „Bewegung reduzieren" bleibt das Buch und blättert ohne Animation.

**Zwei getrennte Bücher:** eines für Speisen (Abend / Mittag / Eis umschaltbar), eines für
Getränke. Wer die Weinkarte sucht, soll nicht durch 60 Speisen blättern müssen.

Die Listenansicht im HTML ist die **einzige Datenquelle**; die Buchseiten werden daraus
geklont und durch echte Messung umbrochen, nicht nach fester Stückzahl. Dadurch können
Liste und Buch nie auseinanderlaufen, und ohne JavaScript bleibt die Karte vollständig
lesbar. Wer lieber scrollt, schaltet über einen Umschalter auf die Liste — der Weg *zum*
Buch führt aber über keinen Knopf.

### 3 · Farbwechsel in der Eis-Sektion (Muster I) + Durchfärbung als Signatur

Die Eis-Sektion ist der **einzige farbige Bereich einer sonst schwarz-weißen Seite**. Beim
Durchscrollen wechselt ihre Fläche durch die Farben der Eisvitrine.

**Die Signatur:** Dieselbe Farbe blutet über `--gelato` und `--gelato-ink` in Navigation,
Markenzeichen und Anruf-Knopf durch — außerhalb der Sektion stehen diese auf Weiß, die
Farbe taucht also nur auf, solange man in der Vitrine ist. Beim Scrollen fühlt es sich an,
als führe man hindurch. Das macht aus Effekt 3 das Erinnerungsstück, statt einen vierten Effekt zu
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
