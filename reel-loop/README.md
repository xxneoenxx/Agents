# Reel Loop

**Eine Zeile rein, ein fertiges animiertes Hochformat-Video raus.** Für Reels, Shorts, TikTok und YouTube, direkt aus Claude Code (oder einem anderen Coding-Agenten). Dazu ein **Stream-Clipper**: Link zu einem YouTube-, Twitch- oder Kick-Stream rein, fertige vertikale Clips raus.

Reel Loop baut den Ablauf nach, den Tools wie Creago verkaufen: Skript schreiben, jede Szene animieren, Stimme und Sound drunterlegen, die fertige Datei abgeben. Kein Schnittprogramm, keine Gebühr pro Video. Alles läuft lokal. Die Stimme nutzt deinen eigenen Key oder eine kostenlose Stimme, Musik und Effekte werden synthetisiert und sind damit lizenzfrei. Styles, Engine und Code sind eigenständig, nichts davon stammt von Creago.

```
Du:     /reel-loop Mach ein 60-Sekunden-Video, warum der Panamakanal Schleusen braucht, im Atlas-Flight-Stil
Claude: stellt max. 5 Fragen → Style → Skript (dein OK) → Look (dein OK) → Plan → Stimme
        → erste Sekunden (dein OK) → Animation → Sound → Check + Kritiker → fertig (dein OK)
Ergebnis: videos/panama-locks/out/panama-locks.mp4 + .srt + cover.jpg + note.md
```

## Installation

Voraussetzungen: **Node.js 18+** und **ffmpeg**.

```bash
cd reel-loop
npm install                      # Schriften und Playwright (~40 MB)
npx playwright install chromium  # der Browser, der jeden Frame zeichnet (~170 MB)
node bin/loop.js doctor          # prüft alles und sagt, was fehlt
```

Optional:

| Was | Wofür | Installation |
|---|---|---|
| `ELEVENLABS_API_KEY` | beste Stimmen, Wort-Timings | `export ELEVENLABS_API_KEY=…` |
| `OPENAI_API_KEY` | gute Stimmen (gpt-4o-mini-tts) | `export OPENAI_API_KEY=…` |
| edge-tts | kostenlose Microsoft-Edge-Stimmen mit Wort-Timings (braucht Internet) | `pip install edge-tts` |
| System-Stimme | macOS `say`, Windows SAPI, Linux `espeak-ng` | meist schon da |
| yt-dlp | nur für den Stream-Clipper mit Links | `pip install yt-dlp` |

Ohne Sprecher geht es auch: Dann tragen die Texte auf dem Bildschirm die Geschichte.

## In Claude Code benutzen

Die Skills liegen in `.claude/skills/` (für andere Agenten verlinkt unter `.agents/skills/`).

**Ein Video, Schritt für Schritt** (12 Schritte, 4 Stopps für dein OK):
```
/reel-loop Mach ein 45-Sekunden-Video: Was passiert, wenn man in ein Schwarzes Loch fällt?
```
1. Setup · 2. Fragen (max. 5) · 3. Style (Bibliothek, dein Lieblingsvideo oder leeres Blatt) · **4. Skript ✋** · **5. Look ✋** (drei Standbilder: erstes, vollstes, ruhigstes) · 6. Plan · 7. Stimme (2–3 Stimmen zur Auswahl) · **8. Erste Sekunden ✋** (mit Ton) · 9. Animation Szene für Szene · 10. Sound (-14 LUFS, Untertitel-Datei) · 11. Check + frischer Kritiker · **12. Fertig ✋** (1080p, 2K oder 4K, mit Cover und Notiz)

**Einfach machen:** „…, mach einfach.“ Claude überspringt die ersten drei Stopps und läuft bis zum Ende durch. Den Look und die ersten Sekunden prüft er trotzdem selbst.

