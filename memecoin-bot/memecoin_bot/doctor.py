"""Self-test: checks every data source and prints a German checklist."""

from __future__ import annotations

import asyncio
import hashlib
import json
import shutil
import sys
import time
from dataclasses import dataclass
from pathlib import Path

import aiohttp

from .config import Config
from .events import IDL_SHA256, IDL_SOURCE, PUMP_PROGRAM_ID, EventDecoder, default_decoder, idl_sha256
from .recorder import Recorder, _de, decode_ratio
from .solana_rpc import RpcError, program_deploy_slot, rpc_call
from .solana_ws import LogStream

ICONS = {"ok": "✅", "warn": "⚠️", "fail": "❌"}
WSOL = "So11111111111111111111111111111111111111112"


@dataclass
class Check:
    name: str
    status: str
    detail: str
    hint: str = ""


def format_checks(checks: list[Check]) -> str:
    lines = []
    for c in checks:
        lines.append(f"{ICONS[c.status]} {c.name}: {c.detail}")
        if c.hint and c.status != "ok":
            lines.append(f"   → {c.hint}")
    failed = sum(c.status == "fail" for c in checks)
    warned = sum(c.status == "warn" for c in checks)
    lines.append("")
    lines.append("Alles in Ordnung." if not failed and not warned
                 else f"{failed} Fehler, {warned} Warnungen.")
    return "\n".join(lines)


def _local_checks(cfg: Config) -> list[Check]:
    checks = []
    py = sys.version_info
    checks.append(Check("Python", "ok" if py >= (3, 11) else "fail", f"{py.major}.{py.minor}.{py.micro}",
                        "Python 3.11 oder neuer installieren"))
    checks.append(Check("aiohttp", "ok", aiohttp.__version__))
    tape_dir = Path(cfg.recorder.dir)
    try:
        tape_dir.mkdir(parents=True, exist_ok=True)
        probe = tape_dir / ".doctor-write-test"
        probe.write_text("ok")
        probe.unlink()
        free = shutil.disk_usage(tape_dir).free / 1e9
        status = "ok" if free >= cfg.recorder.min_free_gb + 5 else "warn"
        checks.append(Check("Aufnahme-Ordner", status, f"{tape_dir.resolve()} beschreibbar, {free:.1f} GB frei",
                            "Für 30 Tage Aufnahme etwa 10 GB frei halten (oder keep_days senken)"))
    except OSError as exc:
        checks.append(Check("Aufnahme-Ordner", "fail", f"{tape_dir}: {exc}", "Rechte/Pfad prüfen"))
    sha = idl_sha256()
    checks.append(Check("pump.fun-IDL", "ok" if sha == IDL_SHA256 else "fail", sha[:12],
                        "Die mitgelieferte IDL-Datei wurde verändert – Repo neu auschecken"))
    return checks


async def probe_stream(cfg: Config, session: aiohttp.ClientSession, seconds: float,
                       save_fixtures: Path | None = None) -> tuple[dict, list[dict]]:
    recorder = Recorder(None)
    stream = LogStream(session, cfg.solana.ws_url, PUMP_PROGRAM_ID, commitment=cfg.solana.commitment,
                       on_gap=recorder.on_gap)
    samples: list[dict] = []
    kept: dict[str, int] = {}
    started = time.time()
    first_at = None

    async def consume() -> None:
        nonlocal first_at
        async for n in stream.notifications():
            first_at = first_at or time.time()
            line = recorder.handle(n)
            if save_fixtures is None:
                continue
            kinds = {r[0] for r in (line[5] if line else [])}
            tags = [k for k in ("C", "M", "P", "A", "U", "E") if k in kinds]
            if line and line[4]:
                tags.append("truncated")
            if not line and n.err is None and any("Instruction: Buy" in x or "Instruction: Sell" in x
                                                  for x in n.logs):
                tags.append("no_event")
            tags = tags or (["T"] if line else [])
            for tag in tags:
                if kept.get(tag, 0) < (40 if tag == "T" else 15):
                    kept[tag] = kept.get(tag, 0) + 1
                    samples.append({"tag": tag, "slot": n.slot, "signature": n.signature,
                                    "err": n.err, "logs": n.logs})
                    break

    task = asyncio.create_task(consume())
    try:
        await asyncio.wait_for(asyncio.shield(task), timeout=seconds)
    except asyncio.TimeoutError:
        pass
    finally:
        task.cancel()
        await asyncio.gather(task, return_exceptions=True)
    recorder.continuity.flush(time.time())
    elapsed = max(time.time() - started, 1e-9)
    stats = dict(recorder.totals)
    ok, breaks, first = recorder.continuity.reset_counters()
    stats.update(cont_ok=stats.get("cont_ok", 0) + ok, cont_break=stats.get("cont_break", 0) + breaks,
                 cont_first=first, seconds=elapsed, connected=stream.connected or bool(first_at),
                 first_message_after=(first_at - started) if first_at else None,
                 other=dict(recorder.other_events))
    if save_fixtures is not None:
        save_fixtures.mkdir(parents=True, exist_ok=True)
        (save_fixtures / "probe_samples.json").write_text(json.dumps(samples, indent=1))
        (save_fixtures / "probe_stats.json").write_text(json.dumps(stats, indent=1, default=str))
    return stats, samples


