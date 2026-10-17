import asyncio
import base64
import time
from collections import Counter

import aiohttp
from aiohttp import web

from fakes import data_line, notification, pump_tx_logs, start_server
from memecoin_bot.base58 import b58decode
from memecoin_bot.config import Config
from memecoin_bot.events import PUMP_PROGRAM_ID
from memecoin_bot.recorder import (Alerter, Recorder, compact_event, decode_ratio, heartbeat_text, next_local_time,
                                   run_recorder)
from memecoin_bot.solana_ws import LogNotification
from memecoin_bot.tape import read_records, tape_files
from test_events import DEFAULT_PUBKEY, MINT, USER, trade_values

V0 = 1_073_000_000_000_000
USDC = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"


def create_values(ts=None):
    return {"name": "Moon", "symbol": "MOON", "uri": "https://x", "mint": MINT, "bonding_curve": USER,
            "user": USER, "creator": USER, "timestamp": int(ts or time.time()), "virtual_token_reserves": V0,
            "virtual_sol_reserves": 30_000_000_000, "real_token_reserves": 793_100_000_000_000,
            "token_total_supply": 10**15, "quote_mint": DEFAULT_PUBKEY}


def note(sig, logs, slot=10, err=None):
    return LogNotification(slot=slot, signature=sig, err=err, logs=logs, recv_ts=time.time(), size=1000)


def buy_values(tok, post, ts=None, **kw):
    return trade_values(token_amount=tok, virtual_token_reserves=post, timestamp=int(ts or time.time()), **kw)


class ListWriter:
    def __init__(self):
        self.lines = []

    def write(self, rec):
        self.lines.append(rec)


def test_create_and_bundle_buy_in_one_tx():
    w = ListWriter()
    r = Recorder(w)
    logs = pump_tx_logs(data_line("CreateEvent", create_values()),
                        data_line("TradeEvent", buy_values(10**12, V0 - 10**12)), instruction="CreateV2")
    line = r.handle(note("sig-a" * 10, logs))
    assert line[0] == "X" and line[1] == 10 and line[3] == ("sig-a" * 10)[:16]
    kinds = [rec[0] for rec in line[5]]
    assert kinds == ["C", "T"]
    create, trade = line[5]
    assert create[1] == MINT and create[16] is None  # SOL quote stored as None
    assert trade[1] == MINT and trade[3] == 1 and trade[5] == 10**12 and trade[7] == V0 - 10**12
    assert r.minute["creates"] == 1 and r.minute["trades"] == 1 and r.minute["create_ix"] == 1
    r.continuity.flush(time.time())
    assert r.continuity.reset_counters() == (1, 0, 0)


def test_failed_duplicate_and_implausible_transactions():
    w = ListWriter()
    r = Recorder(w)
    good = pump_tx_logs(data_line("TradeEvent", buy_values(1, V0 - 1)))
    assert r.handle(note("s1", good, err={"InstructionError": [0, "x"]})) is None
    assert r.handle(note("s2", good)) is not None
    assert r.handle(note("s2", good)) is None  # duplicate after reconnect
    stale = pump_tx_logs(data_line("TradeEvent", buy_values(1, V0 - 1, ts=1_000)))
    assert r.handle(note("s3", stale)) is None
    assert r.totals["err_tx"] == 1 and r.totals["dup"] == 1 and r.totals["implausible"] == 1


def test_complete_unknown_and_count_only_events():
    w = ListWriter()
    r = Recorder(w)
    logs = pump_tx_logs(
        data_line("CompleteEvent", {"mint": MINT, "user": USER, "bonding_curve": USER,
                                    "timestamp": int(time.time())}),
        data_line("InitUserVolumeAccumulatorEvent", {"payer": USER, "user": USER,
                                                     "timestamp": int(time.time())}),
        "Program data: " + base64.b64encode(b"\x09" * 20).decode(),
        instruction="Buy",
    )
    line = r.handle(note("s4", logs))
    assert [rec[0] for rec in line[5]] == ["M", "U"]
    assert MINT in r.migrated.mints
    assert r.other_events["InitUserVolumeAccumulatorEvent"] == 1


def test_non_sol_quote_is_kept_with_quote_amount():
    rec = compact_event(_decode_trade(quote_mint=USDC, quote_amount=12345))
    assert rec[13] == USDC and rec[14] == 12345
    rec = compact_event(_decode_trade())
    assert rec[13] is None and rec[14] is None


def _decode_trade(**kw):
    from memecoin_bot.events import EventEncoder, default_decoder
    dec = default_decoder()
    return dec.decode(EventEncoder(dec).encode("TradeEvent", trade_values(**kw)))


def test_status_record_and_decode_ratio():
    w = ListWriter()
    r = Recorder(w)
    r.handle(note("s5", pump_tx_logs(data_line("TradeEvent", buy_values(1, V0 - 1)))))
    r.on_gap(1.0, 31.0, "geschlossen")
    stats = r.status(time.time(), {"connected": True})
    assert w.lines[-2][0] == "G" and w.lines[-1][0] == "S"
    assert stats["trades"] == 1 and stats["trade_ix"] == 1 and decode_ratio(stats) == 1.0
    assert stats["gaps"] == 1 and stats["gap_seconds"] == 30
    assert r.status(time.time()).get("trades", 0) == 0  # minute counters reset


