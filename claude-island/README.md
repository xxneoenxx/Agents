# Claude Island

Eine kleine schwebende Insel oben mittig auf dem Bildschirm, die deine
Claude-Code-Sitzungen (Code-Tab der Claude-Desktop-App) anzeigt und steuert.
Darauf wohnt ein **Mini-Claude**, das orange Pixel-Maskottchen aus Claude
Code. Seine Stimmung zeigt, was gerade los ist, und seine Augen folgen deiner Maus.

| Stimmung | Wann | Mini-Claude |
| :- | :- | :- |
| **Wartet auf dich** | eine Freigabe oder Rückfrage ist offen | hüpft, winkt, große Augen |
| **Hängt fest** | API-Fehler (`StopFailure`) oder 3 Werkzeugfehler in Folge | zittert, Augen `> <`, Schweißtropfen |
| **Arbeitet** | nach deinem Prompt, bei jedem Werkzeugschritt | tippelt mit den Beinen, tippt mit den Armen |
| **Fertig** | Claude hat geantwortet (`Stop`); nach 10 min wird es ruhig | Arme hoch, Augen `^ ^`, funkelt |
| **Ruhig** | Sitzung offen, nichts zu tun | sitzt und schläft |

Bei mehreren Sitzungen zeigt er die dringendste (in dieser Reihenfolge). Der
Pixel über seinem Kopf leuchtet in der Farbe der Stimmung.

**Kopf oder ganz**: Standardmäßig zeigt die Pille nur seinen Kopf. Beim
Aufklappen wachsen erst die Arme, dann die Beine heraus, und der ganze
Mini-Claude macht einen Hopser; beim Zuklappen schrumpft er in den Kopf zurück.
Der Figur-Knopf in der Kopfzeile (oder Rechtsklick › **Figur in der Pille**)
schaltet auf **Ganzer Mini-Claude** um: dann steht er auch in der Pille komplett.

## Aufbau

```
claude-island/
  app/      Electron-App (Insel, lokaler Server auf 127.0.0.1:47821)
  plugin/   Claude-Code-Plugin „island-bridge“: HTTP-Hooks + Mod
```

Das Plugin heißt `island-bridge`, weil Claude Code Plugin-Namen mit
`claude-` als reserviert ablehnt.

## Installation

### 1. App installieren