**Autopilot (der Loop über viele Ideen):** Kopiere `templates/ideas.md` z. B. als `ideas.md` ins Repo und trage pro Zeile eine Idee ein. Dann:
```
/reel-loop autopilot ideas.md                  # arbeitet die Liste ab
/loop 3h /reel-loop autopilot ideas.md         # alle 3 Stunden ein neues Video
```
Jedes fertige Video wird in der Liste abgehakt und in `videos/autopilot-log.md` protokolliert. Gepostet wird nie automatisch, deine Accounts bleiben in deiner Hand.

**Stream-Clipper:**
```
/stream-clipper https://www.twitch.tv/videos/123456789
```
Lädt nur Ton, Untertitel und Chat (nie die ganzen 10 Stunden) und findet Momente über Schreie, Lautstärke-Spitzen, Chat-Explosionen und Hype-Wörter. Claude liest auf den Vorschaubildern den Spielbildschirm (WASTED, BUSTED …) und schreibt Überschriften. Du wählst aus, dann kommen fertige 1080×1920-Clips mit 60 fps: Überschrift, Wort-für-Wort-Untertitel, Zoom auf die Reaktion, ohne schwarze Balken, Layout A–E, dazu eine Caption mit Credit an den Streamer. Kampagnen-Regeln (Länge, Hashtags, Werbekennzeichnung) stehen einmal in `campaign.json`. Der Live-Modus prüft laufende Streams alle 10–15 Minuten.

## GTA-6-Live-Autopilot: Stream schauen, lustige Momente clippen, zu TikTok hochladen

Der Autopilot läuft im Hintergrund, solange der Stream live ist:

1. **Aufnehmen:** Der Stream wird in 30-Sekunden-Stücken mitgeschnitten (mit `yt-dlp`, oder mit `streamlink`, das Twitch-Werbepausen überspringt). Gespeichert wird nur die letzte Stunde.
2. **Chat lesen:** Twitch-Chat anonym ohne Account, YouTube-Live-Chat über yt-dlp. Für Kick gibt es keinen Chat, dort entscheiden Ton und KI.
3. **Lustiges erkennen:** Alle halbe Sekunde wird gezählt: Lach-Explosionen im Chat (KEKW, LUL, OMEGALUL, 😂, 💀 …), Chat-Tempo, „clip it“-Rufe, Lautstärke-Spitzen und Schreie.
4. **Bewerten:** Mit `ANTHROPIC_API_KEY` schaut sich Claude pro Moment vier Bilder, den Chat und (mit `OPENAI_API_KEY`) die gesprochenen Worte an. Claude entscheidet, ob der Moment wirklich lustig und TikTok-tauglich ist, und schreibt eine deutsche Überschrift. Ohne Key entscheidet der Punktwert, und die Überschrift kommt aus Vorlagen.
5. **Schneiden:** 1080×1920 mit 60 fps, Layout A–E, Überschrift, Zoom auf die Reaktion, Untertitel, Caption mit Credit an den Streamer und Hashtags.
6. **Hochladen:** über die offizielle TikTok-API, standardmäßig als **Entwurf** in deine TikTok-Inbox (dort tippst du nur noch auf Posten). Es gibt ein Tageslimit (`maxPerDay`) und einen Mindestabstand zwischen zwei Posts (`minGapMinutes`).

```bash
# einmalig: eigene TikTok-Entwickler-App (kostenlos) anlegen, Schritte zeigt:
node reel-loop/bin/loop.js clip tiktok setup
node reel-loop/bin/loop.js clip tiktok setup --key <client key> --secret <client secret>
node reel-loop/bin/loop.js clip tiktok login

# Konfiguration anlegen und ausfüllen (url, permission, streamer, layout …)
node reel-loop/bin/loop.js clip auto --init

# erst testen: eine alte Aufnahme + Chat-Replay, nichts wird hochgeladen
node reel-loop/bin/loop.js clip auto --simulate aufnahme.mp4 --sim-chat chat.json --speed 4 --dry-run --foreground

# live starten, Status ansehen, stoppen
node reel-loop/bin/loop.js clip auto
node reel-loop/bin/loop.js clip auto-status clips/auto-<kanal>-<datum>
node reel-loop/bin/loop.js clip auto-stop clips/auto-<kanal>-<datum>
```

