# Werbevideo neu rendern (Flick + Remotion)

Das Video `../claude-island-promo-1080x1920-60fps.mp4` entsteht mit dem Flick-Workflow
(Creatorberry/flick) und Remotion. Format: 1080×1920, 60 fps, 14 Szenen.

## Inhalt

| Pfad | Was |
| :- | :- |
| `flick-plan.md`, `remotion-brief.md`, `scene-spec.json`, `transcript.json` | Flicks Plan, Übergabe und Szenenliste |
| `remotion/src/scenes/` | eine Komposition pro Szene |
| `remotion/src/lib/` | gemeinsame Bausteine, u. a. Mini-Claude als Pixel-Nachbau der App, die Pille und die Untertitel |
| `remotion/src/lib/timings.json` | Szenen- und Wortzeiten, erzeugt von `tools/timings.py` |
| `tools/` | Skripte für Stimme, Timing, Render und Zusammenschnitt |

## Ablauf

1. Flick-Workspace anlegen und dieses Projekt hineinkopieren:
   - `node <flick>/scripts/setup-workspace.mjs --project flick-output`
   - `remotion/` aus diesem Ordner nach `flick-output/remotion/` kopieren und dort `npm install` ausführen
   - die Assets aus `../brand-assets/` nach `flick-output/remotion/public/brand-assets/` kopieren
   - Flicks Sounds liegen schon in `public/sounds`, Schriften in `public/fonts`
2. Optional mit Stimme: `pip install piper-tts`, dann `python3 tools/voice.py` und `python3 tools/timings.py`.
   Das Stimmmodell „Thorsten“ kommt von huggingface.co.
3. Rendern: `tools/render-all.sh`. Das nutzt Flicks `render-scene.mjs`, eine MP4 pro Szene.
4. Zusammenfügen: `tools/concat.sh`.

In `remotion/remotion.config.ts` steht der Pfad zum Chromium der Cloud-Umgebung. Lokal kannst du die Zeile mit
`setBrowserExecutable` entfernen, dann lädt Remotion seinen eigenen Browser.

Vorschau einzelner Bilder als Kontaktbogen:
`node preview.mjs out.png 07-freigabe-klappt-auf:0,60,120`