def evaluate_probe(stats: dict) -> list[Check]:
    checks = []
    seconds = stats.get("seconds", 1)
    notif = stats.get("notif", 0)
    if not notif:
        return [Check("Solana-Datenstrom", "fail", "keine Nachrichten empfangen",
                      "Server-IP evtl. gesperrt: in [solana] einen anderen kostenlosen Knoten (z. B. Helius) "
                      "eintragen oder Firewall prüfen")]
    checks.append(Check("Solana-Datenstrom", "ok",
                        f"{notif / seconds:.0f} Nachrichten/s, {stats.get('bytes', 0) / seconds / 1e3:.0f} KB/s, "
                        f"Fehler-Txs {stats.get('err_tx', 0) / notif:.0%}"))
    ratio = decode_ratio(stats)
    trades = stats.get("trades", 0)
    if ratio is None:
        checks.append(Check("pump.fun-Events", "warn", "keine Buy/Sell-Instruktionen gesehen",
                            "Probe länger laufen lassen (--probe-seconds 120)"))
    elif trades == 0 and stats.get("self_cpi", 0):
        checks.append(Check("pump.fun-Events", "fail",
                            "Trades stehen nicht in den Logs (nur als CPI-Event) – kostenloser Weg A geht nicht",
                            "Fallback Weg B nötig (Curve-Zustände statt Einzel-Trades)"))
    else:
        status = "ok" if 0.9 <= ratio <= 1.5 else "warn"
        checks.append(Check("pump.fun-Events", status,
                            f"{_de(trades)} Trades / {_de(stats.get('trade_ix', 0))} Instruktionen = {ratio:.0%}, "
                            f"{_de(stats.get('creates', 0))} Launches, {_de(stats.get('completes', 0))} Migrationen",
                            "Dekodierquote prüfen – evtl. hat pump.fun das Event-Format geändert (idl-check)"))
    total = stats.get("cont_ok", 0) + stats.get("cont_break", 0)
    if total:
        rate = stats.get("cont_break", 0) / total
        checks.append(Check("Vollständigkeit", "ok" if rate < 0.02 else "warn",
                            f"{rate:.2%} Kontinuitätsbrüche, {stats.get('truncated', 0)} abgeschnittene Logs, "
                            f"{stats.get('decode_errors', 0)} Dekodierfehler",
                            "Viele Brüche heißen: der Knoten verschluckt Nachrichten"))
    if stats.get("gaps"):
        checks.append(Check("Verbindung", "warn", f"{stats['gaps']} Abbrüche während der Probe",
                            "Instabile Verbindung oder Drosselung durch den RPC-Knoten"))
    return checks


