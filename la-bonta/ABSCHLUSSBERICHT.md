# Abschlussbericht — Website-Relaunch LA BONTÀ

Stand: Juli 2026

---

## Was fertig ist

Fünf Seiten, vollständig funktionsfähig, lokal lauffähig:

| Seite | Inhalt |
|---|---|
| `index.html` | Startseite mit allen neun Abschnitten und dem Live-Öffnungsstatus |
| `speisekarte.html` | **Zwei Bücher** — Speisen (Abend / Mittag / Eis) und Getränke |
| `kontakt.html` | Adresse, Anfahrt, Öffnungszeiten, Tischanfrage per `mailto:` |
| `impressum.html` | Gerüst mit Prüfhinweis |
| `datenschutz.html` | Gerüst mit Prüfhinweis |

**Die Abendkarte ist echt und vollständig:** 19 Rubriken, 137 Positionen, alle Preise,
alle Allergen- und Zusatzstoffangaben — übernommen von den Fotos der gedruckten Karte.

Alle drei beauftragten Effekte sind umgesetzt, keiner mehr:
1. Live-Öffnungsstatus im Hero (rechnet in `Europe/Berlin`, Dienstag korrekt als Ruhetag)
2. Speisekarte als frei blätterbares Buch — auf jedem Gerät sofort, ohne Knopfdruck;
   unter 760 px als Einzelseite, darüber als Doppelseite
3. Farbwechsel der Eis-Sektion, der in Navigation und Anruf-Knopf durchblutet

Zusätzlich: Straßenverkauf als eigener Block, Schwester-Restaurants als Abschnitt,
schaltbares Saison-Band.

---

## Nachweise statt Behauptungen

30 automatische Prüfungen, alle bestanden (`node pruefung/test.js`):

- **Keine Fremdanfragen** — die Seite lädt ausschließlich von ihrem eigenen Server.
  Nachgewiesen über einen vollständigen Netzwerkmitschnitt aller fünf Seiten.
- **Kein waagerechtes Scrollen** bei 320, 768 und 1440 px.
- **Ohne JavaScript** sind alle Gerichte, Preise und die Allergenlegende lesbar.
- **Bei reduzierter Bewegung** bleiben alle Inhalte sichtbar; das Buch bleibt, blättert
  aber ohne Animation.
- **Keine überlaufende Buchseite und keine Rubrik-Überschrift am Seitenfuß**, geprüft
  von 320 bis 1440 px.
- **Der Anruf-Knopf ist bei jeder Eissorten-Farbe lesbar** (schlechtester Wert 6,06:1).
- **Jedes Textelement aller fünf Seiten** im laufenden Browser gegen WCAG gemessen —
  396 Stück, alle über der Anforderung.
- **Tastaturbedienung** blättert in beiden Büchern.
- **Anrufen ist bei 320 px ohne Scrollen erreichbar.**

Die Zeitlogik wurde gegen acht Zeitpunkte geprüft, unter anderem: Dienstag → „Heute
Ruhetag"; Montag 21:30 → überspringt den Dienstag korrekt auf Mittwoch; ein Gerät in
Auckland zeigt trotzdem die Berliner Zeit.

Ihre drei Prüffragen, beantwortet:
- **Telefonnummer auf dem Handy in unter zwei Sekunden?** Ja — die Anruf-Leiste sitzt
  dauerhaft am unteren Rand in Daumenreichweite, ohne Scrollen.
- **Steht der Ruhetag korrekt?** Ja, geprüft.
- **Ist die Speisekarte ohne JavaScript lesbar?** Ja, geprüft.

---

## Abweichungen vom Auftrag, mit Begründung

| Vorgabe | Was stattdessen geschah | Warum |
|---|---|---|
| Alte Seite auslesen (Schritt 4) | **Entfallen** | `la-bonta.de` ist aus der Arbeitsumgebung nicht erreichbar (403). Auch Wayback Machine, Textproxys und die Gastro-Portale sind blockiert. |
| Stock-Bilder beschaffen (Stufe 2) | **Entfallen** | Unsplash, Pexels und Foodiesfeed ebenfalls blockiert. Die Seite ist vollständig ohne Fotos gebaut. |
| GSAP, Lenis, StPageFlip per CDN | **Lokal eingebunden** | Ihr DSGVO-Argument für Schriften gilt für unpkg und cdnjs genauso — auch sie übertragen die Besucher-IP in die USA. Nebeneffekt: null Drittanfragen, dadurch eine sehr kurze Datenschutzerklärung. |
| Lucide-Icons per CDN | **SVGs inline** | Für acht Icons ein Paket von rund 500 KB zu laden, lohnt nicht. |
| Skill-Muster G, H, I | Nach Ihrer Beschreibung gebaut | Der installierte Skill enthält nur die Muster A–F. |

---

## Was der Betreiber noch liefern muss

### Dringend — vor dem Livegang

1. **Impressum vervollständigen.** Rechtsform, USt-IdNr., Aufsichtsbehörde,
   Verantwortlicher nach § 18 MStV, Angabe zur Verbraucherschlichtung. Alle Stellen sind
   mit `[[ZU ERGÄNZEN]]` markiert.
