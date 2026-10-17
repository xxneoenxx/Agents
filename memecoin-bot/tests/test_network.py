"""PumpPortal client and alert senders against local fake servers."""

import asyncio
import json

import aiohttp
from aiohttp import web

from memecoin_bot.config import Config, SourceConfig
from memecoin_bot.demo import generate_events
from memecoin_bot.notifiers import DiscordNotifier, TelegramNotifier, format_signal
from memecoin_bot.pumpportal import PumpPortalClient
from memecoin_bot.tracker import Tracker


async def start_server(app):
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "127.0.0.1", 0)
    await site.start()
    port = site._server.sockets[0].getsockname()[1]
    return runner, f"http://127.0.0.1:{port}"


def demo_signal():
    tracker = Tracker(Config())
    for ts, msg in generate_events():
        signals = tracker.handle(msg, ts)
        if signals:
            return signals[0]


def test_pumpportal_subscribes_and_resubscribes_after_reconnect():
    received: list[list[dict]] = []
    create = {"txType": "create", "mint": "M1", "traderPublicKey": "dev", "initialBuy": 1, "marketCapSol": 28}

    async def ws_handler(request):
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        conn: list[dict] = []
        received.append(conn)
        assert request.query.get("api-key") == "secret"
        await ws.send_json({"message": "Successfully subscribed"})
        if len(received) == 1:
            await ws.send_json(create)
        async for msg in ws:
            data = json.loads(msg.data)
            conn.append(data)
            if len(received) == 1 and data.get("method") == "subscribeTokenTrade":
                # Drop the connection; the client has to reconnect and resubscribe M1.
                await ws.close()
        return ws

    async def scenario():
        app = web.Application()
        app.router.add_get("/api/data", ws_handler)
        runner, base = await start_server(app)
        try:
            cfg = SourceConfig(ws_url=base.replace("http", "ws") + "/api/data", api_key="secret")
            tracker = Tracker(Config())
            async with aiohttp.ClientSession() as session:
                client = PumpPortalClient(cfg, session, lambda: tracker.tokens.keys())
                gen = client.messages()
                msg = await asyncio.wait_for(gen.__anext__(), 5)
                assert msg == create
                tracker.handle(msg, 0)
                subscribe, _ = tracker.drain_subscriptions()
                await client.subscribe(subscribe)

                async def wait_for_resubscribe():
                    while len(received) < 2 or len(received[1]) < 2:
                        await asyncio.sleep(0.05)

                pump = asyncio.ensure_future(gen.__anext__())
                await asyncio.wait_for(wait_for_resubscribe(), 10)
                pump.cancel()
                try:
                    await pump
                except asyncio.CancelledError:
                    pass
                await gen.aclose()
        finally:
            await runner.cleanup()

    asyncio.run(scenario())
    assert received[0] == [{"method": "subscribeNewToken"}, {"method": "subscribeTokenTrade", "keys": ["M1"]}]
    assert received[1] == [{"method": "subscribeNewToken"}, {"method": "subscribeTokenTrade", "keys": ["M1"]}]


def test_telegram_sends_html_and_retries_after_429():
    calls = []

    async def handler(request):
        calls.append((request.match_info["token"], await request.json()))
        if len(calls) == 1:
            return web.json_response({"ok": False, "parameters": {"retry_after": 0}}, status=429)
        return web.json_response({"ok": True})

    async def scenario():
        app = web.Application()
        app.router.add_post("/bot{token}/sendMessage", handler)
        runner, base = await start_server(app)
        try:
            async with aiohttp.ClientSession() as session:
                tg = TelegramNotifier(session, "123:abc", "42", api_base=base)
                return await tg.send("<b>hi</b>")
        finally:
            await runner.cleanup()

    assert asyncio.run(scenario()) is True
    assert len(calls) == 2
    token, payload = calls[1]
    assert token == "123:abc"
    assert payload["chat_id"] == "42" and payload["parse_mode"] == "HTML"


def test_telegram_reports_failure():
    async def handler(request):
        return web.json_response({"ok": False, "description": "chat not found"}, status=400)

    async def scenario():
        app = web.Application()
        app.router.add_post("/bot{token}/sendMessage", handler)
        runner, base = await start_server(app)
        try:
            async with aiohttp.ClientSession() as session:
                return await TelegramNotifier(session, "t", "1", api_base=base).send("x")
        finally:
            await runner.cleanup()

    assert asyncio.run(scenario()) is False


def test_discord_disables_mentions():
    calls = []

    async def handler(request):
        calls.append(await request.json())
        return web.Response(status=204)

    async def scenario():
        app = web.Application()
        app.router.add_post("/webhook", handler)
        runner, base = await start_server(app)
        try:
            async with aiohttp.ClientSession() as session:
                return await DiscordNotifier(session, base + "/webhook").send("@everyone moon")
        finally:
            await runner.cleanup()

    assert asyncio.run(scenario()) is True
    assert calls[0]["allowed_mentions"] == {"parse": []}


def test_format_escapes_untrusted_token_names():
    sig = demo_signal()
    sig.name = "<script>alert(1)</script>"
    sig.symbol = "@everyone"
    socials = {"twitter": "https://x.com/a\"><b>", "telegram": "<i>tg</i>"}
    html_text = format_signal(sig, socials, 150.0, "html")
    assert "<script>" not in html_text and "&lt;script&gt;" in html_text
    assert "<i>tg</i>" not in html_text
    assert '"><b>' not in html_text
    assert "$" in html_text and "MC" in html_text
    md_text = format_signal(sig, socials, None, "markdown")
    assert "\\@everyone" in md_text
    plain = format_signal(sig, {}, None, "plain")
    assert f"https://pump.fun/coin/{sig.mint}" in plain
