from memecoin_bot.analyzer import failed_filters, score, tier_for
from memecoin_bot.config import SignalConfig
from memecoin_bot.models import Metrics


def metrics(**overrides):
    base = dict(age_s=120, window_s=60, buys=40, sells=5, unique_buyers=40, buy_sol=16, sell_sol=1,
                net_flow_sol=15, buy_ratio=40 / 45, top_buyer_share=0.1, market_cap_sol=80,
                mc_change_pct=100, holders=60, top_holder_pct=3, dev_holding_pct=3, dev_sold=False,
                curve_progress_pct=50)
    base.update(overrides)
    return Metrics(**base)


def test_score_range():
    cfg = SignalConfig()
    assert 0 <= score(metrics(unique_buyers=0, net_flow_sol=-5, buy_ratio=0, mc_change_pct=-50,
                              top_holder_pct=50), cfg) == 0
    assert score(metrics(buy_ratio=1.0, top_holder_pct=0), cfg) == 100


def test_filters_pass_for_healthy_metrics():
    assert failed_filters(metrics(), SignalConfig()) == []


def test_filters_report_each_problem():
    reasons = failed_filters(metrics(unique_buyers=3, net_flow_sol=0.5, buy_ratio=0.4, top_buyer_share=0.9,
                                     top_holder_pct=40, dev_sold=True), SignalConfig())
    assert len(reasons) == 6


def test_market_cap_bounds():
    cfg = SignalConfig(min_market_cap_sol=50, max_market_cap_sol=100)
    assert failed_filters(metrics(market_cap_sol=40), cfg) == ["MC zu klein"]
    assert failed_filters(metrics(market_cap_sol=120), cfg) == ["MC zu groß"]


def test_tiers():
    assert tier_for(59.9, 60) == 0
    assert tier_for(60, 60) == 1
    assert tier_for(75, 60) == 2
    assert tier_for(90, 60) == 3
    # A high min_score skips the tiers below it instead of jumping straight to tier 3.
    assert tier_for(80, 80) == 1
    assert tier_for(95, 80) == 2
