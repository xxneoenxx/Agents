# Werbevideo neu rendern (Flick + Remotion)

Das Video `../claude-island-promo-1080x1920-60fps.mp4` entsteht mit dem Flick-Workflow
(Creatorberry/flick) und Remotion. Format: 1080×1920, 60 fps, 14 Szenen, ca. 2 Minuten.
Eine deutsche Sprecherstimme (SVOX Pico) erklärt alles, und der gesprochene Text läuft als Untertitel mit.

## Inhalt

| Pfad | Was |
| :- | :- |
| `flick-plan.md`, `remotion-brief.md`, `scene-spec.json`, `transcript.json` | Flicks Plan, Übergabe und Szenenliste |
| `remotion/src/scenes/` | eine Komposition pro Szene |
| `remotion/src/lib/` | gemeinsame Bausteine, u. a. Mini-Claude als Pixel-Nachbau der App, die Pille und die Untertitel |
| `remotion/src/lib/timings.json` | Szenen- und Wortzeiten, erzeugt von `tools/timings.py` |
| `tools/script.py` | die Sprechertexte aller Szenen und die Lautschrift für englische Wörter |
| `tools/` | außerdem Skripte für Stimme, Timing, Render und Zusammenschnitt |

## Ablauf

1. Arbeitsordner anlegen, z. B. `promo-run/`, darin:
   - `tools/` aus diesem Ordner hineinkopieren
   - `node <flick>/scripts/setup-workspace.mjs --project flick-output` ausführen (`<flick>` = `flick/skills/flick` aus Creatorberry/flick)
   - `remotion/` aus diesem Ordner nach `flick-output/remotion/` kopieren und dort `npm install` ausführen
   - die Assets aus `../brand-assets/` nach `flick-output/remotion/public/brand-assets/` kopieren
   - die Schriften (Bricolage Grotesque, Figtree, IBM Plex Mono als woff2) nach `flick-output/remotion/public/fonts/`
   - Flicks Sounds liegen schon in `public/sounds`
2. Stimme erzeugen:
   - `apt install libttspico-utils` (liefert `pico2wave`)
   - dann `python3 tools/voice.py`; das legt `remotion/public/voice/NN.wav` an
   - dann `python3 tools/timings.py`; das richtet Szenenlängen und Wortzeiten an den echten Sprechpausen aus
   - Texte änderst du in `tools/script.py`. Danach beide Skripte erneut ausführen.
   - Die Bild-Beats hängen per `T.at('wort')` an Wörtern, ein geändertes Wort muss also auch in der Szene angepasst werden.
   - Optional die Piper-Stimme „Thorsten“: `pip install piper-tts`, dann `python3 tools/voice.py piper`. Das Skript lädt das Modell selbst von huggingface.co.
3. Rendern: `FLICK_SKILL=<flick> tools/render-all.sh` für alle Szenen oder mit Szenen-IDs als Argumente nur für diese. Das nutzt Flicks `render-scene.mjs`, eine MP4 pro Szene.
4. Zusammenfügen: `tools/concat.sh`. Das Ergebnis ist framegenau, mit Limiter auf −1 dBFS.

In `remotion/remotion.config.ts` steht der Pfad zum Chromium der Cloud-Umgebung. Lokal kannst du die Zeile mit
`setBrowserExecutable` entfernen, dann lädt Remotion seinen eigenen Browser.

Vorschau einzelner Bilder als Kontaktbogen:
`node preview.mjs out.png 07-freigabe-klappt-auf:0,60,120`
