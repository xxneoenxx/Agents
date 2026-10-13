# Remotion Composition Brief: Flick

## Objective
Create the approved short-form scene animations from the timestamped transcript.

## Output
- Remotion project: `flick-output/remotion/`
- Format: 9:16 — 1080x1920 at 60 fps
- Rendered scenes:
  - `01-hook-alt-tab` → `scenes/01-hook-alt-tab/01-hook-alt-tab.mp4`
  - `02-problem-verpasst` → `scenes/02-problem-verpasst/02-problem-verpasst.mp4`
  - `03-reveal-island` → `scenes/03-reveal-island/03-reveal-island.mp4`
  - `04-oben-im-vordergrund` → `scenes/04-oben-im-vordergrund/04-oben-im-vordergrund.mp4`
  - `05-ein-blick` → `scenes/05-ein-blick/05-ein-blick.mp4`
  - `06-mehrere-sitzungen` → `scenes/06-mehrere-sitzungen/06-mehrere-sitzungen.mp4`
  - `07-freigabe-klappt-auf` → `scenes/07-freigabe-klappt-auf/07-freigabe-klappt-auf.mp4`
  - `08-freigeben` → `scenes/08-freigeben/08-freigeben.mp4`
  - `09-haengt-fest` → `scenes/09-haengt-fest/09-haengt-fest.mp4`
  - `10-live-und-fertig` → `scenes/10-live-und-fertig/10-live-und-fertig.mp4`
  - `11-modell-aufwand` → `scenes/11-modell-aufwand/11-modell-aufwand.mp4`
  - `12-mini-claude` → `scenes/12-mini-claude/12-mini-claude.mp4`
  - `13-lokal-kostenlos` → `scenes/13-lokal-kostenlos/13-lokal-kostenlos.mp4`
  - `14-cta-loop` → `scenes/14-cta-loop/14-cta-loop.mp4`

## Source Material
- Transcript: `transcript.json`
- Approved plan: `flick-plan.md`
- Selected brand assets: panel-approval-empty.png, panel-working-empty.png, panel-problem-empty.png, panel-done-empty.png, panel-models.png, pill-*.png and mascot-*.png / grow-*.png (as templates for the sharp rebuild), icon.png, BRAND.md
- Available sound effects: `remotion/public/sounds/`

## Creative Direction
- User direction: Hochformat 1080×1920 bei 60 fps. Eine deutsche Sprecherstimme (SVOX Pico, offline) erklärt alles, was im Bild passiert; der gesprochene Text läuft als Untertitel mit. Szenenlängen und Wortzeiten kommen aus `remotion/src/lib/timings.json`.
- Interpretation: Scene direction exactly as in flick-plan.md (sections C and D of FLICK-SKRIPT.md); every scene adds an animated caption line with its transcript.
- Avoid: generic filler visuals, unapproved assets, background music, Anthropic/Windows logos, invented features

## Scene Compositions
See `scene-spec.json` (IDs, component names, frame ranges, assets, SFX) and `flick-plan.md` (per-scene direction).

## Remotion Instructions
- Build one dedicated React component for each approved scene under `src/scenes/`.
- Register each scene as its own `<Composition>` in `src/Root.tsx`.
- Do not create a combined or all-scenes composition.
- Derive frame timing from the approved transcript timestamps and `scene-spec.json`.
- Use frame-driven Remotion motion. Build the approved visual idea; do not fall back to generic title-card layouts.
- Use only selected brand assets from `public/brand-assets/` and bundled SFX from `public/sounds/`.
- Do not add background music. Use an SFX only when it supports the visible action in the approved scene.
- Keep on-screen text readable and render each scene before review.
