# Memecoin-Strategie: Was der Markt 2026 wirklich hergibt

> **Stand: 17.10.2026. Dies ist keine Finanz-, Anlage- oder Steuerberatung.**
> Dieses Dokument fasst zusammen, was Studien, Messungen und offizielle Dokumentationen über pump.fun sagen. Es zeigt auch, wie der geplante FOMO-Signal-Bot (v2) damit umgeht.
> Jede Zahl steht mit Datum oder Zeitraum und mit Quelle da.
> - **(unbestätigt)** heißt: nur eine Quelle, eine Sekundärquelle, ungeprüfte Anbieterdaten oder nicht nachprüfbar.
> - **Faustregel** heißt: Erfahrungswert oder Designentscheidung, nicht getestet.
>
> Der Markt ändert sich innerhalb von Wochen. Prüf die Zahlen, bevor du dich auf sie verlässt.

## Kernaussagen (TL;DR)

1. **Die meisten verlieren Geld.** 74 % von 2,9 Mio. Käufern von Solana-Memecoins hatten zwei Wochen nach dem Kauf weniger SOL als vorher. Das oberste 1 % der Käufer bekam 56 % aller Gewinne ([Bitquery, Stichprobe Nov. 2025 bis Aug. 2026](https://bitquery.io/investigations/solana-memecoin-traders-lose-money)).
2. **Fast jeder Coin ist nach einem Tag tot.** 68,67 % der pump.fun-Tokens wurden zuletzt am Tag ihres Launches gehandelt. Nur 4,55 % wurden nach 90 Tagen noch gehandelt ([CoinGecko, Tokens vom 14.01.2024 bis 18.06.2026](https://cryptobriefing.com/pump-fun-token-survival-rate-study/)).
3. **Insider sind schneller als du.** Sniper, die der Coin-Ersteller selbst finanziert hat, waren zu 85 % nach fünf Minuten wieder ausgestiegen ([Pine Analytics, ca. April 2025](https://beincrypto.com/pump-fun-meme-coin-snipers-systematic-problem/)). In einer Studie lag das einzige durchgehend profitable Einstiegsfenster in den ersten 10 Sekunden ([Bitquery via TechFlow, Sep. 2026, Sekundärquelle](https://techflowpost.com/en-US/article/33966)). Ein Mensch mit iPhone erreicht dieses Fenster nicht. Der Bot ist deshalb ein **Filter gegen Schrott**, kein Geschwindigkeitsvorteil.
4. **Viele „Signale“ sind gekauft.** Mindestens 17 % aller Trades sind Wash-Trades, also Scheingeschäfte ([Meme Coin Factories, ~15 Mio. Coins über zwei Jahre, Sep. 2026](https://arxiv.org/abs/2609.10246)). Käuferzahl, Trade-Anzahl und Volumen lassen sich fälschen. Echten Netto-Zufluss an SOL zu fälschen kostet dagegen echtes Geld.
5. **Kosten fressen den Vorteil.** Ab heute (17.10.2026) kostet ein Trade auf der Kurve über die pump.fun-App 1,70 % pro Richtung ([pump.fun Fees](https://pump.fun/docs/fees)). Kaufst du 0,2 SOL über einen Telegram-Bot mit Jito-Tip und verkaufst wieder, zahlst du rund 5,5–9,5 %, und Slippage kommt noch dazu ([Rechnung nach MadeOnSol u. a., 2026](https://madeonsol.com/compare/pump-portal-vs-pump-fun)).
6. **Direkt nach der Graduation wird abverkauft.** Das Kurstief der ersten 10 Minuten lag im Median 50 % unter dem Preis 10 Sekunden nach der Migration ([Launchtape, 2.193 Graduations, 10.–12.10.2026](https://dev.to/launchtape/what-2193-pumpfun-graduations-did-in-their-first-10-minutes-and-what-it-means-for-your-bot-4f70)). Der Bot signalisiert deshalb nie nach einer Migration.
7. **Der Markt kippt innerhalb von Wochen.** Mitte Juni 2026 lag die 7-Tage-Graduation-Rate bei 0,26 % ([The Block via Bloomingbit, 16.06.2026](https://en.bloomingbit.io/feed/news/114409)). Nach dem Start von BOOST lag sie an einem Tag bei 6,7 % ([The Block, 29.07.2026](https://theblock.co/post/409815/pump-fun-token-graduation-rate-jumps-boost-changes-launch-incentives)). Feste Schwellen veralten deshalb. Der Bot muss ehrlich gemessen und regelmäßig neu kalibriert werden.
8. **Sicherheit und Steuern sind Pflicht.** Der Bot bekommt nie einen Private Key. In Deutschland ist jeder Swap ein steuerpflichtiges privates Veräußerungsgeschäft nach §23 EStG, auch SOL → Memecoin ([stock3](https://stock3.com/news/kryptowaehrungen-versteuern-haltefristen-freigrenzen-und-steuerfallen-im-ueberblick-17282471); [BMF-Schreiben vom 06.03.2025](https://www.deubner-steuern.de/themen/bitcoin-steuer/bmf-632025.html)).

---

## Wie pump.fun funktioniert

### Das Prinzip in drei Schritten

1. **Launch.** Jemand erstellt in Sekunden einen Coin. Ein Standard-Coin hat einen Supply von 1 Mrd. Tokens ([SDK-Doku](https://skills.sh/sendaifun/skills/pumpfun)).
2. **Bonding Curve.** Am Anfang gibt es keinen Liquiditätspool. Ein Programm verkauft die Tokens entlang einer festen Preiskurve. Jeder Kauf macht den nächsten Token teurer, jeder Verkauf macht ihn billiger.
3. **Graduation (Migration).** Sind rund 793,1 Mio. Tokens von der Kurve verkauft, zieht der Coin auf pump.funs eigene Börse **PumpSwap** um. Das entspricht ca. 85 echten SOL in der Kurve. PumpSwap gibt es seit dem 20.03.2025, vorher ging die Migration zu Raydium ([The Block, 2025](https://www.theblock.co/post/347360/pump-fun-launches-dex-called-pumpswap-to-instantly-migrate-graduated-tokens)).
   - Die LP-Tokens werden dabei verbrannt.
   - Die Migrationsgebühr beträgt 0,015 SOL. Zu Raydium-Zeiten waren es ~6 SOL ([pump.fun Fees, Stand Okt. 2026](https://pump.fun/docs/fees)).

### Die Formeln der Bonding Curve

Die Kurve folgt dem Konstantprodukt-Prinzip auf **virtuellen Reserven**. Ein Standard-Coin startet mit 30 virtuellen SOL (vSol) und 1,073 Mrd. virtuellen Tokens (vTokens) ([SDK-/Decoder-Doku](https://skills.sh/sendaifun/skills/pumpfun)).

```text
k              = vSol × vTokens = 30 × 1,073 Mrd. ≈ 32,19 Mrd.   (bleibt konstant)
Preis          = vSol / vTokens = vSol² / k                        [SOL pro Token]
Market Cap     = Preis × 1 Mrd. = vSol² / 32,19                    [SOL]
Echte SOL      = vSol − 30
Fortschritt    = (793,1 Mio. − real_token_reserves) / 793,1 Mio.
Restpotenzial  = MC bei Graduation / MC jetzt = (115 / vSol)²       [Faktor]
```

Bei der Graduation ist vSol = 115 (30 virtuelle plus 85 echte SOL). Die Market Cap liegt dann bei ≈ 410 SOL ([pump.fun Fees](https://pump.fun/docs/fees); [SDK-Doku](https://skills.sh/sendaifun/skills/pumpfun)).

Die Werte unten sind aus den Formeln gerechnet und gelten für einen Standard-Coin:

| Fortschritt | Echte SOL in der Kurve | Market Cap | Restpotenzial bis Graduation |
|---|---|---|---|
| 0 % | 0 | ≈ 28 SOL | ≈ 14,7× |
| 10 % | ≈ 2,4 | ≈ 33 SOL | ≈ 12,6× |
| 30 % | ≈ 8,5 | ≈ 46 SOL | ≈ 8,9× |
| 50 % | ≈ 17,6 | ≈ 70 SOL | ≈ 5,8× |
| 65 % | ≈ 27,7 | ≈ 104 SOL | ≈ 4,0× |
| 100 % | ≈ 85 | ≈ 410 SOL | 1× |

Der Bot signalisiert nur zwischen 10 und 65 % Fortschritt. Das entspricht etwa 33–104 SOL Market Cap.

**Drei Dinge, die du dazu wissen musst:**

- **Das Restpotenzial ist eine Obergrenze, keine Erwartung.** Je nach Zeitraum graduieren nur 0,2–6,7 % aller Coins (Tabelle unten). Nach der Graduation fällt der Kurs außerdem oft hart.
- **Rechne den Preis immer aus den virtuellen Reserven**, nicht aus dem SOL-Guthaben des Kurven-Kontos. Gebühren können inzwischen auf der Kurve liegen bleiben (`creator_fee`, `protocol_fees`). Die Felder heißen jetzt `virtual_quote_reserves` und `real_quote_reserves` ([pump-public-docs, README Stand 13.10.2026](https://github.com/pump-fun/pump-public-docs/blob/main/README.md); [IDL](https://github.com/pump-fun/pump-public-docs/blob/main/idl/pump.json)).
- **Die Formeln gelten nur für Standard-Coins mit SOL-Paar.** Der Bot darf deshalb weder 1 Mrd. Supply noch die Startreserven fest einprogrammieren. Die Ausnahmen:
  - Mayhem-Coins haben laut Presse 2 Mrd. Supply. Ihre virtuellen Reserven können Admins ändern ([Program-README](https://github.com/pump-fun/pump-public-docs/blob/main/docs/PUMP_PROGRAM_README.md); [The Block, Nov. 2025](https://www.theblock.co/post/379285/pump-funs-new-mayhem-mode-fails-boost-token-launches-revenue)).
  - USDC-Coins graduieren bei ca. 58,8k $ Market Cap ([The Defiant, Mai 2026](https://thedefiant.io/news/defi/pump-fun-launches-usdc-paired-liquidity-pools-gi72da)).
  - Seit dem 13.10.2026 können Coins auch in anderen pump-Coins notiert sein („depth 2“).
  - Eine „synthetische Migration“ lässt den letzten Kauf über das Ende der Kurve hinausgehen ([README](https://github.com/pump-fun/pump-public-docs/blob/main/README.md)).

**Wie stark dein eigener Kauf den Preis bewegt:** Kaufst du für x SOL, zahlst du im Schnitt etwa das (1 + x / vSol)-Fache des aktuellen Preises, Gebühren nicht mitgerechnet. Beispiel: 0,2 SOL bei 50 % Fortschritt (vSol ≈ 47,6) ergeben rund 0,4 % Aufschlag. Das ist wenig. Das eigentliche Preisrisiko sind andere Käufer zwischen Alarm und Ausführung (siehe Timing).

### Wie oft und wie schnell Coins graduieren

Die Zahlen widersprechen sich stark, weil jede Quelle anders zählt:

| Zeitraum | Graduation-Rate | Quelle | Haken |
|---|---|---|---|
| 01.09.–01.10.2025 | 0,63 % | [Marino et al., arXiv 2602.14860](https://arxiv.org/html/2602.14860v1) | 655.770 Tokens. 4.338 Graduates ergeben eigentlich 0,66 %. |
| ~2 Jahre bis 2026 | 1,02 % | [Meme Coin Factories](https://arxiv.org/abs/2609.10246) | ~15 Mio. Coins, Durchschnitt über zwei Jahre |
| Apr. 2026 | 0,84 % | [pumpfundata](https://pumpfundata.com/blog/pumpfun-graduation-rate-analysis) | Anbieterdaten |
| 08.05.–10.06.2026 | 0,198 % | [Kamat, arXiv 2607.02823 v3](https://arxiv.org/html/2607.02823v3) | Nur Untergrenze: Der Datensammler sah jeweils nur die ersten ~6 Minuten. |
| Mitte Juni 2026 (7-Tage-Schnitt) | 0,26 % | [The Block via Bloomingbit, 16.06.2026](https://en.bloomingbit.io/feed/news/114409) | The Block nennt später 6,7 % das „~8-Fache des Juni-Schnitts“. Das ergäbe ~0,8 %, ein Widerspruch. |
| Mitte 2026 | ~0,4–0,6 % | [MadeOnSol](https://madeonsol.com/blog/pump-fun-first-3-minutes-graduation-math) | Anbieterdaten |
| 23.06.–19.07.2026 | 1,71 % (andere Auswertung: 1,41 %) | [Scorp Labs](https://trader.scorplabs.online/blog/pump-fun-graduation-rate-dev-signal-12-percent) | Anbieterdaten, nicht begutachtet |
| 4 Tage bis 29.07.2026 | 4,7 % (bester Tag 6,7 %, Vorwoche 2,5 %) | [The Block, 29.07.2026](https://theblock.co/post/409815/pump-fun-token-graduation-rate-jumps-boost-changes-launch-incentives) | Werte nach dem Start von BOOST |
| Kohorten vom 06./13./20.08.2026 | 2,84 / 2,69 / 2,60 % | [Bitquery via Medium](https://medium.com/coinmonks/pump-fun-api-how-to-track-bonding-curves-graduations-and-pumpswap-on-chain-879b689fbedb) | bis zum 02.09.2026 verfolgt |

**Fazit:** Es gibt keine feste Basisrate. Programmier keine ein.

**Wie schnell graduieren Coins?**
- Kohorte vom 13.08.2026 (1.038 Graduates): Median ~2 Minuten bis zur Graduation, 86,8 % innerhalb einer Stunde ([Bitquery via Medium](https://medium.com/coinmonks/pump-fun-api-how-to-track-bonding-curves-graduations-and-pumpswap-on-chain-879b689fbedb)).
- Sep. 2025: Median ~4,4 Minuten ([Marino et al.](https://arxiv.org/html/2602.14860v1)).
- MadeOnSol meldet andere Werte (unbestätigt): ~80 % der Graduates sind innerhalb von 6 h fertig und ~30 % innerhalb von 30 min. Wer nach 24 h nicht graduiert ist, schafft es selten ([MadeOnSol, 2026](https://madeonsol.com/blog/pump-fun-first-3-minutes-graduation-math)).

Erfolgreiche Coins sind also oft sehr schnell. Das spielt für das Timing des Bots eine große Rolle.

### Was bei der Migration passiert: BOOST

Seit dem 21.07.2026 ist **BOOST** Standard für Coins, die nach 10:23 Uhr ET migrieren. So funktioniert es:
- Rund 20 % der Migrationsliquidität werden in den ersten 5 Minuten nach der Migration per TWAP zurückgekauft und verbrannt.
- Das sind 17,6 SOL bei SOL-Paaren oder 2.516 $ bei USDC-Paaren.
- Mayhem-Coins sind ausgenommen ([The Defiant, 21.07.2026](https://thedefiant.io/news/defi/pump-fun-adds-boost-liquidity-mode-for-every-new-coin)).

Was daraus folgt:
- Dieser Teil der Liquidität bleibt nicht im Pool ([The Defiant, Mai 2026](https://thedefiant.io/news/defi/pump-fun-launches-usdc-paired-liquidity-pools-gi72da)).
- BOOST kauft erst, wenn die Kurve abgeschlossen ist. Der Anstieg der Graduation-Rate danach kommt also von verändertem Verhalten der Teilnehmer, nicht vom Mechanismus selbst.
- Das 5-Minuten-Fenster ist fest und öffentlich bekannt. Bots können vorher kaufen und es so ausnutzen (Front-Running) ([The Block, 29.07.2026](https://theblock.co/post/409815/pump-fun-token-graduation-rate-jumps-boost-changes-launch-incentives)).

### Gebühren (Kurzfassung)

| Wo | Gebühr | Stand | Quelle |
|---|---|---|---|
| Bonding Curve | 1,25 % (0,30 % Creator + 0,95 % Protokoll + 0 % LP) | Okt. 2026 | [pump.fun Fees](https://pump.fun/docs/fees) |
| pump.fun Web/App | +0,45 % (0,40 % mit Referral), gilt auch für Erstkäufe und bedingte Orders, nicht für Perps | ab 17.10.2026 | [pump.fun Fees](https://pump.fun/docs/fees); [TokenPost](https://www.tokenpost.com/news/business/33804) |
| Kurve über die App, ohne Referral | **1,70 % pro Trade** | ab 17.10.2026 | [pump.fun Fees](https://pump.fun/docs/fees) |
| PumpSwap (nach Graduation) | Creator-Anteil nach Market Cap gestaffelt: ~0,95 % (< 300k $) bis 0,05 % (> 20 Mio. $). Protokoll- und LP-Anteil bleiben unverändert. | „Project Ascend“, angekündigt 02.09.2025 | [Blockworks](https://blockworks.co/news/pumpdotfun-fee-model); [Decrypt](https://decrypt.co/337872/pump-funs-new-fee-model-hands-out-2m-to-creators-in-first-24-hours) |
| Migration | 0,015 SOL | Okt. 2026 | [pump.fun Fees](https://pump.fun/docs/fees) |

Gut zu wissen:
- Die App-Gebühr ohne Referral fließt in einen „Callout Rewards“-Topf.
- Bots, die direkt on-chain handeln (z. B. über PumpPortal), umgehen die App-Gebühr möglicherweise ([pump.fun Fees](https://pump.fun/docs/fees)).
- Ältere Quellen nennen noch 1 % auf der Kurve ([Datawallet](https://datawallet.com/crypto/what-is-pump-fun-and-create-a-coin)). Das ist veraltet.
- Bei Custom Pairs sollen Creator eine Creator-Gebühr von 0,05–1 % wählen können. Das passt nicht zu den 0,30 % auf der Gebührenseite ([Bankless, Sep. 2026](https://www.bankless.com/read/news/pump-fun-launches-custom-pairs-for-tokenized-stocks)) (unbestätigt).

### Neue Mechaniken 2025–2026

| Datum | Neuerung | Was das für dich und den Bot heißt |
|---|---|---|
| 12.11.2025 | **Mayhem Mode**: zusätzlich 1 Mrd. Tokens für einen KI-Agenten, nicht genutzte Tokens werden nach 24 h verbrannt ([The Block](https://www.theblock.co/post/379285/pump-funs-new-mayhem-mode-fails-boost-token-launches-revenue)) | Die Kurvenmathematik ist anders, deshalb filtert der Bot diese Coins aus. In einer Stichprobe waren ~23 % der SOL-Creates Mayhem-Coins (Okt. 2026, [floor-mop-Log](https://github.com/sm33f3r/floor-mop/blob/e88af815cc3896cdfaf89a211ee41976babb92a3/roadmaps/floor_mop_phase1_project_log.md), unbestätigt). |
| 09.01.2026 | **Creator-Fee-Sharing**, manche Quellen nennen den 10.01. ([The Block](https://www.theblock.co/post/384975/pump-fun-overhauls-creator-fees-token-launches-highest-daily-september)) | Creator und CTO-Admins können Gebührenanteile verteilen. |
| 17.02.2026 | **Cashback Coins** ([Cointelegraph](https://regional-front.cointelegraph.com/news/pumpfun-launches-cashback-coins-rewards)) | Inzwischen eingestellt: `create_v2` lehnt Cashback ab. Neu ist der Coin-Typ „Holder Rewards“ ([pump-public-docs](https://github.com/pump-fun/pump-public-docs/blob/main/docs/HOLDER_REWARDS_README.md)). |
| 01.05.2026 | **PumpPortal**: Trade-Streams kosten Geld (Key, Wallet mit ≥ 0,02 SOL, 0,01 SOL pro 10.000 Nachrichten) ([PumpPortal](https://pumpportal.fun/data-api/real-time/)) | Der Bot nutzt nur die kostenlosen Create- und Migration-Events. |
| 21.05.2026 | **USDC-Coins** ([Crypto Briefing](https://cryptobriefing.com/pump-fun-usdc-liquidity-pools/)) | Andere Graduation-Schwelle. Der Bot filtert Coins aus, die nicht in SOL notiert sind. |
| 21.07.2026 | **BOOST** ([The Defiant](https://thedefiant.io/news/defi/pump-fun-adds-boost-liquidity-mode-for-every-new-coin)) | Kein Signal nach der Migration (siehe oben). |
| 09.09.2026 | **Custom Pairs**: 93 Quote-Assets inkl. tokenisierter Aktien über Sunrise und xStocks. 50 % der Einnahmen gehen in PUMP-Rückkäufe ([FXStreet](https://www.fxstreet.com/cryptocurrencies/news/pumpfun-launches-custom-pairs-for-tokenized-stocks-and-real-world-assets-on-solana-202609100558)). Bankless datiert auf den 10.09. | Launches mit Aktienpreis stiegen von 53/Tag (12.08.2026) auf 4.270/Tag (09.09.2026) ([Bitquery](https://bitquery.io/investigations/pump-fun-stock-tokens-meme-coins)). |
| 30.09.2026 | `virtual_quote_reserves` eines PumpSwap-Pools kann negativ sein ([README](https://github.com/pump-fun/pump-public-docs/blob/main/README.md)) | Nach der Migration rechnet man den Preis mit Vault + `virtual_quote_reserves`. |
| 13.10.2026 | Notierung in anderen pump-Coins möglich („depth 2“) ([README](https://github.com/pump-fun/pump-public-docs/blob/main/README.md)) | Strukturbruch für die Statistik |
| 17.10.2026 | **App-Gebühr 0,45 %** ([pump.fun Fees](https://pump.fun/docs/fees)) | Strukturbruch für Kosten und Statistik |
| Okt. 2026 | Hyperliquid-Perps auf pump.fun ([Gokhshtein](https://gokhshtein.com/news/2026-10-07-fomo-tops-pumpfun-in-daily-revenue-as-hyperliquid-perps-go)) | – |
| Datum unklar | Eigene Limit-Orders mit Take-Profit und Stop-Loss in der App, angekündigt am „2. Sep.“. Das Jahr ist in den Quellen uneinheitlich ([Phemex](https://phemex.com/news/article/pumpfun-launches-solana-limit-orders-with-takeprofit-and-stoploss-tools-95256); [Crypto Briefing](https://cryptobriefing.com/pumpfun-limit-orders-solana-tokens/)) | Auf bedingte Orders fällt ab dem 17.10.2026 die App-Gebühr an. Bei Kurslücken garantieren sie keinen Preis. |

Rund 10 % der pump.fun-Creates sind nicht in SOL notiert, sondern z. B. in USDC oder PUMP (Okt. 2026, [floor-mop-Log](https://github.com/sm33f3r/floor-mop/blob/e88af815cc3896cdfaf89a211ee41976babb92a3/roadmaps/floor_mop_phase1_project_log.md), unbestätigt).

### Konkurrenz und Marktlage

- **LetsBonk** überholte pump.fun im Juli 2025 ([The Block, 06.07.2025](https://theblock.co/post/361189/letsbonk-dethrones-pump-fun-with-higher-daily-memecoin-volume-token-launches)).
  - Laut Decrypt kam LetsBonk auf 58,5 % der neu erstellten Solana-Tokens ([Decrypt, Juli 2025](https://decrypt.co/328822/bonk-meme-coin-launchpad-flips-pump-fun-for-solana-tokens-created)).
  - Ein Substack nennt als Spitze ~65,9 % der Launches am 08.07.2025 (unbestätigt).
  - Im Aug./Sep. 2025 holte sich pump.fun die Führung zurück ([stepdata](https://stepdata.substack.com/p/solana-launchpad-showdown-pumpfun)).
- **September 2026:**
  - StonkFun verlegte seine Launches um den 05./06.09.2026 auf Raydium LaunchLab und verdiente an einem Tag mehr als pump.fun ([The Block](https://www.theblock.co/news/defi/2026-09-06-stonk-surges-250-to-140-million-market-cap-as-stonkfun-pulls-volume-to-raydium-and-jupiter-413621); [CoinDCX](https://coindcx.com/blog/crypto-news-global/solana-launchpad-stonkfun-out-earned-pump-fun-for-a-day/)).
  - Über 30 Tage (09.08.–07.09.2026) kam pump.fun auf 64,20 % Umsatzanteil, Pons (Robinhood Chain) auf 28,21 % und StonkFun auf 7,58 %. Das ist ein Vergleich über mehrere Chains ([CoinDCX](https://coindcx.com/blog/crypto-news-global/solana-launchpad-stonkfun-out-earned-pump-fun-for-a-day/)).
  - Ende Sep. 2026 hatte pump.fun wieder > 73 % des täglichen Launchpad-Umsatzes auf Solana ([Crypto Economy nach Blockworks](https://crypto-economy.com/pump-fun-retakes-the-lead-in-solanas-launchpad-race/)).
- **Oktober 2026:** Um den 07.10.2026 verdiente Fomo an einem Tag mehr als pump.fun ([Gokhshtein](https://gokhshtein.com/news/2026-10-07-fomo-tops-pumpfun-in-daily-revenue-as-hyperliquid-perps-go)).
- **Umsatz von pump.fun:**
  - CryptoTicker nennt ~1,59 Mio. $ pro Tag am 09.10.2026, nach −16 % seit dem 05.10. ([CryptoTicker](https://cryptoticker.io/en/pump-fun-revenue-buyback/)).
  - DefiLlama zeigte ~1,1 Mio. $ am 07.10.2026 ([DefiLlama](https://defillama.com/protocol/pump.fun)). Die Tracker widersprechen sich also.
  - In den sechs Monaten bis Juni 2026 fiel der Umsatz um mehr als 80 %: von 4,8 Mio. $ auf ~0,8 Mio. $ pro Tag im Juni-Schnitt ([Yahoo Finance/The Block](https://finance.yahoo.com/markets/crypto/articles/pump-fun-activity-plunges-80-193800825.html)).
- **Launches pro Tag:**
  - Am 09.09.2026 waren 34.184 von 40.360 Launchpad-Tokens auf Solana pump.fun-Launches. An diesem Tag stellte Solana mit 263k SPL-Mints einen Rekord auf ([Cointelegraph nach Blockworks](https://cointelegraph.com/news/solana-record-263k-tokens-issued)).
  - Bitquery zählte im April 2026 ~2.100 Launches pro Stunde, also ~50k pro Tag ([Bitquery](https://docs.bitquery.io/docs/mcp/trading/examples/pumpfun-launch-pulse/)).
  - Eine feste Spanne von „30.000–52.000 pro Tag“ ließ sich nicht belegen (unbestätigt).

---

## Wer verdient – und wer verliert

### Was Trader tatsächlich erreichen

| Studie | Zeitraum | Ergebnis | Haken |
|---|---|---|---|
| Bitquery | je eine Launch-Woche pro Monat, Nov. 2025 bis Aug. 2026 | 74 % von 2,9 Mio. Käufern hatten nach 2 Wochen weniger SOL. Median-Verlust 13 $, Gesamtverlust ~269 Mio. $, Monatswerte 70–79 % ([Bitquery](https://bitquery.io/investigations/solana-memecoin-traders-lose-money)) | alle Solana-Memecoins, nicht nur pump.fun |
| Bitquery, Aktien-Tokens | 31 Tage im Sep. 2026: 43,3 Mio. Trades, 148k Tokens, 5 Launchpads | ~3/4 der Käufer verloren, zusammen ~287 Mio. $ netto ([TechFlow](https://techflowpost.com/en-US/article/33966)) | Sekundärquelle (unbestätigt) |
| CoinGecko | Jun. 2025 → Apr. 2026 | Der Anteil profitabler Trader stieg von 30,08 % auf 73,28 % ([CoinGecko](https://www.coingecko.com/research/publications/pump-fun-traders-are-making-a-comeback)) | nur realisierte Gewinne, Bots und Wash-Trades nicht herausgefiltert |
| Dune (via Decrypt) | Jan. 2025 | Nur 0,4 % von ~13,4 Mio. Wallets (55.012) machten mehr als 10.000 $ Gewinn ([Decrypt](https://decrypt.co/300403/pump-fun-traders-millionaires)) | – |
| Dune (@defioasis) | Jul. 2025 | Von 4,257 Mio. Adressen mit mehr als 10 gehandelten Tokens verloren 56,6 % zwischen 0 und 1.000 $ ([BeInCrypto](https://beincrypto.com/pump-fun-trading-data-majority-lose-money/)) | – |

Die Zahl der monatlich aktiven Wallets fiel von 5,2 Mio. (Mai 2025) auf 1,8 Mio. (Dez. 2025) und stieg wieder auf 3,14 Mio. (Apr. 2026) ([BeInCrypto](https://beincrypto.com/pump-fun-traders-profit-comeback-meme-coin-season/); [CoinGecko](https://www.coingecko.com/research/publications/pump-fun-traders-are-making-a-comeback)).

**Warum passen „73 % profitabel“ (CoinGecko) und „74 % Verlierer“ (Bitquery) nicht zusammen?** Die Methoden sind verschieden. CoinGecko zählt nur realisierte Gewinne und lässt Bot-Wallets drin. Bitquery misst, ob ein Käufer zwei Wochen später mehr oder weniger SOL hat. Du hast keinen Bot-Vorsprung. Rechne deshalb mit der vorsichtigeren Zahl.

### Wer zuverlässig verdient

1. **Sniper, die der Ersteller finanziert.** Pine Analytics hat einen Monat ausgewertet (Bericht ca. 21.04.2025). Gemeint sind Sniper, die im selben Block wie der Launch kaufen und vom Deployer finanziert wurden.
   - Sie verdienten zusammen mehr als 15.000 SOL. 87 % ihrer Snipes waren profitabel.
   - 11 % stiegen innerhalb von 15 s aus, 55 % innerhalb von 1 min und 85 % innerhalb von 5 min.
   - Das betraf rund 1,75 % aller Launches: über 15.000 Launches, mehr als 4.600 Sniper-Wallets und mehr als 10.400 Deployer.
   - Gezählt wurden nur direkte Finanzierungen. Die Zahlen sind also eine Untergrenze ([Pine Analytics](https://pineanalytics.substack.com/p/exit-liquidity-machines); [BeInCrypto](https://beincrypto.com/pump-fun-meme-coin-snipers-systematic-problem/)).
2. **Coin-Fabriken.** Die Studie hat Creator nach gemeinsamer Finanzierung zu Gruppen zusammengefasst. Das oberste 1 % dieser Gruppen hat 58,6 % aller Coins erstellt ([Meme Coin Factories, Sep. 2026](https://arxiv.org/html/2609.10246v1)).
3. **Sandwich-Bots.** Vom 30.10.2025 bis 07.10.2026 haben sie brutto ~29,7 Mio. $ abgeschöpft.
   - Das waren 6.850.144 Angriffe von 2.545 Bot-Wallets.
   - 96 % davon liefen auf der pump.fun-Kurve oder auf PumpSwap.
   - 39 % der Beute kam von anderen Bots ([Bitquery](https://bitquery.io/investigations/solana-sandwich-attacks); [CryptoSlate](https://cryptoslate.com/solana-sandwich-bots-took-29-7-million-before-costs-bitquery-estimates/)).
4. **Die Plattform.** Sie verdient an jedem Trade, Anfang Okt. 2026 ~1,1–1,59 Mio. $ pro Tag (siehe oben).
5. **Rug-Betreiber.** Im ersten Halbjahr 2025 wurden 76.469 neue Solana-Tokens als Rugs eingestuft. Der Schaden lag bei mindestens 151 Mio. $, verdient haben 7.322 Adressen ([From Hype to Collapse, arXiv 2603.24625, v2 vom 31.05.2026](https://arxiv.org/abs/2603.24625)). Diese Tokens lagen in DEX-Pools (Orca, Raydium, Meteora), nicht auf der pump.fun-Kurve ([Pith-Review](https://pith.science/paper/2603.24625)).

Von über 7 Mio. pump.fun-Tokens mit mindestens 5 Trades (Jan. 2024 bis Mär. 2025) fielen 98,6 % unter 1.000 $ Liquidität ([Solidus Labs, Mai 2025](https://www.soliduslabs.com/reports/solana-rug-pulls-pump-dumps-crypto-compliance); [Forklog](https://forklog.com/en/report-98-of-pump-funs-memecoins-deemed-scams/)).

### Die Gewinne sind extrem konzentriert

Das oberste 1 % der Käufer bekam 56 % aller Gewinne ([Bitquery, Nov. 2025 bis Aug. 2026](https://bitquery.io/investigations/solana-memecoin-traders-lose-money)). Daraus folgt zweierlei:

- **Für dich:** Wer „jemanden kennt, der 100× gemacht hat“, sieht den seltenen Ausreißer. Der typische Trade verliert.
- **Für den Bot:** Ein Durchschnittsgewinn sagt fast nichts. Ein oder zwei Mondraketen verzerren ihn. Deshalb wertet der Bot Median, Trefferquote und Konfidenzintervalle aus (siehe Erfolgsmessung).

---

## Manipulation erkennen

Die Studie „Meme Coin Factories“ definiert Manipulation so: Jemand fälscht Handels-, Besitz-, Bedeutungs- oder Social-Signale, um ahnungslose Trader anzulocken und später an ihnen zu verdienen ([arXiv 2609.10246, Sep. 2026](https://arxiv.org/abs/2609.10246)). Die Studie unterscheidet fünf Klassen und beschreibt Werkzeuge, die Manipulation als Dienstleistung anbieten.

Belege dafür:
- Anbieter von Volumen-Bots werben offen damit, die Filter von Scannern zu überlisten, die nach Volumen, Holder- und Trade-Anzahl filtern ([gts.ai, Anbieterseite](https://gts.ai/defi/pumpfun-volume-bot)).
- Ein Dune-Analyst fand bei manchen Tokens bis zu 60–80 % Bot-Anteil am Umsatz ([Forklog, 2025, eine Quelle](https://forklog.com/en/expert-highlights-bot-infiltration-on-pump-funs-meme-token-platform/)).
- Eine Studie mit ~6.000 pump.fun-Coins fand: Aufmerksamkeits-Manipulation wie Wash-Trading und Fake-Kommentare zieht tatsächlich mehr Trader an. Bundle- und Sniper-Bots verschleiern zugleich, wie viel jemand ansammelt ([SBFC 2025](https://sbfc.sydney.edu.au/2025/papers/SBFC2025_4G3_P154.pdf)).

**Das heißt für den Bot:** Seine „Bestätigt“-Schwellen sind genau die Metriken, die Manipulatoren fälschen. Das gilt für ≥ 40 Trades, Buy-Ratio ≥ 0,55, Ø-Trade ≥ 0,10 SOL, Top10 ≤ 30 % und Socials. Solche gefälschte Traktion nennt man „Bot-Bait“.

| Muster | Woran man es erkennt | Was der Bot prüft | Was der Bot NICHT sehen kann |
|---|---|---|---|
| **Sniper, vom Dev finanziert** | Käufe im selben Block wie der Launch, Wallets vom Deployer finanziert, Ausstieg nach Minuten ([Pine, Apr. 2025](https://beincrypto.com/pump-fun-meme-coin-snipers-systematic-problem/)) | Wallets aus dem ersten Slot und wie viel sie noch halten (≤ 15 %). Gemeinsame Funder geben einen Score-Abzug. | Finanzierung über mehrere Zwischen-Wallets oder Börsen. Sniper, die erst im 2. oder 3. Slot kaufen. |
| **Bundles (Jito)** | Gebündelte Käufe im selben Block, frühe Käufer halten viel Supply. Wallet-Gruppen einer Partei halten im Schnitt ~36,5 %, je nach Definition ([MELT/MemeTrans, Daten Dez. 2024 bis Mär. 2025](https://arxiv.org/html/2602.13480v2)) | First-Slot-Anteil, Top1 ≤ 8 %, Top10 ≤ 30 % (Curve-Vault nicht mitgezählt) | Bundle-IDs, die der kostenlose RPC nicht liefert. Supply, der auf viele frische Wallets verteilt ist und so die Top1/Top10-Grenzen umgeht. |
| **Wash-Trading und Volumen-Bots** | Viele Trades, aber wenig Netto-Zufluss. Dieselben Wallets kaufen und verkaufen. Mindestens 17 % aller Trades sind Wash-Trades ([Meme Coin Factories](https://arxiv.org/abs/2609.10246)). | Netto-Zufluss ≥ 3 SOL in 2 min, Ø-Trade ≥ 0,10 SOL, Buy-Ratio | Wash-Trades zwischen Wallets mit unterschiedlicher Finanzierung. Bots, die gezielt knapp über Scanner-Schwellen bleiben. |
| **Coin-Fabriken, Serien-Deployer** | Eine Gruppe launcht viele Coins: das oberste 1 % der Gruppen 58,6 % aller Coins ([Meme Coin Factories](https://arxiv.org/html/2609.10246v1)) | ≥ 3 Launches in 24 h vom selben Deployer → raus | Jeder Launch mit neuer Wallet, die aus einer gemeinsamen Quelle finanziert ist |
| **Copycats** | Name oder Symbol eines Trend-Coins | Symbol ≥ 5× in 6 h → raus | Abwandlungen mit Tippfehler, Emoji oder anderer Schreibweise |
| **Dev-Dump** | Der Dev kauft viel und verkauft in den Anstieg hinein | Dev-Kauf > 20 % Supply → raus, Dev-Anteil fließt in den Score | Ein Dev, der seine Tokens vorher auf andere Wallets verteilt |
| **Fake-Aufmerksamkeit** | Neue oder leere Accounts, eine Flut von Kommentaren ([SBFC 2025](https://sbfc.sydney.edu.au/2025/papers/SBFC2025_4G3_P154.pdf)) | Socials zählen nur 5 Punkte. Domains erscheinen nur als Text. | Ob Follower und Accounts echt sind |
| **Köder für Copy-Trader** | Bots wie „PumpKing“ erzeugen absichtlich vorhersehbares Copy-Trading ([arXiv 2601.08641](https://arxiv.org/pdf/2601.08641)) | Nichts, denn der Bot nutzt kein Smart-Money-Signal | Insider, die ihre Follower als Ausstiegsliquidität benutzen |
| **Abverkauf nach Graduation** | Liquidität bricht weg. Nur 43,8 % von 15.548 Graduates hatten nach 30 min noch 5k $ Liquidität, nach 24 h nur 19,7 % ([Scorp Labs](https://trader.scorplabs.online/blog/pump-fun-graduation-raydium-migration), Zeitraum nicht genannt, unbestätigt) | Kein Signal nach der Migration | – |
| **Sandwich** | Dein Kauf wird von einem Bot umschlossen: Er kauft vor dir und verkauft direkt danach ([Bitquery](https://bitquery.io/investigations/solana-sandwich-attacks)) | Der Alert zeigt Kosten und ein empfohlenes Slippage-Limit | Deine Ausführung, denn die passiert in deiner Wallet |
| **Front-Running von BOOST** | Bots kaufen vor dem öffentlichen 5-Minuten-Rückkauf ([The Block, 29.07.2026](https://theblock.co/post/409815/pump-fun-token-graduation-rate-jumps-boost-changes-launch-incentives)) | Kein Signal nach der Migration | – |

Nach der Migration ist ein klassischer Liquiditätsabzug bei pump.fun nicht möglich, weil die LP-Tokens verbrannt werden ([The Block, 2025](https://www.theblock.co/post/347360/pump-fun-launches-dex-called-pumpswap-to-instantly-migrate-graduated-tokens)). Der „Rug“ läuft hier über Abverkauf.

### Schwellenwerte aus Ratgebern sind Konvention, keine Wissenschaft

| Quelle | Grenze |
|---|---|
| RugCheck (API-Ausgabe in einem GitHub-PR) | Top-10 > 50 % wird markiert, „High Ownership“ ab > 70 % ([GitHub](https://github.com/antaresscan/antares-extension/pull/766)) |
| Ratgeber eines Drittanbieters | einzelne Wallet > 20 %, keine offizielle RugCheck-Regel ([OpenClaw](https://openclaw-skills.org/skills/rugcheck)) |
| Mobula | Sniper zusammen > 20 % werden markiert. Ein oder zwei Sniper in den Top 20 gelten als normal ([Mobula](https://docs.mobula.io/almanac/detecting-snipers-bundlers)). |
| Eine Checkliste | Bundles ≥ 10 % = durchgefallen. Top-10 ≥ 40 % = durchgefallen, 25–40 % = Vorsicht ([MadeOnSol](https://madeonsol.com/blog/how-to-score-pumpfun-token-60-seconds)) |
| **Bot v2** | Top10 ≤ 30 %, Top1 ≤ 8 %, Sniper/Bundle ≤ 15 %, also strenger |

Bubblemaps verknüpft Holder über direkte Transfers und ähnliches Verhalten. Gemeinsame Funder zeigt es vor allem über „Magic Nodes“ ([Bubblemaps Wiki](https://wiki.bubblemaps.io/bubblemaps-v2/how-does-it-work); [Magic Nodes](https://wiki.bubblemaps.io/bubblemaps-v2/magic-nodes)).

Feste Grenzen lassen sich umgehen. Dafür gibt es Bundler- und Volumen-Bot-Dienste ([gts.ai](https://gts.ai/defi/pumpfun-volume-bot)). Die Kritik am Bot-Design empfiehlt deshalb zwei Änderungen:
- **Gemeinsame Funder als harte Grenze, nicht nur als Score-Abzug.** Ausschluss, wenn Wallets mit gemeinsamer Finanzierung mehr als ~15–20 % halten (Faustregel).
- **Metriken bevorzugen, die schwer zu fälschen sind.** Zum Beispiel Netto-SOL-Zufluss aus verschiedenen Finanzierungs-Clustern und aus Wallets, die nicht frisch sind. Rohe Trade-Anzahl und Buy-Ratio sind leichter zu fälschen.

Eine Studie zu Sniper-Ringen (Kamat, [arXiv 2607.02795](https://arxiv.org/abs/2607.02795)) wird gerade korrigiert, weil ihre „Käufer“-Daten auch Verkäufe enthielten. Der Autor bittet ausdrücklich, ihre Zahlen bis zur Korrektur nicht zu verwenden ([Brave New Coin, ca. 14.10.2026](https://bravenewcoin.com/insights/what-auditing-832941-pump-fun-launches-taught-me-about-memecoin-success)). Daran halten wir uns.

---

## Welche Signale taugen – und was Folklore ist

**Legende:**
- 🟢 **belastbar:** große Datensätze, bestätigt. Am nützlichsten als **Ausschlussfilter**.
- 🟡 **schwach:** eine einzelne Studie, Anbieterdaten oder ein kleiner bzw. umstrittener Effekt.
- 🔴 **keine Evidenz, leicht zu fälschen oder widerlegt.**

| Signal | Ampel | Was die Daten sagen | Im Bot |
|---|---|---|---|
| Rug-Merkmale in den ersten 5 Minuten (als Ausschluss) | 🟢 | Ein Modell (XGBoost) auf den ersten 5 Minuten sagt das Ergebnis nach 1 h voraus. Datenbasis: 6,4 Mio. Tokens über 7 Monate. PR-AUC ~0,76–0,80 laut einem Drittreview (unbestätigt). Die große Mehrheit der Memecoins zeigt innerhalb 1 h Rug-Merkmale ([Catching the Rug, arXiv 2608.20271, Aug. 2026](https://arxiv.org/abs/2608.20271); [Pith](https://pith.science/paper/2608.20271)). | Launch- und Traktionsfilter, Tiefenprüfung, Signal frühestens nach 3 min |
| Konzentration, Bundles, Sniper-Anteil (als Ausschluss) | 🟢 | Bei riskanten Launches halten frühe Käufer mehr Supply ([MELT/MemeTrans, 41.470 migrierte Tokens, Dez. 2024 bis Mär. 2025](https://arxiv.org/abs/2602.13480)). Sniper gewinnen systematisch ([Pine, Apr. 2025](https://pineanalytics.substack.com/p/exit-liquidity-machines)). | Verteilung 20 Punkte plus harte Grenzen |
| Schneller SOL-Zufluss über wenige, größere Trades | 🟢 (für Graduation) | Stärkster Prädiktor für Graduation, gemessen an 655.770 Tokens im Sep. 2025 ([Marino et al.](https://arxiv.org/abs/2602.14860)). **Haken:** Graduation heißt nicht Gewinn. Riskante Launches haben ebenfalls größere Käufe pro Käufer ([MemeTrans](https://arxiv.org/abs/2602.13480)). | Zufluss 25 + Trade-Qualität 15 Punkte |
| Bot-dominierte Coins graduieren seltener | 🟡 | Gilt ab mittleren Stadien der Kurve ([Marino et al., Sep. 2025](https://arxiv.org/abs/2602.14860)). Wash-getradete Coins graduieren dagegen häufiger: 2,0 % gegenüber 0,90 % ([Meme Coin Factories](https://arxiv.org/html/2609.10246v1)). Die Befunde widersprechen sich. | Trade-Qualität (Ø-Tradegröße) |
| Dev-Historie: frühere Graduation, danach 7+ Tage Pause | 🟡 | 12,01 % Graduation (98 von 816) gegenüber 1,71 % Basis, bei 693.331 Launches vom 23.06. bis 19.07.2026. Der Live-Test des Anbieters verlor Geld ([Scorp Labs](https://trader.scorplabs.online/blog/pump-fun-graduation-rate-dev-signal-12-percent)). | Deployer 5 Punkte |
| Dev hält nach der Graduation > 5 % | 🟡 | Solche Graduates fielen seltener auf −80 %: 33,6 %, der Vergleichswert 47,4 % ist unbestätigt. Nur 3 Tage Daten von einem Anbieter, der die Daten verkauft ([Launchtape, 10.–12.10.2026](https://dev.to/launchtape/what-2193-pumpfun-graduations-did-in-their-first-10-minutes-and-what-it-means-for-your-bot-4f70)). | nicht genutzt |
| Smart-Money- und KOL-Copytrading | 🟡 | KOL-Wallets: Ø 30-Tage-Win-Rate ~42 %, nur ~26 % liegen über 50 % (457 Wallets, Jun. 2026, Anbieterdaten) ([MadeOnSol](https://madeonsol.com/blog/what-is-a-kol-in-crypto)). Im Backtest machte Smart Money ~14 %, Kopierer nach Reibungsverlusten nur ~3 % pro Coin ([arXiv 2601.08641, v3 vom 05.02.2026](https://arxiv.org/abs/2601.08641v2)). | nicht genutzt |
| Socials vorhanden (Website, X, Telegram) | 🟡 | Eine Studie meldete einen starken Zusammenhang. Sie wurde korrigiert, umbenannt, und die Aussage „Prädiktor“ wurde zurückgenommen ([Kamat, arXiv 2607.02823](https://arxiv.org/html/2607.02823v3)). Socials sind außerdem trivial zu fälschen. | nur 5 Punkte, Anzeige nur als Text |
| Anzahl Käufer, Holder, Trades | 🔴 | Mindestens 17 % Wash-Trades ([Meme Coin Factories](https://arxiv.org/abs/2609.10246)). Anbieter von Volumen-Bots zielen genau auf diese Zahlen ([gts.ai](https://gts.ai/defi/pumpfun-volume-bot)). | nur als Mindestwert (≥ 40 Trades), nicht als Qualitätsmaß |
| Großer Kursanstieg = echte Nachfrage | 🔴 | 82,8 % der Tokens mit mehr als 100 % Anstieg zeigen künstliches Wachstum. Datenbasis: 34.988 Tokens auf ETH, BSC, SOL und Base ([Mongardini & Mei, USENIX Security '26](https://arxiv.org/abs/2507.01963v2)). | Drawdown- und Trendprüfung statt purer Anstieg |
| X-Erwähnungen, Tageszeit, Wochentag | 🔴 | Keine belastbare Studie gefunden, Stand Okt. 2026 (unbestätigte Abwesenheit). Bitquery hat nur eine Heatmap der Launch-Zahlen ([Bitquery](https://docs.bitquery.io/docs/mcp/trading/examples/pumpfun-launch-pulse/)). | nicht genutzt |
| DexScreener-Boosts | 🔴 | Boosts heben den Trending Score für 12–24 h. Das ist gekaufte Sichtbarkeit. Für Rendite gibt es nur Anekdoten ([DexScreener Docs](https://docs.dexscreener.com/boosting)). | nicht genutzt |
| Kauf direkt nach der Graduation | 🔴 | Tief der ersten 10 min im Median −50 %. Große Einzel-Dumps kommen im Median nach 2,2 min. 38,1 % fallen auf −80 % ([Launchtape, 10.–12.10.2026](https://dev.to/launchtape/what-2193-pumpfun-graduations-did-in-their-first-10-minutes-and-what-it-means-for-your-bot-4f70)). | kein Signal nach der Migration |
| Win-Rate als Qualitätsmaß für KOLs | 🔴 | Selbst MadeOnSol hält die Win-Rate für einen schlechten Prädiktor und nimmt lieber den Profit-Faktor ([MadeOnSol, 2026](https://madeonsol.com/blog/profit-factor-percentile-rank-kol-wallet-selection-solana)). | nicht genutzt |

**Mythen, die die Daten nicht tragen:**

- **Mythos: „Ein Telegram-Link erhöht die Graduation-Chance um ein Vielfaches.“** Die Studie dazu wurde korrigiert. Ihr Datensammler sah nur die ersten ~6 Minuten, und die Aussage, Socials seien ein Prädiktor, wurde zurückgezogen ([Kamat, arXiv 2607.02823](https://arxiv.org/html/2607.02823v3)).
- **Mythos: „Wash-Trading verzehnfacht die Graduation-Chance.“** Die 10× sind eine Obergrenze mit „bis zu“. Der rohe Unterschied liegt bei ~2,2× (2,0 % gegenüber 0,90 %) ([Meme Coin Factories](https://arxiv.org/html/2609.10246v1)).
- **Mythos: „Graduation heißt Gewinn.“** Nach der Migration ist das 10-Minuten-Tief im Median −50 % ([Launchtape](https://dev.to/launchtape/what-2193-pumpfun-graduations-did-in-their-first-10-minutes-and-what-it-means-for-your-bot-4f70)).
- **Mythos: „Viele Holder bedeuten einen gesunden Coin.“** Holder lassen sich mit frischen Wallets, Bundles und Wash-Trades herstellen ([Meme Coin Factories](https://arxiv.org/abs/2609.10246)).
- **Mythos: „76 % aller pump.fun-Coins sind Rugs.“** Die 76 % stammen aus DEX-Pools im ersten Halbjahr 2025, nicht von der pump.fun-Kurve ([Pith-Review](https://pith.science/paper/2603.24625)).
- **Mythos: „PumpPortal ist komplett gratis.“** Trade-Streams kosten seit dem 01.05.2026 Geld ([PumpPortal](https://pumpportal.fun/fees/)).
- **Mythos: „Der öffentliche Solana-RPC reicht für Holder-Checks.“** `getTokenLargestAccounts` lieferte am 12.08.2026 und im Okt. 2026 HTTP 429, also Rate-Limit ([three.ws](https://github.com/nirholas/three.ws/blob/800052ed822a409b6177c61b176a1bd6607fec0f/docs/ops/solana-rpc-lanes.md); [floor-mop-Log](https://github.com/sm33f3r/floor-mop/blob/e88af815cc3896cdfaf89a211ee41976babb92a3/roadmaps/floor_mop_phase1_project_log.md)).

---

## Timing: Warum der Bot erst nach ~3 Minuten signalisiert

### Die ersten Minuten gehören den Maschinen

- In einer Studie lag das einzige durchgehend profitable Einstiegsfenster in den ersten 10 Sekunden nach dem ersten Trade: +18,4 %. Sie umfasste 43,3 Mio. Trades in 31 Tagen ([Bitquery via TechFlow, Sep. 2026, Sekundärquelle](https://techflowpost.com/en-US/article/33966)). Das schaffen nur Bots, keine Menschen mit iPhone.
- Vom Dev finanzierte Sniper steigen schnell aus: 11 % innerhalb von 15 s, 55 % innerhalb von 1 min, 85 % innerhalb von 5 min ([Pine Analytics, Apr. 2025](https://pineanalytics.substack.com/p/exit-liquidity-machines)).
- Die meisten Coins sterben früh. Rug-Merkmale zeigen sich oft schon in den ersten 5 Minuten ([Catching the Rug](https://arxiv.org/abs/2608.20271)).

### Warum gerade ~3 Minuten? Ein Kompromiss

**Dafür spricht:**
- Nach 1 Minute ist schon gut die Hälfte der Sniper draußen ([Pine](https://beincrypto.com/pump-fun-meme-coin-snipers-systematic-problem/)).
- Tote Coins sind bis dahin gut zu erkennen.
- Der Bot kann prüfen, wie viel die Wallets aus dem ersten Slot noch halten.

**Dagegen spricht:**
- **Das Signal fällt noch in die Zeit, in der Sniper aussteigen.** Bis 5 Minuten verkaufen weitere Sniper, insgesamt sind es 85 % ([Pine](https://beincrypto.com/pump-fun-meme-coin-snipers-systematic-problem/)). Deshalb verlangt der Bot, dass Sniper und Bundles höchstens noch 15 % halten.
- **Schnelle Graduates verpasst der Bot.** Die Median-Zeit bis zur Graduation lag bei ~2 min (Kohorte vom 13.08.2026, [Bitquery](https://medium.com/coinmonks/pump-fun-api-how-to-track-bonding-curves-graduations-and-pumpswap-on-chain-879b689fbedb)) bzw. ~4,4 min (Sep. 2025, [Marino et al.](https://arxiv.org/html/2602.14860v1)). Der Bot sieht im Band von 10–65 % Fortschritt also vor allem langsamere Coins.

Zusätzlich muss ein Coin für ein Signal 30 s stabil sein und 10–65 % Fortschritt haben. Außerdem braucht er ≥ 3 SOL Zufluss in 2 min und darf höchstens 25 % Drawdown haben.

### Die Verzögerungskette

| Schritt | Verzögerung | Quelle |
|---|---|---|
| DexScreener nimmt einen Kurven-Token auf | Median 45–53 s nach Erstellung (Live-Test Okt. 2026) | [floor-mop-Log](https://github.com/sm33f3r/floor-mop/blob/e88af815cc3896cdfaf89a211ee41976babb92a3/roadmaps/floor_mop_phase1_project_log.md) |
| DexScreener-Daten kommen aus dem CDN-Cache | 30–60 s alt (Okt. 2026) | [floor-mop-Log](https://github.com/sm33f3r/floor-mop/blob/e88af815cc3896cdfaf89a211ee41976babb92a3/roadmaps/floor_mop_phase1_project_log.md) |
| Stabilitätsfenster des Bots | 30 s | Design |
| Abfrage-Intervall für den RPC | einige Sekunden | Design (offen) |
| Push über APNs | meist schnell. Verzögerungen liegen laut Apple DTS meist am Netz des Geräts. | [Apple Developer Forum](https://developer.apple.com/forums/thread/762088) |
| Du: Alarm lesen, Wallet öffnen, signieren | geschätzt 20–90 s | unbestätigt |
| **Summe** | **1–3 Minuten** von der Bewegung on-chain bis zu deinem Fill sind plausibel | Schätzung |

Bezahlte Tools wie GMGN prüfen Bundle-Anteil, Dev-Anteil und Top-10 automatisch und in Echtzeit für jeden Token ([Datawallet über GMGN](https://www.datawallet.com/zh/隐蔽性/gmgn-explained)). Ihre Nutzer handeln oft auf dieselben Kennzahlen, bevor dieser kostenlose Bot überhaupt meldet. Im Smart-Money-Backtest nennen die Autoren die Verzögerung als einen Hauptgrund, warum Kopierer nur ~3 % statt ~14 % machen ([arXiv 2601.08641](https://arxiv.org/abs/2601.08641v2)).

### Der Dump nach der Migration

- Das Tief der ersten 10 Minuten lag im Median 50 % unter dem Preis 10 s nach der Migration ([Launchtape, 2.193 Graduations, 10.–12.10.2026](https://dev.to/launchtape/what-2193-pumpfun-graduations-did-in-their-first-10-minutes-and-what-it-means-for-your-bot-4f70)).
- Große Einzel-Dumps kamen im Median nach 2,2 Minuten (n = 894). 38,1 % aller Graduates fielen auf −80 % (gleiche Quelle, 3 Tage, Anbieter).
- BOOST kauft in den ersten 5 Minuten nach der Migration per TWAP. Dieses Fenster nutzen Bots aus ([The Block, 29.07.2026](https://theblock.co/post/409815/pump-fun-token-graduation-rate-jumps-boost-changes-launch-incentives)).

**Deshalb:** Der Bot signalisiert ab 65 % Fortschritt nicht mehr und nach einer Migration gar nicht. Hältst du einen Coin über die Migration hinaus, ist das deine eigene Entscheidung. Der Bot vergleicht beide Varianten im Schattenbuch.

### Was das für dich heißt

- Ein „Bestätigt“-Signal ist eine **späte Bestätigung**, kein früher Tipp.
- Rechne damit, dass dein Fill schlechter ist als der Preis im Alarm. Der Alert sollte deshalb anzeigen, wie alt die Daten in Sekunden sind.
- Der Bot bewertet seine Signale auch so, als hättest du verzögert eingestiegen (+30/60/120 s), siehe Erfolgsmessung.

---

## Kosten: Die stille Rendite-Bremse

### Gebührentabelle

| Posten | Höhe | Stand | Quelle |
|---|---|---|---|
| Bonding Curve | 1,25 % pro Trade | Okt. 2026 | [pump.fun Fees](https://pump.fun/docs/fees) |
| pump.fun Web/App | 0,45 % (0,40 % mit Referral) | ab 17.10.2026 | [pump.fun Fees](https://pump.fun/docs/fees) |
| Telegram-Trading-Bots | ~1 % pro Trade | 2025–2026 | [DL News](https://dlnews.com/articles/defi/solana-bot-axiom-takes-over-cursor-with-150m-revenue/) |
| Axiom | 0,75–1 % pro Trade: 0,95 % auf der Einstiegsstufe, bis 0,75 % auf der Top-Stufe per SOL-Cashback | 2025–2026 | [DefiLlama](https://preview.dl.llama.fi/fees/axiom); [The Block](https://www.theblock.co/amp/post/355676/axiom-exchange-hits-100-million-in-revenue-just-four-months-after-launch) |
| Trades über die GMGN-API | die normalen 1 % | Mai 2026 | [GMGN auf X](https://x.com/gmgnai/status/2054772025584238956) |
| PumpPortal-Trading-API | Local 0,5 %, Lightning 1 % (unbestätigt) | – | [ClawKit](https://getclawkit.com/skills/official-playdadev-pump-fun) |
| Jito-Tip | ~0,001–0,005 SOL pro Trade. Ratgeber nennen 0,001–0,01 SOL, steigt mit der Volatilität. | 2026 | [RPC Fast](https://rpcfast.com/blog/jito-explained-bundles-tips-mev-solana); [MadeOnSol](https://madeonsol.com/learn/priority-fees-jito-tips) |
| Priority Fee | meist weit unter 0,001 SOL | 2026 | [MadeOnSol](https://madeonsol.com/learn/priority-fees-jito-tips) |
| Miete für das Token-Konto | ~0,002 SOL, gebunden, bis du das Konto schließt | 2026 | [MadeOnSol](https://madeonsol.com/compare/pump-portal-vs-pump-fun) |
| PumpSwap nach der Graduation | Creator-Anteil ~0,95 % (< 300k $ MC) bis 0,05 % (> 20 Mio. $), dazu Protokoll- und LP-Anteil | seit 02.09.2025 | [Blockworks](https://blockworks.co/news/pumpdotfun-fee-model) |

### Rechenbeispiel: 0,2 SOL rein und wieder raus

Vereinfacht gerechnet: beide Seiten auf 0,2 SOL, ohne Kursbewegung, mit den Sätzen aus der Tabelle.

**Variante A: pump.fun-App ohne Referral**

| Posten | Kauf | Verkauf | Summe |
|---|---|---|---|
| Kurve 1,25 % | 0,0025 SOL | 0,0025 SOL | 0,0050 SOL |
| App 0,45 % | 0,0009 SOL | 0,0009 SOL | 0,0018 SOL |
| **Gesamt** | | | **0,0068 SOL ≈ 3,4 %** |

Dazu kommen die Netzwerkgebühren. Bleibt das Token-Konto offen, ist außerdem ~1 % als Miete gebunden.

**Variante B: Telegram-Bot mit Jito-Tip** (deckt sich mit [MadeOnSol](https://madeonsol.com/compare/pump-portal-vs-pump-fun))

| Posten | Summe aus Kauf und Verkauf |
|---|---|
| Kurve 1,25 % × 2 | 0,005 SOL (2,5 %) |
| Bot 1 % × 2 | 0,004 SOL (2 %) |
| Jito-Tip 0,001–0,005 SOL × 2 | 0,002–0,01 SOL (1–5 %) |
| **Gesamt** | **0,011–0,019 SOL ≈ 5,5–9,5 %** |

**Break-even:** Der Bot rechnet mit 8 % Kosten für Kauf plus Verkauf. Bei diesem Wert muss der Kurs um ~8,5 % steigen, nur damit du bei null rauskommst. Bei Verlusttrades kommen die Kosten oben drauf.

**Die Fixkosten-Falle:** Der Tip ist ein fester Betrag. Bei einer Position von 0,05 SOL sind 0,005 SOL Tip schon 10 % pro Seite. Kleine Positionen sind deshalb relativ viel teurer.

### Slippage und Sandwich-Angriffe

Die Slippage-Toleranz legt fest, wie viel schlechter dein Preis höchstens sein darf. Eine hohe Toleranz lädt Sandwich-Bots ein: Sie kaufen kurz vor dir und verkaufen dir direkt danach teurer.

- 96 % der Sandwich-Angriffe liefen auf der pump.fun-Kurve oder auf PumpSwap. Sie brachten brutto ~29,7 Mio. $ ein (30.10.2025 bis 07.10.2026) ([Bitquery](https://bitquery.io/investigations/solana-sandwich-attacks)).
- Trades mit 20–50 % Slippage-Toleranz wurden 14-mal häufiger angegriffen als Trades unter 3 % ([Bitquery](https://bitquery.io/investigations/solana-sandwich-attacks)). Das ist eine Beobachtung, keine kontrollierte Messung, und sie gilt nur für Swaps über Jupiter.
- **Zielkonflikt:** Mit niedriger Toleranz schlägt ein Kauf eher fehl, was harmlos ist. Aber auch ein Verkauf im Crash schlägt dann eher fehl, und das ist gefährlich.
- **Faustregel:** Kauf eng, also ≤ 3–5 %. Beim Notverkauf bewusst höher, aber nie pauschal 20–50 % einstellen.

---

## Deine Spielregeln

> **Das sind Faustregeln, keine Beratung, und nichts davon ist getestet.** Auch die Tipps aus der Praxis sind nicht im Backtest geprüft ([DEXTools](https://www.dextools.io/tutorials/memecoin-trading-strategy-take-profits); [Altrady](https://www.altrady.com/blog/crypto-trading-strategies/how-to-trade-memecoins)). Entscheidend ist, dass du die Regeln **festlegst, bevor der erste Alarm kommt**.

### Warum die Regeln vorher feststehen müssen

Dieser Bot schickt dir Push-Nachrichten, die Zeitdruck machen. Genau davor warnt die Forschung:

- Push-Nachrichten eines Brokers zu Kursbewegungen erhöhten das Risiko, das Privatanleger eingingen. Trades nach einem Alarm hatten ~19 Prozentpunkte mehr Hebel ([Arnold, Pelster & Subrahmanyam, J. Financial Economics 2022](https://ris.uni-paderborn.de/record/21571)).
- Bei Robinhood verloren die Aktien, die an einem Tag am meisten gekauft wurden, in den 20 Tagen danach ~4,7 % ([Barber et al., Arbeitspapier 2020/21](https://www.smallake.kr/wp-content/uploads/2020/12/SSRN-id3715077.pdf)).
- FOMO-Appelle von außen veränderten Investitionsentscheidungen, besonders bei impulsiven Menschen. Sie führten auch nach Verlusten zu erneuten Käufen ([„CRYPTO-MANIA“, Psychology & Marketing 2024](https://www.recercat.cat/handle/20.500.14342/4759)).
- Intensives Krypto-Trading hängt mit Symptomen von Spielsucht zusammen ([Scoping Review, PubMed](https://pubmed.ncbi.nlm.nih.gov/36174424/); [UNLV 2023, n = 643](https://digitalscholarship.unlv.edu/gaming_institute/2023/May23/60); [UK Gambling Commission](https://www.gamblingcommission.gov.uk/about-us/freedomofinformation/print/cryptocurrency-and-links-or-impact-to-gambling-addiction)). Therapeuten sehen Parallelen zur Glücksspielsucht ([Euronews, 03.06.2026](https://de.euronews.com/health/2026/06/03/krypto-statt-casino-warum-experten-parallelen-zur-glucksspielsucht-sehen)).

Wie gut du dich an deine Regeln hältst, entscheidet dein Ergebnis wahrscheinlich stärker als der Score.

### Die Regeln

1. **Spielbudget:** Leg einen festen Betrag in einer eigenen Wallet fest. Ein Totalverlust dieses Betrags darf an deinem Leben nichts ändern. Im laufenden Monat schießt du nichts nach.
2. **Positionsgröße:** höchstens 2 % des Spielbudgets pro Signal. Aus der Praxis kommen Empfehlungen von 1–5 % ([Altrady](https://www.altrady.com/blog/crypto-trading-strategies/how-to-trade-memecoins)), belegt ist keine davon. Denk an die Fixkosten: Bei sehr kleinen Positionen frisst der Tip viel (siehe Kosten).
3. **Tagesverlust-Limit:** Nach 3 Verlusttrades oder −10 % des Spielbudgets an einem Tag ist Schluss. Dann `/mute` bis zum nächsten Tag.
4. **Take-Profit-Leiter:** 50 % bei 2× verkaufen (Einsatz zurück), 20 % bei 5×, 20 % bei 10×, 10 % als Restposition behalten. Die Leiter stammt von DEXTools und ist nicht getestet ([DEXTools](https://www.dextools.io/tutorials/memecoin-trading-strategy-take-profits)).
5. **Stop:** −35 % vom Einstieg, vorher festgelegt. Rechne damit, dass er im Crash erst bei −50 bis −80 % greift ([Launchtape, Okt. 2026](https://dev.to/launchtape/what-2193-pumpfun-graduations-did-in-their-first-10-minutes-and-what-it-means-for-your-bot-4f70)). Dazu ein Zeit-Stop: Hat sich nach 60 Minuten nichts getan, steigst du aus.
6. **Keine Käufe kurz nach der Migration:** frühestens 10 Minuten nach der Graduation, besser gar nicht. Gründe: das 10-Minuten-Tief von −50 % und das 5-Minuten-Fenster von BOOST.
7. **Slippage-Limit:** beim Kauf höchstens 3–5 %, niemals 20–50 % (siehe Kosten).
8. **Kein Nachkaufen nach einem Upgrade-Signal:** Steigt ein Coin von Stufe 65 auf 75 oder 85, ist das kein Grund nachzukaufen. Der Preis ist schon gestiegen, und dein Risiko im selben Coin würde sich verdoppeln. Pro Coin hast du genau eine Position.
9. **Höchstens 5 Trades pro Tag.**
10. **Ruhezeiten:** Nachts keine Pushes mit „Zeitkritisch“ oder „Kritisch“. Bot v2 soll dafür Ruhezeiten bekommen, in denen Bark nur die Stufe `passive` nutzt.
11. **Journal:** Notier zu jedem Trade:
    - Uhrzeit von Alarm und Fill
    - Preis im Alarm und tatsächlicher Fill-Preis
    - Gebühren
    - Grund für den Trade und dein Gefühl dabei (FOMO? Langeweile?)
    - Ergebnis

    Geplant für eine spätere Version: Der Bot fragt „Hast du getradet?“ und vergleicht deine echten Fills mit seinen Papier-Ergebnissen. Bis dahin führst du das Journal selbst.
12. **Gewinne abziehen und Steuern zurücklegen:** Hol Gewinne regelmäßig aus der Hot-Wallet und leg einen Teil für die Steuer zurück.
13. **Pause-Regel:** Wenn du Verluste „zurückholen“ willst, ist das dein Signal für eine Pause. Hilfe bekommst du bei check-dein-spiel.de, einem kostenlosen und anonymen Angebot der BIÖG (früher BZgA). Die kostenlose Hotline 0800 1 37 27 00 stammt aus einer Mitteilung von 2017, prüf bitte, ob sie noch gilt ([BZgA 2017](https://www.bzga.de/fileadmin/user_upload/PDF/pressemitteilungen/2017/17_09_22_pm_aktionstag_glueckspielsucht--5b1e40e1b24ff98718fe2f54ce1e7b1f.pdf)).

---

## Sicherheit

### Grundsatz: Der Bot handelt nicht und kennt keine Schlüssel

Der Bot tradet nicht automatisch und speichert keine Private Keys. Was passieren kann, wenn Keys bei einem Dienst liegen, zeigen diese Vorfälle:

| Vorfall | Datum | Was passiert ist | Lehre |
|---|---|---|---|
| Tradewiz | 30.09.2026 | ~20.933 Wallets wurden geleert, ~459k $ (bei SOL = 120 $). Private Keys lagen über die Export-Funktion „SOL PVP“ offen ([Bitcoin.com nach Bitquery](https://news.bitcoin.com/the-459000-bot-hacker-was-a-customer-first-researchers-say/); [Coinfomania](https://coinfomania.com/solana-faces-critical-security-incident-as-20000-wallets/)). | Wallets, die ein Bot verwahrt, sind ein direktes Risiko für deine Schlüssel. |
| Solareum | 29.03.2024 | Zuerst wurden ~520–523k $ Schaden gemeldet. Eine spätere Einziehungsklage des US-Justizministeriums sagt: Ein nordkoreanischer Entwickler, eingestellt im Dez. 2023, stahl 6.045 SOL (~1,2–1,4 Mio. $) ([Cointelegraph](https://cointelegraph.com/news/telegram-trading-bot-solareum-shutters-after-520k-exploit); [DL News](https://www.dlnews.com/articles/regulation/how-a-dprk-developer-tricked-solareum-and-stole-14m)). | Auch das Team selbst kann das Risiko sein. |
| Axiom | 26.02.2026 | ZachXBT warf Mitarbeitern vor, über interne Support-Tools Nutzer-Wallets abgefragt und vor Memecoin-Käufen gekauft zu haben. Das sind Vorwürfe, nicht bewiesen ([Decrypt](https://decrypt.co/359223/y-combinator-backed-axiom-employees-accused-insider-trading-zachxbt)). | Tools sehen deine Trades. |
| Malware-Repo `zldp2002/solana-pumpfun-bot` | 02.07.2025 | Ein „Bot“ auf GitHub mit gefälschten Sternen. Das npm-Paket `crypto-layout-utils` stahl Keys ([Cointelegraph](https://cointelegraph.com/news/solana-trading-bot-github-malware-scam); [Crypto Economy/SlowMist](https://crypto-economy.com/slowmist-uncovers-malicious-github-project-targeting-solana-users/)). | Fremde Bot-Repos nie ungeprüft ausführen. |
| `@solana/web3.js` 1.95.6 und 1.95.7 | 02.–03.12.2024 | Etwa 5 Stunden lang waren kompromittierte Versionen online. Sie griffen Keys ab, ~160k $ wurden gestohlen. Behoben in 1.95.8 ([The Hacker News](https://thehackernews.com/2024/12/researchers-uncover-backdoor-in-solanas.html); [Decrypt](https://decrypt.co/294742/solana-web3-js-library-compromised-in-targeted-supply-chain-attack)). | Versionen von Abhängigkeiten festschreiben. Keine Keys im Backend. |
| Gefälschte „Safeguard“-Bots | Dez. 2024 | Telegram-„Verifizierungs“-Bots installierten PowerShell-Malware. Mindestens zwei Opfer verloren mehr als 3 Mio. $ ([Cointelegraph](https://cointelegraph.com/news/telegram-verification-bots-carry-crypto-stealing-malware)). | Lass dich nie per Bot „verifizieren“. |

Laut SlowMist waren geleakte Private Keys im 1. Quartal 2025 die häufigste Ursache für Diebstähle ([SlowMist Q1 2025](https://slowmist.medium.com/slowmist-2025-q1-misttrack-stolen-funds-analysis-d5abca19c997)).

### Scam-DMs und gefälschte Links

- **Niemand Seriöses fragt nach Seed-Phrase oder Key.** Der Bot fragt auch nie danach.
- **Es gibt nachgemachte Trading-Bots.** BonkBot warnt selbst davor und rät, den Handle zu prüfen ([MadeOnSol, BonkBot-Review](https://madeonsol.com/blog/bonkbot-review)).
- **Gefälschte pump.fun-Domains:** Im März 2026 wurden z. B. `pump-fees.live`, `pumtp.fun` und `pumpfun-claim.pages.dev` gemeldet. Verbreitet werden sie auch über Google-Anzeigen ([PhishDestroy, Anbieterdaten](https://phishdestroy.io/domain/pumpfun-claim.pages.dev)).
- **NFT-Airdrops mit Phishing-Links:** Anfang 2024 erbeuteten Solana-Drainer so ~4,17 Mio. $ von ~3.967 Wallets ([Scam Sniffer](https://drops.scamsniffer.io/over-4-million-stolen-by-multiple-solana-wallet-drainers/)).
- **KOLs, die auf ihre Follower verkaufen,** sind nur in Einzelfällen belegt, z. B. ZachXBTs Wallet-Analyse zu Murad 2024 ([The Block](https://www.theblock.co/post/320472/zachxbt-murad-mahmudov-memecoins)). Eine Studie mit Zahlen für 2026 gibt es nicht.

### Das Hot-Wallet-Prinzip

- Handle nur aus einer kleinen **Burner-Wallet**, auf der nur dein Spielbudget liegt. Dein Hauptvermögen liegt getrennt davon.
- Zieh Gewinne nach jeder Session aus der Burner-Wallet ab.
- Schließ leere Token-Konten, dann bekommst du die Miete zurück.
- Schalte **Telegram-2FA** ein. Tritt keinen „Alpha“-Gruppen bei, die eine Verifizierung per Bot verlangen.

### Was der Bot technisch absichert (Plan für v2)

- Er antwortet nur der gekoppelten Chat-ID. Die Kopplung läuft über einen 6-stelligen Code.
- Socials und Website eines Tokens zeigt er nur als **Text-Domain**, nicht als Link. Klickbar sind nur feste Link-Vorlagen von pump.fun und DexScreener.
- Auf dem Server liegen keine Wallet-Keys. Der Zugang läuft per SSH-Schlüssel, und die Versionen der Abhängigkeiten werden festgeschrieben.

---

## Steuern in Deutschland (kein Steuerrat)

> Das hier ist **keine Steuerberatung.** Bei echten Fragen hilft eine Steuerberaterin, ein Steuerberater oder ein Lohnsteuerhilfeverein.

| Thema | Regel | Quelle |
|---|---|---|
| Rechtsgrundlage | §23 Abs. 1 Nr. 2 EStG: private Veräußerungsgeschäfte | [stock3](https://stock3.com/news/kryptowaehrungen-versteuern-haltefristen-freigrenzen-und-steuerfallen-im-ueberblick-17282471) |
| Haltefrist | 1 Jahr. Memecoins hältst du praktisch nie so lange, also ist der Gewinn steuerpflichtig. | [stock3](https://stock3.com/news/kryptowaehrungen-versteuern-haltefristen-freigrenzen-und-steuerfallen-im-ueberblick-17282471) |
| Freigrenze | 1.000 € pro Jahr seit dem Steuerjahr 2024, vorher 600 €. Sie ist eine **Freigrenze**, kein Freibetrag: Liegt der Gesamtgewinn darüber, ist alles steuerpflichtig. Sie gilt für die Summe **aller** §23-Geschäfte, nicht nur für Krypto. | [stock3](https://stock3.com/news/kryptowaehrungen-versteuern-haltefristen-freigrenzen-und-steuerfallen-im-ueberblick-17282471) |
| Swaps | Jeder Tausch Krypto gegen Krypto ist eine Veräußerung, auch SOL → Memecoin und zurück. Transfers zwischen deinen eigenen Wallets sind keine. | [CoinTracker](https://cointracker.io/blog/germany-crypto-tax-guide) |
| Verluste | Nur mit Gewinnen aus §23-Geschäften verrechenbar. Rücktrag ins Vorjahr und Vortrag in spätere Jahre sind möglich (§23 Abs. 3 mit §10d). | [CoinTracking](https://cointracking.info/de/lernen/krypto-steuerliche-verlustverrechnung) |
| BMF-Schreiben | Das Schreiben vom 06.03.2025 (IV C 1 - S 2256/00042/064/043) ersetzt das vom 10.05.2022. Für die Haltefrist gilt FIFO, bewertet wird pro Wallet. Die Mitwirkungspflichten sind erweitert und gelten auch für DEX (Rz. 87 ff.). | [Deubner](https://www.deubner-steuern.de/themen/bitcoin-steuer/bmf-632025.html); [CMS](https://cms.law/de/deu/legal-updates/Update-des-BMF-Schreibens-zu-Kryptowerten) |
| DAC8 / KStTG | In Kraft seit 01.01.2026. Krypto-Dienstleister melden das Jahr 2026 bis zum 31.07.2027 an das BZSt. Reine On-Chain-Trades auf pump.fun aus der eigenen Wallet meldet kein Dienstleister. **Steuerpflichtig sind sie trotzdem.** | [Forvis Mazars](https://www.forvismazars.com/de/en/who-we-are/news/press-media/newsletters/newsletter-steuern/newsletter-steuern-1-2026/dac8-meldepflicht-fuer-kryptotransaktionen-ab-2026); [KPMG](https://kpmg.com/de/de/insights/corporate-governance-und-compliance/dac8-neue-transparenzpflichten-fuer-kryptowerte-anbieter-ab-2026.html) |
| MiCA | Privattrader brauchen keine Lizenz und haben keine Offenlegungspflichten. Die Verbote von Insiderhandel und Marktmanipulation (Art. 86–92) gelten aber für **jede Person**, sobald ein Kryptowert auf einer EU-Plattform gehandelt wird oder werden soll. Für pump.fun-Tokens ist das meist irrelevant. | [EUR-Lex](https://eur-lex.europa.eu/eli/reg/2023/1114/oj) |

**Beispiel für die Freigrenze:** Liegt dein Gesamtgewinn aus allen §23-Geschäften im Jahr bei 990 €, ist er steuerfrei. Bei 1.010 € sind alle 1.010 € steuerpflichtig, nicht nur die 10 € über der Grenze ([stock3](https://stock3.com/news/kryptowaehrungen-versteuern-haltefristen-freigrenzen-und-steuerfallen-im-ueberblick-17282471)).

**Hier wird es leicht falsch gemacht:**
- **Jeder Trade sind zwei Vorgänge.** Beim Kauf gibst du SOL ab. Das ist steuerpflichtig, wenn du die SOL kürzer als ein Jahr hattest. Beim Verkauf gibst du den Memecoin ab ([CoinTracker](https://cointracker.io/blog/germany-crypto-tax-guide)).
- **Die Bewertungsmethode ist umstritten.** IWW nennt zuerst die Einzelzuordnung, sonst die Durchschnittsmethode und als Vereinfachung FIFO. Manche Blogs sagen, die Durchschnittsmethode werde nicht anerkannt. FIFO über mehrere Wallets hinweg ist noch offen, dazu läuft das Verfahren FG Niedersachsen 10 K 165/23 ([IWW](https://www.iww.de/astw/einkommensteuer/vermeidung-von-teuren-fehlern-fristberechnung-bei-der-veraeusserung-von-kryptowaehrungen-f165994); [PPLaw](https://www.pplaw.com/crypto-M3-geklaerte-und-offene-steuerfragen)).
- **Verluste solltest du trotzdem in der Steuererklärung angeben,** damit du sie später verrechnen kannst. Frag dazu am besten eine Beraterin oder einen Berater ([CoinTracking](https://cointracking.info/de/lernen/krypto-steuerliche-verlustverrechnung)).

**Was du dokumentieren solltest:**
- alle Wallet-Adressen
- die Transaktions-Hashes
- den Euro-Wert zum Zeitpunkt jedes Trades
- die Gebühren
- dein Trade-Journal

Exportier das regelmäßig. Das Bot-Journal hilft dabei, ersetzt aber keinen vollständigen Export der Wallet.

**Steuer-Tools** (Preise Jun. bis Sep. 2026):

| Tool | Einstiegsstufe | Realistisch für Bot-Trading |
|---|---|---|
| CoinTracking | Starter 39 €/Jahr für 200 Transaktionen, **über alle Jahre zusammengezählt** | Pro 129 € für 3.500 Transaktionen |
| Blockpit | Small 49 € für 50 Transaktionen pro Steuerjahr | Large 149 € für 3.000 Transaktionen |
| Koinly | Newbie 49 € für 100 Transaktionen | Trader 199 € |

Quellen: [CoinTracking vs. Blockpit](https://cointracking.info/de/blog/cointracking-vs-blockpit); [CoinTracking vs. Koinly](https://cointracking.info/de/blog/cointracking-vs-koinly); [BTC-Echo](https://www.btc-echo.de/news/blockpit-vs-cointracking-krypto-steuertools-im-vergleich-190265/).

Wer viel tradet, landet realistisch bei 99–549 € im Jahr.
- Accointing gibt es nicht mehr. Die Seite ist seit dem 31.01.2024 nicht mehr erreichbar ([Blockpit-Hilfe](https://intercom.help/blockpit/de/articles/12137134-anleitung-zur-datenmigration-von-accointing-zu-blockpit)).
- Blockpit importiert Solana-Wallets automatisch. Ob Trades auf der pump.fun-Kurve vollständig erfasst werden, ist nicht geprüft ([Blockpit](https://www.blockpit.io/de-de/integrationen/solana-steuern); [Blockpit-Hilfe](https://intercom.help/blockpit/de/articles/12137106-defi-datenimport-fur-solana-sol-basierte-anwendungen-dapps)).

---

## Warum der Bot auf einem Server läuft (iOS)

> Die iOS-Angaben stammen aus einer eigenen Recherche und wurden nicht separat gegengeprüft. Wo keine Quelle verlinkt ist, gelten sie als **(unbestätigt)**.

### Das Problem: iOS schläft

- iOS hält Apps kurz nach dem Wechsel in den Hintergrund an.
- Apple-Engineer Quinn schreibt in einem Forum-Thread, der für iOS 26 aktualisiert wurde: Eine App kann nicht dauerhaft im Hintergrund weiterlaufen ([Apple Developer Forum, Thread 685525](https://developer.apple.com/forums/thread/685525)) (unbestätigt).
  - `BGAppRefresh` und `BGProcessing` sind keine Timer.
  - `BGContinuedProcessingTask` (ab iOS 26) gilt nur für Arbeit, die du selbst startest und die einen Fortschritt anzeigt.
  - Laut App-Review-Regel 2.5.4 sind Hintergrundmodi nur für ihren jeweiligen Zweck erlaubt.
- WebSockets über `URLSession` laufen nicht in Hintergrund-Sessions (unbestätigt).
- Der Bot verarbeitet geschätzt 2–17 GB Daten pro Tag (Schätzung, unbestätigt).

### Die Optionen

| Option | Läuft im Hintergrund? | Haken (unbestätigt) |
|---|---|---|
| Pythonista 3 | nein | kein pip |
| a-Shell | nein | pip nur für reine Python-Pakete |
| Carnets | nein | – |
| Pyto | über stilles Audio | Erinnerung alle 6 h, Wartung fraglich |
| iSH | über einen `/dev/location`-Trick | x86-Emulation, langsam |
| Eigene Swift-App | nur mit Server + APNs | Apple Developer Program 99 $/Jahr, in DE 99 €. Mit kostenlosem Account muss die App alle 7 Tage neu signiert werden. |
| PWA mit Web Push | nur mit Server | Push erst ab iOS 16.4 und nur vom Home-Bildschirm aus |
| **Server + Telegram + Bark** | **ja, rund um die Uhr** | empfohlen |

### Empfehlung: Server + Telegram + Bark

- **Server:** Der Bot läuft rund um die Uhr als systemd-Dienst mit Watchdog. SSH-Apps wie Termius oder Blink verlieren im Hintergrund die Verbindung (unbestätigt). Nutz sie also nur zur Wartung.
- **Telegram:** Darüber steuerst du den Bot mit den Befehlen `/status /pause /resume /mute /stats /top /settings /set /reset /test /doctor`.
  - Telegram arbeitet mit Long-Polling, eine öffentliche IP brauchst du nicht.
  - Es darf nur eine Instanz laufen, sonst meldet Telegram den Fehler 409 „Conflict: terminated by other getUpdates request“ ([tdlib, Quellcode](https://github.com/tdlib/telegram-bot-api/blob/master/telegram-bot-api/Client.cpp)).
  - Telegram erlaubt etwa 1 Nachricht pro Sekunde und Chat ([Telegram Bot FAQ](https://core.telegram.org/bots/faq)).
- **Bark:** Der Bot schickt einen `POST` an `https://api.day.app/push`. Es gibt die Stufen `critical`, `active`, `timeSensitive` und `passive`. Bark ist kostenlos, Open Source und kann selbst gehostet werden ([bark-server API V2](https://github.com/Finb/bark-server/blob/master/docs/API_V2.md)). Für „Bestätigt“-Signale soll der Bot `timeSensitive` nehmen, in den Ruhezeiten `passive`.

**Warum eine eigene IPv4-Adresse?**
- Der öffentliche Solana-RPC begrenzt pro IP auf 100 Anfragen pro 10 s ([Solana Docs](https://solana.com/docs/references/clusters)).
- Bei PumpPortal kann eine Flut von Verbindungen die IP für bis zu ~1 h sperren (Lesart eines Dritten, [solcoin](https://github.com/srmcno/solcoin/blob/a83b508526a478c4549a049f3e18db045aaba33c/packages/server/src/providers/market/pumpportal-stream.ts)).
- Teilst du dir eine Ausgangs-IP mit anderen, kann deren Traffic gegen deine Limits zählen. Das ist eine Schlussfolgerung, nicht gemessen.

### Kosten

| Option | Kosten | Stand | Haken |
|---|---|---|---|
| **Hetzner CX23** | 5,49 €/Monat netto plus IPv4 ~0,50 €, also ≈ 6 €. Ab 01.04.2026 waren es 3,99 €, davor 2,99 €. | Neubestellungen seit 15.06.2026 ([Hetzner](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/); [privatedevops](https://privatedevops.com/news/hetzner-june-2026-cloud-price-increase-what-to-do)) | Die Cost-Optimized-Tarife waren am 08.09. und 07.10.2026 „derzeit nicht verfügbar“. Die Alternative CPX22 kostet ~19,49–19,99 €/Monat ([Schmalbach](https://www.vincentschmalbach.com/hetzner-cheap-cloud-unavailable-price-increases/)). |
| Hetzner CAX11 (ARM) | 5,99 €/Monat netto plus IPv4. Ab 01.04.2026 waren es 4,49 €, davor 3,29 €. | seit 15.06.2026 ([privatedevops](https://privatedevops.com/news/hetzner-june-2026-cloud-price-increase-what-to-do)) | wie oben |
| Railway Hobby | 5 $/Monat inklusive 5 $ Nutzung. Volumes bis 5 GB für 0,15 $ pro GB und Monat. | Okt. 2026 ([Railway Docs](https://github.com/railwayapp/docs/blob/main/content/docs/pricing/plans.md)) | Eine statische Ausgangs-IP gibt es nur im Pro-Tarif ([Railway](https://github.com/railwayapp/docs/blob/main/content/docs/networking/static-outbound-ips.md)). SIGKILL kommt direkt nach SIGTERM, weil das Draining standardmäßig 0 s dauert. Setz deshalb `RAILWAY_DEPLOYMENT_DRAINING_SECONDS` ([Railway](https://github.com/railwayapp/docs/blob/main/content/docs/deployments/reference.md)). Es gibt auch einen Free-Plan für 0 $ mit 1 $ Guthaben. |
| Raspberry Pi 4/5 (1 GB) | einmalig ~35/45 $ (unbestätigt), dazu Strom | – | Läuft über dein Heim-Internet. |
| Push | Telegram und Bark kostenlos. Pushover 4,99 $ einmalig (unbestätigt), ntfy als weitere Option. | – | – |
| Daten | 0 € (siehe nächster Abschnitt) | – | – |

Ungeeignet sind (alles unbestätigt):
- Render Free, weil es nach 15 min Inaktivität einschläft
- Oracle Always Free, weil oft keine Kapazität frei ist und ungenutzte Instanzen zurückgeholt werden
- Google e2-micro, weil es nur US-Regionen gibt
- GitHub Actions, weil ein Job höchstens 6 h laufen darf

**Fazit:** Rechne mit ≈ 6 €/Monat, wenn Hetzner bestellbar ist, und sonst mit Railway Hobby für 5 $. Push und Daten kosten nichts.

---

## So setzt der Bot diese Erkenntnisse um

### Datenquellen und ihre Grenzen

| Quelle | Wofür | Grenzen (Stand) |
|---|---|---|
| PumpPortal-WebSocket | Create- und Migration-Events, kostenlos und ohne Key | Nur eine Verbindung, unter 200 Nachrichten/s, bis 5.000 Keys pro Nachricht ([PumpPortal](https://pumpportal.fun/data-api/real-time/); [FAQ](https://pumpportal.fun/FAQ/)). Ein Create-Event hat 15 Felder inklusive `is_mayhem_mode`, aber **kein Feld für den Quote-Mint** ([floor-mop-Log](https://github.com/sm33f3r/floor-mop/blob/e88af815cc3896cdfaf89a211ee41976babb92a3/roadmaps/floor_mop_phase1_project_log.md); [solcoin](https://github.com/srmcno/solcoin/blob/a83b508526a478c4549a049f3e18db045aaba33c/packages/server/src/providers/market/pumpportal-stream.ts)). Im Vergleich mit PumpDev fehlten am 05.10.2026 9,0 % bzw. 8,0 % der Launches, mit 167 ms Median-Verzug, einer Lücke von 26 s in 45 min und 12 Duplikaten ([floor-mop-Log](https://github.com/sm33f3r/floor-mop/blob/e88af815cc3896cdfaf89a211ee41976babb92a3/roadmaps/floor_mop_phase1_project_log.md)). |
| Öffentlicher Solana-RPC | Zustand der Kurve per `getMultipleAccounts` | 100 Anfragen pro 10 s und IP, 40 pro 10 s und Methode, 40 Verbindungen, 100 MB pro 30 s. Laut Doku „nicht für Produktion gedacht“, die Limits können sich ohne Ankündigung ändern ([Solana Docs](https://solana.com/docs/references/clusters)). `getTokenLargestAccounts` ist praktisch gesperrt (429). |
| Helius Free | Holder-Checks, Transaktionen | 1 Mio. Credits pro Monat, 10 RPC-Anfragen/s. Ein Standardaufruf kostet 1 Credit. Ob `getSignaturesForAddress` und `getTransaction` 1 oder 10 Credits kosten, ist umstritten. Plan gültig seit 07.04.2026 ([Helius Pläne](https://www.helius.dev/docs/billing/plans); [Credits](https://www.helius.dev/docs/billing/credits); [helius core-ai](https://github.com/helius-labs/core-ai/blob/main/helius-skills/helius/references/onboarding.md)) |
| DexScreener | Trades, Volumen, Buy-Ratio, Liquidität, Preise nach der Migration | 300 Anfragen/min für Tokens und Pairs, 60/min für Profile und Boosts, bis 30 Adressen pro Abfrage ([GitHub-Wrapper](https://github.com/opensvm/dexscreener-mcp-server); [OpenAPI-Kopie](https://github.com/aipotheosis-labs/aci/blob/3e4a82fa5fd22f1165af2b39fa3de2b0f031242e/backend/apps/dexscreener/functions.json)). Kurven-Tokens erscheinen nach 45–53 s (Median), die Daten sind 30–60 s alt. Paare können in SOL, USDC, USDT oder USD1 notiert sein, nutz deshalb die USD-Felder (Okt. 2026, [floor-mop-Log](https://github.com/sm33f3r/floor-mop/blob/e88af815cc3896cdfaf89a211ee41976babb92a3/roadmaps/floor_mop_phase1_project_log.md)). |
| Jupiter Price v3 | SOL/USD | Ohne Key 0,5 Anfragen/s, mit kostenlosem Key 1/s ([Jupiter](https://developers.jup.ag/docs/portal/rate-limits)) |
| GMGN (optional) | Holder-Labels | Kostenloser Key, Leaky Bucket 20/20 seit 13.05.2026 ([GMGN auf X](https://x.com/gmgnai/status/2054772025584238956)) |

### Erkenntnis → Bot-Funktion

✅ = im Bot-v2-Plan enthalten. ➕ = Empfehlung aus der Kritik, noch nicht im Plan.

| Erkenntnis | Bot-Funktion | Status |
|---|---|---|
| Fast alle Coins sterben früh | Traktionsfilter: tote Coins fliegen früh raus (z. B. < 1 SOL netto nach 90 s) | ✅ |
| Rug-Merkmale sind in den ersten 5 min sichtbar | Signal frühestens nach 3 min und 30 s Stabilität. Die Tiefenprüfung per RPC dient als Ausschlussfilter. | ✅ |
| Sniper steigen nach 1–5 min aus | Wallets aus dem ersten Slot: Wie viel halten sie noch? Höchstens 15 % | ✅ |
| Bundles und Konzentration | Top1 ≤ 8 %, Top10 ≤ 30 % (ohne Curve-Vault), Verteilung 20 Punkte. Ohne Holder-Check wird die Stufe gedeckelt. | ✅ |
| Coin-Fabriken | Serien-Deployer mit ≥ 3 Launches in 24 h fliegen raus. Gemeinsame Funder geben einen Score-Abzug. | ✅ ➕ harte Grenze, wenn ein Cluster > 15–20 % hält |
| Copycats | Symbol ≥ 5× in 6 h → raus | ✅ |
| Dev-Dump | Dev-Kauf > 20 % Supply → raus | ✅ |
| Wash-Trading, Bot-Bait | Netto-Zufluss (25 Punkte), Ø-Trade ≥ 0,10 SOL, Buy-Ratio ≥ 0,55. Die Trade-Anzahl ist nur ein Mindestwert. | ✅ ➕ Zufluss nach Finanzierungs-Clustern und nicht-frischen Wallets bewerten |
| Schneller SOL-Zufluss über wenige große Trades | ≥ 3 SOL Zufluss in 2 min, Trade-Qualität 15 Punkte | ✅ |
| Dump nach der Migration, BOOST | Fortschritt höchstens 65 %, kein Signal nach der Migration | ✅ |
| Coins, die nicht dem Standard entsprechen | Mayhem (`is_mayhem_mode` im Create-Event) und Nicht-SOL-Quote (`quote_mint` im BondingCurve-Konto, Offset 83) fliegen raus ([IDL](https://github.com/pump-fun/pump-public-docs/blob/main/idl/pump.json)) | ✅ |
| Gebühren bleiben auf der Kurve liegen | Preis und Market Cap werden aus den virtuellen Reserven berechnet | ✅ |
| Kosten | Der Alert zeigt Kosten und Break-even. Die Papier-PnL rechnet mit 8 % Kosten für Kauf plus Verkauf. | ✅ |
| Socials sind schwach und fälschbar | Nur 5 Punkte | ✅ ➕ Domains nur als Text anzeigen |
| Dev-Historie ist ein schwaches Signal | Deployer 5 Punkte | ✅ |
| Kein Beleg für X-Erwähnungen, Tageszeit oder Boosts | nicht genutzt | ✅ |
| 1–3 min Verzögerung | Datenalter in Sekunden im Alert. Die Auswertung simuliert verzögerte Einstiege. | ➕ |
| Sandwich-Angriffe | Empfohlenes Slippage-Limit im Alert | ➕ |
| Das Marktregime wechselt schnell | Regime-Vektor zu jedem Signal speichern (siehe unten) | ➕ |
| Push-Nachrichten als FOMO-Auslöser | Ruhezeiten, Obergrenze für Alarme pro Tag, Tagesverlust-Limit mit automatischem `/mute`, neutrale Formulierung. Im Alert steht die Basisrate („74 % der Käufer verlieren“) und die eigene Trefferquote des Bots außerhalb der Kalibrierdaten. | ➕ |
| Sicherheit | Kein Auto-Trading, keine Keys, Kopplung per 6-stelligem Code | ✅ |
| PumpPortal hat Lücken | Lücken im Feed protokollieren. Optional PumpDev als zweiter Feed: ohne Key, mit Quote-Mint-Feldern ([floor-mop-Log](https://github.com/sm33f3r/floor-mop/blob/e88af815cc3896cdfaf89a211ee41976babb92a3/roadmaps/floor_mop_phase1_project_log.md)) | ➕ |
| Der öffentliche RPC blockt Holder-Abfragen | Kostenloser Helius-Key für die Holder-Checks, sonst wird die Stufe gedeckelt | ➕ |
| Telegram meldet 409 bei einer zweiten Instanz | Der Watchdog sorgt für genau eine Instanz, `/doctor` prüft das | ✅ |
| Railway beendet Prozesse sofort | Draining-Zeit in Sekunden setzen | ➕ |

**Der Score** (0–100):

| Teil | Punkte |
|---|---|
| Zufluss | 25 |
| Verteilung | 20 |
| Trade-Qualität | 15 |
| Kaufdruck | 10 |
| Trend | 10 |
| Upside | 10 |
| Deployer | 5 |
| Socials | 5 |

Die Stufen beginnen bei 65, 75 und 85 Punkten. Die Gewichte sind Designentscheidungen, nicht aus Daten abgeleitet. Ob sie etwas taugen, muss erst die Messung zeigen.

### Ehrliche Erfolgsmessung

**Geplant:**
- Der Bot verfolgt den Kurs jedes Signals minütlich bis 1 h, danach nach 6 h und nach 24 h.
- Er rechnet drei Papier-Strategien, alle nach 8 % Kosten für Kauf plus Verkauf:
  - 1 h halten
  - Take-Profit bei 2× / Stop bei −35 %
  - 24 h halten
- Vergleichsgruppen:
  - **Schatten-Kandidaten**: Coins, die alle Filter passiert, aber die Stufe nicht erreicht haben
  - eine **Zufallsstichprobe von 1 %** aller Launches
- Ergebnisse gibt es per `/stats` und im Tagesbericht um 08:00.

**Was ergänzt werden sollte:**

1. **Fairer Vergleich.** Eine Zufallsstichprobe von 1 % ist zu leicht zu schlagen. 68,67 % aller Coins sterben am Launch-Tag ([CoinGecko, Juni 2026](https://cryptobriefing.com/pump-fun-token-survival-rate-study/)). Jeder Filter, der 3 min Alter und 10 % Fortschritt verlangt, gewinnt schon dadurch.
   - Hauptvergleich sind deshalb die Schatten-Kandidaten aus demselben Zeitraum.
   - Dazu kommt eine Zufallsstichprobe, die nach Alter und Fortschritt passend gewählt ist.
2. **Realistische Ausführung:**
   - Einstieg bei Signal +30, +60 und +120 s, jeweils zum schlechteren beobachteten Preis.
   - Stops werden zum nächsten beobachteten Preis nach dem Auslösen ausgeführt, nicht zum Auslösepreis.
   - Die Preisauswirkung für deine echte Positionsgröße kommt aus der Konstantprodukt-Formel.
   - Zwei Exit-Varianten: vor der Migration raus oder durch BOOST hindurch halten.
3. **Robuste Statistik.** Die Gewinne sind extrem konzentriert: Das oberste 1 % bekam 56 % ([Bitquery](https://bitquery.io/investigations/solana-memecoin-traders-lose-money)).
   - Ausgewertet werden deshalb Median, getrimmter Mittelwert, Trefferquote und Bootstrap-Konfidenzintervalle.
   - Gezählt werden Signale, nicht Tage.
4. **Keine Schönfärberei durch Überlebende.** Ein Coin, der von DexScreener verschwindet oder nicht mehr gehandelt wird, zählt als −100 % und nicht als „fehlend“. Lücken im Feed werden protokolliert.
5. **Kein Overfitting.** Der Plan stellt ~20 Schwellen, 8 Gewichte und 3 Stufen ein. Wer auf denselben Daten einstellt und bewertet, betrügt sich selbst. Deshalb:
   - Das Regelwerk wird eingefroren, und der Config-Hash wird bei jedem Signal gespeichert.
   - Jede `/set`-Änderung wird protokolliert.
   - Die Kalibrierung (Woche 1–2) ist getrennt von einer unberührten Testphase. Danach geht es mit Walk-Forward weiter.
   - Hilfsmittel aus der Forschung:
     - Probability of Backtest Overfitting ([Bailey, Borwein, López de Prado & Zhu, J. Comput. Finance 2017](https://papers.ssrn.com/abstract=2326253); [R-Paket pbo](https://archive.linux.duke.edu/cran/web/packages/pbo/vignettes/pbo.html))
     - Deflated Sharpe Ratio ([Bailey & López de Prado, JPM 2014](https://papers.ssrn.com/abstract=2460551))
     - Nach Data-Mining einen t-Wert von mindestens 3,0 statt 2,0 verlangen ([Harvey, Liu & Zhu, RFS 2016](https://nber.org/papers/w20592))
6. **Genug Signale.** Trau einer Stufe erst nach etwa 100–200 bestätigten Signalen (Faustregel).
7. **Echte Fills (spätere Version).** Über ein Log „Hast du getradet?“ soll `/stats` deine echten Ergebnisse mit den Papier-Ergebnissen des Bots vergleichen.

### Kalibrierungsphase

- Plane **1–2 Wochen** ein, bevor du die Stufen ernst nimmst. Wenn danach weniger als ~100 Signale pro Stufe vorliegen, dauert die Kalibrierung eben länger.
- **Ein Kalibrierungsfenster darf keinen Strukturbruch enthalten.** Bekannte Brüche:
  - BOOST (21.07.2026)
  - Custom Pairs (09.09.2026)
  - Notierung in anderen pump-Coins, „depth 2“ (13.10.2026)
  - App-Gebühr (17.10.2026)

  Quellen: [The Defiant](https://thedefiant.io/news/defi/pump-fun-adds-boost-liquidity-mode-for-every-new-coin); [FXStreet](https://www.fxstreet.com/cryptocurrencies/news/pumpfun-launches-custom-pairs-for-tokenized-stocks-and-real-world-assets-on-solana-202609100558); [README](https://github.com/pump-fun/pump-public-docs/blob/main/README.md); [pump.fun Fees](https://pump.fun/docs/fees).

  Eine Kalibrierung ab heute beginnt direkt nach dem letzten bekannten Bruch.

### Regime-Anzeige (Empfehlung)

Der Markt wechselt sein Regime schnell und stark:
- 7-Tage-Graduation-Rate: 0,26 % Mitte Juni 2026 ([Bloomingbit](https://en.bloomingbit.io/feed/news/114409)), dann 4,7 % im Vier-Tage-Schnitt Ende Juli ([The Block](https://theblock.co/post/409815/pump-fun-token-graduation-rate-jumps-boost-changes-launch-incentives)).
- Anteil profitabler Trader: 30,08 % im Jun. 2025, 73,28 % im Apr. 2026 ([CoinGecko](https://www.coingecko.com/research/publications/pump-fun-traders-are-making-a-comeback)).
- Spot-Volumen der Solana-Memecoins in der Woche bis 26.08.2026: 5,2 Mrd. $, der Höchstwert 2026. Die Quelle warnt selbst, dass eine Woche wenig aussagt ([Solana Compass](https://solanacompass.com/news/solana-memecoin-spot-volume-hits-52b-in-a-week-the-highest-reading-since-november-2025)).

Das gleiche „Bestätigt“-Signal kann in einem Regime Gewinn bringen und in einem anderen verlässlich verlieren.

**Kennzahlen, die der Bot kostenlos aus seinen eigenen Streams bekommt:**
- Creates pro Stunde und Migrationen pro Stunde
- eine Live-Graduation-Rate nach Kohorten: Migrationen der Coins aus einem Zeitfenster geteilt durch die Creates aus demselben Fenster
- Anteil der Mayhem- und Nicht-SOL-Creates
- Anzahl der Signale pro Stunde
- rollierender Median der 1-h-Rendite der Schatten-Kandidaten
- SOL/USD

**Was der Bot damit macht:**
- Er speichert zu jedem Signal einen Regime-Vektor.
- Er teilt `/stats` und den Tagesbericht nach Regime-Terzilen auf.
- Liegt das Regime außerhalb des Bereichs der Kalibrierung, hebt er die Schwellen an oder schaltet die Stufen 65 und 75 automatisch stumm.

---

## Was noch fehlt / offene Fragen

**Daten und Zahlen**
- **Launches pro Tag:** Es gibt nur einen unabhängigen Datenpunkt (34.184 am 09.09.2026). Die Spanne von 30.000–52.000 pro Tag und ein 7-Tage-Schnitt von ~33k sind unbelegt.
- **Graduation-Basisrate:** Die Werte reichen je nach Methode von 0,198 % bis 6,7 %. The Block widerspricht sich selbst (0,26 % gegenüber implizit ~0,8 % im Juni-Schnitt).
- **Erste Minute:** Laut Bitquery waren Käufe in der ersten Minute einen Tag später zu 34 % profitabel, spätere Käufe zu 28 % (unbestätigt). Auch das Datum 15.10.2026 der Studie ist unbestätigt.
- **10-Sekunden-Fenster:** Das profitable 10-Sekunden-Fenster (+18,4 %) stammt aus einer Sekundärquelle. Das Original war nicht erreichbar.
- **Sniper-Ringe:** Die Studie (arXiv 2607.02795) wird korrigiert. Wie stark Käuferzahlen durch Ringe aufgebläht sind, ist deshalb nicht beziffert.
- **Rug-Erkennung:** Die PR-AUC-Werte (0,76–0,80) stammen nur aus einem Review.
- **Dev-Anteil nach Graduation:** Den Vergleichswert 47,4 % bei Launchtape haben wir nicht gefunden.
- **Mayhem-Anteil:** ~23 % stammen aus einer einzigen Stichprobe.
- **KOL-Dumps:** Dass KOLs auf ihre Follower verkaufen, ist nur in Einzelfällen belegt. Eine Studie mit Zahlen für 2026 fehlt.
- **Regime-Daten:** Für Oktober 2026 fehlen sie (prüf live bei Dune oder DefiLlama). Keine Studie verbindet den SOL-Kurstrend mit den Renditen von Memecoins.

**Widersprüche in der Evidenz**
- **Wenige große Trades** sagen Graduation voraus ([Marino](https://arxiv.org/abs/2602.14860)). Sie kennzeichnen aber auch riskante Launches ([MemeTrans](https://arxiv.org/abs/2602.13480)). Der Filter „Ø-Trade ≥ 0,10 SOL“ könnte deshalb auch riskante Launches bevorzugen.
- **Wash-Trading und Bot-Anteil:** Wash-getradete Coins graduieren häufiger ([Meme Coin Factories](https://arxiv.org/html/2609.10246v1)). Bot-dominierte Coins graduieren dagegen seltener ([Marino](https://arxiv.org/abs/2602.14860)). Unklar ist, was davon bei den Kandidaten des Bots überwiegt.
- **Socials:** Nach der Korrektur der Kamat-Studie ist ihr Effekt offen. Die Kalibrierung muss zeigen, ob die 5 Punkte überhaupt etwas bringen.
- **3 oder 5 Minuten bis zum Signal:**
  - Für 5 Minuten spricht, dass dann mehr Sniper ausgestiegen sind (85 % gegenüber 55 % nach 1 min).
  - Dagegen spricht, dass dann noch mehr schnelle Graduates schon fertig sind (Median-Zeit bis zur Graduation 2–4,4 min).
  - Welche Wartezeit besser ist, muss das Schattenbuch zeigen.

**Bot-Technik und APIs**
- **PumpPortal:**
  - Die Trading-Gebühren (Local 0,5 %, Lightning 1 %) sind unbestätigt.
  - Das Commitment-Level „processed“ ist nirgends dokumentiert.
  - Die offiziellen Seiten waren bei der Prüfung nicht erreichbar.
  - Für das Event-Schema gibt es weder eine offizielle Beschreibung noch eine Stabilitätsgarantie ([floor-mop-Log](https://github.com/sm33f3r/floor-mop/blob/e88af815cc3896cdfaf89a211ee41976babb92a3/roadmaps/floor_mop_phase1_project_log.md)).
- **Helius:**
  - Ob `getSignaturesForAddress` und `getTransaction` 1 oder 10 Credits kosten, ist umstritten. Plane vorsichtshalber mit 10.
  - Beim Preis des „Agent“-Plans widersprechen sich die Quellen: 10 USDC oder 1 USDC ([helius core-ai](https://github.com/helius-labs/core-ai/blob/main/helius-skills/helius/references/onboarding.md)).
- **DexScreener:** Die offizielle API-Doku war nicht abrufbar. Die Limits stammen aus Kopien von Drittanbietern.
- **Öffentlicher RPC:**
  - Ob IPs von Cloud-Anbietern pauschal geblockt werden, ist ungeprüft.
  - Die echten Limits weichen von der Doku ab: Die Response-Header eines Tests zeigten 250 Anfragen/s ([floor-mop-Log](https://github.com/sm33f3r/floor-mop/blob/e88af815cc3896cdfaf89a211ee41976babb92a3/roadmaps/floor_mop_phase1_project_log.md)).
- **Neue Coin-Typen:** Offen ist, wie der Bot diese Fälle behandeln soll ([README](https://github.com/pump-fun/pump-public-docs/blob/main/README.md)):
  - Holder-Rewards-Coins
  - Coins, die in anderen pump-Coins notiert sind („depth 2“, seit 13.10.2026)
  - negative `virtual_quote_reserves` in PumpSwap-Pools (seit 30.09.2026)

  Bis das geklärt ist, filtert er sie im Zweifel aus.
- **Gebühren:**
  - Ob die Creator-Gebühr bei Custom Pairs 0,05–1 % oder 0,30 % beträgt, ist unklar.
  - Nach der Gebühren-Umstellung vom Jan. 2026 gehören alle Kostensätze regelmäßig neu geprüft ([Datawallet](https://datawallet.com/crypto/what-is-pump-fun-and-create-a-coin)).
- **Eigene TP/SL-Orders in der App:** Das genaue Startjahr ist in den Quellen uneinheitlich.

**Methodik**
- **Überlebt überhaupt ein Vorteil 1–3 Minuten Verzögerung?** Das ist die wichtigste offene Frage. Beantworten kann sie nur die Schattenmessung mit verzögerten Einstiegen.
- Deine Reaktionszeit von 20–90 s ist eine Schätzung. Miss sie über das Journal.
- Es ist unklar, ob in 1–2 Wochen genug Signale pro Stufe (~100–200) zusammenkommen.
- Die Score-Gewichte und Schwellen sind gesetzt, nicht aus Daten abgeleitet.
- Der Faktor 14 für Sandwich-Angriffe bei hoher Slippage gilt nur für Swaps über Jupiter ([Bitquery](https://bitquery.io/investigations/solana-sandwich-attacks)).

**Betrieb und iOS**
- Alle iOS-Angaben ohne Link sind unbestätigt, auch die geschätzten 2–17 GB Daten pro Tag.
- **Hetzner:**
  - Ob CX23 und CAX11 überhaupt bestellbar sind, ist offen.
  - Ob CX23 inklusive IPv4 5,99 € kostet, ist unbestätigt ([Schmalbach](https://www.vincentschmalbach.com/hetzner-cheap-cloud-unavailable-price-increases/)).
- Die Preise für den Raspberry Pi, für Pushover und für das Apple Developer Program sind ungeprüft.

**Steuern**
- Die Bewertungsmethode und FIFO über mehrere Wallets sind nicht abschließend geklärt (FG Niedersachsen 10 K 165/23) ([PPLaw](https://www.pplaw.com/crypto-M3-geklaerte-und-offene-steuerfragen)).
- Ob Blockpit Trades auf der pump.fun-Kurve vollständig importiert, ist nicht geprüft.
- Wie Creator-Fees, Cashback und Holder Rewards steuerlich zu behandeln sind, deckt dieses Material nicht ab.
- Prüf vor der Nutzung, ob die Hotline-Nummer von 2017 noch gilt.

---

## Quellen

**pump.fun: Mechanik, Gebühren, Protokoll**
- [pump.fun – Fees](https://pump.fun/docs/fees)
- [pump-public-docs – README](https://github.com/pump-fun/pump-public-docs/blob/main/README.md)
- [pump-public-docs – IDL pump.json](https://github.com/pump-fun/pump-public-docs/blob/main/idl/pump.json)
- [pump-public-docs – PUMP_PROGRAM_README](https://github.com/pump-fun/pump-public-docs/blob/main/docs/PUMP_PROGRAM_README.md)
- [pump-public-docs – HOLDER_REWARDS_README](https://github.com/pump-fun/pump-public-docs/blob/main/docs/HOLDER_REWARDS_README.md)
- [skills.sh – pumpfun SDK](https://skills.sh/sendaifun/skills/pumpfun)
- [The Block – PumpSwap-Start](https://www.theblock.co/post/347360/pump-fun-launches-dex-called-pumpswap-to-instantly-migrate-graduated-tokens)
- [The Block – Mayhem Mode](https://www.theblock.co/post/379285/pump-funs-new-mayhem-mode-fails-boost-token-launches-revenue)
- [The Block – Creator-Fees](https://www.theblock.co/post/384975/pump-fun-overhauls-creator-fees-token-launches-highest-daily-september)
- [Cointelegraph – Cashback Coins](https://regional-front.cointelegraph.com/news/pumpfun-launches-cashback-coins-rewards)
- [Crypto Briefing – USDC-Pools](https://cryptobriefing.com/pump-fun-usdc-liquidity-pools/)
- [The Defiant – USDC-Pools](https://thedefiant.io/news/defi/pump-fun-launches-usdc-paired-liquidity-pools-gi72da)
- [The Defiant – BOOST](https://thedefiant.io/news/defi/pump-fun-adds-boost-liquidity-mode-for-every-new-coin)
- [FXStreet – Custom Pairs](https://www.fxstreet.com/cryptocurrencies/news/pumpfun-launches-custom-pairs-for-tokenized-stocks-and-real-world-assets-on-solana-202609100558)
- [Bankless – Custom Pairs](https://www.bankless.com/read/news/pump-fun-launches-custom-pairs-for-tokenized-stocks)
- [TokenPost – App-Gebühr](https://www.tokenpost.com/news/business/33804)
- [Blockworks – Gebührenmodell](https://blockworks.co/news/pumpdotfun-fee-model)
- [Decrypt – Project Ascend](https://decrypt.co/337872/pump-funs-new-fee-model-hands-out-2m-to-creators-in-first-24-hours)
- [Datawallet – Was ist pump.fun](https://datawallet.com/crypto/what-is-pump-fun-and-create-a-coin)
- [Phemex – Limit-Orders](https://phemex.com/news/article/pumpfun-launches-solana-limit-orders-with-takeprofit-and-stoploss-tools-95256)
- [Crypto Briefing – Limit-Orders](https://cryptobriefing.com/pumpfun-limit-orders-solana-tokens/)

**Markt, Graduation, Konkurrenz, Umsatz**
- [Bloomingbit/The Block – Graduation-Rate Juni 2026](https://en.bloomingbit.io/feed/news/114409)
- [The Block – Graduation-Rate nach BOOST](https://theblock.co/post/409815/pump-fun-token-graduation-rate-jumps-boost-changes-launch-incentives)
- [Bitquery via Medium – Graduation-Kohorten](https://medium.com/coinmonks/pump-fun-api-how-to-track-bonding-curves-graduations-and-pumpswap-on-chain-879b689fbedb)
- [pumpfundata – Graduation-Rate](https://pumpfundata.com/blog/pumpfun-graduation-rate-analysis)
- [MadeOnSol – Graduation in den ersten 3 Minuten](https://madeonsol.com/blog/pump-fun-first-3-minutes-graduation-math)
- [Scorp Labs – Dev-Signal 12 %](https://trader.scorplabs.online/blog/pump-fun-graduation-rate-dev-signal-12-percent)
- [Scorp Labs – Liquidität nach Migration](https://trader.scorplabs.online/blog/pump-fun-graduation-raydium-migration)
- [Cointelegraph – Rekord 263k Tokens](https://cointelegraph.com/news/solana-record-263k-tokens-issued)
- [Bitquery – Launch Pulse](https://docs.bitquery.io/docs/mcp/trading/examples/pumpfun-launch-pulse/)
- [Bitquery – Aktien-Tokens](https://bitquery.io/investigations/pump-fun-stock-tokens-meme-coins)
- [The Block – LetsBonk überholt pump.fun](https://theblock.co/post/361189/letsbonk-dethrones-pump-fun-with-higher-daily-memecoin-volume-token-launches)
- [Decrypt – Bonk-Launchpad](https://decrypt.co/328822/bonk-meme-coin-launchpad-flips-pump-fun-for-solana-tokens-created)
- [stepdata – Launchpad Showdown](https://stepdata.substack.com/p/solana-launchpad-showdown-pumpfun)
- [The Block – StonkFun](https://www.theblock.co/news/defi/2026-09-06-stonk-surges-250-to-140-million-market-cap-as-stonkfun-pulls-volume-to-raydium-and-jupiter-413621)
- [CoinDCX – StonkFun vs. pump.fun](https://coindcx.com/blog/crypto-news-global/solana-launchpad-stonkfun-out-earned-pump-fun-for-a-day/)
- [Crypto Economy – pump.fun wieder vorn](https://crypto-economy.com/pump-fun-retakes-the-lead-in-solanas-launchpad-race/)
- [Gokhshtein – Fomo vor pump.fun](https://gokhshtein.com/news/2026-10-07-fomo-tops-pumpfun-in-daily-revenue-as-hyperliquid-perps-go)
- [CryptoTicker – Umsatz](https://cryptoticker.io/en/pump-fun-revenue-buyback/)
- [DefiLlama – pump.fun](https://defillama.com/protocol/pump.fun)
- [Yahoo Finance – Aktivität −80 %](https://finance.yahoo.com/markets/crypto/articles/pump-fun-activity-plunges-80-193800825.html)
- [Solana Compass – Memecoin-Volumen](https://solanacompass.com/news/solana-memecoin-spot-volume-hits-52b-in-a-week-the-highest-reading-since-november-2025)

**Trader-Ergebnisse**
- [Bitquery – Memecoin-Trader verlieren](https://bitquery.io/investigations/solana-memecoin-traders-lose-money)
- [TechFlow – Bitquery-Studie zu Aktien-Tokens](https://techflowpost.com/en-US/article/33966)
- [CoinGecko – Comeback der Trader](https://www.coingecko.com/research/publications/pump-fun-traders-are-making-a-comeback)
- [BeInCrypto – Comeback](https://beincrypto.com/pump-fun-traders-profit-comeback-meme-coin-season/)
- [BeInCrypto – Mehrheit verliert](https://beincrypto.com/pump-fun-trading-data-majority-lose-money/)
- [Decrypt – Gewinner über 10k $](https://decrypt.co/300403/pump-fun-traders-millionaires)
- [Crypto Briefing – CoinGecko-Überlebensstudie](https://cryptobriefing.com/pump-fun-token-survival-rate-study/)

**Manipulation, Rugs, Sniper**
- [Pine Analytics – Exit Liquidity Machines](https://pineanalytics.substack.com/p/exit-liquidity-machines)
- [BeInCrypto – Sniper](https://beincrypto.com/pump-fun-meme-coin-snipers-systematic-problem/)
- [Meme Coin Factories – arXiv 2609.10246](https://arxiv.org/abs/2609.10246) ([HTML](https://arxiv.org/html/2609.10246v1))
- [Marino et al. – arXiv 2602.14860](https://arxiv.org/abs/2602.14860) ([HTML](https://arxiv.org/html/2602.14860v1))
- [Kamat – arXiv 2607.02823 v3](https://arxiv.org/html/2607.02823v3)
- [Kamat – arXiv 2607.02795 (in Korrektur)](https://arxiv.org/abs/2607.02795)
- [Brave New Coin – Kamat-Korrekturhinweis](https://bravenewcoin.com/insights/what-auditing-832941-pump-fun-launches-taught-me-about-memecoin-success)
- [Catching the Rug – arXiv 2608.20271](https://arxiv.org/abs/2608.20271)
- [Pith – Review zu Catching the Rug](https://pith.science/paper/2608.20271)
- [MemeTrans/MELT – arXiv 2602.13480](https://arxiv.org/abs/2602.13480) ([v2](https://arxiv.org/html/2602.13480v2))
- [From Hype to Collapse – arXiv 2603.24625](https://arxiv.org/abs/2603.24625)
- [Pith – Review zu From Hype to Collapse](https://pith.science/paper/2603.24625)
- [Solidus Labs – Rug Pulls](https://www.soliduslabs.com/reports/solana-rug-pulls-pump-dumps-crypto-compliance)
- [Forklog – Solidus-Bericht](https://forklog.com/en/report-98-of-pump-funs-memecoins-deemed-scams/)
- [Mongardini & Mei – arXiv 2507.01963](https://arxiv.org/abs/2507.01963v2)
- [Launchtape – 2.193 Graduations](https://dev.to/launchtape/what-2193-pumpfun-graduations-did-in-their-first-10-minutes-and-what-it-means-for-your-bot-4f70)
- [SBFC 2025 – Attention Manipulation](https://sbfc.sydney.edu.au/2025/papers/SBFC2025_4G3_P154.pdf)
- [Forklog – Bots auf pump.fun](https://forklog.com/en/expert-highlights-bot-infiltration-on-pump-funs-meme-token-platform/)
- [gts.ai – Volumen-Bot (Anbieterseite)](https://gts.ai/defi/pumpfun-volume-bot)
- [GitHub – RugCheck-Flags (Antares PR)](https://github.com/antaresscan/antares-extension/pull/766)
- [OpenClaw – RugCheck](https://openclaw-skills.org/skills/rugcheck)
- [Mobula – Sniper und Bundler](https://docs.mobula.io/almanac/detecting-snipers-bundlers)
- [MadeOnSol – Token in 60 Sekunden bewerten](https://madeonsol.com/blog/how-to-score-pumpfun-token-60-seconds)
- [Bubblemaps – Funktionsweise](https://wiki.bubblemaps.io/bubblemaps-v2/how-does-it-work)
- [Bubblemaps – Magic Nodes](https://wiki.bubblemaps.io/bubblemaps-v2/magic-nodes)
- [Bitquery – Sandwich-Angriffe](https://bitquery.io/investigations/solana-sandwich-attacks)
- [CryptoSlate – Sandwich-Bots](https://cryptoslate.com/solana-sandwich-bots-took-29-7-million-before-costs-bitquery-estimates/)

**Signale, Smart Money, Kosten**
- [arXiv 2601.08641 – Smart Money](https://arxiv.org/abs/2601.08641v2) ([PDF](https://arxiv.org/pdf/2601.08641))
- [MadeOnSol – KOL](https://madeonsol.com/blog/what-is-a-kol-in-crypto)
- [MadeOnSol – Profit-Faktor](https://madeonsol.com/blog/profit-factor-percentile-rank-kol-wallet-selection-solana)
- [DexScreener – Boosting](https://docs.dexscreener.com/boosting)
- [DefiLlama – Axiom-Gebühren](https://preview.dl.llama.fi/fees/axiom)
- [DL News – Axiom](https://dlnews.com/articles/defi/solana-bot-axiom-takes-over-cursor-with-150m-revenue/)
- [The Block – Axiom](https://www.theblock.co/amp/post/355676/axiom-exchange-hits-100-million-in-revenue-just-four-months-after-launch)
- [ClawKit – PumpPortal](https://getclawkit.com/skills/official-playdadev-pump-fun)
- [RPC Fast – Jito](https://rpcfast.com/blog/jito-explained-bundles-tips-mev-solana)
- [MadeOnSol – Priority Fees und Jito-Tips](https://madeonsol.com/learn/priority-fees-jito-tips)
- [MadeOnSol – PumpPortal vs. pump.fun](https://madeonsol.com/compare/pump-portal-vs-pump-fun)
- [Datawallet – GMGN](https://www.datawallet.com/zh/隐蔽性/gmgn-explained)
- [DEXTools – Take-Profits](https://www.dextools.io/tutorials/memecoin-trading-strategy-take-profits)
- [Altrady – Memecoins traden](https://www.altrady.com/blog/crypto-trading-strategies/how-to-trade-memecoins)

**Statistik und Psychologie**
- [Bailey et al. – Probability of Backtest Overfitting](https://papers.ssrn.com/abstract=2326253)
- [R-Paket pbo](https://archive.linux.duke.edu/cran/web/packages/pbo/vignettes/pbo.html)
- [Bailey & López de Prado – Deflated Sharpe Ratio](https://papers.ssrn.com/abstract=2460551)
- [Harvey, Liu & Zhu – NBER w20592](https://nber.org/papers/w20592)
- [Arnold, Pelster & Subrahmanyam – Attention Triggers](https://ris.uni-paderborn.de/record/21571)
- [Barber et al. – Attention-Induced Trading](https://www.smallake.kr/wp-content/uploads/2020/12/SSRN-id3715077.pdf)
- [CRYPTO-MANIA – Psychology & Marketing 2024](https://www.recercat.cat/handle/20.500.14342/4759)
- [PubMed – Scoping Review](https://pubmed.ncbi.nlm.nih.gov/36174424/)
- [UNLV 2023](https://digitalscholarship.unlv.edu/gaming_institute/2023/May23/60)
- [UK Gambling Commission](https://www.gamblingcommission.gov.uk/about-us/freedomofinformation/print/cryptocurrency-and-links-or-impact-to-gambling-addiction)
- [Euronews – Krypto statt Casino](https://de.euronews.com/health/2026/06/03/krypto-statt-casino-warum-experten-parallelen-zur-glucksspielsucht-sehen)
- [BZgA 2017 – Aktionstag Glücksspielsucht](https://www.bzga.de/fileadmin/user_upload/PDF/pressemitteilungen/2017/17_09_22_pm_aktionstag_glueckspielsucht--5b1e40e1b24ff98718fe2f54ce1e7b1f.pdf)

**Sicherheit**
- [Bitcoin.com – Tradewiz](https://news.bitcoin.com/the-459000-bot-hacker-was-a-customer-first-researchers-say/)
- [Coinfomania – Tradewiz](https://coinfomania.com/solana-faces-critical-security-incident-as-20000-wallets/)
- [Cointelegraph – Solareum](https://cointelegraph.com/news/telegram-trading-bot-solareum-shutters-after-520k-exploit)
- [DL News – Solareum und DPRK](https://www.dlnews.com/articles/regulation/how-a-dprk-developer-tricked-solareum-and-stole-14m)
- [Decrypt – Axiom-Vorwürfe](https://decrypt.co/359223/y-combinator-backed-axiom-employees-accused-insider-trading-zachxbt)
- [Cointelegraph – GitHub-Malware](https://cointelegraph.com/news/solana-trading-bot-github-malware-scam)
- [Crypto Economy – SlowMist zur GitHub-Malware](https://crypto-economy.com/slowmist-uncovers-malicious-github-project-targeting-solana-users/)
- [The Hacker News – web3.js-Backdoor](https://thehackernews.com/2024/12/researchers-uncover-backdoor-in-solanas.html)
- [Decrypt – web3.js](https://decrypt.co/294742/solana-web3-js-library-compromised-in-targeted-supply-chain-attack)
- [Cointelegraph – Fake-Verifizierungsbots](https://cointelegraph.com/news/telegram-verification-bots-carry-crypto-stealing-malware)
- [SlowMist – Q1 2025](https://slowmist.medium.com/slowmist-2025-q1-misttrack-stolen-funds-analysis-d5abca19c997)
- [MadeOnSol – BonkBot-Review](https://madeonsol.com/blog/bonkbot-review)
- [PhishDestroy – pumpfun-claim.pages.dev](https://phishdestroy.io/domain/pumpfun-claim.pages.dev)
- [Scam Sniffer – Solana-Drainer](https://drops.scamsniffer.io/over-4-million-stolen-by-multiple-solana-wallet-drainers/)
- [The Block – ZachXBT zu Murad](https://www.theblock.co/post/320472/zachxbt-murad-mahmudov-memecoins)

**Steuern und Recht**
- [stock3 – Kryptowährungen versteuern](https://stock3.com/news/kryptowaehrungen-versteuern-haltefristen-freigrenzen-und-steuerfallen-im-ueberblick-17282471)
- [CoinTracker – Steuerguide Deutschland](https://cointracker.io/blog/germany-crypto-tax-guide)
- [CoinTracking – Verlustverrechnung](https://cointracking.info/de/lernen/krypto-steuerliche-verlustverrechnung)
- [Deubner – BMF-Schreiben 06.03.2025](https://www.deubner-steuern.de/themen/bitcoin-steuer/bmf-632025.html)
- [CMS – Update BMF-Schreiben](https://cms.law/de/deu/legal-updates/Update-des-BMF-Schreibens-zu-Kryptowerten)
- [IWW – Fristberechnung](https://www.iww.de/astw/einkommensteuer/vermeidung-von-teuren-fehlern-fristberechnung-bei-der-veraeusserung-von-kryptowaehrungen-f165994)
- [PPLaw – geklärte und offene Steuerfragen](https://www.pplaw.com/crypto-M3-geklaerte-und-offene-steuerfragen)
- [Forvis Mazars – DAC8](https://www.forvismazars.com/de/en/who-we-are/news/press-media/newsletters/newsletter-steuern/newsletter-steuern-1-2026/dac8-meldepflicht-fuer-kryptotransaktionen-ab-2026)
- [KPMG – DAC8](https://kpmg.com/de/de/insights/corporate-governance-und-compliance/dac8-neue-transparenzpflichten-fuer-kryptowerte-anbieter-ab-2026.html)
- [EUR-Lex – MiCA (VO 2023/1114)](https://eur-lex.europa.eu/eli/reg/2023/1114/oj)
- [CoinTracking vs. Blockpit](https://cointracking.info/de/blog/cointracking-vs-blockpit)
- [CoinTracking vs. Koinly](https://cointracking.info/de/blog/cointracking-vs-koinly)
- [BTC-Echo – Steuertools im Vergleich](https://www.btc-echo.de/news/blockpit-vs-cointracking-krypto-steuertools-im-vergleich-190265/)
- [Blockpit-Hilfe – Accointing-Migration](https://intercom.help/blockpit/de/articles/12137134-anleitung-zur-datenmigration-von-accointing-zu-blockpit)
- [Blockpit – Solana-Integration](https://www.blockpit.io/de-de/integrationen/solana-steuern)
- [Blockpit-Hilfe – DeFi-Import Solana](https://intercom.help/blockpit/de/articles/12137106-defi-datenimport-fur-solana-sol-basierte-anwendungen-dapps)

**Daten-APIs, Infrastruktur, iOS**
- [PumpPortal – Real-time Data API](https://pumpportal.fun/data-api/real-time/)
- [PumpPortal – Fees](https://pumpportal.fun/fees/)
- [PumpPortal – FAQ](https://pumpportal.fun/FAQ/)
- [floor-mop – Projektlog (Live-Tests)](https://github.com/sm33f3r/floor-mop/blob/e88af815cc3896cdfaf89a211ee41976babb92a3/roadmaps/floor_mop_phase1_project_log.md)
- [solcoin – PumpPortal-Stream](https://github.com/srmcno/solcoin/blob/a83b508526a478c4549a049f3e18db045aaba33c/packages/server/src/providers/market/pumpportal-stream.ts)
- [Solana Docs – Clusters](https://solana.com/docs/references/clusters)
- [three.ws – Solana-RPC-Lanes](https://github.com/nirholas/three.ws/blob/800052ed822a409b6177c61b176a1bd6607fec0f/docs/ops/solana-rpc-lanes.md)
- [Helius – Pläne](https://www.helius.dev/docs/billing/plans)
- [Helius – Credits](https://www.helius.dev/docs/billing/credits)
- [helius-labs core-ai – Onboarding](https://github.com/helius-labs/core-ai/blob/main/helius-skills/helius/references/onboarding.md)
- [dexscreener-mcp-server](https://github.com/opensvm/dexscreener-mcp-server)
- [ACI – DexScreener-Funktionen](https://github.com/aipotheosis-labs/aci/blob/3e4a82fa5fd22f1165af2b39fa3de2b0f031242e/backend/apps/dexscreener/functions.json)
- [Jupiter – Rate Limits](https://developers.jup.ag/docs/portal/rate-limits)
- [GMGN auf X – Rate-Limit](https://x.com/gmgnai/status/2054772025584238956)
- [bark-server – API V2](https://github.com/Finb/bark-server/blob/master/docs/API_V2.md)
- [tdlib telegram-bot-api – Client.cpp](https://github.com/tdlib/telegram-bot-api/blob/master/telegram-bot-api/Client.cpp)
- [Telegram – Bot FAQ](https://core.telegram.org/bots/faq)
- [Apple Developer Forum – Thread 685525](https://developer.apple.com/forums/thread/685525)
- [Apple Developer Forum – Thread 762088](https://developer.apple.com/forums/thread/762088)
- [Hetzner – Preisanpassung](https://docs.hetzner.com/general/infrastructure-and-availability/price-adjustment/)
- [privatedevops – Hetzner-Preiserhöhung Juni 2026](https://privatedevops.com/news/hetzner-june-2026-cloud-price-increase-what-to-do)
- [Vincent Schmalbach – Hetzner nicht verfügbar](https://www.vincentschmalbach.com/hetzner-cheap-cloud-unavailable-price-increases/)
- [Railway – Pläne](https://github.com/railwayapp/docs/blob/main/content/docs/pricing/plans.md)
- [Railway – Deployment-Referenz](https://github.com/railwayapp/docs/blob/main/content/docs/deployments/reference.md)
- [Railway – Static Outbound IPs](https://github.com/railwayapp/docs/blob/main/content/docs/networking/static-outbound-ips.md)