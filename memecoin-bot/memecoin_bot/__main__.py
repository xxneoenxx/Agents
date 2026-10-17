from __future__ import annotations

import argparse
import asyncio
import logging
import signal
import sys

from . import app
from .config import ConfigError, default_config_path, load_config

COMMANDS = ("record", "doctor", "idl-check", "run", "demo", "replay", "test-alert")


def parse_args(argv: list[str]) -> argparse.Namespace:
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("-c", "--config", help="Pfad zur config.toml (Standard: ./config.toml, falls vorhanden)")
    common.add_argument("-v", "--verbose", action="store_true", help="ausführliches Log")

    parser = argparse.ArgumentParser(
        prog="python -m memecoin_bot",
        description="Beobachtet neue pump.fun-Memecoins und meldet, wenn viele Käufer einsteigen.",
    )
    sub = parser.add_subparsers(dest="command")
    sub.add_parser("record", parents=[common], help="v2: alle pump.fun-Ereignisse kostenlos aufzeichnen")
    doctor = sub.add_parser("doctor", parents=[common], help="Selbsttest aller Datenquellen")
    doctor.add_argument("--probe-seconds", type=float, default=20.0, metavar="S",
                        help="so lange den Solana-Datenstrom testen (Standard 20)")
    doctor.add_argument("--save-fixtures", metavar="ORDNER", help="Beispiel-Logs und Statistik speichern")
    sub.add_parser("idl-check", parents=[common], help="prüfen, ob pump.fun sein Event-Format geändert hat")
    run = sub.add_parser("run", parents=[common],
                         help="v1-Live-Modus (braucht seit 05/2026 einen kostenpflichtigen PumpPortal-Key)")
    run.add_argument("--record", metavar="DATEI", help="alle Rohdaten als JSONL aufzeichnen (für replay)")
    sub.add_parser("demo", parents=[common], help="Demo mit simulierten Coins, ohne Internet")
    replay = sub.add_parser("replay", parents=[common], help="aufgezeichnete Daten erneut auswerten")
    replay.add_argument("file", help="mit --record erstellte JSONL-Datei")
    replay.add_argument("--notify", action="store_true", help="Signale auch an Telegram/Discord senden")
    sub.add_parser("test-alert", parents=[common], help="Test-Nachricht an Telegram/Discord schicken")

    if not argv:
        argv = ["--help"]
    elif argv[0] not in COMMANDS + ("-h", "--help"):
        argv = ["run", *argv]
    return parser.parse_args(argv)


def _stop_on_sigterm(signum, frame):
    raise KeyboardInterrupt


def main(argv: list[str] | None = None) -> int:
    args = parse_args(sys.argv[1:] if argv is None else argv)
    # Treat `kill`/systemd/docker stop like Ctrl+C so recordings get closed cleanly.
    signal.signal(signal.SIGTERM, _stop_on_sigterm)
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(errors="replace")
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(asctime)s %(levelname)-7s %(message)s",
        datefmt="%H:%M:%S",
    )
    logging.getLogger("aiohttp").setLevel(logging.WARNING)

    try:
        cfg = load_config(args.config or default_config_path())
    except ConfigError as exc:
        print(f"Fehler in der Konfiguration: {exc}", file=sys.stderr)
        return 2

    try:
        if args.command == "record":
            from .recorder import run_recorder
            asyncio.run(run_recorder(cfg))
        elif args.command == "doctor":
            return asyncio.run(_doctor(cfg, args))
        elif args.command == "idl-check":
            return asyncio.run(_idl_check())
        elif args.command == "demo":
            asyncio.run(app.run_demo(cfg))
        elif args.command == "replay":
            asyncio.run(app.run_replay(cfg, args.file, notify=args.notify))
        elif args.command == "test-alert":
            return 0 if asyncio.run(app.run_test_alert(cfg)) else 1
        else:
            asyncio.run(app.run_live(cfg, record_path=args.record))
    except KeyboardInterrupt:
        print("\nBot gestoppt.")
    except FileNotFoundError as exc:
        print(f"Datei nicht gefunden: {exc.filename}", file=sys.stderr)
        return 2
    return 0


async def _doctor(cfg, args) -> int:
    from pathlib import Path

    from .doctor import format_checks, run_doctor
    print(f"Selbsttest läuft (Datenstrom-Probe {args.probe_seconds:.0f} s) …\n")
    checks = await run_doctor(cfg, args.probe_seconds, Path(args.save_fixtures) if args.save_fixtures else None)
    print(format_checks(checks))
    return 1 if any(c.status == "fail" for c in checks) else 0


async def _idl_check() -> int:
    import aiohttp

    from .doctor import idl_check
    async with aiohttp.ClientSession(trust_env=True) as session:
        try:
            changed, report = await idl_check(session)
        except (aiohttp.ClientError, asyncio.TimeoutError) as exc:
            print(f"IDL nicht abrufbar: {exc!r}", file=sys.stderr)
            return 2
    print(report)
    return 1 if changed else 0


if __name__ == "__main__":
    sys.exit(main())
