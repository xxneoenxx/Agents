# Claude Island

Eine kleine schwebende Insel oben mittig auf dem Bildschirm, die deine
Claude-Code-Sitzungen (Code-Tab der Claude-Desktop-App) anzeigt und steuert.
Darauf wohnt **Funke**, eine apricotfarbene Figur, deren Stimmung zeigt, was
gerade los ist, und deren Augen deiner Maus folgen.

| Stimmung | Wann | Funke |
| :- | :- | :- |
| **Wartet auf dich** | eine Freigabe oder Rückfrage ist offen | hüpft, große Augen |
| **Hängt fest** | API-Fehler (`StopFailure`) oder 3 Werkzeugfehler in Folge | zittert, besorgte Brauen |
| **Arbeitet** | nach deinem Prompt, bei jedem Werkzeugschritt | atmet schnell |
| **Fertig** | Claude hat geantwortet (`Stop`); nach 10 min wird es ruhig | Augen `^ ^` |
| **Ruhig** | Sitzung offen, nichts zu tun | schläft |

Bei mehreren Sitzungen zeigt Funke die dringendste (in dieser Reihenfolge).

## Aufbau

```
claude-island/
  app/      Electron-App (Fenster, lokaler Server auf 127.0.0.1:47821)
  plugin/   Claude-Code-Plugin „island-bridge“: HTTP-Hooks + Mod
```

Das Plugin heißt `island-bridge`, weil Claude Code Plugin-Namen mit
`claude-` als reserviert ablehnt.

## Installation

### 1. App starten

Node.js 22 oder neuer, dann:

```bash
cd claude-island/app
npm install
npm start
```

Installer bauen (auf Windows): `npm run dist` legt unter `app/dist/` einen
Installer und eine portable `.exe` ab. Im Rechtsklick-Menü der Insel kannst du
„Mit Windows starten“ einschalten.

### 2. Plugin installieren

Im Terminal (die Desktop-App liest dieselben Einstellungen, ein Plugin im
Benutzerbereich gilt also auch im Code-Tab):

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

Ist der Marketplace einmal hinzugefügt, findest du das Plugin auch in der
Desktop-App unter **+ › Plugins › Add plugin**. Offene Sitzungen laden es mit
`/reload-plugins` oder beim nächsten Start. Mods brauchen in der Desktop-App
Claude Code 2.1.286 oder neuer (`/status` zeigt die Version).

## Bedienung

- **Pille** (232×48): Figur, Stimmung, Name der dringendsten Sitzung, Anzahl
  der Sitzungen. Klick klappt auf.
- **Aufgeklappt** (720×436): Kopfzeile mit Zusammenfassung, **Anpinnen** (bleibt
  offen, auch wenn du woanders klickst), **Ton** und **Einklappen** (auch `Esc`).
  Links Funke mit Status, rechts die Sitzungs-Chips und eine Karte je Zustand:
  - **Freigabe**: Werkzeug und Befehl/Datei, **Freigeben** / **Ablehnen**.
    Eine neue Freigabe klappt die Insel auf, ohne dir den Fokus zu stehlen.
  - **Problem**: Fehlermeldung, **Hinweis geben** (Strg+Enter) oder
    **Erneut versuchen**.
  - **Arbeitet**: dein Prompt und die letzten Schritte.
  - **Fertig**: Claudes letzte Antwort und ein Feld für die nächste Anweisung.
  - unten **Modell** (Opus/Sonnet/Haiku) und **Aufwand** (Niedrig, Mittel,
    Hoch, Sehr hoch, Max) für die gewählte Sitzung. Ein Punkt markiert, was
    gerade tatsächlich läuft, wenn deine Wahl noch nicht angekommen ist.
- **Rechtsklick**: „Mit Windows starten“, „Beenden“.

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

`%APPDATA%\Claude Island\config.json` (wird beim ersten Umschalten von Ton
oder Anpinnen angelegt):

```json
{
  "port": 47821,
  "models": { "opus": "claude-opus-5-5", "sonnet": "claude-sonnet-5-5", "haiku": "claude-haiku-5-5" },
  "sound": true,
  "pinned": false
}
```

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