**Wichtig zu TikTok:** Öffentlich *direkt* posten (`"upload": {"mode": "direct"}`) erlaubt TikTok erst, wenn deine App von TikTok geprüft wurde. Bis dahin sind Direkt-Posts nur für dich sichtbar, und dein Account muss auf privat stehen. Entwürfe (Standard) brauchen nur einen Fingertipp in der App. Mit `--review` wartet jeder Clip zusätzlich auf dein OK (`clip auto-approve <ordner> m003`).

**Wichtig zum Clippen:** Der Autopilot startet nur, wenn in `autopilot.json` unter `permission` steht, woher deine Erlaubnis kommt, z. B. aus einer Clipping-Kampagne des Streamers. Fremde Streams ohne Erlaubnis hochzuladen kann zu Urheberrechts-Strikes und gesperrten Accounts führen.

| Einstellung | Bedeutung |
|---|---|
| `detect.threshold` | höher = weniger, aber stärkere Momente (Standard 6) |
| `detect.minLaughs` | mindestens so viele Lach-Nachrichten in 10 s (Standard 5) |
| `detect.chatLagSeconds` | wie viele Sekunden der Chat nach dem Moment reagiert (Standard 4) |
| `judge.minScore` | Claudes Mindestwert für „lustig“ von 0 bis 10 (Standard 7) |
| `judge.model` | Standard `claude-opus-5-5`; günstiger z. B. `claude-haiku-5-5` |
| `clip.layout` / `clip.cam` | Layout A–E; Facecam-Rechteck für A/C/D (`clip auto-frame <url>` hilft) |
| `upload.mode` | `draft` (Standard), `direct` oder `none` (nur speichern) |
| `upload.maxPerDay` / `minGapMinutes` | höchstens 8 Posts am Tag, 20 Minuten Abstand (Standard) |
| `notify.webhook` | Discord- oder Slack-Webhook für Meldungen zu jedem Clip |

## Styles

13 eigene Styles, jeder mit Regeln für Farben, Schrift, Bewegung, Struktur, Sound und Stimme (`styles/`):

| ID | Name | Wofür |
|---|---|---|
| S01 | Atlas Flight | Warum-Geschichten mit fliegender Karte |
| S02 | Chalk Fable | Strichmännchen-Fabeln auf der Kreidetafel |
| S03 | Neon Sayings | leuchtende Sprüche, Mindset |
| S04 | Ink & Gilt Chronicle | Geschichte auf Pergament |
| S05 | Cut Paper | freundliche Papier-Erklärvideos |
| S06 | Swiss Kinetic | Kinetic Typography, Tipps |
| S07 | Data Pop | Charts, Rankings, Geld |
| S08 | Midnight Lab | dunkle, leuchtende Wissenschaft |
| S09 | Fork in the Road | „Was würdest du tun?“-Serien |
| S10 | Blueprint | wie Maschinen funktionieren |
| S11 | Doodle Mascot | Alltags-Comedy mit Maskottchen |
| S12 | Battery Personality | Persönlichkeit als Akku-Balken |
| S13 | Pixel Arcade | Retro-Pixel, Gaming |

Eigene Styles: `styles learn <video>` misst Schnitte, Tempo, Farbpalette und Lautheit eines Videos, das du magst, und erzeugt eine Style-Karte. Claude verfeinert sie anhand der Bilder (Texte, Figuren, Logos und Musik werden nie übernommen). Oder Claude entwirft drei Looks vom leeren Blatt und rendert sie als echte Standbilder.

## Szenentypen

