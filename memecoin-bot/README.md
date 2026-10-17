# Memecoin FOMO-Bot 🔥 – v2

Ein Bot für neue **pump.fun-Coins (Solana)**, der nicht auf gut Glück arbeitet. Er sammelt zuerst Daten,
testet darauf eine feste Strategie und meldet erst dann Signale aufs iPhone. Alle Datenquellen sind kostenlos.

> ⚠️ **Kein Finanzrat.** 74 % der Memecoin-Käufer haben nach zwei Wochen weniger SOL als vorher, das oberste
> 1 % kassiert über die Hälfte der Gewinne. Der Bot soll dich vor Bauchgefühl-Trades schützen, er garantiert
> keinen Gewinn. Hintergründe und Quellen: [`docs/STRATEGIE.md`](docs/STRATEGIE.md).

## Fahrplan

| Stufe | Was passiert | Status |
|---|---|---|
| **v2.0a Recorder** | Zeichnet rund um die Uhr jeden Launch und jeden Trade auf pump.fun auf, kostenlos direkt aus der Solana-Blockchain | ✅ **jetzt einrichten** |
| v2.0b Engine + Backtest | Wertet die Aufnahmen aus und testet eine feste Strategie (Einstieg, Take-Profit, Stop, Zeit-Stop, alle Gebühren) | in Arbeit, Backtest nach ~7 Tagen Daten |
| v2.0c Beobachten + Paper | Stille Signale aufs iPhone (Telegram + Bark), die Strategie handelt virtuell mit | danach |
| Stufen 3–4 | Die Strategie steigt nur auf, wenn sie nach Kosten **statistisch belegt** besser ist als Zufall (≥ 100 Signale) | automatisch gemessen |
| Auto-Trading | Erst nach Bewährung, als eigener Schritt mit eigener Freigabe | später |

Warum zuerst nur aufzeichnen? Ein Backtest braucht echte Daten, und die gibt es nur, wenn der Recorder läuft.
Jeder Tag, an dem er früher läuft, ist ein Tag mehr Testmaterial.

## Was du brauchst

- **iPhone** mit **Telegram** und der kostenlosen SSH-App **Termius** (App Store)
- **Einen kleinen Linux-Server**, der rund um die Uhr läuft (iOS beendet Apps im Hintergrund, deshalb läuft der
  Bot nicht auf dem iPhone selbst):
  - **Empfohlen:** VPS mit eigener IPv4, 1 vCPU, 2 GB RAM, 40 GB Platte, Debian 12 oder Ubuntu 24.04. Zum
    Beispiel Hetzner CX23/CAX11 (~6 €/Monat inkl. IPv4, falls bestellbar) oder ein vergleichbarer Anbieter.
  - **Oder:** ein Raspberry Pi 4/5 zu Hause, mit Raspberry Pi OS 64-bit (Bookworm).
- **Platz:** Der Recorder schreibt ca. 250–350 MB pro Tag (geschätzt). Bei 30 Tagen Aufbewahrung sind das ca.
  10 GB. Ältere Aufnahmen löscht er automatisch.

## Einrichtung vom iPhone aus (ca. 15 Minuten)

### 1. Telegram-Bot anlegen
1. In Telegram **@BotFather** öffnen und `/newbot` senden.
2. Einen Namen und einen Benutzernamen (endet auf `bot`) vergeben.
3. Den **Token** kopieren (sieht aus wie `123456:ABC-…`).

### 2. Server mieten und verbinden
1. Beim Anbieter einen Server mit **Debian 12** oder **Ubuntu 24.04** bestellen.
2. In **Termius** einen SSH-Schlüssel erzeugen und den öffentlichen Teil beim Anbieter hinterlegen: Keychain → Keys
   → Generate → *Export to host* oder den Text kopieren.
3. In Termius einen Host mit der IP-Adresse des Servers anlegen (Benutzer `root`) und verbinden.

### 3. Installieren
Diese eine Zeile in Termius einfügen und Enter drücken:

```bash
curl -fsSL https://raw.githubusercontent.com/xxneoenxx/Agents/claude/memecoin-fomo-bot/memecoin-bot/deploy/install.sh | sudo bash
```

