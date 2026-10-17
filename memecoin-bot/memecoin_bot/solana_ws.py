"""Solana `logsSubscribe` stream for the pump.fun program and parsing of its logs."""

from __future__ import annotations

import asyncio
import base64
import binascii
import json
import logging
import random
import re
import time
from collections import OrderedDict
from collections.abc import AsyncIterator, Callable
from dataclasses import dataclass, field

import aiohttp

from .events import DecodeError, Event, EventDecoder

log = logging.getLogger(__name__)

_INVOKE = re.compile(r"^Program (\w+) invoke \[(\d+)\]$")
_RESULT = re.compile(r"^Program (\w+) (success|failed)")
_DATA_PREFIX = "Program data: "
_IX_PREFIX = "Program log: Instruction: "


@dataclass
class ParsedTx:
    events: list[Event] = field(default_factory=list)
    trade_ix: int = 0       # pump Buy*/Sell* instructions seen in the logs
    create_ix: int = 0      # pump Create* instructions
    data_lines: int = 0     # "Program data:" lines emitted by pump itself
    self_cpi: int = 0       # pump invoking pump (emit_cpi! leaves its data here, not in logs)
    undecoded: list[str] = field(default_factory=list)   # pump data with unknown discriminator
    decode_errors: int = 0
    truncated: bool = False


def parse_logs(logs: list[str], program_id: str, decoder: EventDecoder) -> ParsedTx:
    """Attribute log lines to the program on top of the invoke stack and decode
    pump's own events. Data emitted by other programs in the same transaction
    (PumpSwap, routers, fee programs) is ignored."""
    out = ParsedTx()
    stack: list[str] = []
    for line in logs:
        if line.startswith(_DATA_PREFIX):
            if stack and stack[-1] == program_id:
                out.data_lines += 1
                raw = line[len(_DATA_PREFIX):].strip()
                try:
                    data = base64.b64decode(raw, validate=True)
                except (binascii.Error, ValueError):
                    out.decode_errors += 1
                    continue
                try:
                    event = decoder.decode(data)
                except DecodeError:
                    out.decode_errors += 1
                    continue
                if event is None:
                    out.undecoded.append(raw)
                else:
                    out.events.append(event)
            continue
        if line.startswith(_IX_PREFIX):
            if stack and stack[-1] == program_id:
                name = line[len(_IX_PREFIX):].strip()
                if name.startswith(("Buy", "Sell")):
                    out.trade_ix += 1
                elif name.startswith("Create"):
                    out.create_ix += 1
            continue
        m = _INVOKE.match(line)
        if m:
            if m.group(1) == program_id and stack and stack[-1] == program_id:
                out.self_cpi += 1
            stack.append(m.group(1))
            continue
        m = _RESULT.match(line)
        if m:
            if stack and stack[-1] == m.group(1):
                stack.pop()
            continue
        if line.startswith("Log truncated"):
            out.truncated = True
    return out


@dataclass
class LogNotification:
    slot: int
    signature: str
    err: object
    logs: list[str]
    recv_ts: float
    size: int


class SignatureCache:
    """Bounded set of recently seen signatures (duplicates arrive after reconnects)."""

    def __init__(self, maxsize: int = 50_000):
        self.maxsize = maxsize
        self._seen: OrderedDict[str, None] = OrderedDict()

    def add(self, signature: str) -> bool:
        """Returns False if the signature was already seen."""
        if signature in self._seen:
            return False
        self._seen[signature] = None
        if len(self._seen) > self.maxsize:
            self._seen.popitem(last=False)
        return True


class LogStream:
    """`logsSubscribe` with `mentions: [program]` and automatic reconnect.

    `on_gap(started, ended, reason)` is called after a reconnect so the recorder
    can mark the outage in the tape.
    """

    def __init__(self, session: aiohttp.ClientSession, ws_url: str, program_id: str,
                 commitment: str = "confirmed", receive_timeout: float = 60.0,
                 on_gap: Callable[[float, float, str], None] | None = None,
                 clock: Callable[[], float] = time.time, initial_backoff: float = 1.0):
        self.session = session
        self.ws_url = ws_url
        self.program_id = program_id
        self.commitment = commitment
        self.receive_timeout = receive_timeout
        self.on_gap = on_gap
        self.clock = clock
        self.initial_backoff = initial_backoff
        self.connected = False
        self.reconnects = 0
        self.bytes_received = 0
        self.last_message_at = 0.0

    def _request(self) -> dict:
        return {"jsonrpc": "2.0", "id": 1, "method": "logsSubscribe",
                "params": [{"mentions": [self.program_id]}, {"commitment": self.commitment}]}

    async def notifications(self) -> AsyncIterator[LogNotification]:
        backoff = self.initial_backoff
        down_since: float | None = None
        reason = "start"
        while True:
            try:
                timeout = aiohttp.ClientWSTimeout(ws_receive=self.receive_timeout, ws_close=10)
                async with self.session.ws_connect(self.ws_url, heartbeat=30, timeout=timeout,
                                                   max_msg_size=8 * 1024 * 1024) as ws:
                    await ws.send_json(self._request())
                    subscribed = False
                    async for raw in ws:
                        if raw.type != aiohttp.WSMsgType.TEXT:
                            if raw.type in (aiohttp.WSMsgType.CLOSED, aiohttp.WSMsgType.ERROR):
                                break
                            continue
                        now = self.clock()
                        self.bytes_received += len(raw.data)
                        self.last_message_at = now
                        try:
                            msg = json.loads(raw.data)
                        except json.JSONDecodeError:
                            continue
                        if not subscribed:
                            if "error" in msg:
                                raise ConnectionError(f"logsSubscribe abgelehnt: {msg['error']}")
                            if msg.get("id") == 1 and "result" in msg:
                                subscribed = True
                                self.connected = True
                                backoff = self.initial_backoff
                                log.info("Solana-Log-Stream verbunden (Abo %s)", msg["result"])
                                if down_since is not None and self.on_gap:
                                    self.on_gap(down_since, now, reason)
                                down_since = None
                                continue
                        if msg.get("method") != "logsNotification":
                            continue
                        result = msg.get("params", {}).get("result", {})
                        value = result.get("value") or {}
                        signature = value.get("signature")
                        if not signature:
                            continue
                        yield LogNotification(
                            slot=int(result.get("context", {}).get("slot") or 0),
                            signature=signature,
                            err=value.get("err"),
                            logs=value.get("logs") or [],
                            recv_ts=now,
                            size=len(raw.data),
                        )
                    reason = "geschlossen"
                    log.warning("Solana-Log-Stream wurde geschlossen")
            except (aiohttp.ClientError, asyncio.TimeoutError, OSError, ConnectionError) as exc:
                reason = type(exc).__name__
                log.warning("Solana-Log-Stream unterbrochen: %r", exc)
            if down_since is None:
                down_since = self.clock()
            self.connected = False
            self.reconnects += 1
            delay = backoff * (0.5 + random.random())
            log.info("Neuer Verbindungsversuch in %.1fs", delay)
            await asyncio.sleep(delay)
            backoff = min(backoff * 2, 60.0)
