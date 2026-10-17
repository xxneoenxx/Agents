from __future__ import annotations

import asyncio
import html
import json
import logging
import re
import sys
from dataclasses import asdict
from pathlib import Path

import aiohttp

from .enrich import MetadataFetcher, SolPrice
from .models import Signal

log = logging.getLogger(__name__)

TIER_FLAMES = {1: "🔥", 2: "🔥🔥", 3: "🔥🔥🔥"}
SOCIAL_LABELS = {"twitter": "X/Twitter", "telegram": "Telegram", "website": "Website"}


def _age(seconds: float) -> str:
    minutes, secs = divmod(int(seconds), 60)
    return f"{minutes}m {secs:02d}s" if minutes else f"{secs}s"


def _usd(value: float) -> str:
    if value >= 1_000_000:
        return f"${value / 1_000_000:.2f}M"
    if value >= 1_000:
        return f"${value / 1_000:.1f}k"
    return f"${value:.0f}"


class _Markup:
    def __init__(self, style: str):
        self.style = style

    def text(self, s: str) -> str:
        if self.style == "html":
            return html.escape(s, quote=False)
        if self.style == "markdown":
            return re.sub(r"([\\*_~`|>\[\]()#@])", r"\\\1", s)
        return s

    def bold(self, s: str) -> str:
        if self.style == "html":
            return f"<b>{s}</b>"
        if self.style == "markdown":
            return f"**{s}**"
        return s

    def code(self, s: str) -> str:
        if self.style == "html":
            return f"<code>{html.escape(s)}</code>"
        if self.style == "markdown":
            return f"`{s.replace('`', '')}`"
        return s

    def link(self, label: str, url: str) -> str:
        if self.style == "html":
            return f'<a href="{html.escape(url)}">{html.escape(label)}</a>'
        if self.style == "markdown":
            return f"[{self.text(label)}](<{url.replace('>', '')}>)"
        return f"{label}: {url}"


def format_signal(sig: Signal, socials: dict[str, str], sol_usd: float | None, style: str = "plain",
                  headline: str = "FOMO-SIGNAL") -> str:
    md = _Markup(style)
    m = sig.metrics
    sep = " · " if style != "plain" else "\n"

    mc = f"{m.market_cap_sol:.1f} SOL"
    if sol_usd:
        mc += f" (~{_usd(m.market_cap_sol * sol_usd)})"
    if m.dev_sold:
        dev = md.bold("Dev hat VERKAUFT")
    else:
        dev = f"Dev hält {m.dev_holding_pct:.1f}%"

    lines = [
        md.bold(f"🚨 {headline} {TIER_FLAMES.get(sig.tier, '🔥')}  Score {sig.score:.0f}/100"),
        md.bold(md.text(f"${sig.symbol}")) + " – " + md.text(sig.name),
        f"⏱ Alter {_age(m.age_s)} | 💰 MC {mc} | 📈 {m.mc_change_pct:+.0f}% in {m.window_s}s",
        f"👥 {m.unique_buyers} Käufer in {m.window_s}s | Buys/Sells {m.buys}/{m.sells} ({m.buy_ratio:.0%})",
        f"💸 Netto-Flow {m.net_flow_sol:+.2f} SOL | größter Käufer {m.top_buyer_share:.0%} vom Volumen",
        f"🧑‍🤝‍🧑 Holder {m.holders} | Top-Holder {m.top_holder_pct:.1f}% | {dev}",
    ]
    if m.curve_progress_pct is not None:
        lines.append(f"📊 Bonding Curve {m.curve_progress_pct:.0f}%")

    social_parts = []
    for key, label in SOCIAL_LABELS.items():
        value = socials.get(key)
        if not value:
            continue
        if value.startswith(("https://", "http://")):
            social_parts.append(md.link(label, value))
        else:
            social_parts.append(f"{label}: {md.text(value)}")
    if social_parts:
        lines.append("🔗 " + sep.join(social_parts))

    lines.append("Mint: " + md.code(sig.mint))
    links = [
        md.link("pump.fun", f"https://pump.fun/coin/{sig.mint}"),
        md.link("DexScreener", f"https://dexscreener.com/solana/{sig.mint}"),
        md.link("GMGN", f"https://gmgn.ai/sol/token/{sig.mint}"),
    ]
    lines.append(sep.join(links))
    return "\n".join(lines)


