from __future__ import annotations

import asyncio
import json
import logging
import time
from pathlib import Path

import aiohttp

from . import demo
from .config import Config
from .enrich import MetadataFetcher, SolPrice
from .notifiers import (ConsoleNotifier, DiscordNotifier, Dispatcher, SignalLog, TelegramNotifier,
                        format_signal)
from .pumpportal import PumpPortalClient
from .tracker import Tracker

log = logging.getLogger(__name__)

STATUS_INTERVAL_S = 60.0


def build_notifiers(cfg: Config, session: aiohttp.ClientSession, remote: bool = True) -> list:
    notifiers: list = [ConsoleNotifier()]
    if not remote:
        return notifiers
    if cfg.telegram.bot_token and cfg.telegram.chat_id:
        notifiers.append(TelegramNotifier(session, cfg.telegram.bot_token, cfg.telegram.chat_id))
    if cfg.discord.webhook_url:
        notifiers.append(DiscordNotifier(session, cfg.discord.webhook_url))
    return notifiers


def _channel_names(notifiers: list) -> str:
    names = {"ConsoleNotifier": "Konsole", "TelegramNotifier": "Telegram", "DiscordNotifier": "Discord"}
    return ", ".join(names.get(type(n).__name__, type(n).__name__) for n in notifiers)


async def run_live(cfg: Config, record_path: str | None = None) -> None:
    async with aiohttp.ClientSession(trust_env=True) as session:
        tracker = Tracker(cfg)
        notifiers = build_notifiers(cfg, session)
        sol_price = SolPrice(session) if cfg.output.sol_price else None
        dispatcher = Dispatcher(
            notifiers,
            metadata=MetadataFetcher(session) if cfg.output.fetch_metadata else None,
            sol_price=sol_price,
            signal_log=SignalLog(cfg.output.signal_log) if cfg.output.signal_log else None,
        )
        client = PumpPortalClient(cfg.source, session, lambda: tracker.tokens.keys())
        price_task = asyncio.create_task(sol_price.run()) if sol_price else None

        recorder = None
        if record_path:
            Path(record_path).parent.mkdir(parents=True, exist_ok=True)
            recorder = open(record_path, "a", encoding="utf-8")
            log.info("Zeichne Rohdaten auf nach %s", record_path)

        log.info("Bot läuft. Alerts gehen an: %s", _channel_names(notifiers))
        last_status = time.time()
        last_stats = tracker.stats.copy()
        try:
            async for msg in client.messages():
                now = time.time()
                if recorder:
                    recorder.write(json.dumps({"ts": now, "msg": msg}) + "\n")
                for sig in tracker.handle(msg, now):
                    dispatcher.publish(sig)
                subscribe, unsubscribe = tracker.drain_subscriptions()
                await client.subscribe(subscribe)
                await client.unsubscribe(unsubscribe)

                if now - last_status >= STATUS_INTERVAL_S:
                    minutes = (now - last_status) / 60
                    delta = tracker.stats - last_stats
                    log.info(
                        "Beobachte %d Coins | %.0f neue/min | %.0f Trades/min | Signale gesamt: %d",
                        len(tracker.tokens), delta["new_tokens"] / minutes,
                        delta["trades"] / minutes, tracker.stats["signals"],
                    )
                    last_status, last_stats = now, tracker.stats.copy()
        finally:
            if recorder:
                recorder.close()
            if price_task:
                price_task.cancel()
            await dispatcher.drain()


def read_recording(path: str):
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            try:
                record = json.loads(line)
                yield float(record["ts"]), record["msg"]
            except (ValueError, KeyError, TypeError):
                continue


async def run_replay(cfg: Config, path: str, notify: bool = False) -> None:
    async with aiohttp.ClientSession(trust_env=True) as session:
        tracker = Tracker(cfg)
        dispatcher = Dispatcher(build_notifiers(cfg, session, remote=notify))
        events = 0
        for ts, msg in read_recording(path):
            events += 1
            if isinstance(msg, dict):
                for sig in tracker.handle(msg, ts):
                    await dispatcher.deliver(sig)
        print(f"\nReplay fertig: {events} Events, {tracker.stats['new_tokens']} neue Coins, "
              f"{tracker.stats['trades']} Trades, {tracker.stats['signals']} Signale")


async def run_demo(cfg: Config) -> None:
    print("DEMO – simulierte Daten, keine echten Coins. Szenarien:")
    for symbol, _, description in demo.SCENARIOS:
        print(f"  ${symbol}: {description}")
    tracker = Tracker(cfg)
    dispatcher = Dispatcher([ConsoleNotifier()])
    for ts, msg in demo.generate_events(start=time.time()):
        for sig in tracker.handle(msg, ts):
            await dispatcher.deliver(sig)
    print(f"\nDemo fertig: {tracker.stats['new_tokens']} Coins, {tracker.stats['trades']} Trades, "
          f"{tracker.stats['signals']} Signale")


async def run_test_alert(cfg: Config) -> bool:
    """Sends one simulated signal through every configured channel."""
    tracker = Tracker(cfg)
    sample = None
    for ts, msg in demo.generate_events(start=time.time()):
        signals = tracker.handle(msg, ts)
        if signals:
            sample = signals[0]
            break
    if sample is None:
        print("Mit deinen Einstellungen löst die Demo kein Signal aus, Test nicht möglich.")
        return False

    async with aiohttp.ClientSession(trust_env=True) as session:
        notifiers = build_notifiers(cfg, session)
        if len(notifiers) == 1:
            print("Kein Telegram oder Discord konfiguriert – Test nur in der Konsole.")
        ok = True
        for notifier in notifiers:
            text = format_signal(sample, {}, None, notifier.style, headline="TEST-ALERT (Demo-Daten)")
            sent = await notifier.send(text)
            ok = ok and sent
            print(f"{_channel_names([notifier])}: {'OK' if sent else 'FEHLGESCHLAGEN (siehe Log oben)'}")
    return ok
