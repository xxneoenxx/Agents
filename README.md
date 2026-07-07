# Bella's Food Empire

Ein plattformübergreifendes **2D-Idle-Tycoon-Spiel** (im Stil freundlicher, bunter Gastro-Tycoons –
mit vollständig **eigenständigen** Assets). Vom winzigen Limonaden-Stand zum Gastro-Imperium: bediene
Kunden, stelle Manager ein, renoviere Lokale und schalte neue Restaurants frei.

Läuft im Browser auf **Handy, Tablet und Desktop**, ist als **PWA installierbar** und funktioniert offline.

## Tech-Stack

- **TypeScript** + **Vite** (Dev-Server & Build)
- **Phaser 3** für die lebendige 2D-Welt
- **DOM/HTML-Overlay** für HUD & Menüs
- **Vitest** für die Wirtschaftslogik (`src/core/`)
- **ESLint + Prettier**
- **vite-plugin-pwa** (installierbar, Offline-Cache)

**Architektur-Grundregel:** `src/core/` enthält reine, testbare Spiellogik und importiert **nie**
Phaser. Darstellung (Phaser) und UI (DOM) lesen den Zustand und melden Aktionen über einen Event-Bus.

## Loslegen

Voraussetzung: Node.js ≥ 20.

```bash
npm install      # Abhängigkeiten installieren
npm run dev      # Dev-Server starten (URL wird ausgegeben, meist http://localhost:5173)
```

Im Browser öffnen – du siehst die Platzhalter-Welt mit HUD-Overlay.

## Skripte

| Befehl               | Zweck                                       |
| -------------------- | ------------------------------------------- |
| `npm run dev`        | Startet den Dev-Server mit Hot-Reload       |
| `npm run build`      | Typprüfung + Produktions-Build nach `dist/` |
| `npm run preview`    | Vorschau des Produktions-Builds             |
| `npm test`           | Führt die Vitest-Tests einmalig aus         |
| `npm run test:watch` | Tests im Watch-Modus                        |
| `npm run lint`       | ESLint über `src/`                          |
| `npm run format`     | Prettier formatiert Quellcode               |

## Projektstruktur

```
src/
  main.ts              # Einstieg: Phaser-Config, HUD, PWA-Registrierung
  game/scenes/         # BootScene, PreloadScene, WorldScene
  core/                # ENGINE-UNABHÄNGIGE LOGIK (Vitest-getestet)
    events.ts          #   kleiner Event-Bus
    format.ts          #   Zahlenformatierung (K/M/B/…)
  data/                # balance.ts (zentrale Tuning-Werte), assets.ts (Manifest)
  ui/                  # HTML/DOM-Overlay (HUD)
  styles/              # Design-Tokens + CSS
tests/                 # Vitest-Tests der core-Logik
public/                # Icons, statische Assets
```

## Entwicklungsstand

**Phasen 0–5 abgeschlossen** (siehe `CHANGELOG.md`). Das Spiel ist als **PWA installierbar**
(PNG-Icons, Offline-Cache), speichert automatisch und übersteht Neuladen, hat den kompletten
Idle-Loop (tippen/kaufen/Manager/Meilensteine/Boosts), eine lebendige Welt (Kunden, Manager,
Investoren-NPCs, Rush Hour), Fortschritt & Meta (Renovieren, 3 Restaurants + Weltkarte, Upgrades,
Prestige), Offline-Einnahmen, Einstellungen, prozedurale SFX, **Achievements/Ziele** und einen
Optik-Pass. Balancing über `src/data/balance.ts` ist zentral und weiter feinjustierbar.

Icons neu erzeugen: `npm run gen:icons`.

## Sprache & Recht

- Code, Bezeichner und Dateinamen auf **Englisch**; im Spiel sichtbare Texte auf **Deutsch**.
- Nur eigene oder frei lizenzierte Assets – siehe `ASSETS.md`. Nichts aus geschützten Spielen kopiert.