async def idl_check(session: aiohttp.ClientSession, url: str = IDL_SOURCE) -> tuple[bool, str]:
    """Compare the vendored IDL with upstream. Never changes the local file."""
    async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as resp:
        resp.raise_for_status()
        body = await resp.read()
    upstream_sha = hashlib.sha256(body).hexdigest()
    if upstream_sha == IDL_SHA256:
        return False, "IDL unverändert."
    upstream = EventDecoder(json.loads(body))
    local = default_decoder()
    lines = [f"IDL hat sich geändert (neu {upstream_sha[:12]}, lokal {IDL_SHA256[:12]})."]
    for name in ("TradeEvent", "CreateEvent", "CompleteEvent", "PostCompleteBuyEvent",
                 "CompletePumpAmmMigrationEvent"):
        try:
            new, old = upstream.field_names(name), local.field_names(name)
        except KeyError:
            lines.append(f"- {name}: fehlt in einer der Versionen!")
            continue
        if new != old:
            prefix_ok = new[:len(old)] == old
            lines.append(f"- {name}: {'nur neue Felder angehängt' if prefix_ok else 'FELDER GEÄNDERT'} "
                         f"({len(old)} → {len(new)})")
    old_discs = local.by_discriminator.keys()
    new_events = [n for d, n in upstream.by_discriminator.items() if d not in old_discs]
    if new_events:
        lines.append(f"- neue Events: {', '.join(new_events)}")
    return True, "\n".join(lines)


async def run_doctor(cfg: Config, probe_seconds: float = 20.0, save_fixtures: Path | None = None) -> list[Check]:
    checks = _local_checks(cfg)
    async with aiohttp.ClientSession(trust_env=True) as session:
        t0 = time.monotonic()
        try:
            slot = await rpc_call(session, cfg.solana.rpc_url, "getSlot")
            checks.append(Check("Solana-RPC", "ok", f"Slot {slot}, {1000 * (time.monotonic() - t0):.0f} ms"))
        except RpcError as exc:
            hint = ("IP gesperrt (403) – kostenlosen Helius-Key als SOLANA_RPC_URL/SOLANA_WS_URL eintragen"
                    if exc.status == 403 else "Netzwerk/Firewall prüfen")
            checks.append(Check("Solana-RPC", "fail", str(exc), hint))
        try:
            deploy = await program_deploy_slot(session, cfg.solana.rpc_url, PUMP_PROGRAM_ID)
            checks.append(Check("pump.fun-Programm", "ok" if deploy else "warn",
                                f"letztes Update in Slot {deploy}" if deploy else "nicht lesbar"))
        except RpcError as exc:
            checks.append(Check("pump.fun-Programm", "warn", str(exc)))

        stats, _ = await probe_stream(cfg, session, probe_seconds, save_fixtures)
        checks += evaluate_probe(stats)

        if cfg.dexscreener.enabled:
            try:
                url = f"{cfg.dexscreener.base_url.rstrip('/')}/tokens/v1/solana/{WSOL}"
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                    ok = resp.status == 200
                    checks.append(Check("DexScreener", "ok" if ok else "warn", f"HTTP {resp.status}",
                                        "Preise nach der Migration fehlen dann im Backtest"))
            except (aiohttp.ClientError, asyncio.TimeoutError) as exc:
                checks.append(Check("DexScreener", "warn", type(exc).__name__,
                                    "Preise nach der Migration fehlen dann im Backtest"))

        if cfg.telegram.bot_token:
            try:
                url = f"https://api.telegram.org/bot{cfg.telegram.bot_token}/getMe"
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                    data = await resp.json(content_type=None)
                ok = resp.status == 200 and data.get("ok")
                name = (data.get("result") or {}).get("username", "?") if ok else data.get("description")
                checks.append(Check("Telegram", "ok" if ok and cfg.telegram.chat_id else "warn",
                                    f"Bot @{name}" + ("" if cfg.telegram.chat_id else ", aber keine Chat-ID"),
                                    "TELEGRAM_CHAT_ID setzen (siehe README)"))
            except (aiohttp.ClientError, asyncio.TimeoutError, ValueError) as exc:
                checks.append(Check("Telegram", "fail", type(exc).__name__, "Token prüfen / Netzwerk"))
        else:
            checks.append(Check("Telegram", "warn", "nicht eingerichtet",
                                "Ohne Telegram bekommst du keine Alarme aufs iPhone"))
    return checks
