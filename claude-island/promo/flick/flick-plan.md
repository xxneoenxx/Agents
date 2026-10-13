# Flick-Plan: Claude Island – „Ein Blick statt Alt-Tab“ (freigegeben)

## Format
9:16 · 1080×1920 · **60 fps** · 14 Szenen · 3276 Frames (54,6 s). Freigegeben durch die Wahl des Nutzers (Hochformat, Sprechertext als Text im Bild).

## Zusätzliche Freigabe: Sprechertext im Bild
Flick erzeugt keine Stimme. Der Sprechertext jeder Szene erscheint deshalb als animierte Untertitelzeile (Wort für Wort, ca. 2,5 Wörter/s, Bricolage Grotesque 700, im unteren Mittelfeld bei y ≈ 1420, oberhalb der Safe Zone).

## Mini-Claude
Mini-Claude wird als Pixel-Nachbau der App (gleiche Geometrie und Stimmungs-Keyframes wie `claude-island/app/renderer/styles.css`) gezeichnet, damit er sich bei 60 fps bewegt; die PNGs dienen als Vorlage. Panels nutzen die echten Screenshots mit leerer Bühne (`panel-*-empty.png`), Mini-Claude liegt als lebendige Ebene darauf.

## C) Szenen-Regie (pro Szene)

**Asset-Ort:** `./promo-assets/` in deinem Arbeitsordner. Das ist eine Kopie von `claude-island/promo/brand-assets/` aus dem Repo (siehe E). Farben, Schriften und Formen stehen in `BRAND.md`.

**Größen und Schärfe:**

| Dateien | Größe in px |
| :- | :- |
| `pill-*.png` | 464×96 |
| `panel-*.png` | 1440×872 |
| `panel-models.png` | 1406×104 |
| `mascot-*.png`, `grow-*.png` | 368×300 |
| `icon.png` | 512×512 |

- Alle Screenshots haben doppelte Pixeldichte. Zeig sie **höchstens ca. 1,4× ihrer Pixelgröße** (eine Pille also bis ca. 650 px breit). Für stärkere Zooms das UI-Teil nach Screenshot und BRAND.md scharf nachbauen.
- Mini-Claude ist Pixel-Art. Er wird nur in ganzen Vielfachen und mit Nearest Neighbor skaliert.

**Hinweise zu den Dateien:**
- Die `pill-*.png` zeigen bereits den Modus „Nur Kopf“. Der Signature-Morph startet also direkt aus `pill-waiting.png`.
- `grow-1.png` ist identisch mit `mascot-head.png`.
- Der Status-Pixel leuchtet in allen Figur-Dateien schon in der richtigen Stimmungsfarbe. `mascot-head.png` und `grow-1…4.png` sind im Zustand „Wartet auf dich“ aufgenommen, der Pixel ist also gelb. Soll er pulsieren oder die Farbe wechseln, darf er als eigene Ebene darübergelegt werden.
- `panel-idle.png` (Ruhig) wird in keiner Szene gezeigt, sondern dient nur als Referenz.

**Szenenbild vom ersten Frame:** Mini-Claude (`mascot-waiting.png`) in 2× (736×600 px), horizontal zentriert, Bildmitte bei y ≈ 860 px, auf #15110E. Der Status-Pixel leuchtet gelb (#FFC857), sonst ist nichts im Bild. Szene 14 endet exakt auf diesem Bild.

### 01 · `01-hook-alt-tab` · 00:00.0–00:03.6 · 216 Frames (60 fps)
**VO:** „Alt-Tab. Wartet Claude? Alt-Tab. Hängt er fest?“
- **Bild:** Zuerst das Szenenbild vom ersten Frame, dann ein dunkler, neutraler Windows-Desktop ohne Logos mit Editor, Browser und einem Terminal „Terminal · portfolio“. Im unteren Drittel, oberhalb der Safe Zone, stehen zwei große Tastenkappen „Alt“ und „Tab“.
- **Bewegung (Reihenfolge):**
  1. Frame 1 bis ca. 0,5 s: Mini-Claude hüpft einmal (Squash & Stretch) und winkt. Der Status-Pixel pulsiert gelb. Das ist der Teaser: Das Produktgesicht ist ab dem ersten Bild da.
  2. Erstes „Alt-Tab“: Beide Tasten drücken sichtbar ein, und die Kamera ruckt nach hinten. Mini-Claude ist jetzt klein im Terminalfenster zu sehen, als Symbol für die wartende Sitzung. Sofort schiebt sich der Editor davor.
  3. „Wartet Claude?“: Hinter dem Editor bleibt nur ein gelber Schimmer am Fensterrand. Er pulsiert einmal, aber niemand sieht hin.
  4. Zweites „Alt-Tab“: Die Tasten drücken wieder ein, und ein Umschalter-Streifen mit drei Kacheln (Editor, Browser, Terminal) ploppt auf. Die Auswahl landet auf dem Browser, das Terminal bleibt verdeckt.
  5. „Hängt er fest?“: Der gelbe Schimmer pulsiert noch einmal, jetzt schwächer.