**Windows-Installer (empfohlen, ohne Befehle):**
[Claude-Island-Setup.exe herunterladen](https://github.com/xxneoenxx/Agents/releases/latest/download/Claude-Island-Setup.exe)
und doppelklicken. Die Insel installiert sich ohne Admin-Rechte und startet
sofort. Ohne Installation geht es mit der
[portablen Version](https://github.com/xxneoenxx/Agents/releases/latest/download/Claude-Island-Portable.exe).
Weil die Datei nicht signiert ist, zeigt Windows evtl. „Der Computer wurde
durch Windows geschützt“: **Weitere Informationen › Trotzdem ausführen**.
Beide Dateien baut GitHub Actions bei jeder Änderung an der App neu
(`.github/workflows/claude-island-windows.yml`).

**Aus dem Quellcode** (zum Mitentwickeln): Node.js 22 oder neuer, dann:

```bash
cd claude-island/app
npm install
npm start
```

Installer selbst bauen (auf Windows): `npm run dist` legt unter `app/dist/`
`Claude-Island-Setup.exe` und `Claude-Island-Portable.exe` ab. Im Rechtsklick-Menü der Insel kannst du
„Mit Windows starten“ einschalten.

### 2. Plugin aktivieren

Am einfachsten in der Insel: Solange keine Sitzung da ist, zeigt sie, ob das
Plugin aktiv ist, und bietet **Plugin aktivieren** an (auch im
Rechtsklick-Menü). Das ruft die `claude`-CLI deines Rechners auf und
installiert `island-bridge` im Benutzerbereich. Danach die Claude-App neu
starten oder in offenen Sitzungen `/reload-plugins` eingeben.

Nur **lokale** Sitzungen melden sich bei der Insel. Cloud-Sitzungen laufen auf
Anthropic-Servern und kommen an `127.0.0.1` auf deinem PC nicht heran.

Von Hand im Terminal (die Desktop-App liest dieselben Einstellungen, ein Plugin
im Benutzerbereich gilt also auch im Code-Tab):

```bash
claude plugin marketplace add xxneoenxx/Agents
claude plugin install island-bridge@neo-agents
```

Solange dieser Stand noch nicht im Standard-Branch ist, den Branch angeben:
`claude plugin marketplace add xxneoenxx/Agents#claude/fervent-tesla-3kfm1o`.

Alternativ in einer Terminal-Sitzung in einem Schritt:

```text
/plugin install island-bridge --marketplace xxneoenxx/Agents
```

**Update auf 0.3.0** (entfernt die Obsidian-Werkzeuge aus 0.2.x): Die Insel erkennt eine
ältere installierte Version und bietet **Plugin aktualisieren** an (Bühne links,
leere Karte oder Rechtsklick-Menü). Von Hand:
`claude plugin marketplace update neo-agents` und
`claude plugin update island-bridge@neo-agents`, danach die Claude-App neu starten.

Ist der Marketplace einmal hinzugefügt, findest du das Plugin auch in der
Desktop-App unter **+ › Plugins › Add plugin**. Offene Sitzungen laden es mit
`/reload-plugins` oder beim nächsten Start. Mods brauchen in der Desktop-App
Claude Code 2.1.286 oder neuer (`/status` zeigt die Version).

## Bedienung

- **Größe**: Rechtsklick › **Größe**: Klein (50 %), Kompakt (60 %), Mittel
  (75 %), Groß (90 %, Standard) oder Sehr groß (100 %). Bei 100 % ist die Pille
  232×48 und das aufgeklappte Fenster 720×436 Pixel, bei 90 % 209×43 bzw.
  648×392. Eine früher gewählte Größe wächst beim ersten Start einmalig um
  50 % mit (60 % → 90 %, 50 % → 75 %, 75 % → 100 %).
- **Pille**: Figur, Stimmung, Name der dringendsten Sitzung, Anzahl
  der Sitzungen. Klick klappt auf.
- **Aufgeklappt**: Kopfzeile mit Zusammenfassung, **Anpinnen** (bleibt
  offen, auch wenn du woanders klickst), **Ton** und **Einklappen** (auch `Esc`).
  Links der Mini-Claude mit Status, rechts die Sitzungs-Chips und eine Karte je Zustand:
  - **Freigabe**: Werkzeug und Befehl/Datei, **Freigeben** / **Ablehnen**.
    Eine neue Freigabe klappt die Insel auf, ohne dir den Fokus zu stehlen.
  - **Problem**: Fehlermeldung, **Hinweis geben** (Strg+Enter) oder
    **Erneut versuchen**.
  - **Arbeitet**: dein Prompt und die letzten Schritte.
  - **Fertig**: Claudes letzte Antwort und ein Feld für die nächste Anweisung.
  - unten **Modell** (Opus/Sonnet/Haiku) und **Aufwand** (Niedrig, Mittel,
    Hoch, Sehr hoch, Max) für die gewählte Sitzung. Ein Punkt markiert, was
    gerade tatsächlich läuft, wenn deine Wahl noch nicht angekommen ist.
- **Kopfzeile**: der Figur-Knopf schaltet die Pille zwischen **nur Kopf** und
  **ganzem Mini-Claude** um.
- **Rechtsklick**: Größe, Figur in der Pille, Plugin aktivieren/aktualisieren,
  „Mit Windows starten“, „Beenden“.

**Animationen** laufen mit der Bildrate des Monitors, auf dem die Insel steht
(60 Hz am Laptop, bis 144 Hz am Monitor): Alle Dauer-Animationen bewegen nur
`transform` und `opacity`, die der Grafikchip ohne Neuzeichnen abspielt. Die
Augen folgen der Maus pro Bild mit zeitbasierter Glättung, also bei jeder
Bildrate gleich schnell, und die Maus wird so oft abgefragt, wie der Monitor
Bilder zeigt.

## So hängt es zusammen

**HTTP-Hooks** (`plugin/hooks/hooks.json`, `"type": "http"`) schicken
`SessionStart`, `UserPromptSubmit`, `PostToolUse`, `PostToolUseFailure`,
`Notification`, `Stop`, `StopFailure` und `SessionEnd` an
`http://127.0.0.1:47821/hook/<Event>`; die App antwortet sofort mit leerem `200`.

**Freigaben**: Der `PermissionRequest`-Hook bleibt offen, bis du klickst. Die
App antwortet dann mit

```json
{"hookSpecificOutput":{"hookEventName":"PermissionRequest","decision":{"behavior":"allow"}}}
```

bzw. `"behavior":"deny"` mit `"message":"Abgelehnt in Claude Island."`.
Läuft die App nicht, schlägt die Verbindung fehl; das ist für Claude Code ein
nicht blockierender Fehler und der normale Dialog erscheint. Dasselbe passiert,
wenn du 10 Minuten nicht reagierst (`timeout: 600`). Beantwortest du die Frage
doch im Code-Tab, verschwindet die Karte aus der Insel.

**Der Mod** (`plugin/hooks/register.ts`) fragt die App jede Sekunde per
`$.clock.every` + `$.http.fetch` (`POST /mod/poll`):

- Modell und Aufwand setzt er in jedem Modellaufruf der Hauptschleife über
  `turn.step` mit `next({ ...e, model, effort })`; Subagenten bleiben unberührt.
  Gehört das laufende Modell schon zur gewünschten Familie (etwa
  `claude-opus-5-5[1m]`), bleibt es unverändert.
- Hinweise und „Erneut versuchen“ schickt er mit
  `$.prompt.submit({ text, asUser: true })`; sie starten einen eigenen Zug,
  sobald die Sitzung frei ist.
- Er meldet zurück, welches Modell und welchen Aufwand er tatsächlich schickt.

## In der Doku geprüft (Claude Code 2.1.294)

- **Eingabefelder**: alle Hooks bekommen `session_id`, `transcript_path`, `cwd`,
  `hook_event_name` (meist auch `permission_mode`). Dazu
  `PermissionRequest`: `tool_name`, `tool_input`, `permission_suggestions?`,
  `mcp_server?` (kein `tool_use_id`); `Notification`: `message`, `title?`,
  `notification_type` (z. B. `permission_prompt`, `idle_prompt`,
  `elicitation_dialog`, `agent_needs_input`); `Stop`: `stop_hook_active`,
  `last_assistant_message?`, `background_tasks?`, `session_crons?`;
  `StopFailure`: `error` (`rate_limit`, `overloaded`, …), `error_details?`,
  `last_assistant_message?`.
- **`turn.step`**: `model` ist ein String, `effort` einer von `'low'`,
  `'medium'`, `'high'`, `'xhigh'`, `'max'` (oder eine Zahl). Modelle ohne
  Aufwand bekommen keinen. **Aliasse wie `sonnet` werden hier nicht
  aufgelöst** (im Test: „There's an issue with the selected model (sonnet)“),
  volle IDs funktionieren. Deshalb schickt die App volle IDs, Standard
  `claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-5-5` (siehe unten).
- **`allowedHttpHookUrls`**: ungesetzt sind alle URLs erlaubt, du musst also
  nichts tun. Ist der Schlüssel in irgendeiner Einstellungsdatei gesetzt (auch
  von deiner Organisation), läuft ein HTTP-Hook nur, wenn seine URL passt. Dann
  ergänzen:

  ```json
  { "allowedHttpHookUrls": ["http://127.0.0.1:47821/*"] }
  ```

  `$.http.fetch` im Mod unterliegt dem nicht, nur einer Web-Fetch-Richtlinie
  deiner Organisation.

## Einstellungen

`%APPDATA%\Claude Island\config.json` (wird beim ersten Umschalten von Ton,
Anpinnen, Größe oder Figur angelegt):

```json
{
  "port": 47821,
  "models": { "opus": "claude-opus-5-5", "sonnet": "claude-sonnet-5-5", "haiku": "claude-haiku-5-5" },
  "sound": true,
  "pinned": false,
  "scale": 0.9,
  "pluginSource": "xxneoenxx/Agents#claude/fervent-tesla-3kfm1o",
  "figureMode": "head"
}
```

In der Datei steht nur, was du geändert hast; alles andere sind Standardwerte.
Dazu schreibt die Insel `"sizeVersion": 2`: Es merkt sich, dass die einmalige
Vergrößerung um 50 % gelaufen ist. Bitte stehen lassen, sonst wächst eine
gespeicherte Größe beim nächsten Start noch einmal.

`scale` ist eine der Größen 0.5, 0.6, 0.75, 0.9 oder 1. `figureMode` ist
`"head"` (Pille zeigt den Kopf, die ganze Figur wächst beim Aufklappen heraus)
oder `"full"` (überall der ganze Mini-Claude). `pluginSource` ist der
Marketplace, aus dem **Plugin aktivieren** installiert.

Unter `models` stehen die IDs, die beim Umschalten geschickt werden. Den Port
nur zusammen mit `plugin/hooks/hooks.json` und `plugin/hooks/register.ts`
ändern.

## Sicherheit

Der Server lauscht nur auf `127.0.0.1`. Anfragen mit `Origin`-Header (also aus
einem Browser), mit fremdem `Host` (DNS-Rebinding) oder ohne
`application/json` werden abgewiesen. Freigeben und Ablehnen geht nur über
das Fenster der App, nicht über HTTP.

## Tests

```bash
cd claude-island/app && npm test                 # Zustand und Server
claude plugin validate claude-island/plugin      # Plugin, Hooks, Mod
claude plugin test claude-island/plugin          # Mod: Modell, Aufwand, Hinweise
```
