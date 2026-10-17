# Memecoin FOMO-Bot 🔥

Beobachtet **jeden neuen pump.fun-Coin (Solana) ab dem Launch** in Echtzeit, analysiert die Trades
und schickt dir ein Signal (Konsole, Telegram, Discord), sobald **viele verschiedene Wallets in
kurzer Zeit einsteigen** – und filtert dabei die typischen Fallen (Dev verkauft, ein Wal kauft
alles, Bot-Spam mit Mini-Käufen).

> 🚧 **Wichtig (Stand 17.10.2026): Diese Version (v1) braucht kostenpflichtige Daten.** Seit dem
> 01.05.2026 verlangt PumpPortal für Trade-Daten (`subscribeTokenTrade`) einen API-Key mit
> verknüpfter Wallet und berechnet 0,01 SOL pro 10.000 Nachrichten. Kostenlos sind nur noch Launch-
> und Migrations-Events. Eine v2 mit ausschließlich kostenlosen Datenquellen ist geplant; die
> Hintergründe stehen in [`docs/STRATEGIE.md`](docs/STRATEGIE.md).

> ⚠️ **Kein Finanzrat.** Die allermeisten Memecoins gehen auf null, viele sind Rugs. Ein Signal
> heißt nur „gerade kaufen viele" – nicht „das steigt weiter". Wer FOMO-Signale kauft, ist oft der
> Exit für andere. Nur mit Geld spielen, das du komplett verlieren kannst.

## So funktioniert's