- **Text im Bild:** „Alt“ · „Tab“ (auf den Tastenkappen)
- **Assets:** `mascot-waiting.png`. Fenster, Tasten und Umschalter werden neutral nachgebaut.
- **SFX:** `Click.mp3` bei jedem Tastendruck (2×)
- **Übergang:** harter Schnitt

### 02 · `02-problem-verpasst` · 00:03.6–00:06.8 · 192 Frames (60 fps)
**VO:** „Ständig nachsehen. Und trotzdem die Freigabe verpassen.“
- **Bild:** Derselbe Desktop. Im Editor steht ein halb geschriebener Funktionsname.
- **Bewegung:**
  1. „Ständig nachsehen“: Der Umschalter flackert immer schneller zwischen Editor, Terminal und Browser hin und her. Oben links zählt ein Zähler von „Alt-Tab ×1“ bis „×7“, und „×7“ steht danach ca. 0,8 s. Der Cursor im Editor kommt dabei nicht voran.
  2. „Und trotzdem die Freigabe verpassen“: Push-in ins Terminal. Dort steht `npm run build && npm run deploy` mit einem gelben Tag „wartet auf Freigabe“ (#FFC857).
  3. Die Kamera zieht zurück. Das Terminal liegt wieder hinter Editor und Browser, und der Tag pulsiert zweimal, ohne dass es jemand sieht.
- **Text im Bild:** „Alt-Tab ×7“ (zählt hoch) · „wartet auf Freigabe“ (IBM Plex Mono)
- **Assets:** keine, alles wird nachgebaut. Der Befehl ist derselbe wie in `panel-approval.png`, damit die Geschichte durchgehend bleibt.
- **SFX:** `Click.mp3` leise bei jedem Wechsel, `Zoomin-OR-out.mp3` beim Push-in
- **Übergang:** Transform. Der gelbe Schimmer löst sich, fliegt nach oben in die Mitte und wird zur Insel.

### 03 · `03-reveal-island` · 00:06.8–00:09.6 · 168 Frames (60 fps)
**VO:** „Schluss damit. Das ist Claude Island.“
- **Bild:** Die zugeklappte Insel sitzt oben mittig (ca. 18–22 % unter der Oberkante). Darunter erscheinen später App-Icon und Name.
- **Bewegung:**
  1. Ab Frame 1 landet der Schimmer und ploppt zur Pille auf (Squash & Stretch, leichtes Überschwingen).
  2. „Schluss damit“: Alle Fenster wischen nach unten aus dem Bild. Die Pille bleibt stehen.
  3. Der Kopf blinzelt, der Status-Pixel leuchtet gelb.
  4. „Claude Island“: Icon und Schriftzug gleiten unter der Pille hoch.
- **Text im Bild:** „Claude Island“ (Bricolage Grotesque 700, #F6EFE8)
- **Assets:** `pill-waiting.png` (bis ca. 650 px Breite, größer wird nachgebaut), `icon.png`
- **SFX:** `Pop.mp3` beim Aufploppen, `transitions.mp3` beim Wegwischen
- **Übergang:** Slide. Icon und Schriftzug gleiten hinaus, die Oberkante eines Monitors gleitet unter die Insel.

### 04 · `04-oben-im-vordergrund` · 00:09.6–00:12.6 · 180 Frames (60 fps)
**VO:** „Eine kleine Insel, oben auf deinem Bildschirm.“
- **Bild:** Ausschnitt eines Monitors mit sichtbarer, abgerundeter Oberkante (dünne Linie #A99C90) und dunklem Desktop. Die Insel schwebt rahmenlos oben mittig.
- **Bewegung:**
  1. „Eine kleine Insel“: Die Kamera zieht zurück (Pull-out). Die Pille wirkt jetzt klein auf dem großen Bildschirm und „atmet“ einmal.
  2. „oben auf deinem Bildschirm“: Ein Editorfenster gleitet nach oben und **unter** der Pille durch. Die Pille bleibt scharf obenauf, mit weichem Schatten.
  3. Der Mauszeiger fährt an der Pille vorbei, und Mini-Claudes Block-Augen folgen ihm. Das geht nur, wenn der Kopf als Pixel-SVG mit eigener Augenebene nachgebaut wird; sonst diesen Schritt weglassen.
- **Text im Bild:** „immer im Vordergrund“ (klein, Figtree, #A99C90). Es erscheint, wenn das Fenster unter der Pille durchgleitet, und steht bis zum Szenenende (mindestens 1,2 s).
- **Assets:** `pill-waiting.png`
- **SFX:** `transitions.mp3` leise, wenn das Fenster unter der Insel durchgleitet
- **Übergang:** Zoom (Push-in auf die Pille)

### 05 · `05-ein-blick` · 00:12.6–00:15.6 · 180 Frames (60 fps)
**VO:** „Ein Blick genügt: Stimmung, Sitzung, Anzahl.“
- **Bild:** Nahaufnahme der Pille, ca. 1000 px breit. Weil das über 1,4× liegt, wird sie nach `pill-*.png` und BRAND.md scharf nachgebaut (232×48, Radius 24, hochskaliert).
- **Bewegung:**
  1. „Ein Blick genügt“: Die Stimmungszeile blättert wie eine Fallblattanzeige durch Ruhig, Arbeitet, Hängt fest und Fertig und rastet auf **„Wartet auf dich“** ein. Kopf, Textfarbe und Status-Pixel wechseln jedes Mal mit.
  2. „Stimmung“: Eine Callout-Linie zeigt auf die Stimmung, dazu das Label „Stimmung“.
  3. „Sitzung“: Ein Callout zeigt auf „portfolio“, Label „dringendste Sitzung“.
  4. „Anzahl“: Ein Callout zeigt auf die gelbe „1“, Label „Anzahl“.

  Jedes Callout erscheint kurz vor seinem Wort. Danach stehen alle drei gemeinsam bis zum Szenenende (ca. 0,8 s) und blenden erst im Übergang aus.
- **Text im Bild:** „Stimmung“ · „dringendste Sitzung“ · „Anzahl“ (Figtree 600, #F6EFE8, Linien in #A99C90)
- **Assets:** `pill-waiting.png` als Vorlage für den Endzustand, `pill-idle.png`, `pill-working.png`, `pill-problem.png` und `pill-done.png` als Vorlagen zum Durchblättern. Gezeigt wird überall der scharfe Nachbau.
- **SFX:** `Zoomin-OR-out.mp3` beim Push-in
- **Übergang:** Transform. Die Callouts blenden aus, die Pille bleibt stehen, und von unten gleiten Sitzungs-Chips ein.

### 06 · `06-mehrere-sitzungen` · 00:15.6–00:19.1 · 210 Frames (60 fps)
**VO:** „Mehrere Sitzungen? Sie zeigt dir immer die dringendste.“
- **Bild:** Unter der Pille liegen drei Sitzungs-Chips: „api“ (blau, Arbeitet), „docs“ (grün, Fertig) und „portfolio“ (gelb, Wartet auf dich). **Das ist eine Visualisierung, kein echter App-Bildschirm.** In der App sitzen die Chips im aufgeklappten Panel. Der Look ist der des Chips „● portfolio“ aus den Panel-Screenshots, ohne Fensterrahmen und ohne Panel drumherum.
- **Bewegung:**
  1. „Mehrere Sitzungen?“: Die Chips gleiten nacheinander ein.
  2. „Sie zeigt dir immer“: Sie sortieren sich nach Dringlichkeit (Wartet auf dich > Hängt fest > Arbeitet > Fertig > Ruhig). „portfolio“ springt nach vorn.
  3. „die dringendste“: „portfolio“ fliegt hoch in die Pille und rastet ein. Die Pille zeigt „Wartet auf dich“ und darunter „portfolio“ (zweizeilig wie in `pill-waiting.png`), und der Zähler springt von 1 auf 3.
- **Text im Bild:** „api“, „docs“, „portfolio“, der Pillentext („Wartet auf dich“ / „portfolio“), „3“
- **Assets:** `pill-waiting.png` (den Zähler „3“ nachbauen). Den Chip-Look aus `panel-approval.png` übernehmen.
- **SFX:** `Pop.mp3`, wenn der gelbe Chip in der Pille einrastet
- **Übergang:** Transform. Die Pille bleibt stehen und geht nahtlos in Szene 07 über.

### 07 · `07-freigabe-klappt-auf` · 00:19.1–00:23.4 · 258 Frames (60 fps) · SIGNATURE-MOMENT
**VO:** „Braucht Claude eine Freigabe, klappt die Insel von selbst auf.“
- **Bild:** Im Hintergrund ein Editor, in dem weiter getippt wird, mit durchgehend blinkendem Text-Cursor. Oben die gelbe Pille im Modus „Nur Kopf“.
- **Bewegung:**
  1. Der Kopf hüpft einmal in der Pille.
  2. Die Pille morpht weich zum Panel: im App-Maßstab von 232×48 auf 720×436, der Radius geht von 24 auf 26, mit leichtem Überschwingen. Im Bild wird das Panel ca. 1000 px breit.
  3. Links auf der Bühne wachsen aus dem Kopf erst die Arme, dann die Beine heraus (`grow-1` bis `grow-4`, mit Überschwingen). Danach macht der ganze Mini-Claude einen Hopser mit Squash & Stretch und winkt (`mascot-waiting.png`).
  4. Rechts blendet die Freigabe-Karte ein.

  Der Editor-Cursor blinkt die ganze Zeit weiter, denn der Fokus bleibt beim Nutzer.
- **Text im Bild:** „klappt auf, ohne den Fokus zu stehlen“ (klein, unter dem Panel, mindestens 1,8 s sichtbar)
- **Assets:**
  - `pill-waiting.png`, `grow-1.png` bis `grow-4.png`, `mascot-waiting.png`, `panel-approval.png`
  - Die Figur im Screenshot abdecken und Mini-Claude als eigene Ebene darüberlegen.
- **SFX:** `Notification.mp3` beim Aufklappen (steht für den Freigabe-Ton der App), `Pop.mp3` beim Hopser
- **Übergang:** Zoom auf die Freigabe-Karte

### 08 · `08-freigeben` · 00:23.4–00:26.5 · 186 Frames (60 fps)
**VO:** „Freigeben oder ablehnen. Direkt hier, ohne Fensterwechsel.“
- **Bild:** Nahaufnahme der Freigabe-Karte mit dem Tag „Freigabe“ und „Bash“, darunter „Seite bauen und veröffentlichen“, `npm run build && npm run deploy` und die Knöpfe „Ablehnen“ und „Freigeben“. Der Ausschnitt ist höchstens 1,4× vergrößert.
- **Bewegung:**
  1. „Freigeben oder ablehnen“: Der Mauszeiger fährt über „Ablehnen“, der Knopf hellt kurz auf.
  2. „Direkt hier“: Der Zeiger gleitet zu „Freigeben“ und klickt. Der Knopf drückt sich ein und federt zurück.
  3. „ohne Fensterwechsel“: Die Stimmung springt auf Arbeitet. Der Status-Pixel wird blau, Mini-Claude tippelt los, und die Karte wechselt zu `panel-working.png`.
- **Text im Bild:** nur der UI-Text aus dem Screenshot
- **Assets:** `panel-approval.png`, `panel-working.png`, `mascot-working.png`
- **SFX:** `Click.mp3` beim Klick auf „Freigeben“
- **Übergang:** Transform im Panel. Die Stimmung kippt auf Hängt fest (rot), und Mini-Claude beginnt zu zittern.

### 09 · `09-haengt-fest` · 00:26.5–00:30.8 · 258 Frames (60 fps)
**VO:** „Hängt Claude fest? Gib einen Hinweis oder versuch es erneut.“
- **Bild:** Das Panel im Zustand Hängt fest: der Tag „Problem“ mit „API-Fehler: rate_limit“, die Fehlermeldung, das Hinweisfeld und die Knöpfe „Erneut versuchen“ und „Hinweis geben“.
- **Bewegung:**
  1. „Hängt Claude fest?“: Mini-Claude zittert, seine Augen werden zu > <, und ein Schweißtropfen fällt.
  2. „Gib einen Hinweis“: Der Zeiger klickt ins Hinweisfeld, und „Kurz warten, dann weiter.“ tippt sich ein.
  3. „oder versuch es erneut“: „Erneut versuchen“ leuchtet kurz auf.
  4. Klick auf „Hinweis geben“. Danach wechselt das Panel auf Arbeitet (blau).
- **Text im Bild:** „Kurz warten, dann weiter.“ (getippt), sonst nur UI-Text
- **Assets:** `panel-problem.png`, `mascot-problem.png`; für den Wechsel am Ende `panel-working.png`, `mascot-working.png`
- **SFX:** `Typing.mp3` (auf ca. 1,2 s gekürzt), `Click.mp3` beim Klick auf „Hinweis geben“
- **Übergang:** Transform im Panel, weiter im Zustand Arbeitet

### 10 · `10-live-und-fertig` · 00:30.8–00:35.7 · 294 Frames (60 fps)
**VO:** „Sieh live, woran Claude arbeitet. Fertig? Schick gleich die nächste Anweisung.“
- **Bild:** Das Panel im Zustand Arbeitet mit dem Prompt „Baue die Kontaktseite mit Formular und Validier…“ und den Werkzeugschritten darunter.
- **Bewegung:**
  1. Die Schritte erscheinen nacheinander: Read `…/pages/index.astro`, Write `…/pages/kontakt.astro`, Edit `…/lib/validate.ts`, Bash `npm test`. Der letzte pulsiert als aktiver Schritt. Mini-Claude tippelt und tippt dabei.
  2. „Fertig?“: Das Panel wechselt auf Fertig (grün). Mini-Claude reißt die Arme hoch, die Augen werden zu ^ ^, und es funkelt. Claudes letzte Antwort erscheint.
  3. „Schick gleich die nächste Anweisung“: Der Zeiger klickt ins Feld „Nächste Anweisung …“, und „Jetzt noch ein Impressum.“ tippt sich zügig ein. Der Satz steht danach ca. 1,2 s. Erst kurz vor Szenenende (ca. 00:35.5) klickt der Zeiger auf „Senden“.
- **Text im Bild:** UI-Text, dazu „Jetzt noch ein Impressum.“ (getippt)
- **Assets:** `panel-working.png`, `panel-done.png`, `mascot-working.png`, `mascot-done.png`
- **SFX:** `Correct.mp3` (auf ca. 1 s gekürzt) beim Wechsel auf Fertig, `Click.mp3` bei „Senden“
- **Übergang:** Slide. Die Kamera schwenkt nach unten auf die Leiste mit Modell und Aufwand.

### 11 · `11-modell-aufwand` · 00:35.7–00:39.2 · 210 Frames (60 fps)
**VO:** „Modell und Aufwand stellst du pro Sitzung um.“
- **Bild:** Die Leiste nach `panel-models.png`, groß und scharf nachgebaut. Im Hochformat ist sie zweizeilig: oben „MODELL Opus · Sonnet · Haiku“, darunter „AUFWAND Niedrig · Mittel · Hoch · Sehr hoch · Max“. Darüber steht der Sitzungs-Chip „● portfolio“.
- **Bewegung:**
  1. „Modell“: Der Zeiger klickt auf „Sonnet“, und die orange Markierung (#FF9A62) gleitet von Opus zu Sonnet.
  2. „Aufwand“: Der Zeiger klickt auf „Mittel“, und die Markierung gleitet von Hoch zu Mittel.
  3. „pro Sitzung“: Der Chip „portfolio“ leuchtet kurz auf, darunter blendet der Hinweis ein.
- **Text im Bild:** „wirkt ab dem nächsten Modellaufruf“ (klein, #A99C90, mindestens 1,5 s sichtbar)
- **Assets:** `panel-models.png` (Vorlage für den Nachbau)
- **SFX:** `Click.mp3` bei jedem der beiden Klicks
- **Übergang:** Transform. Die Leiste fällt weg, und Mini-Claude hüpft groß in die Bildmitte.

### 12 · `12-mini-claude` · 00:39.2–00:43.3 · 246 Frames (60 fps)
**VO:** „Und Mini-Claude fiebert mit: schläft, tippt, winkt, zittert, jubelt.“
- **Bild:** Mini-Claude groß in der Bildmitte (2×, scharfe Pixel), darunter ein weicher Schatten, über dem Kopf der Status-Pixel. Unten fünf Stimmungs-Chips (3 + 2).
- **Bewegung:**
  1. „Und Mini-Claude fiebert mit“: Er landet mit einem Hopser in der Mitte und setzt sich (`mascot-idle.png`). Unten gleiten nacheinander die fünf Stimmungs-Chips ein, zunächst gedämpft (Rand und Text in #A99C90).
  2. Dann wechselt er die Stimmung genau auf die fünf Verben:
     - schläft: sitzt, zzz steigt auf (grau)
     - tippt: Beine tippeln, Arme tippen (blau)
     - winkt: hüpft, große Augen (gelb)
     - zittert: Augen > <, Schweißtropfen (rot)
     - jubelt: Arme hoch, Augen ^ ^, es funkelt (grün)

  Der Status-Pixel nimmt jedes Mal die passende Farbe an, und der passende Chip leuchtet in seiner Stimmungsfarbe auf und bleibt an. Am Ende leuchten alle fünf. So steht jedes Label mindestens ca. 2,5 s.
- **Text im Bild:** „Ruhig“ · „Arbeitet“ · „Wartet auf dich“ · „Hängt fest“ · „Fertig“ (Chips)
- **Assets:** `mascot-idle.png`, `mascot-working.png`, `mascot-waiting.png`, `mascot-problem.png`, `mascot-done.png`
- **SFX:** `energy.MP3` beim Jubel-Hopser am Ende
- **Übergang:** Transform. Mini-Claude hüpft zurück auf die Bühne des Fertig-Panels, die Chips blenden aus.

### 13 · `13-lokal-kostenlos` · 00:43.3–00:47.6 · 258 Frames (60 fps)
**VO:** „Kostenlos, Open Source. Die Insel läuft lokal auf deinem PC.“
- **Bild:** Die linke Bühne aus `panel-done.png` als hochformatige Karte, höchstens 1,4× (ca. 550×870 px): Mini-Claude jubelt, darunter „Fertig“ und „portfolio“ (zweizeilig wie im Screenshot), und unten die echten Statuszeilen „● Server :47821“ und „● Mod verbunden“.
- **Bewegung:**
  1. „Kostenlos“: Das Badge „Kostenlos“ ploppt über der Karte auf.
  2. „Open Source“: Das Badge „Open Source · MIT“ ploppt auf.
  3. „Die Insel läuft lokal“: Push-in auf die echten Statuszeilen. Ab 1,4× wird nahtlos in einen scharfen Nachbau überblendet (IBM Plex Mono, Punkte in #7ED6A8), der groß genug zum Lesen ist.
  4. „auf deinem PC“: Daneben tippt sich `127.0.0.1:47821` ein, und das Badge „läuft lokal“ ploppt auf. Keine Wolke und keine Pfeile nach draußen zeigen.
- **Text im Bild:**
  - „Kostenlos“ · „Open Source · MIT“ · „läuft lokal“ · „127.0.0.1:47821“
  - Fußzeile klein in #A99C90, ab Szenenbeginn sichtbar: „Inoffizielles Community-Tool · nicht von Anthropic“
- **Assets:** `panel-done.png` (Ausschnitt der Bühne links). Dieselben Statuszeilen stehen auch in den anderen Panel-Screenshots (nicht in `panel-models.png`).
- **SFX:** `Pop.mp3` bei jedem Badge (3×), `Zoomin-OR-out.mp3` beim Push-in
- **Übergang:** Slide. Alles gleitet nach oben aus dem Bild, und die Endkarte kommt von unten.

### 14 · `14-cta-loop` · 00:47.6–00:54.6 · 420 Frames (60 fps)
Der Sprechertext endet ca. bei 00:51.9. Danach steht die Endkarte noch ca. 1,4 s, dann folgt der Loop.

**VO:** „Claude Island für Windows. Hol sie dir jetzt auf GitHub.“
- **Bild:** Endkarte auf #15110E:
  - oben das App-Icon, darunter groß „Claude Island“ und die Zeile „für Windows · kostenlos · Open Source“
  - darunter ein Download-Knopf, der Link und drei Schritte
  - ganz unten, oberhalb der Safe Zone, das Kleingedruckte (ab Szenenbeginn sichtbar)
- **Bewegung:**
  1. „Claude Island für Windows“ (ca. 00:47.7–00:49.3): Icon und Schriftzug federn ein, die Unterzeile folgt.
  2. „Hol sie dir jetzt auf GitHub“ (ab ca. 00:49.6): Der Knopf „Setup.exe herunterladen“ (#FF9A62) mit der Unterzeile „ohne Admin-Rechte“ erscheint, bei ca. 00:49.9 darunter `github.com/xxneoenxx/Agents`. Bei ca. 00:50.1 klickt der Zeiger auf den Knopf, der sich eindrückt.
  3. Die drei Schritte erscheinen bei ca. 00:50.2, 00:50.5 und 00:50.8 nacheinander: „1 · Setup.exe doppelklicken“, „2 · ‚Plugin aktivieren‘ klicken“, „3 · Claude-App neu starten“. Danach steht alles ruhig bis ca. 00:53.3 (ca. 2,5 s ab dem letzten Schritt).
  4. Ab ca. 00:53.3 (ca. 1,4 s nach dem letzten gesprochenen Wort) kippt die Kamera nach oben, und alles rutscht nach unten aus dem Bild. Oben mittig leuchtet die Insel gelb (`pill-waiting.png`).
  5. Push-in auf den Kopf. Der ganze wartende Mini-Claude springt heraus (kurz `grow-1` bis `grow-4`, dann `mascot-waiting.png`) und landet **exakt** in Größe und Position des ersten Bilds von Szene 01.
- **Text im Bild:** „Claude Island“, „für Windows · kostenlos · Open Source“, „Setup.exe herunterladen“, „ohne Admin-Rechte“, „github.com/xxneoenxx/Agents“, die drei Schritte. Klein, ab Szenenbeginn: „Inoffizielles Community-Tool, nicht von Anthropic.“
- **Assets:** `icon.png`, `pill-waiting.png`, `grow-1.png` bis `grow-4.png`, `mascot-waiting.png`
- **SFX:** `Click.mp3` beim Klick auf den Knopf, `Zoomin-OR-out.mp3` beim Push-in, `Pop.mp3` bei der Landung
- **Übergang:** Match-Cut auf das erste Bild von `01-hook-alt-tab` (Loop). Kein Fade-out und kein Schwarzbild.

---


## D) Kreative Richtung (gesamt)

**Stil:** Dunkel, warm und aufgeräumt. Das Produkt ist der Held: Jede Szene ab 03 zeigt einen echten Zustand der Insel, entweder als Screenshot oder als genauen Nachbau. Alle UI-Texte sind deutsch, so wie in den Screenshots.

**Leinwand:** #15110E. Erlaubt ist höchstens ein dezenter warmer Lichtschein direkt hinter der Insel (Akzent mit sehr geringer Deckkraft), aber kein flächiger Verlauf.

**Farben:**

| Rolle | Hex |
| :- | :- |
| Hintergrund | #15110E |
| Text | #F6EFE8 |
| Gedämpft, Linien, Fußzeilen | #A99C90 |
| Akzent (Knöpfe, Auswahl, CTA) | #FF9A62 |
| Mini-Claude | #D97757 |
| Augen | #2A1A12 |
| Wartet auf dich | #FFC857 |
| Hängt fest | #FF7A6B |
| Arbeitet | #8FB8FF |
| Fertig | #7ED6A8 |
| Ruhig | #A99C90 |

**Schriften** (alle Google Fonts):
- Bricolage Grotesque 600/700 für Überschriften und Stimmungen
- Figtree 400–600 für Text, Labels, Callouts und Knöpfe
- IBM Plex Mono 400/500 für Befehle, Pfade, Statuszeilen und `127.0.0.1:47821`

Es gibt **keinen Font-Ordner** in den Assets. Flick lädt die drei Familien über `@remotion/google-fonts` (in derselben Version wie `remotion`). Wenn du die .ttf-Dateien selbst bei Google Fonts herunterlädst und nach `./promo-assets/fonts/` legst, bindet Flick stattdessen diese per `@font-face` + `staticFile()` ein.

**Bewegungssprache:**
- Kurz, weich und federnd: Feder-Easing mit kleinem Überschwingen, Squash & Stretch bei jedem Hopser, Überschwingen beim Herauswachsen der Arme und Beine.
- Das Aufklappen ist ein durchgehender Morph von der Pille zum Panel. Das Zuklappen wäre dieselbe Bewegung rückwärts.
- Die App animiert mit bis zu 144 Hz. Im Video heißt das: butterweiches Easing, keine linearen oder ruckigen Bewegungen.
- Die Kamera macht nur Push-ins, Pull-outs und Schwenks. Wackeln gibt es nur an zwei Stellen: den Ruck im Hook und das Zittern bei „Hängt fest“.
- Tempo: 01–02 hektisch, mit schnellen Wechseln. Ab 03 ruhig und souverän, und jede UI-Szene hat genau einen klaren Klick- oder Wechselmoment.

**Pixel-Art:**
- Mini-Claude wird nur in ganzen Vielfachen mit Nearest Neighbor skaliert (`image-rendering: pixelated`). Nie weichzeichnen, nie um krumme Winkel drehen.
- Er bewegt sich über Position, Skalierung und den Wechsel der PNGs.
- Für die Augen, die der Maus folgen, darf der Kopf als Pixel-SVG exakt nach `mascot-head.png` nachgebaut werden. Neue Posen sind nicht erlaubt.
- Der Status-Pixel ist in allen Figur-Dateien schon in der richtigen Stimmungsfarbe. Für Pulsieren oder Farbwechsel darf er als eigene Ebene darübergelegt werden.

**Screenshots:** Höchstens ca. **1,4×** ihrer Pixelgröße zeigen, weil sie laut BRAND.md doppelte Pixeldichte haben. Für stärkere Zooms das UI-Teil nach Screenshot und BRAND.md scharf nachbauen. Nur Inhalte zeigen, die im Screenshot tatsächlich vorkommen.

**Layout 9:16:**
- Die Insel sitzt oben mittig, ca. 18–22 % unter der Oberkante (y ≈ 350–420 px). Ganz oben liegen die Leisten der Plattformen.
- Panels zuerst in voller Breite (ca. 1000 px) im oberen Teil zeigen, dann per Push-in auf die passende Karte gehen.
- Unten ca. 20 % (ca. 380 px) und rechts ca. 12 % (ca. 130 px) bleiben frei von wichtigem Text.

**Layout 16:9 (Variante):**
- Wie die echte App: die Insel oben mittig auf einem dunklen Desktop-Ausschnitt.
- Die Panels fast bildfüllend (ca. 1600–1700 px breit), mit der Bühne und Mini-Claude links und den Karten rechts.
- Die Modell-Leiste in 11 einzeilig wie im Original, die Stimmungs-Chips in 12 in einer Reihe.
- Die Safe-Zone-Regeln entfallen.

**Lesbarkeit (Flicks Regeln, plus eine eigene Obergrenze):**
- Flick: Ein Label steht mindestens ca. 0,8 s ruhig, ein Satz ca. 0,3 s pro Wort und mindestens ca. 1,2 s. Bei Aufzählungen die Teile nacheinander zeigen und danach das ganze Set stehen lassen.
- Eigene Regel: Höchstens ca. 6 Wörter pro Einblendung. Das Kleingedruckte ist ausgenommen.

**Mauszeiger:** Ein schlichter Pfeil, in allen Szenen gleich groß. Flick soll die Cursor-Komponente mit Klick-Zustand aus der gespeicherten Animation `pdf-token-limit` wiederverwenden.

**Brauchbare Flick-Vorlagen** (alle 9:16):
- `pdf-token-limit` nur für die Cursor-Komponente
- `token-waste-terminal` nur für den dunklen Terminal-Rahmen in 01–02, ohne Token-Zähler

Aus beiden Vorlagen **nicht** übernehmen: die fremden Bilder (`claude.png` in token-waste-terminal, `markitdown-github-top-section-ecc.png` und `Satya-Nadella.png` in pdf-token-limit), den Tab „Claude Code“ mit dem Sternchen-Symbol und alle Claude-Code-Texte (Prompts, Tipps, „Synthesizing …“, „ctrl esc to focus …“). Die beiden Vorlagen bringen keine eigenen Sounds mit; es gelten nur die Sounds aus Abschnitt C.

**Vermeiden:**
- Anthropic-Logo, den Anthropic-Sunburst (auch als Sternchen-Symbol), Windows-Logos und jede Nachbildung der offiziellen Claude-App-Oberfläche. Die Fenster in 01–02 sind neutral und ohne Logos.
- Erfundene Funktionen und UI: keine Cloud-Sitzungen, kein macOS oder Linux, keine Menüleiste, kein iPhone-„Dynamic-Island“-Look, keine Benachrichtigungen außerhalb der Insel, kein Installer-Assistent.
- Zahlen und Statistiken zur Zeitersparnis oder Produktivität, Bewertungen, Testimonials und Preise außer „kostenlos“.
- Generische Titelkarten, abstrakte Muster, Farbflächen, Stock-Verläufe und Stock-Footage.
- Lange Sätze im Bild, Emojis und Text, der kürzer steht, als man zum Lesen braucht.
- Weichgezeichnete Pixel-Art und unscharf hochgezoomte Screenshots.
- 3D-Karussells oder starke Neigungen, die die UI unlesbar machen.
- Hintergrundmusik (die kommt erst im Schnitt dazu) und Sounds ohne sichtbare Aktion.

---

