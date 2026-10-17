import asyncio
import json

import aiohttp
from aiohttp import web

from fakes import OTHER_PROGRAM, data_line, notification, pump_tx_logs, start_server
from memecoin_bot.events import PUMP_PROGRAM_ID, default_decoder
from memecoin_bot.solana_ws import LogStream, SignatureCache, parse_logs
from test_events import MINT, trade_values

DEC = default_decoder()


def test_parse_attributes_data_to_pump_only():
    logs = pump_tx_logs(data_line("TradeEvent", trade_values()), outer=OTHER_PROGRAM)
    # PumpSwap emits its own event in the same tx; it must not be decoded as pump data.
    logs.insert(-1, "Program data: vdt/AAAA")
    parsed = parse_logs(logs, PUMP_PROGRAM_ID, DEC)
    assert [e.name for e in parsed.events] == ["TradeEvent"]
    assert parsed.trade_ix == 1 and parsed.data_lines == 1 and parsed.decode_errors == 0


def test_parse_create_with_bundle_buys():
    logs = pump_tx_logs(
        data_line("CreateEvent", {"name": "A", "symbol": "A", "mint": MINT}),
        data_line("TradeEvent", trade_values()),
        data_line("TradeEvent", trade_values(user="11111111111111111111111111111112")),
        instruction="CreateV2",
    )
    parsed = parse_logs(logs, PUMP_PROGRAM_ID, DEC)
    assert [e.name for e in parsed.events] == ["CreateEvent", "TradeEvent", "TradeEvent"]
    assert parsed.create_ix == 1


def test_parse_counts_errors_truncation_unknown_and_self_cpi():
    logs = [
        f"Program {PUMP_PROGRAM_ID} invoke [1]",
        "Program log: Instruction: Sell",
        "Program data: !!!notbase64",
        "Program data: AQIDBAUGBwgJ",           # unknown discriminator
        f"Program {PUMP_PROGRAM_ID} invoke [2]",  # emit_cpi self-invoke
        f"Program {PUMP_PROGRAM_ID} success",
        "Log truncated",
    ]
    parsed = parse_logs(logs, PUMP_PROGRAM_ID, DEC)
    assert parsed.decode_errors == 1 and parsed.undecoded == ["AQIDBAUGBwgJ"]
    assert parsed.self_cpi == 1 and parsed.truncated and parsed.trade_ix == 1 and not parsed.events


def test_signature_cache_is_bounded():
    cache = SignatureCache(maxsize=2)
    assert cache.add("a") and cache.add("b") and not cache.add("a")
    assert cache.add("c")  # evicts "a"
    assert cache.add("a")


def test_log_stream_subscribes_yields_and_reports_gap_after_reconnect():
    requests = []
    connections = []

    async def handler(request):
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        connections.append(ws)
        msg = await ws.receive()
        requests.append(json.loads(msg.data))
        await ws.send_json({"jsonrpc": "2.0", "result": 42, "id": 1})
        n = len(connections)
        await ws.send_json(notification(100 + n, f"sig{n}", pump_tx_logs(data_line("TradeEvent", trade_values()))))
        await ws.send_str("not json")
        await ws.send_json({"jsonrpc": "2.0", "method": "slotNotification", "params": {}})
        if n == 1:
            await ws.close()
        else:
            async for _ in ws:
                pass
        return ws

    gaps = []

    async def scenario():
        app = web.Application()
        app.router.add_get("/", handler)
        runner, base = await start_server(app)
        try:
            async with aiohttp.ClientSession() as session:
                stream = LogStream(session, base.replace("http", "ws") + "/", PUMP_PROGRAM_ID,
                                   on_gap=lambda a, b, r: gaps.append((a, b, r)), initial_backoff=0.01)
                got = []
                gen = stream.notifications()
                while len(got) < 2:
                    got.append(await asyncio.wait_for(gen.__anext__(), 10))
                await gen.aclose()
                return got, stream
        finally:
            await runner.cleanup()

    got, stream = asyncio.run(scenario())
    assert [n.signature for n in got] == ["sig1", "sig2"] and got[0].slot == 101
    assert requests[0]["method"] == "logsSubscribe"
    assert requests[0]["params"] == [{"mentions": [PUMP_PROGRAM_ID]}, {"commitment": "confirmed"}]
    assert len(gaps) == 1 and gaps[0][0] <= gaps[0][1]
    assert stream.reconnects == 1 and stream.bytes_received > 0


def test_log_stream_retries_when_subscription_is_rejected():
    attempts = []

    async def handler(request):
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        await ws.receive()
        attempts.append(1)
        if len(attempts) == 1:
            await ws.send_json({"jsonrpc": "2.0", "error": {"code": -32600, "message": "nope"}, "id": 1})
        else:
            await ws.send_json({"jsonrpc": "2.0", "result": 1, "id": 1})
            await ws.send_json(notification(5, "ok", []))
        async for _ in ws:
            pass
        return ws

    async def scenario():
        app = web.Application()
        app.router.add_get("/", handler)
        runner, base = await start_server(app)
        try:
            async with aiohttp.ClientSession() as session:
                gen = LogStream(session, base.replace("http", "ws") + "/", PUMP_PROGRAM_ID,
                                initial_backoff=0.01).notifications()
                first = await asyncio.wait_for(gen.__anext__(), 10)
                await gen.aclose()
                return first
        finally:
            await runner.cleanup()

    assert asyncio.run(scenario()).signature == "ok"
    assert len(attempts) == 2
