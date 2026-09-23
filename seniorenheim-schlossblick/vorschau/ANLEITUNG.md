# Die Entwürfe zeigen

Zwei vollständige Fassungen der Website, jede eine einzige Datei mit allem
darin — Inhalte, Kamerafahrt, Formulare, Barrierefreiheits-Bedienfeld.

```
index.html                    Auswahlseite mit beiden Entwürfen
variante-a-landingpage.html   Die glänzende Landingpage-Fassung
variante-b-heimseite.html     Die nüchterne Heimseiten-Fassung
```

Unten in jeder Fassung liegt eine Leiste: sie sagt, welcher Entwurf zu sehen
ist, und schaltet mit einem Tipp zum anderen.

---

## Weg 1 · Als Link — der verlässliche Weg für den Termin

**Empfohlen.** Auf dem iPhone kann Safari keine lokalen Dateien öffnen. Über
einen echten Link läuft alles genau so, wie es später live aussieht.

1. Den ganzen Ordner `vorschau` auf **app.netlify.com/drop** ziehen.
   Kein Konto nötig, keine Anmeldung, keine Kosten.
2. Nach wenigen Sekunden erscheint eine Adresse wie
   `https://zufallsname-123abc.netlify.app`.
3. Diese Adresse auf dem iPhone in Safari öffnen. Fertig.

Die Entwürfe tragen `noindex` — Google nimmt sie nicht auf. Wer die Adresse
hat, kann sie aber öffnen. Für einen Kundentermin ist das in Ordnung; vor dem
Weitergeben an Dritte kurz überlegen.

**Tipp:** Die Adresse als Lesezeichen auf den Homebildschirm legen. Dann
startest du im Termin mit einem Tipp und ohne Suchen.

---

## Weg 2 · Als Datei — ohne Netz

Die Dateien per **AirDrop** aufs iPhone schicken oder in **iCloud Drive**
legen, dann in der **Dateien-App** antippen.

**Ehrlich dazugesagt:** iOS öffnet HTML-Dateien nicht in Safari, sondern in
einer Schnellvorschau. Ob die das JavaScript für die Kamerafahrt ausführt,
hängt an der iOS-Version — das lässt sich nicht garantieren.

Beide Dateien sind darauf vorbereitet: Läuft kein JavaScript, wird aus der
Fahrt eine ruhige Bildstrecke — Bild, Text, Bild, Text. **Kein Inhalt geht
verloren**, nur die Bewegung fehlt.

Für den Termin also besser Weg 1, und die Dateien als Rückfall, falls im Heim
kein Netz ist.

---

## Weg 3 · Am Rechner

`index.html` doppelklicken. Läuft in jedem Browser, ohne Server, ohne
Installation. Für die Kamerafahrt mit dem Mausrad langsam scrollen.

---

## Im Termin

- **Querformat** — die Kamerafahrt wirkt deutlich stärker.
- **Langsam scrollen.** Die Fahrt folgt der Scrollbewegung, sie läuft nicht
  von allein. Wer schnell wischt, sieht nur ein Flackern.
- **Wenn es ruckelt:** unten rechts das Rad antippen, bei „Bewegung" auf
  „Aus". Aus der Fahrt werden ruhige Einzelbilder, alles bleibt lesbar. Das
  ist gleichzeitig ein gutes Argument: Die Seite bedient Menschen, denen
  Bewegung unangenehm ist.
- **Zum Zeigen der Barrierefreiheit:** dasselbe Rad, Schriftgröße auf „Sehr
  groß", Kontrast auf „Stark", dann „Abschnitt vorlesen". Bei einem Haus, das
  auf blinde und sehbehinderte Menschen spezialisiert ist, ist das der
  stärkste Moment der ganzen Vorführung.

---

## Wichtig zum Repository

Das Repository `xxneoenxx/Agents` steht auf **öffentlich**. Alle Dateien zu
diesem Projekt sind damit für jeden einsehbar, der die Adresse kennt —
einschließlich der Platzhalter zum Seniorenheim Schlossblick.

Das ist kein Problem für die Arbeit, aber du solltest es wissen, bevor der
Kunde davon erfährt. Wenn dir das unangenehm ist: Repository in den
GitHub-Einstellungen auf privat stellen, oder den Projektordner in ein eigenes
privates Repository verschieben.

---

## Neu erzeugen

Ändert sich etwas an der Website, beide Vorschaudateien neu bauen:

```bash
node vorschau/bauen.js
```

Das Skript holt Variante A aus dem Git-Verlauf (Stand `4fe2596`) und Variante B
aus dem Arbeitsverzeichnis, härtet beide für iOS und setzt die Umschaltleiste
ein. Variante A bleibt dadurch exakt die Fassung von damals und wird nicht
versehentlich mitverändert.