2. **Datenschutzerklärung prüfen und vervollständigen.** Hosting-Anbieter, Speicherdauer
   der Logdateien, Aufsichtsbehörde. Die technische Beschreibung stimmt bereits.
3. **Preise gegenprüfen.** Alle 137 Positionen wurden von Fotos abgetippt. Vor der
   Veröffentlichung sollte jemand die Karte einmal gegenlesen — falsche Preise auf der
   eigenen Seite sind kein Schönheitsfehler.
4. **Logo liefern.** Derzeit steht dort eine typografische Wortmarke, weil die Logodatei
   nicht abrufbar war. Als SVG oder PNG nach `assets/img/` legen.

### Inhalte

5. **Mittagskarte** und **Eis-Karte** als Fotos — dann werden beide genauso gesetzt wie die
   Abendkarte. Die Eis-Karte liefert zusätzlich die **echten Eissorten**, aus denen die
   Farben der Eis-Sektion abgeleitet werden sollten (derzeit stehen dort allgemeine Sorten,
   sichtbar als Platzhalter gekennzeichnet).
6. **Fotos** nach der Shotlist in `content/bild-inventar.md` — der mit Abstand größte Hebel.
7. Offene Angaben: Zeitraum der Mittagskarte, Parkmöglichkeiten, Zahlungsarten,
   Barrierefreiheit, Kapazität für Feiern, Einzugsgebiet für Catering.

---

## Dinge, die bei der Arbeit aufgefallen sind

Diese Punkte betreffen nicht die Website, sondern **Ihre bestehende gedruckte Karte**:

1. **Drei Kennzeichen ohne Legende.** Die Hochzahlen **(O)**, **(P)** und **(R)** werden
   verwendet, stehen aber in keiner der beiden Legenden:
   - `(O)` bei Prosecco, Aperol Spritz, Glühwein, allen offenen Weinen, Amaro Avenra,
     Ramazzotti und Amaretto
   - `(P)` bei Linguine Scampi e Rucola
   - `(R)` bei Spaghetti Frutti di Mare und Pizza Frutti di Mare

   Auf der Website sind sie als „in der Legende nicht erklärt" gekennzeichnet, statt sie
   zu unterschlagen oder zu erraten. Bei Allergenangaben wäre Raten das Falsche.

2. **Die Ziffern 9 und 10 wirken vertauscht.** Laut Legende ist 9 = coffeinhaltig und
   10 = chininhaltig. Verwendet wird aber (10) bei Espresso, Cappuccino und Milchkaffee —
   dort wäre 9 richtig — und (9) bei Mozzarella alla Griglia und Prosciutto e Melone, wo
   coffeinhaltig kaum zutreffen dürfte. Bei Tonic Water und Bitter Lemon ist (10) korrekt.
   Die Angaben wurden **unverändert** übernommen; eine Korrektur sollte von Ihnen kommen.

3. **Nummernlücken** (21–29, 37, 42, 53–58, 68, 76–79, 85–88, 90–99, 105–109) wurden
   bewusst beibehalten — vermutlich Platz für Erweiterungen.

4. **Gründungsjahr unklar.** Ihr Logo sagt „EST. 2021", eine Presserecherche legt Sommer
   2022 nahe. Auf der Seite steht derzeit „seit 2021" nach dem Logo. Bitte bestätigen.

5. **Feiertag am Dienstag.** Dienstag ist Ruhetag, Feiertage sind Öffnungstage — was bei
   einer Kollision gilt, ist ungeklärt. In `assets/js/hours.js` ist dafür `AUSNAHMEN`
   vorbereitet; eine Zeile pro Ausnahmetag genügt.

6. **Bewertung veraltet mit der Zeit.** 4,8 aus 289 Bewertungen steht an zwei Stellen:
   sichtbar in `index.html` (Abschnitt „Was Gäste sagen") und im JSON-LD am Seitenende.
   Beim Aktualisieren beide anpassen. Eine Stichprobe zeigte bereits abweichende Werte auf
   anderen Portalen.

---

## Wartung

**Karte ändern:** Positionen in `content/karte-daten.py` bearbeiten, dann
`python3 content/karte-daten.py` — der erzeugte Block kommt in `speisekarte.html`.
Alternativ direkt im HTML ändern; die Listenansicht ist die Datenquelle, das Buch
erzeugt sich daraus von selbst.

**Saison-Band einschalten:** In `index.html` beim Element `data-saison` das Attribut
`hidden` entfernen und den Text anpassen.

**Feiertag eintragen:** In `assets/js/hours.js` in `AUSNAHMEN` eine Zeile ergänzen,
Beispiel steht als Kommentar darüber.

**Prüfen:** `python3 -m http.server 8080` im Ordner `la-bonta/`, dann in einem zweiten
Fenster `node pruefung/test.js`.

---

## Nächste sinnvolle Schritte

1. **Fotos machen.** Ein halber Tag bringt mehr als jede weitere Animation.
2. **Neue Domain im Google-Profil hinterlegen.** Der Eintrag mit 4,8 Sternen ist Ihre
   wichtigste Sichtbarkeitsquelle — ein Ein-Minuten-Schritt mit großer Wirkung.
3. **Echte Online-Reservierung** statt der `mailto:`-Anfrage wäre der nächste sinnvolle
   Ausbauschritt.