Das Skript fragt nach dem Telegram-Token. Danach schreibst du deinem neuen Bot in Telegram einmal „hallo“, und das
Skript findet deine Chat-ID selbst. Anschließend:
- richtet es einen eigenen Benutzer, den Code und alle Abhängigkeiten mit Prüfsummen ein,
- startet den Recorder als Dienst, der auch nach einem Neustart automatisch weiterläuft,
- und macht einen **Selbsttest**.

In Telegram kommt „▶️ Recorder gestartet.“

### 4. Selbsttest lesen
So sieht ein gutes Ergebnis aus (Beispielwerte):
```
✅ Solana-RPC: Slot 123456789, 85 ms
✅ Solana-Datenstrom: 95 Nachrichten/s, 310 KB/s, Fehler-Txs 21%
✅ pump.fun-Events: 2.412 Trades / 2.405 Instruktionen = 100%, 41 Launches, 1 Migrationen
✅ Vollständigkeit: 0.31% Kontinuitätsbrüche, 0 abgeschnittene Logs, 0 Dekodierfehler
```
Ein ❌ oder ⚠️ erklärt der Abschnitt [Fehlerbehebung](#fehlerbehebung).

## Im Alltag

- **Jeden Morgen um 09:00** kommt ein Lebenszeichen per Telegram: Trades und Launches der letzten 24 h, Lücken,
  freier Speicher.
- **Alarm** kommt, wenn der Datenstrom länger als 2 Minuten stockt, wenn Events nicht mehr dekodiert werden
  (pump.fun-Update) oder wenn der Platz knapp wird. Sobald es wieder läuft, gibt es eine Entwarnung.
- Bei einem Programm-Update von pump.fun kommt ein Hinweis. Die Daten werden an dieser Stelle markiert, damit der
  Backtest vorher und nachher getrennt auswertet.

Nützliche Befehle in Termius:

| Was | Befehl |
|---|---|
| Läuft er? | `systemctl status memecoin-recorder` |
| Live-Log | `journalctl -u memecoin-recorder -f` |
| Selbsttest | `cd /opt/memecoin-bot/src/memecoin-bot && sudo /opt/memecoin-bot/venv/bin/python -m memecoin_bot doctor` |
| Update | `sudo bash /opt/memecoin-bot/src/memecoin-bot/deploy/install.sh` |
| Einstellungen | `sudo nano /etc/memecoin-bot.env`, danach `sudo systemctl restart memecoin-recorder` |
| pump.fun-Format geprüft? | `cd /opt/memecoin-bot/src/memecoin-bot && /opt/memecoin-bot/venv/bin/python -m memecoin_bot idl-check` |

**Empfehlung zur Sicherheit:** Auf dem Server liegen keine Wallet-Schlüssel, und der Bot handelt nicht. Trotzdem gilt:
Anmeldung nur per SSH-Schlüssel, Passwort-Login aus, automatische Sicherheitsupdates an (`apt install
unattended-upgrades`).

## Fehlerbehebung

| Meldung | Bedeutung | Lösung |
|---|---|---|
| ❌ Solana-RPC / Datenstrom: keine Nachrichten | Der öffentliche Solana-Knoten blockt oder drosselt deine Server-IP | Kostenlosen Key bei [helius.dev](https://www.helius.dev) holen und in `/etc/memecoin-bot.env` eintragen: `SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=…` und `SOLANA_WS_URL=wss://mainnet.helius-rpc.com/?api-key=…`. Achtung: Beim Helius-Free-Plan ist das Volumen begrenzt. |
| ❌ pump.fun-Events: „nur als CPI-Event“ | pump.fun schreibt Trades nicht mehr in die Logs | Bitte melden. Dann kommt der Ausweichweg (Curve-Zustände statt Einzel-Trades). |
| ⚠️ Dekodierquote weit unter 100 % | pump.fun hat das Event-Format geändert | `idl-check` ausführen, Update abwarten bzw. einspielen |
| ⚠️ viele Kontinuitätsbrüche | Der Knoten verschluckt Nachrichten | Anderen Knoten eintragen (siehe erste Zeile) |
| ⚠️ wenig Platz | Platte voll | `keep_days` senken: `MEMECOIN_BOT__RECORDER__KEEP_DAYS=14` in der env-Datei |
| Telegram schweigt | Token oder Chat-ID fehlt | `TELEGRAM_BOT_TOKEN` und `TELEGRAM_CHAT_ID` in `/etc/memecoin-bot.env` prüfen |

## Einstellungen

Alle Werte stehen mit Erklärung in [`config.example.toml`](config.example.toml). Auf dem Server setzt du sie am
einfachsten in `/etc/memecoin-bot.env`:
- Kurzformen: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `SOLANA_RPC_URL`, `SOLANA_WS_URL`, `HEALTHCHECK_URL`.
- Jede andere Einstellung geht über `MEMECOIN_BOT__<ABSCHNITT>__<NAME>`, z. B. `MEMECOIN_BOT__OPS__HEARTBEAT_TIME=08:30`.

**Totmannschalter (optional):** Stirbt der ganze Server, kann der Bot das nicht selbst melden. Mit einem
kostenlosen Check bei [healthchecks.io](https://healthchecks.io) und `HEALTHCHECK_URL=https://hc-ping.com/…`
bekommst du in diesem Fall eine Mail bzw. Push.

## Wie die Aufnahme funktioniert

- **Quelle:** Der Recorder abonniert über einen kostenlosen Solana-Knoten die Logs des pump.fun-Programms
  (`logsSubscribe`). Er dekodiert die Events mit der offiziellen IDL (`memecoin_bot/idl/pump.json`, Prüfsumme im
  Code): Launch, jeder Trade mit Wallet, Betrag und Curve-Reserven, Migration.
- **Ehrlichkeit über Lücken:** Pro Coin müssen die Curve-Reserven von Trade zu Trade lückenlos zusammenpassen. Jede
  Abweichung wird gezählt. Verbindungsabbrüche werden als Lücke markiert, und fehlgeschlagene Transaktionen fliegen
  raus.
- **Format:** eine Datei pro Stunde unter `/var/lib/memecoin-bot/tape/` (`tape-JJJJMMTT-HH.jsonl[.gz]`). Jede Zeile
  ist ein JSON-Array:
  - `X` = Transaktion mit Events (`C` Launch, `T` Trade, `M` Migration, `P`/`A` Pool-Start, `E` sonstige, `U` unbekannt)
  - `S` = Minutenstatistik
  - `G` = Lücke
  - `B` = pump.fun-Programm-Update
  - `D` = DexScreener-Preise nach der Migration
- **Preise nach der Migration** (PumpSwap) holt der Recorder 24 h lang von DexScreener, damit der Backtest auch
  Ausstiege nach der Graduation bewerten kann.

## Entwicklung

```bash
cd memecoin-bot
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt pytest
python -m pytest            # Tests
python -m memecoin_bot doctor --probe-seconds 60 --save-fixtures data/fixtures   # Live-Probe
python -m memecoin_bot record                                                     # Recorder lokal
```

**v1:** `run`, `demo`, `replay` und `test-alert` gehören zur ersten Version. Ihr Live-Modus braucht seit
05/2026 einen kostenpflichtigen PumpPortal-Key. `demo` läuft weiterhin offline. v2.0c löst sie ab.

| Datei | Inhalt |
|---|---|
| `memecoin_bot/events.py` | IDL-gesteuerter Decoder für die pump.fun-Events |
| `memecoin_bot/solana_ws.py` | Solana-Log-Stream mit Reconnect, Log-Zuordnung pro Programm, Dedupe |
| `memecoin_bot/recorder.py` | Recorder: Tape, Status, Lücken, DexScreener, Programm-Updates, Telegram-Alarme |
| `memecoin_bot/continuity.py` | Lückenprüfung über die Curve-Reserven |
| `memecoin_bot/tape.py` | Aufnahme-Dateien: Rotation, Komprimierung, robustes Lesen, Aufbewahrung |
| `memecoin_bot/doctor.py` | Selbsttest und `idl-check` |
| `deploy/` | `install.sh`, systemd-Dienst, Log-Begrenzung, env-Vorlage |
| `requirements.lock` | exakt gepinnte Abhängigkeiten mit Prüfsummen |
