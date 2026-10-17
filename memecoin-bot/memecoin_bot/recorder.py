"""The recorder: streams every pump.fun event from Solana into the tape.

It deliberately knows nothing about signals. Its only jobs are completeness
and honesty about gaps, so later backtests run on clean data.
"""

from __future__ import annotations

import asyncio
import logging
import shutil
import signal
import time
from collections import Counter, deque
from datetime import datetime, timedelta
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import aiohttp

from . import __version__
from .config import Config
from .continuity import ChainTrade, ContinuityTracker
from .dexscreener import MigratedTracker, poll_once
from .events import IDL_SHA256, PUMP_PROGRAM_ID, Event, EventDecoder, default_decoder, is_sol_quote, pubkey_str
from .notifiers import TelegramNotifier
from .solana_rpc import RpcError, program_deploy_slot
from .solana_ws import LogNotification, LogStream, SignatureCache, parse_logs
from .tape import TapeWriter, apply_retention

log = logging.getLogger(__name__)

# Bookkeeping events pump.fun emits on many trades; only counted, not recorded.
COUNT_ONLY = frozenset({
    "InitUserVolumeAccumulatorEvent", "SyncUserVolumeAccumulatorEvent", "CloseUserVolumeAccumulatorEvent",
    "ExtendAccountEvent", "ClaimCashbackEvent", "CollectCreatorFeeEvent", "DistributeCreatorFeesEvent",
    "ClaimTokenIncentivesEvent", "MinimumDistributableFeeEvent", "SweepBondingCurveFeeEvent",
    "DistributeFeeToHoldersEvent",
})
MAX_CLOCK_SKEW_S = 86_400


def _quote(raw) -> str | None:
    """None for SOL-quoted coins, otherwise the quote mint."""
    return None if raw is None or is_sol_quote(raw) else pubkey_str(raw)


def _pk(raw) -> str | None:
    return pubkey_str(raw) if raw is not None else None


def _b(value) -> int | None:
    return None if value is None else int(bool(value))


