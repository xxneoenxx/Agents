# Checkliste vor dem Livegang

Diese Liste gehst du **mit dem Kunden** durch. Alles, was hier steht, ist entweder
eine Annahme, ein Vorschlagstext oder eine Pflichtangabe, die nur der Träger liefern kann.

Zwei Kategorien:

- 🟢 **Belegt** — aus öffentlich zugänglichen Quellen; trotzdem bestätigen lassen.
- 🟠 **Offen** — von uns formuliert oder noch gar nicht bekannt. **Muss** geklärt werden.

---

## 1 · Stammdaten 🟢

| Angabe | Wert auf der Seite | bestätigt |
|---|---|:--:|
| Name der Einrichtung | Seniorenheim Schlossblick Rochsburg | ☐ |
| Träger | BSVS Pflege- und Betreuungs gGmbH | ☐ |
| Straße | Schloßstraße 17 | ☐ |
| PLZ / Ort | 09328 Lunzenau OT Rochsburg | ☐ |
| Telefon | 037383 830 | ☐ |
| Fax | 037383 83400 | ☐ |
| E-Mail | kontakt@sh-schlossblick.de | ☐ |
| Einzelzimmer | 44 | ☐ |
| Doppelzimmer | 8 | ☐ |
| Plätze gesamt | 60 (44 + 2×8 — **Rechnung bestätigen lassen**) | ☐ |
| Wohnetagen | zwei | ☐ |
| Zimmerausstattung | eigener Vorraum, eigenes Bad mit WC | ☐ |
| Baujahr | Neubau 1999 | ☐ |
| Qualitätsergebnis | „sehr gut" — **Datum und Prüfstelle fehlen noch** | ☐ |
| ÖPNV | Haltestelle „Rochsburg Blindenheim" direkt vor dem Haus, Linie 664 — siehe Punkt 9 | ☐ |
| Weitere Haltestelle | „Rochsburg Parkplatz", Linien 629, 663 und 664 — siehe Punkt 9 | ☐ |

> Die Zahl **60 Plätze** ist von uns aus 44 + 8 Doppelzimmern hergeleitet, nicht
> direkt belegt. Falls Doppelzimmer teilweise einzeln belegt werden, stimmt sie nicht.
> **Unbedingt nachfragen.**

## 2 · Leistungen 🟠

- [ ] Beschreibungstexte der sechs Leistungskarten freigeben
- [ ] Wird **Kurzzeitpflege** angeboten? Wenn ja: als Karte ergänzen
- [ ] Wird **Verhinderungspflege** angeboten?
- [ ] Wird **Tagespflege** angeboten?
- [ ] Welche **Pflegegrade** werden aufgenommen?
- [ ] Gibt es einen **beschützenden Bereich** für Menschen mit Demenz?
- [ ] Rechtsgrundlage der zusätzlichen Betreuung prüfen: Die Seite nennt **§ 43b SGB XI**.
      Der alte Text des Hauses spricht von § 87b — das ist die vor 2017 gültige Norm.
      Bitte bestätigen, dass § 43b korrekt ist.

## 3 · Alltag 🟠

- [ ] Die fünf Abschnitte in „Ein Tag, der Ihnen gehört" sind **allgemeine
      Vorschlagstexte ohne Uhrzeiten**. Durch die tatsächlichen Abläufe ersetzen.
- [ ] Besuchszeiten: Gibt es feste? Auf der Seite steht bisher keine.
- [ ] Zeitfenster im Besichtigungsplaner (10:00 / 14:00 / 15:00 / 16:00)
      durch die tatsächlichen Zeiten ersetzen.

## 4 · Häufige Fragen 🟠

- [ ] Alle fünf Antworten von der Heimleitung gegenlesen lassen
- [ ] Insbesondere: „Können Ehepaare zusammen einziehen?" — stimmt die Aussage?
- [ ] Fehlt eine Frage, die am Telefon ständig gestellt wird? Dann aufnehmen.

