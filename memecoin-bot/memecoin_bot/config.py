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
class SolanaConfig:
    ws_url: str = "wss://api.mainnet-beta.solana.com"
    rpc_url: str = "https://api.mainnet-beta.solana.com"
    commitment: str = "confirmed"


@dataclass
class RecorderConfig:
    dir: str = "data/tape"
    keep_days: float = 30.0
    min_free_gb: float = 2.0
    compress: bool = True


@dataclass
class DexScreenerConfig:
    enabled: bool = True
    base_url: str = "https://api.dexscreener.com"
    track_hours: float = 24.0
    interval_s: float = 30.0
    max_requests_per_min: int = 120


@dataclass
class OpsConfig:
    healthcheck_url: str = ""
    heartbeat_time: str = "09:00"
    timezone: str = "Europe/Berlin"
    alarm_after_s: float = 120.0


@dataclass
class Config:
    solana: SolanaConfig = field(default_factory=SolanaConfig)
    recorder: RecorderConfig = field(default_factory=RecorderConfig)
    dexscreener: DexScreenerConfig = field(default_factory=DexScreenerConfig)
    ops: OpsConfig = field(default_factory=OpsConfig)
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
    "SOLANA_RPC_URL": ("solana", "rpc_url"),
    "SOLANA_WS_URL": ("solana", "ws_url"),
    "HEALTHCHECK_URL": ("ops", "healthcheck_url"),
}
# Any setting can also be given as MEMECOIN_BOT__<SECTION>__<KEY>, e.g.
# MEMECOIN_BOT__RECORDER__KEEP_DAYS=21
ENV_PREFIX = "MEMECOIN_BOT__"
_TRUE = {"1", "true", "yes", "ja", "on"}
_FALSE = {"0", "false", "no", "nein", "off"}


def _parse_env_value(current: object, raw: str, name: str) -> object:
    """Convert an environment string to the type of the setting it overrides."""
    text = raw.strip()
    if isinstance(current, bool):
        if text.lower() in _TRUE:
            return True
        if text.lower() in _FALSE:
            return False
        raise ConfigError(f"{name} muss true oder false sein")
    if isinstance(current, (int, float)):
        try:
            return float(text) if isinstance(current, float) else int(text)
        except ValueError:
            raise ConfigError(f"{name} muss eine Zahl sein") from None
    return raw


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

    overrides: list[tuple[str, str, str, str]] = []
    for env, (section, key) in ENV_OVERRIDES.items():
        if os.environ.get(env):
            overrides.append((env, section, key, os.environ[env]))
    for env, value in sorted(os.environ.items()):
        if env.startswith(ENV_PREFIX) and value != "":
            parts = env[len(ENV_PREFIX):].lower().split("__")
            if len(parts) != 2:
                raise ConfigError(f"{env}: erwartet {ENV_PREFIX}<ABSCHNITT>__<NAME>")
            overrides.append((env, parts[0], parts[1], value))
    sections = {f.name for f in fields(cfg)}
    for env, section, key, value in overrides:
        if section not in sections:
            raise ConfigError(f"{env}: unbekannter Abschnitt [{section}]")
        target = getattr(cfg, section)
        if key not in {f.name for f in fields(target)}:
            raise ConfigError(f"{env}: unbekannte Einstellung [{section}] {key}")
        _apply_section(target, section, {key: _parse_env_value(getattr(target, key), value, env)})
    return cfg


def default_config_path() -> Path | None:
    p = Path("config.toml")
    return p if p.exists() else None