1. Der Bot verbindet sich mit dem [PumpPortal](https://pumpportal.fun)-WebSocket und
   bekommt jeden neuen Launch (`subscribeNewToken`).
2. Für jeden neuen Coin abonniert er sofort alle Trades und beobachtet ihn bis zu 30 Minuten
   (bzw. bis 5 Minuten lang nichts mehr passiert).
3. Bei jedem Trade wertet er das **letzte 60-Sekunden-Fenster** aus:

| Kennzahl | Bedeutung |
|---|---|
| Unique Käufer | verschiedene Wallets mit Kauf ≥ 0,05 SOL (Dev zählt nicht) |
| Netto-Flow | gekaufte SOL minus verkaufte SOL |
| Buy-Ratio | Anteil Käufe an allen Trades |
| MC-Wachstum | Market Cap jetzt vs. vor 60 s |
| Größter Käufer | Anteil einer Wallet am Kaufvolumen (Wal/Bundle-Erkennung) |
| Top-Holder / Holder | aus den Wallet-Salden seit Launch |
| Dev | hält wie viel, hat er verkauft? |
| Bonding Curve | Fortschritt bis zur Migration |

4. **Signal**, wenn alle harten Bedingungen erfüllt sind (genug Käufer, Netto-Flow, Buy-Ratio,
   kein Wal, Dev hat nicht verkauft …) **und** der FOMO-Score ≥ 60 ist.
   Score = Käufer 35 + Netto-Flow 25 + Buy-Ratio 15 + MC-Wachstum 15 + Verteilung 10 Punkte.
5. Stufen: 🔥 ab 60, 🔥🔥 ab 75, 🔥🔥🔥 ab 90. Pro Coin kommt jede Stufe nur einmal – du wirst
   also benachrichtigt, wenn ein Coin heißer wird, aber nicht zugespammt.

Beispiel-Alert:

```
🚨 FOMO-SIGNAL 🔥🔥  Score 75/100
$MFROG – Moon Frog
⏱ Alter 1m 53s | 💰 MC 66.1 SOL (~$9.9k) | 📈 +66% in 60s
👥 30 Käufer in 60s | Buys/Sells 30/1 (97%)
💸 Netto-Flow +10.38 SOL | größter Käufer 10% vom Volumen
🧑‍🤝‍🧑 Holder 49 | Top-Holder 3.5% | Dev hält 3.5%
📊 Bonding Curve 47%
🔗 X/Twitter · Telegram · Website
Mint: vjAS…pump
pump.fun · DexScreener · GMGN
```

## Installation

Du brauchst Python 3.11 oder neuer.

```bash
cd memecoin-bot
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### Erst mal ausprobieren (ohne Internet)

```bash
python -m memecoin_bot demo
```

Simuliert vier Coins: einen echten FOMO-Coin, einen Rug (Dev verkauft), einen toten Coin und
einen Wal-Pump. Nur der echte FOMO-Coin sollte Signale auslösen.

## Telegram einrichten

1. In Telegram **@BotFather** öffnen → `/newbot` → Namen vergeben → du bekommst einen **Token**.
2. Deinem neuen Bot einmal irgendeine Nachricht schreiben.
3. Im Browser `https://api.telegram.org/bot<DEIN_TOKEN>/getUpdates` öffnen und dort
   `"chat":{"id": …}` suchen – das ist deine **Chat-ID**.
4. Config anlegen und beides eintragen:

```bash
cp config.example.toml config.toml
# dann in config.toml unter [telegram] bot_token und chat_id eintragen
python -m memecoin_bot test-alert   # schickt eine Test-Nachricht
```

Discord geht genauso: Webhook-URL unter `[discord]` eintragen.
Statt in die Datei kannst du die Werte auch als Umgebungsvariablen setzen
(`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `DISCORD_WEBHOOK_URL`).

## Starten

```bash
python -m memecoin_bot            # live
python -m memecoin_bot -v         # mit ausführlichem Log
```

Jede Minute kommt eine Statuszeile (wie viele Coins beobachtet werden, neue Coins/min, Trades/min).
Alle Signale landen zusätzlich in `data/signals.jsonl`. Beenden mit `Strg+C`.

Dauerhaft auf einem Server laufen lassen, z. B.:

```bash
nohup python -m memecoin_bot > bot.log 2>&1 &
```

## Feintuning: aufnehmen und nachspielen

Die Standardwerte sind ein Startpunkt, nicht der heilige Gral. Am besten so tunen:

```bash
python -m memecoin_bot --record data/events.jsonl    # ein paar Stunden live aufzeichnen
python -m memecoin_bot replay data/events.jsonl      # mit anderen Werten in config.toml erneut auswerten
```

Replay sendet standardmäßig nur in die Konsole (`--notify` schickt auch an Telegram/Discord).
Dann die Signale mit dem echten Kursverlauf vergleichen (Links im Alert) und die Werte in
`[signal]` anpassen:

- **Zu viele Signale?** `min_unique_buyers`, `min_net_flow_sol` oder `min_score` hoch.
- **Zu spät dran?** `window_seconds` auf 30 runter und `min_unique_buyers` etwas runter.
- **Viele Bot-Fakes?** `min_buy_sol` hoch (z. B. 0.1) und `max_top_buyer_share` runter.

Achtung: Aufzeichnungen werden schnell groß (je nach Marktlage zig MB pro Stunde).

## Grenzen – bitte lesen

- **Nur pump.fun / Solana.** Andere Launchpads oder Chains sind nicht drin.
- **Sniper im Launch-Block sieht der Bot nicht**, weil er die Trades erst nach dem Launch
  abonnieren kann. Bundles, die sofort beim Launch kaufen, fallen über den Top-Holder-Filter nur
  auf, wenn sie später handeln.
- **Wash-Trading mit vielen Wallets** (ein Akteur, viele Wallets) lässt sich so nicht sicher
  erkennen. Der Mindestkauf und der Wal-Filter helfen, sind aber kein Schutz.
- Für die Trade-Daten, auf denen v1 aufbaut, verlangt PumpPortal seit dem 01.05.2026 einen
  API-Key (`[source] api_key`) und eine Wallet mit mindestens 0,02 SOL; die Nachrichten werden
  einzeln abgerechnet (0,01 SOL pro 10.000). Ohne Key kommen nur Launch-Events an, und der Bot
  signalisiert nichts.
- Bitte nur **eine** Bot-Instanz gleichzeitig laufen lassen – PumpPortal sperrt sonst ggf. deine IP.

## Tests

```bash
pip install pytest
python -m pytest
```

## Aufbau

| Datei | Inhalt |
|---|---|
| `memecoin_bot/pumpportal.py` | WebSocket-Verbindung mit Auto-Reconnect und Re-Subscribe |
| `memecoin_bot/tracker.py` | Zustand pro Coin, Zeitfenster, Aufräumen, Signal-Entscheidung |
| `memecoin_bot/analyzer.py` | Kennzahlen, Filter, FOMO-Score |
| `memecoin_bot/notifiers.py` | Alert-Text, Konsole, Telegram, Discord, Signal-Log |
| `memecoin_bot/enrich.py` | Socials aus den Token-Metadaten, SOL/USD-Kurs |
| `memecoin_bot/demo.py` | simulierte Coins mit echter Bonding-Curve-Mathematik |
| `memecoin_bot/app.py` | Live-, Replay-, Demo- und Test-Modus |
