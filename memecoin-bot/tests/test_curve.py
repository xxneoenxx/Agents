import pytest

from memecoin_bot.curve import (after_buy, after_sell, market_cap_sol, price_sol, progress, sol_for_tokens,
                                tokens_for_sol, upside_to_graduation)

VSOL0 = 30 * 10**9
VTOK0 = 1_073_000_000 * 10**6
RTR0 = 793_100_000 * 10**6
SUPPLY = 1_000_000_000 * 10**6


def state_at_progress(p):
    sold = int(RTR0 * p)
    vtok = VTOK0 - sold
    return VSOL0 * VTOK0 // vtok, vtok, RTR0 - sold


def test_launch_and_graduation_market_cap():
    assert market_cap_sol(VSOL0, VTOK0, SUPPLY) == pytest.approx(27.96, abs=0.01)
    vsol, vtok, rtr = state_at_progress(1.0)
    assert market_cap_sol(vsol, vtok, SUPPLY) == pytest.approx(410.9, abs=0.5)
    vsol, vtok, rtr = state_at_progress(0.65)
    assert market_cap_sol(vsol, vtok, SUPPLY) == pytest.approx(103.6, abs=0.2)


def test_progress_and_upside():
    vsol, vtok, rtr = state_at_progress(0.10)
    assert progress(rtr, RTR0) == pytest.approx(0.10, abs=1e-9)
    assert upside_to_graduation(VTOK0, RTR0) == pytest.approx(14.7, abs=0.05)
    assert upside_to_graduation(vtok, rtr) == pytest.approx(12.6, abs=0.05)
    assert upside_to_graduation(*state_at_progress(0.65)[1:]) == pytest.approx(3.97, abs=0.05)
    assert progress(0, RTR0) == 1.0 and progress(RTR0, 0) == 0.0


def test_buy_then_sell_round_trip_loses_only_fees_and_rounding():
    sol_in = 2 * 10**9
    tokens = tokens_for_sol(VSOL0, VTOK0, sol_in, fee_bps=125)
    vsol, vtok = after_buy(VSOL0, VTOK0, sol_in * (10_000 - 125) // 10_000)
    back = sol_for_tokens(vsol, vtok, tokens, fee_bps=125)
    # two times 1.25 % fee, nothing else
    assert back / sol_in == pytest.approx((1 - 0.0125) ** 2, rel=1e-6)
    v2, t2 = after_sell(vsol, vtok, tokens)
    assert t2 == VTOK0 and abs(v2 - VSOL0) <= 1


def test_price_impact_matches_constant_product():
    small = tokens_for_sol(VSOL0, VTOK0, 10**7)
    big = tokens_for_sol(VSOL0, VTOK0, 10**10)
    # average price paid rises with size
    assert (10**10 / big) > (10**7 / small)
    assert price_sol(VSOL0, VTOK0) == pytest.approx(27.96e-9, rel=1e-3)


def test_degenerate_inputs():
    assert tokens_for_sol(VSOL0, VTOK0, 0) == 0
    assert sol_for_tokens(VSOL0, VTOK0, 0) == 0
    assert market_cap_sol(VSOL0, 0, SUPPLY) == 0.0
    assert upside_to_graduation(100, 100) == 1.0
