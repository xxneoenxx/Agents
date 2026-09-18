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
| ÖPNV | Bushaltestelle direkt vor dem Haus | ☐ |

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
- [ ] Gesamten Text juristisch prüfen lassen

## 8 · Schriften lokal ausliefern 🟠 — der einzige technische Restpunkt

Die Seite lädt **einen einzigen** externen Request: die beiden Schriften von
Google Fonts. Damit geht die IP-Adresse jedes Besuchers an Google — in Deutschland
abmahnrelevant (LG München I, Az. 3 O 17493/20).

- [ ] `Fraunces` und `Atkinson Hyperlegible` herunterladen (beide SIL Open Font License,
      kommerzielle Nutzung und Selbst-Hosting ausdrücklich erlaubt)
- [ ] Als `.woff2` neben `index.html` legen
- [ ] Den `<link>` auf Google Fonts durch `@font-face`-Regeln mit
      `font-display: swap` ersetzen
- [ ] Abschnitt 7 der Datenschutzerklärung auf die Selbst-Hosting-Variante umstellen

Danach lädt die Seite **nichts** von fremden Servern. Kein Cookie-Banner,
kein Consent-Tool, keine Auftragsverarbeiter außer dem Hoster.

## 9 · Bildmaterial 🟠 — optional, aber der größte Hebel

Alle Szenen sind eigens gezeichnete Vektorgrafiken. Das funktioniert, sieht
absichtlich gut aus und kostet nichts. Trotzdem:

- [ ] Gibt es Fotos vom Haus, den Zimmern, dem Garten, dem Team?
- [ ] Sind die Rechte geklärt (Fotograf, abgebildete Personen)?
- [ ] **Einwilligung nach Art. 6 DSGVO für jede erkennbare Person**, besonders bei
      Bewohnerinnen und Bewohnern — bei eingeschränkter Geschäftsfähigkeit über
      die Betreuung
- [ ] Wenn Fotos kommen: Team-Sektion ergänzen. Sie fehlt bisher bewusst, weil
      eine Team-Sektion mit Platzhalter-Personen schlechter wirkt als gar keine.

## 10 · Letzter Blick

- [ ] Telefonnummer angerufen und geprüft, ob der Tap-to-Call-Link funktioniert
- [ ] Eine Testanfrage über das Formular abgeschickt — kommt sie an?
- [ ] Den `.ics`-Termin heruntergeladen und in einen Kalender importiert
- [ ] Seite auf einem echten Telefon durchgescrollt, nicht nur im Simulator
- [ ] Jemanden über 70 die Seite bedienen lassen und dabei zusehen, ohne zu helfen
