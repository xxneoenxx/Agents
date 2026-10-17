from memecoin_bot.continuity import ChainTrade, ContinuityTracker, chain_order

V0 = 1_073_000_000_000_000


def buy(mint, tok, post):
    return ChainTrade(mint, True, tok, post)


def sell(mint, tok, post):
    return ChainTrade(mint, False, tok, post)


def test_pre_reserves_follow_from_trade_direction():
    assert buy("m", 10, 90).pre_vtok == 100
    assert sell("m", 10, 110).pre_vtok == 100


def test_chain_order_restores_order_inside_a_slot():
    a, b, c = buy("m", 10, V0 - 10), buy("m", 5, V0 - 15), sell("m", 3, V0 - 12)
    ordered, breaks = chain_order([c, a, b], V0)
    assert ordered == [a, b, c] and breaks == 0


def test_missing_trade_counts_one_break():
    a, c = buy("m", 10, V0 - 10), buy("m", 7, V0 - 22)  # a 5-token buy in between is missing
    ordered, breaks = chain_order([a, c], V0)
    assert ordered == [a, c] and breaks == 1


def test_tracker_settles_after_delay_and_counts():
    t = ContinuityTracker(settle_slots=4)
    t.on_create("m", V0, 0)
    t.on_trade(100, buy("m", 10, V0 - 10))
    t.on_trade(100, buy("m", 5, V0 - 15))
    assert t.settle(102, 0) == []  # slot not settled yet
    settled = t.settle(104, 0)
    assert [x.post_vtok for x in settled] == [V0 - 10, V0 - 15]
    t.on_trade(105, buy("x", 1, 500))  # mint seen first time without create
    t.flush(0)
    assert t.reset_counters() == (2, 0, 1)
    assert t.reset_counters() == (0, 0, 0)


def test_prune_forgets_idle_mints():
    t = ContinuityTracker(idle_seconds=10)
    t.on_create("m", V0, 0)
    t.prune(20)
    assert "m" not in t.last
