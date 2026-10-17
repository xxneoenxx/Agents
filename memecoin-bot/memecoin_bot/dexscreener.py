"""DexScreener lookups for coins after their migration to PumpSwap."""

from __future__ import annotations

import asyncio
import logging

import aiohttp

log = logging.getLogger(__name__)

BATCH = 30  # addresses per /tokens/v1 request


def _num(value, default=None):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def select_pair(pairs: list[dict]) -> dict | None:
    """Prefer the PumpSwap pool, otherwise the most liquid Solana pair."""
    sol = [p for p in pairs if isinstance(p, dict) and p.get("chainId") == "solana"]
    if not sol:
        return None
    swap = [p for p in sol if p.get("dexId") == "pumpswap"]
    pool = swap or sol
    return max(pool, key=lambda p: _num((p.get("liquidity") or {}).get("usd"), 0.0))


def compact_pair(mint: str, pair: dict) -> list:
    txns = (pair.get("txns") or {}).get("m5") or {}
    return [
        mint, pair.get("dexId"), pair.get("pairAddress"),
        _num(pair.get("priceNative")), _num(pair.get("priceUsd")),
        _num((pair.get("liquidity") or {}).get("usd")), _num(pair.get("fdv")), _num(pair.get("marketCap")),
        _num((pair.get("volume") or {}).get("m5")), txns.get("buys"), txns.get("sells"),
        ((pair.get("quoteToken") or {}).get("symbol")),
    ]


async def fetch_pairs(session: aiohttp.ClientSession, base_url: str, mints: list[str],
                      timeout: float = 15.0) -> dict[str, list[dict]]:
    """GET /tokens/v1/solana/{mints}. Returns pairs grouped by base token mint."""
    url = f"{base_url.rstrip('/')}/tokens/v1/solana/{','.join(mints)}"
    async with session.get(url, timeout=aiohttp.ClientTimeout(total=timeout)) as resp:
        if resp.status == 429:
            raise RateLimited()
        resp.raise_for_status()
        data = await resp.json(content_type=None)
    grouped: dict[str, list[dict]] = {}
    for pair in data if isinstance(data, list) else []:
        base = ((pair or {}).get("baseToken") or {}).get("address")
        if base:
            grouped.setdefault(base, []).append(pair)
    return grouped


class RateLimited(Exception):
    pass


class MigratedTracker:
    """Keeps price snapshots of freshly migrated coins for `track_hours`."""

    def __init__(self, track_hours: float = 24.0):
        self.track_seconds = track_hours * 3600
        self.mints: dict[str, float] = {}

    def add(self, mint: str, now: float) -> None:
        self.mints.setdefault(mint, now)

    def due(self, now: float) -> list[str]:
        for mint in [m for m, t in self.mints.items() if now - t > self.track_seconds]:
            del self.mints[mint]
        return list(self.mints)


async def poll_once(session: aiohttp.ClientSession, base_url: str, mints: list[str],
                    min_interval: float = 0.5) -> tuple[list[list], int, int]:
    """Fetch all mints in batches. Returns (records, requests, errors)."""
    records: list[list] = []
    requests = errors = 0
    for i in range(0, len(mints), BATCH):
        batch = mints[i:i + BATCH]
        requests += 1
        try:
            grouped = await fetch_pairs(session, base_url, batch)
        except RateLimited:
            errors += 1
            log.info("DexScreener: Rate-Limit, Runde abgebrochen")
            break
        except (aiohttp.ClientError, asyncio.TimeoutError, ValueError) as exc:
            errors += 1
            log.debug("DexScreener-Fehler: %r", exc)
            continue
        for mint in batch:
            pair = select_pair(grouped.get(mint, []))
            if pair:
                records.append(compact_pair(mint, pair))
        await asyncio.sleep(min_interval)
    return records, requests, errors
