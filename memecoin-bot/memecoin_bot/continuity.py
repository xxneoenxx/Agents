"""Reserve-continuity check for pump.fun trades.

Every trade reports the curve's virtual token reserves *after* the trade. The
reserves before it follow exactly from the traded amount, so consecutive trades
of a mint must chain: pre(next) == post(previous). A mismatch means a trade was
missed (outage, truncated log) or arrived out of order. Trades are buffered per
slot and ordered by chaining once the slot has settled, because notifications
inside a slot carry no transaction index.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass


@dataclass(slots=True)
class ChainTrade:
    mint: str
    is_buy: bool
    token_amount: int
    post_vtok: int
    ref: object = None  # caller's payload, returned in chain order

    @property
    def pre_vtok(self) -> int:
        # A buy takes tokens out of the curve, a sell puts them back.
        return self.post_vtok + self.token_amount if self.is_buy else self.post_vtok - self.token_amount


def chain_order(trades: list[ChainTrade], start: int | None) -> tuple[list[ChainTrade], int]:
    """Order one mint's trades from one slot so reserves chain from `start`.
    Returns (ordered trades, number of breaks)."""
    remaining = list(trades)
    ordered: list[ChainTrade] = []
    breaks = 0
    cur = start
    while remaining:
        idx = next((i for i, t in enumerate(remaining) if t.pre_vtok == cur), None) if cur is not None else None
        if idx is None:
            if cur is not None:
                breaks += 1
            posts = {t.post_vtok for t in remaining}
            # Restart from a trade no other remaining trade leads into (a chain head).
            idx = next((i for i, t in enumerate(remaining) if t.pre_vtok not in posts), 0)
        t = remaining.pop(idx)
        ordered.append(t)
        cur = t.post_vtok
    return ordered, breaks


class ContinuityTracker:
    def __init__(self, settle_slots: int = 4, idle_seconds: float = 6 * 3600):
        self.settle_slots = settle_slots
        self.idle_seconds = idle_seconds
        self.last: dict[str, tuple[int, float]] = {}
        self.pending: dict[int, list[ChainTrade]] = defaultdict(list)
        self.ok = 0
        self.breaks = 0
        self.first_seen = 0
        self.settled_slot = 0

    def on_create(self, mint: str, initial_vtok: int, now: float) -> None:
        self.last[mint] = (initial_vtok, now)

    def on_trade(self, slot: int, trade: ChainTrade) -> None:
        self.pending[slot].append(trade)

    def settle(self, current_slot: int, now: float) -> list[ChainTrade]:
        """Process every buffered slot older than `current_slot - settle_slots`.
        Returns the settled trades in chain order."""
        out: list[ChainTrade] = []
        for slot in sorted(s for s in self.pending if s <= current_slot - self.settle_slots):
            out += self._settle_slot(self.pending.pop(slot), now)
            self.settled_slot = max(self.settled_slot, slot)
        return out

    def flush(self, now: float) -> list[ChainTrade]:
        out: list[ChainTrade] = []
        for slot in sorted(self.pending):
            out += self._settle_slot(self.pending.pop(slot), now)
        return out

    def _settle_slot(self, trades: list[ChainTrade], now: float) -> list[ChainTrade]:
        by_mint: dict[str, list[ChainTrade]] = defaultdict(list)
        for t in trades:
            by_mint[t.mint].append(t)
        out: list[ChainTrade] = []
        for mint, group in by_mint.items():
            prev = self.last.get(mint)
            if prev is None:
                self.first_seen += 1
            ordered, breaks = chain_order(group, prev[0] if prev else None)
            self.breaks += breaks
            self.ok += len(ordered) - breaks - (1 if prev is None else 0)
            self.last[mint] = (ordered[-1].post_vtok, now)
            out += ordered
        return out

    def prune(self, now: float) -> None:
        cutoff = now - self.idle_seconds
        for mint in [m for m, (_, ts) in self.last.items() if ts < cutoff]:
            del self.last[mint]

    def reset_counters(self) -> tuple[int, int, int]:
        counts = (self.ok, self.breaks, self.first_seen)
        self.ok = self.breaks = self.first_seen = 0
        return counts
