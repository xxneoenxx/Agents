from __future__ import annotations

import asyncio
import json
import logging

import aiohttp

log = logging.getLogger(__name__)

METADATA_TIMEOUT_S = 4.0
METADATA_MAX_BYTES = 64 * 1024
SOL_PRICE_URL = "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
SOL_PRICE_REFRESH_S = 180.0
SOCIAL_KEYS = ("twitter", "telegram", "website")


class MetadataFetcher:
    """Reads the token's metadata JSON (from the ``uri`` of the launch) to show socials."""

    def __init__(self, session: aiohttp.ClientSession):
        self.session = session
        self._cache: dict[str, dict[str, str]] = {}

    async def socials(self, uri: str) -> dict[str, str]:
        if not uri.startswith(("https://", "http://")):
            return {}
        if uri in self._cache:
            return self._cache[uri]
        result: dict[str, str] = {}
        try:
            timeout = aiohttp.ClientTimeout(total=METADATA_TIMEOUT_S)
            async with self.session.get(uri, timeout=timeout) as resp:
                if resp.status == 200:
                    body = await resp.content.read(METADATA_MAX_BYTES)
                    data = json.loads(body)
                    if isinstance(data, dict):
                        for key in SOCIAL_KEYS:
                            value = data.get(key)
                            if isinstance(value, str) and value.strip():
                                result[key] = value.strip()[:120]
        except (aiohttp.ClientError, asyncio.TimeoutError, ValueError) as exc:
            log.debug("Metadaten für %s nicht ladbar: %r", uri, exc)
        if len(self._cache) > 5000:
            self._cache.clear()
        self._cache[uri] = result
        return result


class SolPrice:
    """Keeps a roughly current SOL/USD price so alerts can show USD values."""

    def __init__(self, session: aiohttp.ClientSession):
        self.session = session
        self.usd: float | None = None

    async def refresh(self) -> None:
        try:
            timeout = aiohttp.ClientTimeout(total=10)
            async with self.session.get(SOL_PRICE_URL, timeout=timeout) as resp:
                if resp.status == 200:
                    data = await resp.json(content_type=None)
                    self.usd = float(data["solana"]["usd"])
        except (aiohttp.ClientError, asyncio.TimeoutError, ValueError, KeyError, TypeError) as exc:
            log.debug("SOL-Preis nicht ladbar: %r", exc)

    async def run(self) -> None:
        while True:
            await self.refresh()
            await asyncio.sleep(SOL_PRICE_REFRESH_S)