class ConsoleNotifier:
    style = "plain"

    def __init__(self, stream=None):
        self.stream = stream or sys.stdout
        self.color = hasattr(self.stream, "isatty") and self.stream.isatty()

    async def send(self, text: str) -> bool:
        bar = "=" * 60
        if self.color:
            text = "\033[1;33m" + text.replace("\n", "\033[0m\n", 1)
        print(f"\n{bar}\n{text}\n{bar}", file=self.stream, flush=True)
        return True


class TelegramNotifier:
    style = "html"

    def __init__(self, session: aiohttp.ClientSession, bot_token: str, chat_id: str,
                 api_base: str = "https://api.telegram.org"):
        self.session = session
        self.url = f"{api_base}/bot{bot_token}/sendMessage"
        self.chat_id = chat_id

    async def send(self, text: str) -> bool:
        payload = {
            "chat_id": self.chat_id,
            "text": text,
            "parse_mode": "HTML",
            "link_preview_options": {"is_disabled": True},
        }
        for _ in range(3):
            try:
                async with self.session.post(self.url, json=payload, timeout=aiohttp.ClientTimeout(total=15)) as resp:
                    if resp.status == 200:
                        return True
                    try:
                        data = await resp.json(content_type=None)
                    except ValueError:
                        data = {}
                    if resp.status == 429:
                        await asyncio.sleep(float(data.get("parameters", {}).get("retry_after", 1)))
                        continue
                    log.warning("Telegram lehnt Nachricht ab (%s): %s", resp.status, data.get("description"))
                    return False
            except (aiohttp.ClientError, asyncio.TimeoutError) as exc:
                # Don't log the exception text: it can contain the bot token from the URL.
                log.warning("Telegram nicht erreichbar (%s)", type(exc).__name__)
                return False
        return False


class DiscordNotifier:
    style = "markdown"

    def __init__(self, session: aiohttp.ClientSession, webhook_url: str):
        self.session = session
        self.webhook_url = webhook_url

    async def send(self, text: str) -> bool:
        payload = {"content": text[:2000], "allowed_mentions": {"parse": []}}
        for _ in range(3):
            try:
                async with self.session.post(self.webhook_url, json=payload,
                                             timeout=aiohttp.ClientTimeout(total=15)) as resp:
                    if resp.status in (200, 204):
                        return True
                    try:
                        data = await resp.json(content_type=None)
                    except ValueError:
                        data = {}
                    if resp.status == 429:
                        await asyncio.sleep(float(data.get("retry_after", 1)))
                        continue
                    log.warning("Discord lehnt Nachricht ab (%s): %s", resp.status, data.get("message"))
                    return False
            except (aiohttp.ClientError, asyncio.TimeoutError) as exc:
                log.warning("Discord nicht erreichbar (%s)", type(exc).__name__)
                return False
        return False


class SignalLog:
    """Appends every signal as one JSON line, for later review and tuning."""

    def __init__(self, path: str):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def write(self, sig: Signal, socials: dict[str, str]) -> None:
        record = asdict(sig)
        record["socials"] = socials
        with self.path.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(record, ensure_ascii=False) + "\n")


class Dispatcher:
    def __init__(self, notifiers: list, metadata: MetadataFetcher | None = None,
                 sol_price: SolPrice | None = None, signal_log: SignalLog | None = None):
        self.notifiers = notifiers
        self.metadata = metadata
        self.sol_price = sol_price
        self.signal_log = signal_log
        self._tasks: set[asyncio.Task] = set()

    def publish(self, sig: Signal) -> None:
        task = asyncio.create_task(self.deliver(sig))
        self._tasks.add(task)
        task.add_done_callback(self._tasks.discard)

    async def deliver(self, sig: Signal) -> None:
        socials = await self.metadata.socials(sig.uri) if self.metadata else {}
        sol_usd = self.sol_price.usd if self.sol_price else None
        if self.signal_log:
            try:
                self.signal_log.write(sig, socials)
            except OSError as exc:
                log.warning("Signal-Log nicht schreibbar: %s", exc)
        for notifier in self.notifiers:
            try:
                await notifier.send(format_signal(sig, socials, sol_usd, notifier.style))
            except Exception:
                log.exception("Alert über %s fehlgeschlagen", type(notifier).__name__)

    async def drain(self) -> None:
        if self._tasks:
            await asyncio.gather(*list(self._tasks), return_exceptions=True)
