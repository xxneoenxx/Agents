# CLAUDE.md – Dauerkontext für „Bella's Food Empire"

Kurzreferenz für die Weiterentwicklung. Details im Master-Brief.

## Was ist das

2D-Idle-Tycoon-Spiel (Eatventure-artige Grundstimmung, **eigenständige** Assets), Browser + PWA,
Handy/Tablet/Desktop. Vom Straßen-Stand zum Gastro-Imperium.

## Tech-Stack

TypeScript · Vite · Phaser 3 (Welt) · DOM/HTML-Overlay (HUD) · Vitest · ESLint/Prettier ·
vite-plugin-pwa. Persistenz später via idb-keyval.

## Architektur-Grundregeln

- **`src/core/` importiert NIE Phaser.** Reine, testbare Logik (Wirtschaft, Offline, Format, State).
- Darstellung (Phaser-Szenen/Entities) und UI (DOM) lesen den State und melden Aktionen über den
  **Event-Bus** (`src/core/events.ts`) zurück.
- **Alle Balancing-Zahlen zentral** in `src/data/balance.ts` – nichts hartkodiert verstreuen.
- Assets über Manifest `src/data/assets.ts` (austauschbar).

## Konventionen

- Code/Bezeichner/Datei- und Ordnernamen: **Englisch**.
- Im Spiel sichtbare Texte (UI, Dialoge, Tooltips): **Deutsch**.
- Nur eigene/frei lizenzierte Assets; Lizenzen in `ASSETS.md`; nichts aus geschützten Spielen kopieren.
- `npm run dev` muss **zu jedem Zeitpunkt** starten. `core/`-Logik mit Vitest absichern.
- Commits häufig und klar (`feat(economy): ...`). Vor schweren neuen Libs kurz nachfragen.

## Arbeitsweise

Phasenweise (0–5). Nach jeder Phase: lauffähiger Stand + Zusammenfassung + Commit, dann auf Freigabe
warten. Barrierefreiheit beachten (`prefers-reduced-motion`, Fokus, Kontrast, Touch-Ziele ≥ 44px).

## Phasen-Überblick

0 Setup/Gerüst · 1 Kern-Loop · 2 Lebendige Welt · 3 Fortschritt & Meta · 4 Investoren/Offline/Save/Sound ·
5 Kunst-Pass/Balance/Release. Aktueller Stand siehe `CHANGELOG.md`.
