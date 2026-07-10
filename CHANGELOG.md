# Changelog

Alle nennenswerten Änderungen pro Phase.

## Ergänzungen (nach Release)

- **Balance-Feintuning** (datengestützt): Manager-Kosten in Bistro/Gourmet auf ~10× der ersten
  Einheit gesenkt (sanftere Automatisierung); Freischalt-Kosten an die erste Station des Lokals
  angeglichen (Bistro 150K, Gourmet 8B) – Restaurants sind dadurch erreichbare Meilensteine statt
  Kosten-Klippen. Die Kurve innerhalb eines Lokals (≈5–8× Umsatz je Station) bleibt unverändert.
- **Feier-Animation**: Konfetti-Burst (DOM, Web-Animations) bei Renovierung, Restaurant-
  Freischaltung, Prestige und Achievement-Freischaltung (`celebrate`-Event); respektiert
  `prefers-reduced-motion`.
- **Barrierefreiheit**: sichtbare Tastatur-Fokus-Ringe (`:focus-visible`), ARIA-Rollen (Dialoge
  mit `role="dialog"`/`aria-modal`, Tab-Leiste als `tablist`/`tab`, Toasts als `aria-live`),
  Fokus setzen/zurückgeben + Escape + Fokusfalle in Modals, Aria-Labels für Icon-Buttons,
  Tap-Ziele ≥ 44px, Tastatur-Shortcut „M" für Marketing-Boost.
- **Themen-Deko je Restaurant**: Lichterkette (Akzentfarbe) plus stilabhängige Boden-Deko –
  Imbissmeile (Topfpflanzen), Bistro (Sonnenschirm-Tische), Gourmet-Tempel (goldene Kandelaber).
  `RestaurantTheme` um `accent` + `deco` erweitert.
- **Eigene SVG-Sprites** (handgezeichnet, `public/sprites/`): 3 Kunden-Varianten, Koch/Manager,
  Großinvestor, Verkaufsstand und Münze ersetzen die Primitiv-Formen. In Phaser via `load.svg`
  (2× gerastert) geladen; Kunden mit Blickrichtung (flipX) und Lauf-Bob. Bedienpunkt/Kamera an die
  Stände gelegt, sodass die Warteschlange ab dem ersten Stand sichtbar ist.

- **Promi-Besuch-Event** (§6.6): seltenes Ereignis mit kurzem, starkem Umsatz-Schub (×4) und
  Kundenandrang. Rush Hour und Promi-Besuch zeigen jetzt **Toast-Benachrichtigungen** (`notify`-Event).
- **3 weitere Achievements**: „Milliardenschwer" (1 Mrd. Umsatz), „Rundum saniert" (Lokal Stufe 2),
  „Investoren-Magnet" (100 Investoren). Tests → **70 grün**.

## Phase 5 – Kunst-Pass, Achievements, Balance, Release

- **Achievements/Ziele** (`src/data/achievements.ts`, `core`): 11 Ziele mit Fortschritt und
  Belohnung; Kennzahlen (Tipps/Auszahlungen) im State, Prüfung im Controller, Freischaltungs-Event.
- **Ziele-UI**: neuer Tab „Ziele" mit Fortschrittsbalken + Status; **Erfolgs-Toast** bei
  Freischaltung. Tab-Leiste horizontal scrollbar (5 Tabs).
- **Optik-Pass** (programmatisch, weiterhin eigene Assets): Kunden mit Haaren/Armen und Haut-/
  Haarvarianten, Stände mit **gestreifter Markise**, Boden-Fliesen, Deko-Pflanzen und Wandfenster.
- **PWA/Release-QA**: echte **PNG-Icons** (192/512, erzeugt via `scripts/generate-icons.mjs` mit
  Chromium), Manifest darauf umgestellt; **Code-Splitting** (Phaser in eigenem Chunk → App-Chunk
  ~48 kB). Installierbarkeit erfüllt (Manifest + Icons + Service-Worker-Precache).
- **Balancing**: Startkapital 10 (sofort zweite Einheit kaufbar), Offline-Deckel auf 8 Std.
- **Tests**: `tests/achievements.test.ts` (6) → gesamt **68 grün**.

**Fertig, wenn:** installierbar, rund, mit Achievements und feinerer Optik. ✓

## Phase 4 – Investoren, Events, Offline, Speichern, Sound

- **Großinvestor-NPCs** (`game/entities/Investor.ts`): erscheinen gelegentlich, laufen (mit
  Glitzern) durch die Szene und bieten beim Antippen einen **Deal** an (Sofort-Bonus, Umsatz-Boost
  oder permanente Investoren) – Dialog mit Annehmen/Ablehnen.
- **Events**: gelegentliche **Rush Hour** (Kundenansturm) über den Spawner.
- **Offline-Einnahmen** (`core/offline.ts`): passives Einkommen der Manager über alle Restaurants,
  gedeckelt (Standard 4 Std.); „Willkommen zurück"-Popup mit Betrag.
- **Speichern/Laden** (`core/save.ts`): Spielstand + Zeitstempel in localStorage, Autospeichern
  (alle 15 s, bei `visibilitychange`/`pagehide`), versioniert.
- **Einstellungen** (⚙️): Sound an/aus, Hinweis zur Bewegungsreduktion, Spielstand zurücksetzen
  (zweistufig bestätigt).
- **Sound** (`game/systems/AudioManager.ts`): kurze, **prozedural per WebAudio** erzeugte SFX
  (Servieren/Münze/Kauf/Level-up/Deal) – keine externen Assets, abschaltbar, Autoplay-konform.
- **Tests**: `tests/offline.test.ts` (9, inkl. Offline-Cap, Save-Roundtrip, Deals) → gesamt **62 grün**.

**Fertig, wenn:** Spielstand übersteht Neuladen, Offline-Einnahmen funktionieren, Investoren
erscheinen ab und zu mit antippbaren Deals, Ton an/aus. ✓

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
