from pathlib import Path

import pytest

from memecoin_bot.config import Config, ConfigError, load_config

EXAMPLE = Path(__file__).resolve().parent.parent / "config.example.toml"


def test_example_config_matches_defaults(monkeypatch):
    import os
    from memecoin_bot.config import ENV_OVERRIDES, ENV_PREFIX
    for env in list(ENV_OVERRIDES) + [e for e in os.environ if e.startswith(ENV_PREFIX)]:
        monkeypatch.delenv(env, raising=False)
    assert load_config(EXAMPLE) == Config()


def test_unknown_key_is_an_error(tmp_path):
    p = tmp_path / "c.toml"
    p.write_text("[signal]\nmin_buyers = 5\n")
    with pytest.raises(ConfigError, match="min_buyers"):
        load_config(p)


def test_wrong_type_is_an_error(tmp_path):
    p = tmp_path / "c.toml"
    p.write_text('[signal]\nmin_unique_buyers = "viele"\n')
    with pytest.raises(ConfigError):
        load_config(p)


def test_env_overrides(tmp_path, monkeypatch):
    p = tmp_path / "c.toml"
    p.write_text('[telegram]\nbot_token = "from-file"\n[signal]\nmin_unique_buyers = 25\n')
    monkeypatch.setenv("TELEGRAM_BOT_TOKEN", "from-env")
    cfg = load_config(p)
    assert cfg.telegram.bot_token == "from-env"
    assert cfg.signal.min_unique_buyers == 25
    assert isinstance(cfg.signal.min_net_flow_sol, float)


def test_generic_env_overrides_are_typed(monkeypatch):
    monkeypatch.setenv("MEMECOIN_BOT__RECORDER__KEEP_DAYS", "21")
    monkeypatch.setenv("MEMECOIN_BOT__RECORDER__COMPRESS", "nein")
    monkeypatch.setenv("MEMECOIN_BOT__DEXSCREENER__MAX_REQUESTS_PER_MIN", "60")
    monkeypatch.setenv("SOLANA_RPC_URL", "https://example.invalid/rpc")
    cfg = load_config(None)
    assert cfg.recorder.keep_days == 21.0 and isinstance(cfg.recorder.keep_days, float)
    assert cfg.recorder.compress is False
    assert cfg.dexscreener.max_requests_per_min == 60
    assert cfg.solana.rpc_url == "https://example.invalid/rpc"


def test_bad_env_values_are_errors(monkeypatch):
    monkeypatch.setenv("MEMECOIN_BOT__RECORDER__KEEP_DAYS", "viele")
    with pytest.raises(ConfigError, match="Zahl"):
        load_config(None)
    monkeypatch.delenv("MEMECOIN_BOT__RECORDER__KEEP_DAYS")
    monkeypatch.setenv("MEMECOIN_BOT__NOPE__X", "1")
    with pytest.raises(ConfigError, match="Abschnitt"):
        load_config(None)
