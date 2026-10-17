from memecoin_bot.config import Config
from memecoin_bot.models import TOTAL_SUPPLY
from memecoin_bot.tracker import Tracker

MINT = "TestMint1111111111111111111111111111111pump"
DEV = "DevWallet111111111111111111111111111111111"


def create(mint=MINT, dev_tokens=30_000_000.0, mc=30.0):
    return {"txType": "create", "mint": mint, "traderPublicKey": DEV, "initialBuy": dev_tokens,
            "solAmount": 1.0, "marketCapSol": mc, "vTokensInBondingCurve": 1_043_000_000.0,
            "name": "Test", "symbol": "TST", "uri": "", "pool": "pump"}


def trade(wallet, is_buy=True, sol=0.5, tokens=10_000_000.0, balance=None, mc=35.0, mint=MINT):
    msg = {"txType": "buy" if is_buy else "sell", "mint": mint, "traderPublicKey": wallet,
           "solAmount": sol, "tokenAmount": tokens, "marketCapSol": mc,
           "vTokensInBondingCurve": 1_000_000_000.0}
    if balance is not None:
        msg["newTokenBalance"] = balance
    return msg


def pump(tracker, buyers, start=0.0, step=1.0, sol=0.5, mc_start=30.0, mc_step=2.0):
    signals = []
    for i in range(buyers):
        signals += tracker.handle(trade(f"buyer{i}", sol=sol, balance=1_000_000.0, mc=mc_start + mc_step * (i + 1)),
                                  start + step * (i + 1))
    return signals


def test_create_subscribes_and_tracks_dev_balance():
    t = Tracker(Config())
    t.handle(create(), 0)
    assert MINT in t.tokens
    assert t.tokens[MINT].balances[DEV] == 30_000_000.0
    assert t.drain_subscriptions() == ([MINT], [])
    assert t.drain_subscriptions() == ([], [])


def test_duplicate_create_is_ignored():
    t = Tracker(Config())
    t.handle(create(), 0)
    t.handle(create(), 1)
    assert t.stats["new_tokens"] == 1


def test_dev_buying_too_much_at_launch_is_skipped():
    t = Tracker(Config())
    t.handle(create(dev_tokens=0.30 * TOTAL_SUPPLY), 0)
    assert MINT not in t.tokens
    assert t.stats["skipped_dev_buy"] == 1


def test_many_buyers_trigger_signal_and_tiers_only_go_up():
    t = Tracker(Config())
    t.handle(create(), 0)
    signals = pump(t, buyers=45)
    tiers = [s.tier for s in signals]
    assert tiers == sorted(set(tiers))
    assert tiers[-1] == 3
    first = signals[0]
    assert first.symbol == "TST"
    assert first.metrics.unique_buyers >= t.cfg.signal.min_unique_buyers
    assert first.metrics.holders >= first.metrics.unique_buyers


def test_few_buyers_do_not_signal():
    t = Tracker(Config())
    t.handle(create(), 0)
    assert pump(t, buyers=10) == []


def test_dev_sell_blocks_signal():
    t = Tracker(Config())
    t.handle(create(), 0)
    t.handle(trade(DEV, is_buy=False, sol=0.9, tokens=30_000_000.0, balance=0.0), 0.5)
    assert t.tokens[MINT].dev_sold
    assert DEV not in t.tokens[MINT].balances
    assert pump(t, buyers=45) == []


def test_dev_sell_allowed_when_filter_disabled():
    cfg = Config()
    cfg.signal.block_if_dev_sold = False
    t = Tracker(cfg)
    t.handle(create(), 0)
    t.handle(trade(DEV, is_buy=False, sol=0.9, tokens=30_000_000.0, balance=0.0), 0.5)
    signals = pump(t, buyers=45)
    assert signals and signals[0].metrics.dev_sold


def test_single_whale_blocks_signal():
    t = Tracker(Config())
    t.handle(create(), 0)
    t.handle(trade("whale", sol=20.0, balance=200_000_000.0), 0.5)
    assert pump(t, buyers=20, sol=0.1) == []


def test_window_trimming_uses_market_cap_before_window():
    t = Tracker(Config())
    t.handle(create(), 0)
    t.handle(trade("early", mc=40.0), 1)
    t.handle(trade("late", mc=80.0), 100)
    token = t.tokens[MINT]
    assert len(token.trades) == 1
    assert token.mc_before_window == 40.0


def test_balance_without_new_token_balance_field():
    t = Tracker(Config())
    t.handle(create(), 0)
    t.handle(trade("w", tokens=5.0), 1)
    t.handle(trade("w", tokens=3.0), 2)
    t.handle(trade("w", is_buy=False, tokens=8.0), 3)
    assert "w" not in t.tokens[MINT].balances


def test_sweep_drops_inactive_and_old_tokens():
    t = Tracker(Config())
    t.handle(create(mint="a"), 0)
    t.handle(create(mint="b"), 0)
    t.drain_subscriptions()
    # "b" keeps trading, "a" goes quiet past inactive_minutes.
    for minute in range(1, 7):
        t.handle(trade("x", mint="b"), minute * 60)
    assert "a" not in t.tokens and "b" in t.tokens
    t.handle(trade("x", mint="b"), 31 * 60)
    assert "b" not in t.tokens
    assert t.drain_subscriptions() == ([], ["a", "b"])


def test_max_tracked_evicts_oldest():
    cfg = Config()
    cfg.tracking.max_tracked = 2
    t = Tracker(cfg)
    for i, mint in enumerate(["a", "b", "c"]):
        t.handle(create(mint=mint), i * 0.1)
    assert list(t.tokens) == ["b", "c"]
    # "a" was added and dropped before any flush, so nothing to unsubscribe.
    assert t.drain_subscriptions() == (["b", "c"], [])


def test_trades_for_unknown_mint_are_ignored():
    t = Tracker(Config())
    assert t.handle(trade("w", mint="unknown"), 0) == []
    assert t.stats["trades"] == 0


def test_garbage_messages_are_ignored():
    t = Tracker(Config())
    for msg in ({}, {"txType": "create"}, {"txType": "buy", "mint": None}, {"message": "hi"}):
        assert t.handle(msg, 0) == []
    assert t.tokens == {}