## 5 · Leistungsbeträge der Pflegekasse 🟠

- [ ] Die Werte im Rechner stehen auf **Stand 01.01.2025**:
      Pflegegrad 1: 131 € (Entlastungsbetrag) · PG 2: 805 € · PG 3: 1.319 € ·
      PG 4: 1.855 € · PG 5: 2.096 €
- [ ] **Auf Aktualität prüfen** und bei Änderung im Code an einer Stelle anpassen:
      `index.html` → Abschnitt „8 · Leistungsbeträge der Pflegekasse", Objekt `SGB`.
      Das Datum im Badge darüber mitziehen.
- [ ] Der Eigenanteil des Hauses wird **bewusst nicht** genannt. Falls er genannt
      werden soll: Pflegesatz, Unterkunft und Verpflegung, Investitionskosten und
      Ausbildungsumlage getrennt ausweisen, mit Stand-Datum.

## 6 · Impressum 🟠 — ohne das kein Livegang

In `impressum.html` sind alle Platzhalter mit gelbem Hintergrund markiert:

- [ ] Name der Geschäftsführung
- [ ] Registergericht und HRB-Nummer
- [ ] USt-IdNr. (oder Abschnitt streichen)
- [ ] Zuständige Aufsichtsbehörde / Heimaufsicht
- [ ] Berufsrechtliche Angaben (oder Abschnitt streichen)
- [ ] Inhaltlich Verantwortlicher nach § 18 Abs. 2 MStV
- [ ] Bereitschaft zur Verbraucherschlichtung: ja oder nein

## 7 · Datenschutz 🟠 — ohne das kein Livegang

In `datenschutz.html`, ebenfalls markiert:

- [ ] Datenschutzbeauftragte Person benennen
- [ ] Hosting-Anbieter mit Anschrift, Auftragsverarbeitungsvertrag vorhanden?
- [ ] Speicherfrist der Server-Logfiles beim Hoster erfragen
- [ ] Anschrift des Sächsischen Datenschutzbeauftragten ergänzen
- [ ] Stand-Datum eintragen
- [ ] **Schriften-Abschnitt entsprechend Punkt 8 anpassen**
- [ ] **Abschnitt 8 (Karte) prüfen lassen:** Die Karte lädt ohne vorherige
      Zustimmung, sobald man in ihre Nähe scrollt. So entschieden, das kleine
      Restrisiko ist bekannt. Mitprüfen: Angemessenheitsbeschluss für das
      Vereinigte Königreich, Anschrift der OpenStreetMap Foundation, Betreiber
      der Overpass API
- [ ] Gesamten Text juristisch prüfen lassen

## 8 · Schriften lokal ausliefern 🟠

Neben der Karte (Punkt 9) lädt die Seite nur noch die beiden Schriften von
Google Fonts von fremden Servern. Damit geht die IP-Adresse jedes Besuchers an
Google — in Deutschland abmahnrelevant (LG München I, Az. 3 O 17493/20).

- [ ] `Fraunces` und `Atkinson Hyperlegible` herunterladen (beide SIL Open Font License,
      kommerzielle Nutzung und Selbst-Hosting ausdrücklich erlaubt)
- [ ] Als `.woff2` neben `index.html` legen
- [ ] Den `<link>` auf Google Fonts durch `@font-face`-Regeln mit
      `font-display: swap` ersetzen
- [ ] Abschnitt 7 der Datenschutzerklärung auf die Selbst-Hosting-Variante umstellen

Danach kommt von fremden Servern nur noch die Karte.

## 9 · Karten 🟠 — einmal auf einem echten Gerät ansehen

