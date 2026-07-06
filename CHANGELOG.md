# Changelog

Alle nennenswerten Änderungen pro Phase.

## Phase 3 – Fortschritt & Meta

- **Mehrere Restaurants** (`src/data/restaurants.ts`): 3 Lokale (Imbissmeile, Bistro, Gourmet-Tempel)
  mit eigenem Thema/Stationen; State auf Multi-Restaurant umgebaut (`core/state.ts`). Münzen sind
  global, gemanagte Stationen verdienen auch in nicht besuchten Lokalen weiter (`tick` über alle).
- **Weltkarte/Reisen** (HUD-Tab „Karte"): Restaurants freischalten (Münzkosten) und bereisen.
- **Renovieren** (`core/progression.ts`): Lokal-Stufen mit neuem Namen + Umsatz-Multiplikator
  (`restaurantMultiplier`), Renovier-Button im Panel-Kopf.
- **Prestige/Investoren** (`core/prestige.ts`): Investoren aus Lebenszeit-Umsatz, permanenter
  globaler Umsatz-Bonus; Neuanfang setzt Münzen/Restaurants/Upgrades zurück, behält Investoren
  (zweistufige Bestätigung im HUD-Tab „Investoren").
- **Upgrade-Karten** (`src/data/upgrades.ts`): globale, permanente Umsatz-Multiplikatoren mit
  eskalierenden Kosten (HUD-Tab „Upgrades").
- **HUD-Umbau**: Tab-Leiste (Läden · Karte · Upgrades · Investoren), Restaurant-Kopf; WorldScene
  zeigt Theme + Stände des aktuellen Lokals und initialisiert bei Reise/Renovierung neu.
- **Tests**: `tests/meta.test.ts` (10) + erweiterte `game.test.ts` → gesamt **53 grün**.

**Fertig, wenn:** Weg vom ersten Stand über Renovierungen bis zu 3 freischaltbaren Restaurants
inkl. Prestige spielbar. ✓

## Phase 2 – Lebendige Welt

- **Animierte Kunden** (`src/game/entities/Customer.ts` + `systems/CustomerSpawner.ts`):
  Spawn am Rand → Warteschlange → Bedienung → Abgang nach links, mit Lauf-Bob und
  Farbvarianten. **Objekt-Pooling** für Kunden und Münzen (Cap für 60 fps).
- **Münz-Juice**: beim Bedienen steigt eine Münze auf.
- **Manager als Figuren** (`entities/ManagerFigure.ts`): stehen mit Kochmütze an „ihrer"
  Station und wippen (Idle), respektieren `prefers-reduced-motion`.
- **Restaurant-Layout** (`WorldScene`): Wand, Boden, durchgehender Counter, ein Stand je
  freigeschalteter Station; baut sich bei Freischaltung/Manager-Einstellung neu auf.
- **Kamera** (`systems/CameraController.ts`): Ziehen zum Schwenken, Scrollrad + Pinch zum
  Zoomen, weiche Grenzen, sanftes Zentrieren (🎯-Button im HUD).
- **UI**: einklappbares „Läden"-Panel (gibt die Welt frei), Zentrier-Button.
- Spawn-/Bedientempo und Schlangenlänge skalieren mit dem Fortschritt (Manager/Freischaltungen).

**Fertig, wenn:** Kundenstrom sichtbar und flüssig, Bedienung nachvollziehbar, Kamera per
Touch und Maus. ✓

## Phase 1 – Kern-Loop

- **Wirtschaftslogik** in `src/core/economy.ts` (rein, engine-unabhängig): Einheiten-Kosten
  (`baseCost × 1.07^owned`), geometrische Kaufsumme, **Max-Kauf**, Meilenstein-Multiplikatoren
  (×2 Umsatz bei 25/50/100/…; ×2 Tempo bei 200/300), Umsatz je Zyklus.
- **Zustand & Controller**: `src/core/state.ts` (serialisierbarer `GameState`) und
  `src/core/game.ts` (`GameController` mit `buyUnits`/`hireManager`/`tapStation`/`activateMarketing`/
  `tick`). Loop mit **Delta-Cap** (Hintergrund-Tab), mehrfache Auszahlungen pro Tick.
- **8 Stationen** (`src/data/stations.ts`): Limonade → Sushi, ~×10 gestaffelt. Marketing-Boost
  (×3 / 30 s, 90 s Abklingzeit) in `balance.ts`.
- **HTML-Bedienoberfläche** (`src/ui/hud.ts`): Münzstand, Einkommen/Sek., Marketing-Button,
  Kauf-Modus **×1/×10/Max**, Stationskarten mit Kaufen/Manager, Fortschrittsbalken,
  Meilenstein-Tag, Sperr-Overlay für noch nicht freigeschaltete Stationen. Große Touch-Ziele.
- **„Juice"**: aufsteigendes Münz-Popup bei Auszahlung (`WorldScene`), respektiert
  `prefers-reduced-motion`.
- **Tests**: `tests/economy.test.ts` (16) + `tests/game.test.ts` (13) → gesamt **36 grün**.
- Dev-Helfer: Controller im Dev-Modus unter `window.__game`.

**Fertig, wenn:** vom Stand aus tippen, kaufen, Manager holen, Boost nutzen – auf Handy und
Desktop bedienbar; Economy-Tests grün. ✓

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
