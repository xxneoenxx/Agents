from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field

# pump.fun constants: every token has 1B supply, the bonding curve starts with
# 1.073B virtual tokens and sells 793.1M of them before it migrates.
TOTAL_SUPPLY = 1_000_000_000
INITIAL_VIRTUAL_TOKENS = 1_073_000_000
CURVE_SELLABLE_TOKENS = 793_100_000
# Balances below this are treated as dust, not as a holder.
DUST_TOKENS = 1.0


@dataclass(slots=True)
class Trade:
    ts: float
    wallet: str
    is_buy: bool
    sol: float
    tokens: float
    market_cap_sol: float


@dataclass
class TokenState:
    mint: str
    name: str
    symbol: str
    creator: str
    created_at: float
    uri: str = ""
    pool: str = "pump"
    initial_market_cap_sol: float = 0.0
    dev_initial_tokens: float = 0.0
    dev_initial_sol: float = 0.0
    market_cap_sol: float = 0.0
    v_tokens: float | None = None
    # Trades inside the analysis window, oldest first.
    trades: deque[Trade] = field(default_factory=deque)
    # Market cap of the last trade that fell out of the window, used as the
    # reference point for "MC change inside the window".
    mc_before_window: float | None = None
    balances: dict[str, float] = field(default_factory=dict)
    total_buys: int = 0
    total_sells: int = 0
    dev_sold: bool = False
    dev_sell_sol: float = 0.0
    last_trade_at: float = 0.0
    best_tier: int = 0
    first_signal_at: float | None = None

    @property
    def last_activity(self) -> float:
        return max(self.created_at, self.last_trade_at)

    def curve_progress_pct(self) -> float | None:
        if self.pool != "pump" or self.v_tokens is None:
            return None
        sold = INITIAL_VIRTUAL_TOKENS - self.v_tokens
        return max(0.0, min(100.0, sold / CURVE_SELLABLE_TOKENS * 100))


@dataclass
class Metrics:
    age_s: float
    window_s: int
    buys: int
    sells: int
    unique_buyers: int
    buy_sol: float
    sell_sol: float
    net_flow_sol: float
    buy_ratio: float
    top_buyer_share: float
    market_cap_sol: float
    mc_change_pct: float
    holders: int
    top_holder_pct: float
    dev_holding_pct: float
    dev_sold: bool
    curve_progress_pct: float | None


@dataclass
class Signal:
    ts: float
    mint: str
    name: str
    symbol: str
    creator: str
    uri: str
    pool: str
    tier: int
    score: float
    metrics: Metrics