Belegt ist nur die Lage des Schlosses (Wikipedia, Mapcarta). Alle anderen Orte
sucht die Karte beim ersten Aufruf selbst in OpenStreetMap. Ob sie dort
eingetragen sind und wie genau, ließ sich beim Bau nicht prüfen. Findet sie
einen Ort nicht, erscheint **kein** Pin; der Eintrag in der Ortsliste bleibt
stehen.

- [ ] Die Seite über ihre Adresse öffnen (nicht als Datei) und die Pins prüfen:
      Heim, Haltestelle Blindenheim, Haltestelle Parkplatz, Kirche, Hängebrücke
- [ ] **Festschreiben:** Die Browser-Konsole gibt einen fertigen Block mit den
      gefundenen Koordinaten aus. Nach der Prüfung in `index.html` in die Liste
      `var ORTE = [` eintragen (Anleitung im README unter „Karten"). Danach fragt
      die Seite keine Suchdienste mehr ab, und die Datenschutzerklärung wird kürzer
- [ ] Fehlt ein Ort in OpenStreetMap: dort eintragen (der saubere Weg, hilft
      auch allen anderen Karten) oder die Koordinaten vor Ort bestimmen und
      festschreiben — **nicht schätzen**
- [ ] **Ist „Rochsburg Blindenheim" die Haltestelle vor dem Haus?** Das ist
      unser Schluss aus dem Namen, nicht belegt
- [ ] **Linien** mit dem aktuellen VMS-Fahrplan abgleichen. Stand der Recherche
      September 2026: Blindenheim Linie 664, Parkplatz Linien 629, 663 und 664
- [ ] Texte der Ortsliste freigeben: Schloss mit Museum auf dem Felssporn,
      Kirche spätromanisch und 1195 erstmals erwähnt, Hängebrücke 2010/11 neu
      gebaut
- [ ] Sobald die Position des Heims bestätigt ist: dieselben Koordinaten als
      `geo` in die strukturierten Daten übernehmen (Punkt 13)

## 10 · Bildmaterial 🟠 — optional, aber der größte Hebel

Alle Szenen sind eigens gezeichnete Vektorgrafiken. Das funktioniert, sieht
absichtlich gut aus und kostet nichts. Trotzdem:

- [ ] Gibt es Fotos vom Haus, den Zimmern, dem Garten, dem Team?
- [ ] Sind die Rechte geklärt (Fotograf, abgebildete Personen)?
- [ ] **Einwilligung nach Art. 6 DSGVO für jede erkennbare Person**, besonders bei
      Bewohnerinnen und Bewohnern — bei eingeschränkter Geschäftsfähigkeit über
      die Betreuung
- [ ] Wenn Fotos kommen: Team-Sektion ergänzen. Sie fehlt bisher bewusst, weil
      eine Team-Sektion mit Platzhalter-Personen schlechter wirkt als gar keine.

## 11 · Die neuen Abschnitte 🟠 — das meiste davon klärt ein Telefonat

**Ansprechpartner (Abschnitt 06)**
- [ ] Namen für Heimleitung, Pflegedienstleitung, Sozialdienst und Verwaltung
- [ ] Gibt es Durchwahlen? Dann statt der Zentrale eintragen.
- [ ] Stimmt die Spalte „Wofür zuständig" für dieses Haus?

**Aufnahme und Anmeldung (Abschnitt 07)**
- [ ] Läuft die Aufnahme tatsächlich in diesen vier Schritten ab?
- [ ] Welche Unterlagen werden wirklich verlangt?
- [ ] Die vier PDFs besorgen: Anmeldeformular, Hausprospekt, Speiseplan,
      Muster-Heimvertrag. Bis dahin steht dort „Datei folgt".

**Träger und Qualität (Abschnitt 08)**
- [ ] Registereintrag der gGmbH
- [ ] Mitgliedschaften (Paritätischer, Diakonie, AWO oder keine)
- [ ] Datum und Prüfstelle des Ergebnisses „sehr gut"
- [ ] Link auf den Transparenzbericht

**Arbeiten im Schlossblick**
- [ ] **Vorher abstimmen:** Sucht das Haus überhaupt Personal, und sind
      Initiativbewerbungen erwünscht? Wenn nicht, fliegt das Band raus.
- [ ] Wenn ja: offene Stellen und Ansprechpartner für Bewerbungen

**Besuchszeiten und Anfahrt (Abschnitt 10)**
- [ ] Besuchszeiten werktags, am Wochenende und an Feiertagen
- [ ] Muss ein Besuch angemeldet werden?
- [ ] Buslinie und Haltestelle: siehe Punkt 9
- [ ] Anzahl der Parkplätze am Haus

## 12 · Fotos 🟠 — der größte Hebel überhaupt

Die sechs Szenen der Bildstrecke sind **Zeichnungen als Platzhalter**. Sobald
Fotos in `fotos/` liegen, ersetzen sie die Zeichnungen automatisch, und der
Hinweis „Illustration · Fotos folgen" verschwindet von selbst.

- [ ] Die sechs Aufnahmen machen — die Liste mit Motiven, Formaten und
      rechtlichen Hinweisen steht in `fotos/README.md`
- [ ] Einwilligung nach Art. 6 DSGVO für jede erkennbare Person
- [ ] Nutzungsrechte mit dem Fotografen klären

Ohne echte Fotos wirkt jede Heimseite gezeichnet und damit unecht. Handyfotos
bei gutem Licht genügen völlig.

## 13 · Adresse, Suche und Teilen 🟠

- [ ] **Domain festlegen.** Überall steht der Platzhalter `VORSCHAU-DOMAIN.example`.
      Der Ersetzungsbefehl steht im README unter „Go-Live-Schalter".
- [ ] **Sperre lösen.** Alle drei Seiten tragen `noindex, nofollow`, damit die
      Vorschau nicht in der Suche auftaucht. Beim Livegang entfernen — sonst
      findet Google die Seite nie.
- [ ] **`robots.txt`** von der Vorschau- auf die Produktivfassung umstellen.
- [ ] **`sitemap.xml`**: Datumsangaben auf den Veröffentlichungstag setzen.
- [ ] **Geokoordinaten**: In den strukturierten Daten fehlen Breiten- und
      Längengrad bewusst — ich hatte keine verifizierten. Sobald die Position
      des Heims auf der Karte bestätigt und festgeschrieben ist (Punkt 9),
      dieselben Werte als `"geo": {"@type":"GeoCoordinates","latitude":…,"longitude":…}`
      im JSON-LD ergänzen. Das verbessert die lokale Auffindbarkeit spürbar.
- [ ] **Vorschaubild** nach dem Einbinden der lokalen Schriften mit
      `node og-render.js` neu rendern.
- [ ] Nach dem Livegang einmal den Rich-Results-Test von Google und den Sharing
      Debugger von Facebook über die Adresse laufen lassen.
- [ ] **Google-Unternehmensprofil** prüfen: Ist der Eintrag beansprucht? Stimmen
      Adresse, Telefon und Öffnungszeiten dort mit der Seite überein? Für ein
      Pflegeheim ist das der wichtigste Kanal überhaupt — wichtiger als die Website.

## 14 · Letzter Blick

- [ ] Telefonnummer angerufen und geprüft, ob der Tap-to-Call-Link funktioniert
- [ ] Eine Testanfrage über das Formular abgeschickt — kommt sie an?
- [ ] Den `.ics`-Termin heruntergeladen und in einen Kalender importiert
- [ ] Seite auf einem echten Telefon durchgescrollt, nicht nur im Simulator
- [ ] Auf dem Telefon über beide Karten gewischt: Mit einem Finger scrollt die
      Seite weiter, mit zwei bewegt sich die Karte. „Mein Standort" einmal
      ausprobiert
- [ ] Jemanden über 70 die Seite bedienen lassen und dabei zusehen, ohne zu helfen
