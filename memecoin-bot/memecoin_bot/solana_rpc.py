"""Small Solana JSON-RPC helper (HTTP)."""

from __future__ import annotations

import asyncio
import base64
import itertools

import aiohttp

from .base58 import b58encode

_ids = itertools.count(1)


class RpcError(RuntimeError):
    def __init__(self, message: str, status: int | None = None, code: int | None = None):
        super().__init__(message)
        self.status = status
        self.code = code


async def rpc_call(session: aiohttp.ClientSession, url: str, method: str, params: list | None = None,
                   timeout: float = 15.0):
    payload = {"jsonrpc": "2.0", "id": next(_ids), "method": method, "params": params or []}
    try:
        async with session.post(url, json=payload, timeout=aiohttp.ClientTimeout(total=timeout)) as resp:
            if resp.status != 200:
                raise RpcError(f"{method}: HTTP {resp.status}", status=resp.status)
            data = await resp.json(content_type=None)
    except (aiohttp.ClientError, asyncio.TimeoutError) as exc:
        raise RpcError(f"{method}: {type(exc).__name__}") from exc
    if not isinstance(data, dict):
        raise RpcError(f"{method}: unerwartete Antwort")
    if "error" in data:
        err = data["error"] or {}
        raise RpcError(f"{method}: {err.get('message')}", code=err.get("code"))
    return data.get("result")


async def account_data(session: aiohttp.ClientSession, url: str, address: str,
                       data_slice: tuple[int, int] | None = None) -> bytes | None:
    opts: dict = {"encoding": "base64"}
    if data_slice:
        opts["dataSlice"] = {"offset": data_slice[0], "length": data_slice[1]}
    result = await rpc_call(session, url, "getAccountInfo", [address, opts])
    value = (result or {}).get("value")
    if not value:
        return None
    return base64.b64decode(value["data"][0])


async def program_deploy_slot(session: aiohttp.ClientSession, url: str, program_id: str) -> int | None:
    """Slot of the last deployment of an upgradeable program. Changes whenever
    pump.fun ships a program upgrade, which marks a structural break in the data."""
    program = await account_data(session, url, program_id)
    if not program or len(program) < 36:
        return None
    programdata_address = b58encode(program[4:36])
    header = await account_data(session, url, programdata_address, data_slice=(0, 12))
    if not header or len(header) < 12:
        return None
    return int.from_bytes(header[4:12], "little")
