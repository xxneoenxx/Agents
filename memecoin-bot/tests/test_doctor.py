import asyncio
import json

import aiohttp
from aiohttp import web

from fakes import data_line, notification, pump_tx_logs, start_server
from memecoin_bot.config import Config
from memecoin_bot.doctor import evaluate_probe, format_checks, idl_check, run_doctor
from memecoin_bot.events import IDL_FILE
from test_recorder import V0, buy_values


def test_evaluate_probe_classifies_results():
    assert evaluate_probe({"notif": 0})[0].status == "fail"
    ok = evaluate_probe({"notif": 600, "seconds": 10, "bytes": 2e6, "trade_ix": 400, "trades": 402,
                         "creates": 5, "cont_ok": 390, "cont_break": 2})
    assert [c.status for c in ok] == ["ok", "ok", "ok"]
    cpi = evaluate_probe({"notif": 600, "seconds": 10, "trade_ix": 400, "trades": 0, "self_cpi": 400})
    assert cpi[1].status == "fail" and "Weg B" in cpi[1].hint


def test_format_checks_summary():
    text = format_checks(evaluate_probe({"notif": 0}))
    assert "❌" in text and "1 Fehler" in text


def test_run_doctor_against_fakes(tmp_path):
    async def ws_handler(request):
        ws = web.WebSocketResponse()
        await ws.prepare(request)
        await ws.receive()
        await ws.send_json({"jsonrpc": "2.0", "result": 1, "id": 1})
        for i in range(3):
            await ws.send_json(notification(50 + i, f"s{i}", pump_tx_logs(
                data_line("TradeEvent", buy_values(10, V0 - 10 * (i + 1))))))
        async for _ in ws:
            pass
        return ws

    async def rpc_handler(request):
        body = await request.json()
        if body["method"] == "getSlot":
            return web.json_response({"jsonrpc": "2.0", "id": body["id"], "result": 999})
        return web.json_response({"jsonrpc": "2.0", "id": body["id"], "result": {"value": None}})

    async def dex_handler(request):
        return web.json_response([])

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
            cfg.recorder.min_free_gb = 0
            cfg.dexscreener.base_url = base
            return await run_doctor(cfg, probe_seconds=0.8, save_fixtures=tmp_path / "fx")
        finally:
            await runner.cleanup()

    checks = {c.name: c for c in asyncio.run(scenario())}
    assert checks["Solana-RPC"].status == "ok" and "999" in checks["Solana-RPC"].detail
    assert checks["Solana-Datenstrom"].status == "ok"
    assert checks["pump.fun-Events"].status == "ok" and "3 Trades / 3 Instruktionen" in checks["pump.fun-Events"].detail
    assert checks["Vollständigkeit"].status == "ok"
    assert checks["DexScreener"].status == "ok" and checks["Telegram"].status == "warn"
    samples = json.loads((tmp_path / "fx" / "probe_samples.json").read_text())
    assert samples and samples[0]["logs"]


def test_idl_check_reports_appended_fields():
    idl = json.loads(IDL_FILE.read_text())
    for t in idl["types"]:
        if t["name"] == "TradeEvent":
            t["type"]["fields"].append({"name": "new_field", "type": "u64"})

    async def handler(request):
        return web.Response(body=json.dumps(idl).encode())

    async def scenario():
        app = web.Application()
        app.router.add_get("/idl.json", handler)
        runner, base = await start_server(app)
        try:
            async with aiohttp.ClientSession() as session:
                return await idl_check(session, base + "/idl.json")
        finally:
            await runner.cleanup()

    changed, report = asyncio.run(scenario())
    assert changed and "TradeEvent: nur neue Felder angehängt" in report
