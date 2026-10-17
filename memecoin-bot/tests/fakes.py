"""Shared fakes: local aiohttp servers and pump.fun log builders."""

from __future__ import annotations

import base64

from aiohttp import web

from memecoin_bot.events import PUMP_PROGRAM_ID, EventEncoder, default_decoder

ENCODER = EventEncoder(default_decoder())
OTHER_PROGRAM = "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA"


async def start_server(app: web.Application) -> tuple[web.AppRunner, str]:
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "127.0.0.1", 0)
    await site.start()
    port = site._server.sockets[0].getsockname()[1]
    return runner, f"http://127.0.0.1:{port}"


def data_line(event_name: str, values: dict, drop_last: int = 0) -> str:
    raw = ENCODER.encode(event_name, values, drop_last=drop_last)
    return "Program data: " + base64.b64encode(raw).decode()


def pump_tx_logs(*data_lines: str, instruction: str = "Buy", outer: str | None = None) -> list[str]:
    """Logs of a transaction calling pump (optionally through an outer program)."""
    logs = []
    depth = 1
    if outer:
        logs.append(f"Program {outer} invoke [1]")
        depth = 2
    logs += [f"Program {PUMP_PROGRAM_ID} invoke [{depth}]", f"Program log: Instruction: {instruction}"]
    logs += list(data_lines)
    logs += [f"Program {PUMP_PROGRAM_ID} consumed 40000 of 200000 compute units",
             f"Program {PUMP_PROGRAM_ID} success"]
    if outer:
        logs.append(f"Program {outer} success")
    return logs


def notification(slot: int, signature: str, logs: list[str], err=None, sub: int = 7) -> dict:
    return {"jsonrpc": "2.0", "method": "logsNotification",
            "params": {"result": {"context": {"slot": slot},
                                  "value": {"signature": signature, "err": err, "logs": logs}},
                       "subscription": sub}}
