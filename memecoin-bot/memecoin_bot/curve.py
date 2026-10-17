"""pump.fun bonding-curve math on raw integer units (lamports, 6-decimal token units).

The curve is constant product on *virtual* reserves. All values come from the
events themselves (CreateEvent / TradeEvent), so nothing here hard-codes the
launch reserves or the supply.
"""

from __future__ import annotations

LAMPORTS_PER_SOL = 1_000_000_000
TOKEN_UNIT = 1_000_000  # pump.fun tokens have 6 decimals


def market_cap_sol(vsol_lamports: int, vtok_raw: int, supply_raw: int) -> float:
    """Fully diluted market cap in SOL at the current curve price."""
    if vtok_raw <= 0:
        return 0.0
    return vsol_lamports * supply_raw / (vtok_raw * LAMPORTS_PER_SOL)


def price_sol(vsol_lamports: int, vtok_raw: int) -> float:
    """SOL per whole token."""
    if vtok_raw <= 0:
        return 0.0
    return (vsol_lamports / LAMPORTS_PER_SOL) / (vtok_raw / TOKEN_UNIT)


def progress(real_token_reserves: int, initial_real_token_reserves: int) -> float:
    """Share of the sellable supply already bought, 0..1 (what pump.fun's UI shows)."""
    if initial_real_token_reserves <= 0:
        return 0.0
    return min(1.0, max(0.0, 1.0 - real_token_reserves / initial_real_token_reserves))


def upside_to_graduation(vtok_raw: int, real_token_reserves: int) -> float:
    """Market-cap multiple from here to the end of the curve.

    At graduation the real token reserves are zero, so the virtual token reserves
    drop by exactly `real_token_reserves`; price scales with 1/vtok² under
    constant product."""
    vtok_end = vtok_raw - real_token_reserves
    if vtok_end <= 0:
        return 1.0
    return (vtok_raw / vtok_end) ** 2


def tokens_for_sol(vsol_lamports: int, vtok_raw: int, sol_in_lamports: int, fee_bps: int = 0) -> int:
    """Tokens received when spending `sol_in` (fees taken from the input)."""
    net = sol_in_lamports * (10_000 - fee_bps) // 10_000
    if net <= 0:
        return 0
    k = vsol_lamports * vtok_raw
    new_vtok = -(-k // (vsol_lamports + net))  # ceil, the program rounds in its own favour
    return max(0, vtok_raw - new_vtok)


def sol_for_tokens(vsol_lamports: int, vtok_raw: int, tokens_in_raw: int, fee_bps: int = 0) -> int:
    """SOL received when selling `tokens_in` (fees taken from the output)."""
    if tokens_in_raw <= 0:
        return 0
    k = vsol_lamports * vtok_raw
    new_vsol = -(-k // (vtok_raw + tokens_in_raw))
    gross = max(0, vsol_lamports - new_vsol)
    return gross * (10_000 - fee_bps) // 10_000


def after_buy(vsol_lamports: int, vtok_raw: int, sol_in_net: int) -> tuple[int, int]:
    """Reserves after a buy of `sol_in_net` lamports (fees already removed)."""
    k = vsol_lamports * vtok_raw
    new_vsol = vsol_lamports + sol_in_net
    return new_vsol, -(-k // new_vsol)


def after_sell(vsol_lamports: int, vtok_raw: int, tokens_in: int) -> tuple[int, int]:
    k = vsol_lamports * vtok_raw
    new_vtok = vtok_raw + tokens_in
    return -(-k // new_vtok), new_vtok
