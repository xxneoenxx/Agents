# Changelog

Alle nennenswerten Änderungen pro Phase.

## Phase 0 – Setup & Gerüst

- Projekt aufgesetzt: Vite + TypeScript + Phaser 3 + Vitest + ESLint/Prettier.
- PWA-Grundgerüst via `vite-plugin-pwa` (Manifest, Auto-Update-ServiceWorker, Platzhalter-Icons).
- Ordnerstruktur angelegt: `src/{game/scenes,core,data,ui,styles}`, `tests/`, `public/`.
- Engine-unabhängige `core/`-Basis: kleiner `EventBus` und Zahlenformatierung (`formatNumber`).
- Zentrale Balancing-Datei `src/data/balance.ts` und Asset-Manifest `src/data/assets.ts` (Stub).
- „Hallo Welt"-Welt: `BootScene → PreloadScene → WorldScene` zeichnet programmatisch Himmel, Boden
  und einen Platzhalter-Stand; DOM-HUD-Overlay mit Münz-Anzeige und Hinweistext.
- Design-Tokens (Farbpalette, Radien, Schatten) als CSS-Variablen; responsives Layout mit
  Safe-Area-Insets und `prefers-reduced-motion`.
- Vitest-Test für die Zahlenformatierung (grün).
- Dokumentation: `README.md` (Start/Build/Test), `ASSETS.md` (Lizenz-Tracking), `CLAUDE.md`
  (Dauerkontext).

**Start:** `npm install` → `npm run dev`. **Tests:** `npm test`.
