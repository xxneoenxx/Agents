from __future__ import annotations

import os
import tomllib
from dataclasses import dataclass, field, fields
from pathlib import Path


@dataclass
class SourceConfig:
    ws_url: str = "wss://pumpportal.fun/api/data"
    # Optional. Only needed for PumpSwap data (after migration), see README.
    api_key: str = ""


@dataclass
class TrackingConfig:
    max_age_minutes: float = 30.0
    inactive_minutes: float = 5.0
    max_tracked: int = 1500
    max_dev_initial_buy_pct: float = 25.0


@dataclass
class SignalConfig:
    window_seconds: int = 60
    min_buy_sol: float = 0.05
    min_unique_buyers: int = 15
    min_net_flow_sol: float = 3.0
    min_buy_ratio: float = 0.65
    max_top_buyer_share: float = 0.4
    max_top_holder_pct: float = 15.0
    block_if_dev_sold: bool = True
    min_market_cap_sol: float = 0.0
    max_market_cap_sol: float = 0.0
    min_score: float = 60.0
    target_unique_buyers: int = 40
    target_net_flow_sol: float = 15.0
    target_mc_growth_pct: float = 100.0


@dataclass
class TelegramConfig:
    bot_token: str = ""
    chat_id: str = ""


@dataclass
class DiscordConfig:
    webhook_url: str = ""


@dataclass
class OutputConfig:
    signal_log: str = "data/signals.jsonl"
    log_new_tokens: bool = False
    fetch_metadata: bool = True
    sol_price: bool = True


@dataclass
class Config:
    source: SourceConfig = field(default_factory=SourceConfig)
    tracking: TrackingConfig = field(default_factory=TrackingConfig)
    signal: SignalConfig = field(default_factory=SignalConfig)
    telegram: TelegramConfig = field(default_factory=TelegramConfig)
    discord: DiscordConfig = field(default_factory=DiscordConfig)
    output: OutputConfig = field(default_factory=OutputConfig)


class ConfigError(ValueError):
    pass


ENV_OVERRIDES = {
    "PUMPPORTAL_API_KEY": ("source", "api_key"),
    "TELEGRAM_BOT_TOKEN": ("telegram", "bot_token"),
    "TELEGRAM_CHAT_ID": ("telegram", "chat_id"),
    "DISCORD_WEBHOOK_URL": ("discord", "webhook_url"),
}


def _apply_section(target: object, section: str, values: dict) -> None:
    known = {f.name: f for f in fields(target)}
    for key, value in values.items():
        if key not in known:
            raise ConfigError(f"Unbekannte Einstellung [{section}] {key}")
        current = getattr(target, key)
        if isinstance(current, bool):
            if not isinstance(value, bool):
                raise ConfigError(f"[{section}] {key} muss true oder false sein")
        elif isinstance(current, (int, float)):
            if isinstance(value, bool) or not isinstance(value, (int, float)):
                raise ConfigError(f"[{section}] {key} muss eine Zahl sein")
            value = type(current)(value)
        elif isinstance(current, str):
            value = str(value)
        setattr(target, key, value)


def load_config(path: str | os.PathLike | None) -> Config:
    cfg = Config()
    if path is not None:
        p = Path(path)
        if not p.exists():
            raise ConfigError(f"Config-Datei nicht gefunden: {p}")
        with p.open("rb") as fh:
            try:
                data = tomllib.load(fh)
            except tomllib.TOMLDecodeError as exc:
                raise ConfigError(f"Config-Datei {p} ist kein gültiges TOML: {exc}") from exc
        for section, values in data.items():
            if section not in {f.name for f in fields(cfg)} or not isinstance(values, dict):
                raise ConfigError(f"Unbekannter Abschnitt [{section}]")
            _apply_section(getattr(cfg, section), section, values)

    for env, (section, key) in ENV_OVERRIDES.items():
        value = os.environ.get(env)
        if value:
            setattr(getattr(cfg, section), key, value)
    return cfg


def default_config_path() -> Path | None:
    p = Path("config.toml")
    return p if p.exists() else None
