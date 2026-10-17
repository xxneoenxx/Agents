import json

from memecoin_bot.__main__ import main
from memecoin_bot.config import Config
from memecoin_bot.demo import Curve, generate_events
from memecoin_bot.tracker import Tracker


def signals_by_symbol(cfg):
    tracker = Tracker(cfg)
    found = {}
    for ts, msg in generate_events():
        for sig in tracker.handle(msg, ts):
            found.setdefault(sig.symbol, []).append(sig.tier)
    return found


def test_curve_matches_pump_fun_launch_market_cap():
    curve = Curve()
    assert 27.5 < curve.market_cap_sol < 28.5
    tokens = curve.buy(1.0)
    assert curve.sell(tokens) == pytest_approx(1.0)


def pytest_approx(value):
    import pytest
    return pytest.approx(value, rel=1e-9)


def test_demo_only_real_fomo_signals():
    assert signals_by_symbol(Config()) == {"MFROG": [1, 2, 3]}


def test_demo_rug_is_blocked_only_by_dev_sell_filter():
    cfg = Config()
    cfg.signal.block_if_dev_sold = False
    assert "RCAT" in signals_by_symbol(cfg)


def test_demo_whale_is_blocked_by_concentration_filters():
    cfg = Config()
    cfg.signal.max_top_buyer_share = 0
    cfg.signal.max_top_holder_pct = 0
    cfg.signal.min_unique_buyers = 10
    cfg.signal.min_score = 40
    assert "WHALE" in signals_by_symbol(cfg)


def test_cli_demo(capsys):
    assert main(["demo"]) == 0
    out = capsys.readouterr().out
    assert "FOMO-SIGNAL" in out and "$MFROG" in out and "3 Signale" in out


def test_cli_replay_of_recording(tmp_path, capsys):
    rec = tmp_path / "events.jsonl"
    with rec.open("w") as fh:
        for ts, msg in generate_events():
            fh.write(json.dumps({"ts": ts, "msg": msg}) + "\n")
        fh.write("not json\n")
    assert main(["replay", str(rec)]) == 0
    out = capsys.readouterr().out
    assert "4 neue Coins" in out and "3 Signale" in out


def test_cli_replay_missing_file(capsys):
    assert main(["replay", "does-not-exist.jsonl"]) == 2


def test_cli_bad_config(tmp_path, capsys):
    p = tmp_path / "c.toml"
    p.write_text("[nope]\n")
    assert main(["demo", "--config", str(p)]) == 2
    assert "Konfiguration" in capsys.readouterr().err
