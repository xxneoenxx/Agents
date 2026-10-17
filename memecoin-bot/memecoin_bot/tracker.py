from __future__ import annotations

import logging
from collections import Counter

from .analyzer import compute_metrics, failed_filters, score, tier_for
from .config import Config
from .models import TOTAL_SUPPLY, Signal, TokenState, Trade

log = logging.getLogger(__name__)

SWEEP_INTERVAL_S = 5.0


def _num(value, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


class Tracker:
    """Keeps state for freshly launched tokens and decides when to signal.

    The tracker is fed raw PumpPortal messages plus a timestamp, so the same
    code runs live, on recorded data and in the demo. Subscriptions it wants
    changed are collected in ``pending_subscribe`` / ``pending_unsubscribe``
    and sent by the source.
    """

    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.tokens: dict[str, TokenState] = {}
        self.pending_subscribe: list[str] = []
        self.pending_unsubscribe: list[str] = []
        self.stats: Counter[str] = Counter()
        self._last_sweep = 0.0

    def handle(self, msg: dict, now: float) -> list[Signal]:
        tx_type = msg.get("txType")
        signals: list[Signal] = []
        if tx_type == "create":
            self._on_create(msg, now)
        elif tx_type in ("buy", "sell"):
            signal = self._on_trade(msg, now)
            if signal:
                signals.append(signal)
        if now - self._last_sweep >= SWEEP_INTERVAL_S:
            self.sweep(now)
        return signals

    def _on_create(self, msg: dict, now: float) -> None:
        mint = msg.get("mint")
        if not isinstance(mint, str) or not mint or mint in self.tokens:
            return
        self.stats["new_tokens"] += 1

        dev_tokens = _num(msg.get("initialBuy"))
        dev_pct = dev_tokens / TOTAL_SUPPLY * 100
        max_dev = self.cfg.tracking.max_dev_initial_buy_pct
        if max_dev > 0 and dev_pct > max_dev:
            self.stats["skipped_dev_buy"] += 1
            log.debug("Ignoriere %s: Dev kauft %.1f%% beim Launch", msg.get("symbol"), dev_pct)
            return

        while len(self.tokens) >= self.cfg.tracking.max_tracked:
            oldest = next(iter(self.tokens))
            self._drop(oldest)

        creator = str(msg.get("traderPublicKey") or "")
        mc = _num(msg.get("marketCapSol"))
        token = TokenState(
            mint=mint,
            name=str(msg.get("name") or "?"),
            symbol=str(msg.get("symbol") or "?"),
            creator=creator,
            created_at=now,
            uri=str(msg.get("uri") or ""),
            pool=str(msg.get("pool") or "pump"),
            initial_market_cap_sol=mc,
            dev_initial_tokens=dev_tokens,
            dev_initial_sol=_num(msg.get("solAmount")),
            market_cap_sol=mc,
            v_tokens=_num(msg["vTokensInBondingCurve"]) if "vTokensInBondingCurve" in msg else None,
        )
        if creator and dev_tokens > 0:
            token.balances[creator] = dev_tokens
        self.tokens[mint] = token
        self.pending_subscribe.append(mint)
        if self.cfg.output.log_new_tokens:
            log.info("Neuer Coin: $%s (%s) %s | Dev-Buy %.2f SOL", token.symbol, token.name, mint, token.dev_initial_sol)

    def _on_trade(self, msg: dict, now: float) -> Signal | None:
        token = self.tokens.get(msg.get("mint"))
        if token is None:
            return None
        self.stats["trades"] += 1

        is_buy = msg["txType"] == "buy"
        wallet = str(msg.get("traderPublicKey") or "")
        sol = _num(msg.get("solAmount"))
        amount = _num(msg.get("tokenAmount"))
        mc = _num(msg.get("marketCapSol"), token.market_cap_sol)

        token.trades.append(Trade(now, wallet, is_buy, sol, amount, mc))
        token.market_cap_sol = mc
        token.last_trade_at = now
        if "vTokensInBondingCurve" in msg:
            token.v_tokens = _num(msg["vTokensInBondingCurve"], token.v_tokens or 0.0)
        if is_buy:
            token.total_buys += 1
        else:
            token.total_sells += 1

        if wallet:
            if "newTokenBalance" in msg:
                balance = _num(msg["newTokenBalance"])
            else:
                balance = token.balances.get(wallet, 0.0) + (amount if is_buy else -amount)
            if balance > 0:
                token.balances[wallet] = balance
            else:
                token.balances.pop(wallet, None)

        if not is_buy and wallet and wallet == token.creator:
            if not token.dev_sold:
                log.debug("Dev verkauft bei $%s", token.symbol)
            token.dev_sold = True
            token.dev_sell_sol += sol

        return self._evaluate(token, now)

    def _trim_window(self, token: TokenState, now: float) -> None:
        cutoff = now - self.cfg.signal.window_seconds
        while token.trades and token.trades[0].ts < cutoff:
            token.mc_before_window = token.trades.popleft().market_cap_sol

    def _evaluate(self, token: TokenState, now: float) -> Signal | None:
        scfg = self.cfg.signal
        self._trim_window(token, now)
        m = compute_metrics(token, now, scfg.window_seconds, scfg.min_buy_sol)
        if failed_filters(m, scfg):
            return None
        s = score(m, scfg)
        tier = tier_for(s, scfg.min_score)
        if tier <= token.best_tier:
            return None
        token.best_tier = tier
        if token.first_signal_at is None:
            token.first_signal_at = now
        self.stats["signals"] += 1
        return Signal(
            ts=now,
            mint=token.mint,
            name=token.name,
            symbol=token.symbol,
            creator=token.creator,
            uri=token.uri,
            pool=token.pool,
            tier=tier,
            score=s,
            metrics=m,
        )

    def sweep(self, now: float) -> None:
        self._last_sweep = now
        max_age = self.cfg.tracking.max_age_minutes * 60
        inactive = self.cfg.tracking.inactive_minutes * 60
        for mint, token in list(self.tokens.items()):
            if now - token.created_at > max_age or now - token.last_activity > inactive:
                self._drop(mint)

    def _drop(self, mint: str) -> None:
        if self.tokens.pop(mint, None) is not None:
            self.pending_unsubscribe.append(mint)

    def drain_subscriptions(self) -> tuple[list[str], list[str]]:
        # A mint that was added and dropped before we flushed never got subscribed.
        added = set(self.pending_subscribe)
        dropped = set(self.pending_unsubscribe)
        subscribe = [m for m in self.pending_subscribe if m not in dropped]
        unsubscribe = [m for m in self.pending_unsubscribe if m not in added]
        self.pending_subscribe = []
        self.pending_unsubscribe = []
        return subscribe, unsubscribe
