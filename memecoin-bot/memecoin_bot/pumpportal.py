from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import AsyncIterator, Callable, Iterable
from urllib.parse import urlencode

import aiohttp

from .config import SourceConfig

log = logging.getLogger(__name__)

KEYS_PER_MESSAGE = 100


class PumpPortalClient:
    """PumpPortal data websocket with automatic reconnect.

    On every (re)connect it subscribes to new token launches and to trades of
    every mint returned by ``current_keys``.
    """

    def __init__(
        self,
        cfg: SourceConfig,
        session: aiohttp.ClientSession,
        current_keys: Callable[[], Iterable[str]],
        receive_timeout: float = 120.0,
    ):
        self.url = cfg.ws_url
        if cfg.api_key:
            sep = "&" if "?" in self.url else "?"
            self.url += sep + urlencode({"api-key": cfg.api_key})
        self.session = session
        self.current_keys = current_keys
        self.receive_timeout = receive_timeout
        self._ws: aiohttp.ClientWebSocketResponse | None = None

    @property
    def connected(self) -> bool:
        return self._ws is not None and not self._ws.closed

    async def _send_keys(self, method: str, keys: list[str]) -> None:
        if not keys or not self.connected:
            return
        try:
            for i in range(0, len(keys), KEYS_PER_MESSAGE):
                await self._ws.send_json({"method": method, "keys": keys[i : i + KEYS_PER_MESSAGE]})
        except (aiohttp.ClientError, ConnectionError) as exc:
            # The read loop notices the broken connection and resubscribes everything on reconnect.
            log.debug("%s nicht gesendet: %r", method, exc)

    async def subscribe(self, mints: list[str]) -> None:
        await self._send_keys("subscribeTokenTrade", mints)

    async def unsubscribe(self, mints: list[str]) -> None:
        await self._send_keys("unsubscribeTokenTrade", mints)

    async def messages(self) -> AsyncIterator[dict]:
        backoff = 1.0
        while True:
            try:
                timeout = aiohttp.ClientWSTimeout(ws_receive=self.receive_timeout, ws_close=10)
                async with self.session.ws_connect(self.url, heartbeat=30, timeout=timeout) as ws:
                    self._ws = ws
                    log.info("Verbunden mit PumpPortal")
                    await ws.send_json({"method": "subscribeNewToken"})
                    await self.subscribe(list(self.current_keys()))
                    backoff = 1.0
                    async for raw in ws:
                        if raw.type == aiohttp.WSMsgType.TEXT:
                            try:
                                data = json.loads(raw.data)
                            except json.JSONDecodeError:
                                continue
                            if not isinstance(data, dict):
                                continue
                            if "errors" in data:
                                log.warning("PumpPortal meldet Fehler: %s", data["errors"])
                                continue
                            if "txType" not in data:
                                log.debug("PumpPortal: %s", data)
                                continue
                            yield data
                        elif raw.type in (aiohttp.WSMsgType.CLOSED, aiohttp.WSMsgType.ERROR):
                            break
                    log.warning("PumpPortal hat die Verbindung geschlossen")
            except (aiohttp.ClientError, asyncio.TimeoutError, OSError) as exc:
                log.warning("Verbindung zu PumpPortal fehlgeschlagen: %r", exc)
            finally:
                self._ws = None
            log.info("Neuer Verbindungsversuch in %.0fs", backoff)
            await asyncio.sleep(backoff)
            backoff = min(backoff * 2, 60.0)
