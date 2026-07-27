# Restaurant La Bontà — Website

Reines HTML, CSS und JavaScript. Kein Framework, kein Build-Schritt, keine Installation.

## Starten

In VS Code den Ordner `la-bonta/` öffnen, `index.html` rechts anklicken und
**„Open with Live Server"** wählen.

Ohne VS Code genügt:

```bash
cd la-bonta
python3 -m http.server 8080
# dann http://localhost:8080 im Browser öffnen
```

Die Seite **nicht per Doppelklick** öffnen — über `file://` funktionieren die Skripte nicht
zuverlässig.

## Aufbau

```
index.html            Startseite
speisekarte.html      Zwei Bücher: Speisen und Getränke
kontakt.html          Kontakt, Anfahrt, Tischanfrage
impressum.html        muss vom Betreiber vervollständigt werden
datenschutz.html      muss vom Betreiber vervollständigt werden

assets/css/style.css  Alle Gestaltung, Tokens ganz oben
assets/css/fonts.css  Selbst gehostete Schriften
assets/js/app.js      Lenis, GSAP, Reveals, Navigation
assets/js/hours.js    Öffnungsstatus  ← Feiertage hier eintragen
assets/js/gelato.js   Farbwechsel der Eis-Sektion
assets/js/book.js     Blätterbares Buch
assets/fonts/         Fraunces, Instrument Sans (lokal, SIL OFL)
assets/vendor/        GSAP, Lenis, StPageFlip (lokal)

content/karte-daten.py    Datenquelle der Speisekarte (Autorenwerkzeug)
content/inhalte-alt.md    Was von der alten Seite bekannt ist
content/bild-inventar.md  Bildlage und Foto-Shotlist
pruefung/test.js          30 automatische Prüfungen

DESIGN.md             Warum die Seite so aussieht, wie sie aussieht
ABSCHLUSSBERICHT.md   Offene Punkte und was noch zu liefern ist
```

## Wichtig

- **Die Seite lädt nichts von fremden Servern.** Keine Google Fonts, keine CDN, keine
  eingebettete Karte, keine Cookies. Das ist Absicht und der Grund, warum die
  Datenschutzerklärung so kurz ausfällt. Bitte nicht versehentlich ein CDN-Skript ergänzen.
- **Impressum und Datenschutz sind Gerüste**, keine fertigen Rechtstexte. Siehe
  `ABSCHLUSSBERICHT.md`.
- **Die Listenansicht der Speisekarte ist die Datenquelle.** Das Buch wird daraus erzeugt.
  Wer Gerichte ändert, ändert die Liste — das Buch folgt automatisch.

## Prüfen

Einmalig die Prüfwerkzeuge installieren:

```bash
npm install --prefix pruefung
```

Dann jederzeit:

```bash
python3 -m http.server 8080 &   # im Ordner la-bonta/
node pruefung/test.js
```

Der Testlauf braucht Chromium. In dieser Umgebung liegt er unter
`/opt/pw-browsers/chromium-1194/`; auf einem anderen Rechner ggf. den Pfad
oben in `pruefung/test.js` anpassen.

Prüft unter anderem: keine Fremdanfragen, kein Querscrollen bei 320/768/1440 px,
Lesbarkeit ohne JavaScript, Verhalten bei reduzierter Bewegung, Farbkontraste und
Tastaturbedienung.