def _jsonable(value):
    if isinstance(value, bytes):
        return pubkey_str(value) if len(value) == 32 else value.hex()
    if isinstance(value, dict):
        return {k: _jsonable(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_jsonable(v) for v in value]
    return value


def compact_event(ev: Event) -> list | None:
    """Tape representation of a decoded event (integers in raw units)."""
    f = ev.fields
    if ev.name == "TradeEvent":
        return ["T", _pk(f["mint"]), _pk(f["user"]), _b(f["is_buy"]), f["sol_amount"], f["token_amount"],
                f["virtual_sol_reserves"], f["virtual_token_reserves"], f["real_token_reserves"], f["timestamp"],
                f.get("fee_basis_points"), f.get("creator_fee_basis_points"), f.get("ix_name"),
                _quote(f.get("quote_mint")), f.get("quote_amount") if _quote(f.get("quote_mint")) else None,
                _b(f.get("mayhem_mode")), _pk(f.get("creator"))]
    if ev.name == "CreateEvent":
        return ["C", _pk(f["mint"]), _pk(f["bonding_curve"]), _pk(f["user"]), _pk(f["creator"]),
                f["name"], f["symbol"], f["uri"], f["timestamp"], f["virtual_token_reserves"],
                f["virtual_sol_reserves"], f["real_token_reserves"], f["token_total_supply"],
                _pk(f.get("token_program")), _b(f.get("is_mayhem_mode")), _b(f.get("is_cashback_enabled")),
                _quote(f.get("quote_mint")), f.get("virtual_quote_reserves"), f.get("creator_fee_bps"),
                _b(f.get("is_holder_reward")), f.get("depth")]
    if ev.name == "CompleteEvent":
        return ["M", _pk(f["mint"]), _pk(f["user"]), _pk(f["bonding_curve"]), f["timestamp"],
                _quote(f.get("quote_mint"))]
    if ev.name == "PostCompleteBuyEvent":
        return ["P", _pk(f["mint"]), _pk(f["user"]), f["timestamp"], f["base_out"], f["quote_in"],
                f.get("pool_base_reserves_after"), f.get("pool_quote_reserves_after"), _quote(f.get("quote_mint"))]
    if ev.name == "CompletePumpAmmMigrationEvent":
        return ["A", _pk(f["mint"]), _pk(f.get("pool")), f["timestamp"], f.get("mint_amount"),
                f.get("sol_amount"), _quote(f.get("quote_mint"))]
    if ev.name in COUNT_ONLY:
        return None
    return ["E", ev.name, _jsonable(f)]


def _plausible(ev: Event, now: float) -> bool:
    ts = ev.fields.get("timestamp")
    if ts is not None and abs(ts - now) > MAX_CLOCK_SKEW_S:
        return False
    if ev.name in ("TradeEvent", "CreateEvent", "CompleteEvent") and ev.fields.get("mint") is None:
        return False
    return True


class Recorder:
    """Synchronous core: turns log notifications into tape records and counters."""

    def __init__(self, writer: TapeWriter | None, decoder: EventDecoder | None = None,
                 program_id: str = PUMP_PROGRAM_ID, clock=time.time):
        self.writer = writer
        self.decoder = decoder or default_decoder()
        self.program_id = program_id
        self.clock = clock
        self.dedupe = SignatureCache()
        self.continuity = ContinuityTracker()
        self.migrated = MigratedTracker()
        self.minute: Counter[str] = Counter()
        self.totals: Counter[str] = Counter()
        self.other_events: Counter[str] = Counter()
        self.max_slot = 0
        self.last_trade_at = 0.0
        self.last_trade_ix_at = 0.0
        self.started_at = clock()
        self.on_migrated = None

    def _count(self, key: str, n: int = 1) -> None:
        self.minute[key] += n
        self.totals[key] += n

    def handle(self, n: LogNotification) -> list | None:
        """Process one notification; returns the tape line written (or None)."""
        if not self.dedupe.add(n.signature):
            self._count("dup")
            return None
        self._count("notif")
        self._count("bytes", n.size)
        if n.err is not None:
            self._count("err_tx")
            return None
        self.max_slot = max(self.max_slot, n.slot)
        parsed = parse_logs(n.logs, self.program_id, self.decoder)
        self._count("trade_ix", parsed.trade_ix)
        self._count("create_ix", parsed.create_ix)
        self._count("data_lines", parsed.data_lines)
        self._count("self_cpi", parsed.self_cpi)
        self._count("decode_errors", parsed.decode_errors)
        self._count("undecoded", len(parsed.undecoded))
        if parsed.truncated:
            self._count("truncated")
        if parsed.trade_ix:
            self.last_trade_ix_at = n.recv_ts

        records: list[list] = []
        for ev in parsed.events:
            if not _plausible(ev, n.recv_ts):
                self._count("implausible")
                continue
            rec = compact_event(ev)
            if rec is None:
                self.other_events[ev.name] += 1
                continue
            records.append(rec)
            kind = rec[0]
            if kind == "T":
                self._count("trades")
                self.last_trade_at = n.recv_ts
                if rec[4] is not None and rec[7] is not None:
                    self.continuity.on_trade(n.slot, ChainTrade(rec[1], bool(rec[3]), rec[5], rec[7]))
            elif kind == "C":
                self._count("creates")
                self.continuity.on_create(rec[1], rec[9], n.recv_ts)
            elif kind == "M":
                self._count("completes")
                self.migrated.add(rec[1], n.recv_ts)
            elif kind == "A":
                self.migrated.add(rec[1], n.recv_ts)
            if not ev.complete:
                self._count("short_events")
        for raw in parsed.undecoded:
            records.append(["U", raw[:4096]])
        if not records and not parsed.truncated:
            return None
        line = ["X", n.slot, round(n.recv_ts, 3), n.signature[:16], int(parsed.truncated), records]
        if self.writer:
            self.writer.write(line)
        self.continuity.settle(self.max_slot, n.recv_ts)
        return line

    def on_gap(self, started: float, ended: float, reason: str) -> None:
        self._count("gaps")
        self._count("gap_seconds", int(ended - started))
        if self.writer:
            self.writer.write(["G", round(started, 3), round(ended, 3), reason])

    def status(self, now: float, extra: dict | None = None) -> dict:
        ok, breaks, first = self.continuity.reset_counters()
        stats = dict(self.minute)
        stats.update(cont_ok=ok, cont_break=breaks, cont_first=first, max_slot=self.max_slot)
        if self.other_events:
            stats["other"] = dict(self.other_events)
        stats.update(extra or {})
        self.totals.update({"cont_ok": ok, "cont_break": breaks})
        self.minute.clear()
        self.other_events.clear()
        if self.writer:
            self.writer.write(["S", round(now, 3), stats])
        return stats


def decode_ratio(stats: dict) -> float | None:
    """Decoded trade events per pump Buy/Sell instruction (≈1 when events are in the logs)."""
    ix = stats.get("trade_ix", 0)
    return stats.get("trades", 0) / ix if ix else None


class Alerter:
    """Telegram messages with a per-kind cooldown, so an outage does not spam."""

    def __init__(self, notifier: TelegramNotifier | None, cooldown_s: float = 3600.0, clock=time.time):
        self.notifier = notifier
        self.cooldown_s = cooldown_s
        self.clock = clock
        self._last: dict[str, float] = {}
        self.active: set[str] = set()

    async def send(self, text: str) -> None:
        if self.notifier:
            await self.notifier.send(text)
        log.info("Telegram: %s", text.replace("\n", " | "))

    async def raise_(self, kind: str, text: str) -> None:
        now = self.clock()
        if kind in self.active and now - self._last.get(kind, 0) < self.cooldown_s:
            return
        self.active.add(kind)
        self._last[kind] = now
        await self.send(text)

    async def clear(self, kind: str, text: str) -> None:
        if kind in self.active:
            self.active.discard(kind)
            await self.send(text)


def next_local_time(now: float, hhmm: str, tz_name: str) -> float:
    try:
        tz = ZoneInfo(tz_name)
    except (ZoneInfoNotFoundError, ValueError):
        tz = ZoneInfo("UTC")
    hour, minute = (int(x) for x in hhmm.split(":"))
    local = datetime.fromtimestamp(now, tz)
    target = local.replace(hour=hour, minute=minute, second=0, microsecond=0)
    if target <= local:
        target = (target + timedelta(days=1)).replace(hour=hour, minute=minute)
    return target.timestamp()


def _de(n: int) -> str:
    return f"{n:,}".replace(",", ".")


def heartbeat_text(day: Counter, uptime_s: float, free_gb: float, gaps: int) -> str:
    ratio = decode_ratio(day)
    ratio_txt = f"{ratio:.0%}" if ratio is not None else "–"
    total = day.get("cont_ok", 0) + day.get("cont_break", 0)
    breaks = day.get("cont_break", 0) / total if total else 0.0
    return (
        "✅ <b>Recorder läuft</b>\n"
        f"Laufzeit: {uptime_s / 3600:.1f} h\n"
        f"Letzte 24 h: {_de(day.get('trades', 0))} Trades, {_de(day.get('creates', 0))} Launches, "
        f"{_de(day.get('completes', 0))} Migrationen\n"
        f"Dekodierquote: {ratio_txt} · Kontinuitätsbrüche: {breaks:.2%} · Lücken: {gaps}\n"
        f"Freier Speicher: {free_gb:.1f} GB"
    )


async def run_recorder(cfg: Config, stop: asyncio.Event | None = None, status_interval: float = 60.0,
                       slow_interval: float = 3600.0) -> None:
    stop = stop or asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        try:
            loop.add_signal_handler(sig, stop.set)
        except (NotImplementedError, RuntimeError):
            pass  # Windows

    rcfg = cfg.recorder
    writer = TapeWriter(rcfg.dir, compress=rcfg.compress,
                        header={"version": __version__, "idl_sha256": IDL_SHA256, "program": PUMP_PROGRAM_ID})
    recorder = Recorder(writer)
    day_window: deque[dict] = deque(maxlen=1440)

    async with aiohttp.ClientSession(trust_env=True) as session:
        notifier = None
        if cfg.telegram.bot_token and cfg.telegram.chat_id:
            notifier = TelegramNotifier(session, cfg.telegram.bot_token, cfg.telegram.chat_id)
        alerter = Alerter(notifier)
        stream = LogStream(session, cfg.solana.ws_url, PUMP_PROGRAM_ID, commitment=cfg.solana.commitment,
                           on_gap=recorder.on_gap)

        def free_gb() -> float:
            return shutil.disk_usage(Path(rcfg.dir)).free / 1e9

        async def consume() -> None:
            async for n in stream.notifications():
                recorder.handle(n)

        async def status_loop() -> None:
            last_ping = 0.0
            while True:
                await asyncio.sleep(status_interval)
                now = time.time()
                stats = recorder.status(now, {"connected": stream.connected, "reconnects": stream.reconnects})
                day_window.append(stats)
                ratio = decode_ratio(stats)
                log.info("Minute: %d Trades, %d Launches, %d Migrationen | Dekodierquote %s | Brüche %d | %s",
                         stats.get("trades", 0), stats.get("creates", 0), stats.get("completes", 0),
                         f"{ratio:.0%}" if ratio is not None else "–", stats.get("cont_break", 0),
                         "verbunden" if stream.connected else "GETRENNT")
                quiet = now - max(recorder.last_trade_at, recorder.started_at)
                if not stream.connected and quiet > cfg.ops.alarm_after_s:
                    await alerter.raise_("stream", "⚠️ Recorder: keine Verbindung zum Solana-Datenstrom "
                                         f"seit {quiet / 60:.0f} min. Ich verbinde automatisch neu.")
                elif now - recorder.last_trade_ix_at < 120 and quiet > cfg.ops.alarm_after_s:
                    await alerter.raise_("decode", "⚠️ Recorder: pump.fun-Trades kommen an, lassen sich aber nicht "
                                         "dekodieren. Vermutlich ein pump.fun-Update – bitte `idl-check` "
                                         "ausführen.")
                else:
                    await alerter.clear("stream", "✅ Recorder: Datenstrom wieder da.")
                    await alerter.clear("decode", "✅ Recorder: Events werden wieder dekodiert.")
                if cfg.ops.healthcheck_url and now - recorder.last_trade_at < 60 and now - last_ping > 300:
                    last_ping = now
                    try:
                        async with session.get(cfg.ops.healthcheck_url, timeout=aiohttp.ClientTimeout(total=10)):
                            pass
                    except (aiohttp.ClientError, asyncio.TimeoutError):
                        log.debug("Healthcheck-Ping fehlgeschlagen")

        async def dex_loop() -> None:
            while True:
                await asyncio.sleep(cfg.dexscreener.interval_s)
                mints = recorder.migrated.due(time.time())
                if not mints:
                    continue
                min_interval = 60.0 / max(cfg.dexscreener.max_requests_per_min, 1)
                records, requests, errors = await poll_once(session, cfg.dexscreener.base_url, mints, min_interval)
                recorder._count("dex_requests", requests)
                recorder._count("dex_errors", errors)
                if records:
                    writer.write(["D", round(time.time(), 3), records])

        async def deploy_watch() -> None:
            last_slot = None
            while True:
                try:
                    slot = await program_deploy_slot(session, cfg.solana.rpc_url, PUMP_PROGRAM_ID)
                except RpcError as exc:
                    log.info("Deploy-Slot nicht lesbar: %s", exc)
                    slot = None
                if slot is not None and slot != last_slot:
                    writer.write(["B", round(time.time(), 3), slot])
                    if last_slot is not None:
                        await alerter.send(f"ℹ️ pump.fun hat sein Programm aktualisiert (Slot {slot}). "
                                           "Ab hier gilt ein neuer Daten-Abschnitt.")
                    last_slot = slot
                await asyncio.sleep(slow_interval)

        async def housekeeping() -> None:
            while True:
                deleted = apply_retention(rcfg.dir, rcfg.keep_days, int(rcfg.min_free_gb * 1e9), time.time(),
                                          protect=[p for p in [writer.current_path] if p])
                if deleted:
                    log.info("Retention: %d alte Tape-Dateien gelöscht", len(deleted))
                if free_gb() < rcfg.min_free_gb:
                    await alerter.raise_("disk", f"⚠️ Recorder: nur noch {free_gb():.1f} GB frei.")
                recorder.continuity.prune(time.time())
                await asyncio.sleep(slow_interval)

        async def heartbeat() -> None:
            while True:
                due = next_local_time(time.time(), cfg.ops.heartbeat_time, cfg.ops.timezone)
                await asyncio.sleep(max(1.0, due - time.time()))
                day: Counter = Counter()
                for s in day_window:
                    day.update({k: v for k, v in s.items() if isinstance(v, int) and not isinstance(v, bool)})
                await alerter.send(heartbeat_text(day, time.time() - recorder.started_at, free_gb(),
                                                  day.get("gaps", 0)))

        tasks = [asyncio.create_task(c(), name=c.__name__)
                 for c in (consume, status_loop, housekeeping, heartbeat, deploy_watch)]
        if cfg.dexscreener.enabled:
            tasks.append(asyncio.create_task(dex_loop(), name="dex_loop"))
        log.info("Recorder läuft. Aufnahmen in %s", Path(rcfg.dir).resolve())
        await alerter.send("▶️ Recorder gestartet.")
        stopper = asyncio.create_task(stop.wait())
        done, _ = await asyncio.wait([stopper, *tasks], return_when=asyncio.FIRST_COMPLETED)
        for t in done:
            if t is not stopper and t.exception():
                log.error("Task %s abgestürzt: %r", t.get_name(), t.exception())
        for t in tasks:
            t.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        stopper.cancel()
        recorder.status(time.time(), {"shutdown": True})
        writer.close()
        log.info("Recorder sauber beendet.")
