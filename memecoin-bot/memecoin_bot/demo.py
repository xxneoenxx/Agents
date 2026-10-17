"""Simulated pump.fun launches, so the bot can be tried without a live connection."""

from __future__ import annotations

import random
import string

from .models import INITIAL_VIRTUAL_TOKENS, TOTAL_SUPPLY

B58 = "".join(c for c in string.ascii_letters + string.digits if c not in "0OIl")

SCENARIOS = [
    ("MFROG", "Moon Frog", "echter FOMO: immer mehr Käufer, steigender Flow"),
    ("RCAT", "Rug Cat", "Dev verkauft früh, danach Käuferwelle (wird blockiert)"),
    ("ZZZ", "Sleepy Dog", "toter Coin, kaum Käufer"),
    ("WHALE", "Whale Pump", "ein Wal kauft fast alles (wird blockiert)"),
]


class Curve:
    """Constant-product pump.fun bonding curve (30 virtual SOL at launch)."""

    def __init__(self) -> None:
        self.v_sol = 30.0
        self.v_tokens = float(INITIAL_VIRTUAL_TOKENS)

    @property
    def market_cap_sol(self) -> float:
        return self.v_sol / self.v_tokens * TOTAL_SUPPLY

    def buy(self, sol: float) -> float:
        k = self.v_sol * self.v_tokens
        self.v_sol += sol
        new_tokens = k / self.v_sol
        out = self.v_tokens - new_tokens
        self.v_tokens = new_tokens
        return out

    def sell(self, tokens: float) -> float:
        k = self.v_sol * self.v_tokens
        self.v_tokens += tokens
        new_sol = k / self.v_tokens
        out = self.v_sol - new_sol
        self.v_sol = new_sol
        return out


class _Coin:
    def __init__(self, rng: random.Random, symbol: str, name: str, start: float):
        self.rng = rng
        self.mint = "".join(rng.choice(B58) for _ in range(40)) + "pump"
        self.dev = self.wallet()
        self.curve = Curve()
        self.balances: dict[str, float] = {}
        self.events: list[tuple[float, dict]] = []
        dev_sol = 1.0
        dev_tokens = self.curve.buy(dev_sol)
        self.balances[self.dev] = dev_tokens
        self.events.append((start, {
            "signature": self.sig(), "mint": self.mint, "traderPublicKey": self.dev, "txType": "create",
            "initialBuy": dev_tokens, "solAmount": dev_sol, "bondingCurveKey": self.wallet(),
            "vTokensInBondingCurve": self.curve.v_tokens, "vSolInBondingCurve": self.curve.v_sol,
            "marketCapSol": self.curve.market_cap_sol, "name": name, "symbol": symbol,
            "uri": "", "pool": "pump",
        }))

    def wallet(self) -> str:
        return "".join(self.rng.choice(B58) for _ in range(44))

    def sig(self) -> str:
        return "".join(self.rng.choice(B58) for _ in range(88))

    def _trade(self, ts: float, wallet: str, is_buy: bool, sol: float = 0.0, tokens: float = 0.0) -> None:
        if is_buy:
            tokens = self.curve.buy(sol)
            self.balances[wallet] = self.balances.get(wallet, 0.0) + tokens
        else:
            tokens = min(tokens, self.balances.get(wallet, 0.0))
            if tokens <= 0:
                return
            sol = self.curve.sell(tokens)
            self.balances[wallet] -= tokens
        self.events.append((ts, {
            "signature": self.sig(), "mint": self.mint, "traderPublicKey": wallet,
            "txType": "buy" if is_buy else "sell", "tokenAmount": tokens, "solAmount": sol,
            "newTokenBalance": self.balances[wallet], "bondingCurveKey": "",
            "vTokensInBondingCurve": self.curve.v_tokens, "vSolInBondingCurve": self.curve.v_sol,
            "marketCapSol": self.curve.market_cap_sol, "pool": "pump",
        }))

    def buy(self, ts: float, wallet: str, sol: float) -> None:
        self._trade(ts, wallet, True, sol=sol)

    def sell_part(self, ts: float, wallet: str, fraction: float) -> None:
        self._trade(ts, wallet, False, tokens=self.balances.get(wallet, 0.0) * fraction)

    def random_size(self) -> float:
        return round(min(self.rng.lognormvariate(-1.3, 0.8), 5.0), 3)


def generate_events(start: float = 0.0, seed: int = 7) -> list[tuple[float, dict]]:
    rng = random.Random(seed)
    coins = [_Coin(rng, sym, name, start + i * 3) for i, (sym, name, _) in enumerate(SCENARIOS)]
    frog, rug, sleepy, whale = coins

    # Moon Frog: buyer rate ramps from ~0.2/s up to ~1.5/s over three minutes.
    t = start + 10
    while t < start + 200:
        progress = (t - start) / 200
        holders = [w for w, bal in frog.balances.items() if w != frog.dev and bal > 0]
        if rng.random() < 0.12 and len(holders) > 3:
            frog.sell_part(t, rng.choice(holders), 0.5)
        else:
            frog.buy(t, frog.wallet(), frog.random_size())
        t += rng.expovariate(0.2 + 1.3 * progress)

    # Rug Cat: dev dumps after 15s, then a wave of buyers arrives anyway.
    rug.buy(start + 8, rug.wallet(), 0.3)
    rug.sell_part(start + 15, rug.dev, 1.0)
    t = start + 20
    while t < start + 120:
        rug.buy(t, rug.wallet(), rug.random_size())
        t += rng.expovariate(0.9)

    # Sleepy Dog: a handful of buys, then nothing.
    for i in range(5):
        sleepy.buy(start + 15 + i * 25, sleepy.wallet(), 0.1)

    # Whale Pump: one wallet buys big, plus small filler buys.
    whale_wallet = whale.wallet()
    for i in range(3):
        whale.buy(start + 20 + i * 15, whale_wallet, 4.0)
    t = start + 18
    while t < start + 80:
        whale.buy(t, whale.wallet(), round(rng.uniform(0.06, 0.1), 3))
        t += rng.expovariate(0.4)

    events = [e for coin in coins for e in coin.events]
    events.sort(key=lambda e: e[0])
    return events