def test_heartbeat_text_uses_german_thousands():
    text = heartbeat_text(Counter(trades=1234567, trade_ix=1234567, creates=30000, completes=500,
                                  cont_ok=990, cont_break=10), 7200, 33.3, 2)
    assert "1.234.567 Trades, 30.000 Launches, 500 Migrationen" in text
    assert "Dekodierquote: 100%" in text and "1.00%" in text and "33.3 GB" in text


def test_next_local_time_handles_dst_change():
    # 2026-10-24 12:00 UTC; Berlin switches from CEST to CET on 2026-10-25.
    now = 1792843200.0
    due = next_local_time(now, "09:00", "Europe/Berlin")
    assert time.gmtime(due).tm_hour == 8 and time.gmtime(due).tm_mday == 25  # 09:00 CET = 08:00 UTC
    assert next_local_time(now, "09:00", "Mars/Olympus") > now  # unknown zone falls back to UTC


def test_alerter_cooldown_and_clear():
    sent = []

    class FakeNotifier:
        async def send(self, text):
            sent.append(text)
            return True

    async def scenario():
        a = Alerter(FakeNotifier(), cooldown_s=100, clock=lambda: 0)
        await a.raise_("x", "down")
        await a.raise_("x", "down again")
        await a.clear("x", "up")
        await a.clear("x", "up again")

    asyncio.run(scenario())
    assert sent == ["down", "up"]


def test_run_recorder_end_to_end(tmp_path):
    program_data = b"\x02\x00\x00\x00" + b58decode(USER)
    deploy_header = b"\x03\x00\x00\x00" + (123456789).to_bytes(8, "little")
    rpc_calls = []
    dex_calls = []

    async def ws_handler(request):
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        await ws.receive()
        await ws.send_json({"jsonrpc": "2.0", "result": 1, "id": 1})
        await ws.send_json(notification(20, "sigcreate", pump_tx_logs(
            data_line("CreateEvent", create_values()), data_line("TradeEvent", buy_values(10**12, V0 - 10**12)),
            instruction="CreateV2")))
        await ws.send_json(notification(21, "sigbuy", pump_tx_logs(
            data_line("TradeEvent", buy_values(10**12, V0 - 2 * 10**12)))))
        await ws.send_json(notification(30, "sigdone", pump_tx_logs(
            data_line("CompleteEvent", {"mint": MINT, "user": USER, "bonding_curve": USER,
                                        "timestamp": int(time.time())}))))
        async for _ in ws:
            pass
        return ws

    async def rpc_handler(request):
        body = await request.json()
        rpc_calls.append(body["method"])
        if body["method"] == "getAccountInfo":
            data = program_data if body["params"][0] == PUMP_PROGRAM_ID else deploy_header
            return web.json_response({"jsonrpc": "2.0", "id": body["id"], "result": {
                "value": {"data": [base64.b64encode(data).decode(), "base64"]}}})
        return web.json_response({"jsonrpc": "2.0", "id": body["id"], "result": 1})

    async def dex_handler(request):
        dex_calls.append(request.match_info["mints"])
        return web.json_response([{"chainId": "solana", "dexId": "pumpswap", "pairAddress": "P",
                                   "baseToken": {"address": MINT}, "quoteToken": {"symbol": "SOL"},
                                   "priceNative": "0.0000005", "priceUsd": "0.0001", "liquidity": {"usd": 50000},
                                   "txns": {"m5": {"buys": 10, "sells": 4}}, "volume": {"m5": 1234}}])

    async def scenario():
        app = web.Application()
        app.router.add_get("/ws", ws_handler)
        app.router.add_post("/rpc", rpc_handler)
        app.router.add_get("/tokens/v1/solana/{mints}", dex_handler)
        runner, base = await start_server(app)
        try:
            cfg = Config()
            cfg.solana.ws_url = base.replace("http", "ws") + "/ws"
            cfg.solana.rpc_url = base + "/rpc"
            cfg.recorder.dir = str(tmp_path / "tape")
            cfg.dexscreener.base_url = base
            cfg.dexscreener.interval_s = 0.2
            cfg.dexscreener.max_requests_per_min = 6000
            stop = asyncio.Event()
            task = asyncio.create_task(run_recorder(cfg, stop, status_interval=0.3, slow_interval=3600))
            await asyncio.sleep(1.5)
            stop.set()
            await asyncio.wait_for(task, 5)
        finally:
            await runner.cleanup()

    asyncio.run(scenario())
    records = list(read_records(tape_files(tmp_path / "tape")))
    kinds = Counter(r[0] for r in records)
    assert kinds["H"] == 1 and kinds["X"] == 3 and kinds["B"] == 1 and kinds["S"] >= 2 and kinds["D"] >= 1
    tx_kinds = [e[0] for r in records if r[0] == "X" for e in r[5]]
    assert tx_kinds == ["C", "T", "T", "M"]
    assert [r for r in records if r[0] == "B"][0][2] == 123456789
    d = [r for r in records if r[0] == "D"][0][2][0]
    assert d[0] == MINT and d[1] == "pumpswap" and d[9] == 10
    status = [r[2] for r in records if r[0] == "S"]
    assert sum(s.get("trades", 0) for s in status) == 2
    assert sum(s.get("cont_ok", 0) for s in status) == 2 and sum(s.get("cont_break", 0) for s in status) == 0
    assert status[-1].get("shutdown") is True
    assert "getAccountInfo" in rpc_calls and dex_calls
