from __future__ import annotations

from collections import defaultdict

from .config import SignalConfig
from .models import DUST_TOKENS, TOTAL_SUPPLY, Metrics, TokenState


def _clamp(x: float) -> float:
    return max(0.0, min(1.0, x))


def compute_metrics(token: TokenState, now: float, window_s: int, min_buy_sol: float) -> Metrics:
    """Metrics over the trades currently in the token's window.

    The tracker trims trades older than the window before calling this.
    """
    buys = sells = 0
    buy_sol = sell_sol = 0.0
    buy_sol_by_wallet: dict[str, float] = defaultdict(float)
    for t in token.trades:
        if t.is_buy:
            buys += 1
            buy_sol += t.sol
            if t.wallet != token.creator:
                buy_sol_by_wallet[t.wallet] += t.sol
        else:
            sells += 1
            sell_sol += t.sol

    unique_buyers = sum(1 for sol in buy_sol_by_wallet.values() if sol >= min_buy_sol)
    top_buyer_share = max(buy_sol_by_wallet.values()) / buy_sol if buy_sol > 0 and buy_sol_by_wallet else 0.0
    total = buys + sells
    buy_ratio = buys / total if total else 0.0

    reference_mc = token.mc_before_window if token.mc_before_window is not None else token.initial_market_cap_sol
    mc_change_pct = (token.market_cap_sol / reference_mc - 1) * 100 if reference_mc > 0 else 0.0

    holders = 0
    top_holder = 0.0
    for balance in token.balances.values():
        if balance > DUST_TOKENS:
            holders += 1
            top_holder = max(top_holder, balance)

    return Metrics(
        age_s=now - token.created_at,
        window_s=window_s,
        buys=buys,
        sells=sells,
        unique_buyers=unique_buyers,
        buy_sol=buy_sol,
        sell_sol=sell_sol,
        net_flow_sol=buy_sol - sell_sol,
        buy_ratio=buy_ratio,
        top_buyer_share=top_buyer_share,
        market_cap_sol=token.market_cap_sol,
        mc_change_pct=mc_change_pct,
        holders=holders,
        top_holder_pct=top_holder / TOTAL_SUPPLY * 100,
        dev_holding_pct=token.balances.get(token.creator, 0.0) / TOTAL_SUPPLY * 100,
        dev_sold=token.dev_sold,
        curve_progress_pct=token.curve_progress_pct(),
    )


def score(m: Metrics, cfg: SignalConfig) -> float:
    """FOMO score from 0 to 100. Weights: buyers 35, net flow 25, buy ratio 15,
    MC growth 15, holder distribution 10."""
    s = 35 * _clamp(m.unique_buyers / max(cfg.target_unique_buyers, 1))
    s += 25 * _clamp(m.net_flow_sol / cfg.target_net_flow_sol) if cfg.target_net_flow_sol > 0 else 25
    s += 15 * _clamp((m.buy_ratio - 0.5) / 0.5)
    s += 15 * _clamp(m.mc_change_pct / cfg.target_mc_growth_pct) if cfg.target_mc_growth_pct > 0 else 15
    s += 10 * _clamp(1 - m.top_holder_pct / cfg.max_top_holder_pct) if cfg.max_top_holder_pct > 0 else 10
    return round(s, 1)


def failed_filters(m: Metrics, cfg: SignalConfig) -> list[str]:
    """Hard requirements for a signal. Returns the reasons that failed."""
    reasons = []
    if m.unique_buyers < cfg.min_unique_buyers:
        reasons.append(f"nur {m.unique_buyers} Käufer")
    if m.net_flow_sol < cfg.min_net_flow_sol:
        reasons.append(f"Netto-Flow {m.net_flow_sol:.2f} SOL")
    if m.buy_ratio < cfg.min_buy_ratio:
        reasons.append(f"Buy-Ratio {m.buy_ratio:.0%}")
    if cfg.max_top_buyer_share > 0 and m.top_buyer_share > cfg.max_top_buyer_share:
        reasons.append(f"ein Käufer macht {m.top_buyer_share:.0%} des Volumens")
    if cfg.max_top_holder_pct > 0 and m.top_holder_pct > cfg.max_top_holder_pct:
        reasons.append(f"Top-Holder hält {m.top_holder_pct:.1f}%")
    if cfg.block_if_dev_sold and m.dev_sold:
        reasons.append("Dev hat verkauft")
    if cfg.min_market_cap_sol > 0 and m.market_cap_sol < cfg.min_market_cap_sol:
        reasons.append("MC zu klein")
    if cfg.max_market_cap_sol > 0 and m.market_cap_sol > cfg.max_market_cap_sol:
        reasons.append("MC zu groß")
    return reasons


TIER_STEPS = (75.0, 90.0)


def tier_for(score_value: float, min_score: float) -> int:
    """0 = no signal, 1-3 = signal strength."""
    if score_value < min_score:
        return 0
    return 1 + sum(1 for step in TIER_STEPS if step > min_score and score_value >= step)
