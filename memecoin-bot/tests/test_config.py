from pathlib import Path

import pytest

from memecoin_bot.config import Config, ConfigError, load_config

EXAMPLE = Path(__file__).resolve().parent.parent / "config.example.toml"


def test_example_config_matches_defaults(monkeypatch):
    for env in ("TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID", "DISCORD_WEBHOOK_URL", "PUMPPORTAL_API_KEY"):
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