`hook`, `title`, `text`, `icon`, `number` (Zähler), `list`, `bars`, `compare` (A gegen B), `meters` (Akku-Balken), `timeline`, `steps`, `choice` (Abstimmung mit Countdown), `quote`, `image` (Bild mit Kamerafahrt), `cta`, `stick` (Strichmännchen mit Posen, Gesichtern und Sprechblasen), `map` (fliegende Karte mit Pins und Route) und `custom` (eigenes HTML/CSS/JS). Alles wird synchron zur Stimme animiert: Wörter erscheinen, wenn sie gesprochen werden, Listenpunkte, wenn ihr Stichwort fällt. Details: `.claude/skills/reel-loop/reference/scenes.md`.

## Kommandozeile

```bash
node reel-loop/bin/loop.js help
node reel-loop/bin/loop.js demo                 # deutsches Demo-Video komplett bauen
node reel-loop/bin/loop.js new "Titel" --style S01 --lang de --seconds 60
node reel-loop/bin/loop.js script <video>       # Skript als Tabelle
node reel-loop/bin/loop.js voice <video> [--samples]
node reel-loop/bin/loop.js plan <video>
node reel-loop/bin/loop.js stills <video> [--all | --scene s03]
node reel-loop/bin/loop.js render <video> --first
node reel-loop/bin/loop.js sound <video>
node reel-loop/bin/loop.js check <video>
node reel-loop/bin/loop.js finish <video> --size 1080p|2k|4k
node reel-loop/bin/loop.js make <video>         # alles in einem Rutsch
node reel-loop/bin/loop.js clip fetch|analyze|frames|cut|live …
```

Jeder Befehl lässt sich gefahrlos wiederholen: Stimme, Rendering und Mix werden nur neu gemacht, wenn sich etwas geändert hat.

## So funktioniert es

- **Render-Engine** (`player/`): eine deterministische HTML/CSS-Animations-Engine. Das Bild ist eine reine Funktion der Zeit t. Headless Chromium (Playwright) macht pro Frame einen Screenshot, mehrere Seiten rendern parallel, ffmpeg kodiert direkt mit (rund 25–30 Frames pro Sekunde auf 4 Kernen, also etwa 1 Minute für ein 60-Sekunden-Video).
- **Plan** (`lib/plan.js`): Skript plus echte Längen der Sprachaufnahmen ergeben eine Uhr. Wörter, Untertitel, Listenpunkte und Soundeffekte bekommen ihre exakte Sekunde. Danach wird geprüft: Länge, leere Bildschirme, zu schnelles Sprechen, zu lange Szenen.
- **Sound** (`lib/audio.js`): Musik in 7 Stimmungen und 11 Effekte, alles synthetisiert. Die Musik wird unter der Stimme abgesenkt (Ducking), zweistufig auf -14 LUFS normalisiert, und die Zahlen werden gemeldet.
- **Check** (`lib/check.js`): Format, Länge, schwarze oder eingefrorene Bilder, Stille, Lautheit, dazu Kontaktbögen für den Kritiker.
- **Clipper** (`lib/clipper/`): yt-dlp, Audio-Analyse, Chat- und Untertitel-Parser, ffmpeg-Layouts mit zoompan und libass.

## Grenzen (ehrlich)

- Die Karte ist stilisiert, keine echte Geografie (eigene SVG-Pfade sind möglich).
- Mit OpenAI- oder System-Stimmen sind die Wort-Timings geschätzt. ElevenLabs und Edge liefern echte.
- Die Moment-Erkennung im Clipper ist eine Heuristik. Die Entscheidung trifft der Agent anhand der Bilder, und du wählst aus.
- Der Live-Modus und der Autopilot brauchen einen Rechner, der die ganze Zeit läuft und Internet hat.
- Die Autopilot-Erkennung lebt vom Chat. Auf Twitch klappt das am besten, bei Kick gibt es keinen Chat. Ob ein Moment wirklich lustig ist, beurteilt am zuverlässigsten Claude (mit API-Key) oder du selbst im Freigabe-Modus.
- Öffentliche Direkt-Posts erlaubt TikTok erst nach der Prüfung deiner App. Ohne Prüfung bleiben Entwürfe oder private Posts.
- Nur Streamer clippen, die es erlauben, und immer credits geben. Views kann niemand versprechen.
