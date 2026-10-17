"""Decoder for pump.fun Anchor events, driven by the vendored program IDL.

The IDL (memecoin_bot/idl/pump.json) is the single source of truth for event
layouts: when pump.fun appends fields, replacing that file updates the decoder.
Events that end early (older program versions) decode with the missing
trailing fields set to None.
"""

from __future__ import annotations

import hashlib
import json
import struct
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any, Callable

from .base58 import b58encode

IDL_FILE = Path(__file__).with_name("idl") / "pump.json"
IDL_SOURCE = "https://raw.githubusercontent.com/pump-fun/pump-public-docs/main/idl/pump.json"
# sha256 of the vendored file, fetched 2026-10-17. `idl-check` compares against upstream.
IDL_SHA256 = "7616681ea557975f9f623ac211080f22a93060781eaf4765b0a488d980997207"

PUMP_PROGRAM_ID = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"
# SOL-quoted coins carry Pubkey::default() as quote_mint; wrapped SOL is accepted too.
SOL_QUOTE_MINTS = frozenset({
    "11111111111111111111111111111111",
    "So11111111111111111111111111111111111111112",
})

MAX_STRING_BYTES = 1024
MAX_VEC_LEN = 256

Decoder = Callable[[bytes, int], tuple[Any, int]]


class DecodeError(ValueError):
    """The bytes do not match the IDL layout (misaligned or corrupt)."""


class Truncated(DecodeError):
    """The data ended before the field could be read."""


@lru_cache(maxsize=65536)
def pubkey_str(raw: bytes) -> str:
    return b58encode(raw)


def is_sol_quote(quote_mint: bytes | str | None) -> bool:
    if quote_mint is None:
        return True
    if isinstance(quote_mint, bytes):
        quote_mint = pubkey_str(quote_mint)
    return quote_mint in SOL_QUOTE_MINTS


@dataclass
class Event:
    name: str
    fields: dict[str, Any]
    complete: bool = True
    extra_bytes: int = 0
    missing: list[str] = field(default_factory=list)

    def __getitem__(self, key: str) -> Any:
        return self.fields[key]

    def get(self, key: str, default: Any = None) -> Any:
        value = self.fields.get(key)
        return default if value is None else value


def _fixed(fmt: str) -> Decoder:
    s = struct.Struct("<" + fmt)
    size = s.size
    unpack = s.unpack_from

    def read(buf: bytes, pos: int) -> tuple[Any, int]:
        if pos + size > len(buf):
            raise Truncated
        return unpack(buf, pos)[0], pos + size
    return read


def _read_bool(buf: bytes, pos: int) -> tuple[bool, int]:
    if pos >= len(buf):
        raise Truncated
    b = buf[pos]
    if b > 1:
        raise DecodeError(f"bool byte {b} at {pos}")
    return b == 1, pos + 1


def _int128(signed: bool) -> Decoder:
    def read(buf: bytes, pos: int) -> tuple[int, int]:
        if pos + 16 > len(buf):
            raise Truncated
        return int.from_bytes(buf[pos:pos + 16], "little", signed=signed), pos + 16
    return read


def _read_pubkey(buf: bytes, pos: int) -> tuple[bytes, int]:
    if pos + 32 > len(buf):
        raise Truncated
    return bytes(buf[pos:pos + 32]), pos + 32


_read_u32 = _fixed("I")


def _read_string(buf: bytes, pos: int) -> tuple[str, int]:
    n, pos = _read_u32(buf, pos)
    if n > MAX_STRING_BYTES:
        raise DecodeError(f"string length {n} at {pos}")
    if pos + n > len(buf):
        raise Truncated
    return bytes(buf[pos:pos + n]).decode("utf-8", errors="replace"), pos + n


def _read_bytes(buf: bytes, pos: int) -> tuple[bytes, int]:
    n, pos = _read_u32(buf, pos)
    if n > MAX_STRING_BYTES * 16:
        raise DecodeError(f"bytes length {n} at {pos}")
    if pos + n > len(buf):
        raise Truncated
    return bytes(buf[pos:pos + n]), pos + n


_PRIMITIVES: dict[str, Decoder] = {
    "bool": _read_bool,
    "u8": _fixed("B"), "i8": _fixed("b"),
    "u16": _fixed("H"), "i16": _fixed("h"),
    "u32": _fixed("I"), "i32": _fixed("i"),
    "u64": _fixed("Q"), "i64": _fixed("q"),
    "f32": _fixed("f"), "f64": _fixed("d"),
    "u128": _int128(False), "i128": _int128(True),
    "pubkey": _read_pubkey, "publicKey": _read_pubkey,
    "string": _read_string, "bytes": _read_bytes,
}


class EventDecoder:
    def __init__(self, idl: dict):
        self.address = idl.get("address")
        self._types = {t["name"]: t["type"] for t in idl.get("types", [])}
        self.by_discriminator: dict[bytes, str] = {
            bytes(e["discriminator"]): e["name"] for e in idl.get("events", [])
        }
        self.discriminators = {name: disc for disc, name in self.by_discriminator.items()}
        self._structs: dict[str, list[tuple[str, Decoder]]] = {}
        self._decoders: dict[str, Decoder] = {}

    @classmethod
    def from_file(cls, path: Path = IDL_FILE) -> "EventDecoder":
        return cls(json.loads(path.read_text(encoding="utf-8")))

    def field_names(self, event_name: str) -> list[str]:
        return [name for name, _ in self._struct_fields(event_name)]

    def decode(self, data: bytes) -> Event | None:
        """Decode `discriminator + borsh payload`. Returns None for non-event data."""
        name = self.by_discriminator.get(bytes(data[:8]))
        if name is None:
            return None
        fields_spec = self._struct_fields(name)
        values: dict[str, Any] = {}
        pos = 8
        complete = True
        missing: list[str] = []
        for i, (fname, read) in enumerate(fields_spec):
            try:
                values[fname], pos = read(data, pos)
            except Truncated:
                complete = False
                missing = [f for f, _ in fields_spec[i:]]
                for f in missing:
                    values[f] = None
                break
        return Event(name, values, complete, len(data) - pos if complete else 0, missing)

    # --- compilation of IDL types into decoder functions -------------------

    def _struct_fields(self, type_name: str) -> list[tuple[str, Decoder]]:
        if type_name not in self._structs:
            spec = self._types.get(type_name)
            if spec is None or spec.get("kind") != "struct":
                raise KeyError(f"IDL has no struct {type_name}")
            self._structs[type_name] = [(f["name"], self._compile(f["type"])) for f in spec.get("fields", [])]
        return self._structs[type_name]

    def _compile(self, t: Any) -> Decoder:
        if isinstance(t, str):
            if t not in _PRIMITIVES:
                raise KeyError(f"unsupported IDL type {t}")
            return _PRIMITIVES[t]
        if "vec" in t:
            item = self._compile(t["vec"])

            def read_vec(buf: bytes, pos: int) -> tuple[list, int]:
                n, pos = _read_u32(buf, pos)
                if n > MAX_VEC_LEN:
                    raise DecodeError(f"vec length {n} at {pos}")
                out = []
                for _ in range(n):
                    v, pos = item(buf, pos)
                    out.append(v)
                return out, pos
            return read_vec
        if "option" in t:
            item = self._compile(t["option"])

            def read_option(buf: bytes, pos: int) -> tuple[Any, int]:
                if pos >= len(buf):
                    raise Truncated
                tag = buf[pos]
                if tag == 0:
                    return None, pos + 1
                if tag != 1:
                    raise DecodeError(f"option tag {tag} at {pos}")
                return item(buf, pos + 1)
            return read_option
        if "array" in t:
            item_type, length = t["array"]
            item = self._compile(item_type)

            def read_array(buf: bytes, pos: int) -> tuple[list, int]:
                out = []
                for _ in range(length):
                    v, pos = item(buf, pos)
                    out.append(v)
                return out, pos
            return read_array
        if "defined" in t:
            ref = t["defined"]
            name = ref["name"] if isinstance(ref, dict) else ref
            if name in self._decoders:
                return self._decoders[name]
            spec = self._types.get(name)
            if spec is None:
                raise KeyError(f"IDL has no type {name}")
            if spec.get("kind") == "struct":
                def read_struct(buf: bytes, pos: int, _name: str = name) -> tuple[dict, int]:
                    out = {}
                    for fname, read in self._struct_fields(_name):
                        out[fname], pos = read(buf, pos)
                    return out, pos
                self._decoders[name] = read_struct
            elif spec.get("kind") == "enum":
                variants = spec.get("variants", [])

                def read_enum(buf: bytes, pos: int, _variants: list = variants) -> tuple[Any, int]:
                    if pos >= len(buf):
                        raise Truncated
                    idx = buf[pos]
                    if idx >= len(_variants):
                        raise DecodeError(f"enum variant {idx} at {pos}")
                    variant = _variants[idx]
                    pos += 1
                    if not variant.get("fields"):
                        return variant["name"], pos
                    out = {"variant": variant["name"]}
                    for i, f in enumerate(variant["fields"]):
                        ftype = f["type"] if isinstance(f, dict) else f
                        fname = f.get("name", str(i)) if isinstance(f, dict) else str(i)
                        out[fname], pos = self._compile(ftype)(buf, pos)
                    return out, pos
                self._decoders[name] = read_enum
            else:
                raise KeyError(f"unsupported IDL kind for {name}")
            return self._decoders[name]
        raise KeyError(f"unsupported IDL type {t}")


_FIXED_FORMATS = {"u8": "B", "i8": "b", "u16": "H", "i16": "h", "u32": "I", "i32": "i",
                  "u64": "Q", "i64": "q", "f32": "f", "f64": "d"}


class EventEncoder:
    """Inverse of EventDecoder, used by the demo and tests to produce real event bytes."""

    def __init__(self, decoder: EventDecoder):
        self.decoder = decoder
        self._types = decoder._types

    def encode(self, event_name: str, values: dict[str, Any], drop_last: int = 0) -> bytes:
        """Encode an event. Missing fields default to zero values. `drop_last` omits
        trailing fields to mimic events from older program versions."""
        out = bytearray(self.decoder.discriminators[event_name])
        fields = self._types[event_name]["fields"]
        if drop_last:
            fields = fields[:-drop_last]
        for f in fields:
            self._write(out, f["type"], values.get(f["name"]))
        return bytes(out)

    def _write(self, out: bytearray, t: Any, v: Any) -> None:
        if isinstance(t, str):
            if t == "bool":
                out.append(1 if v else 0)
            elif t in _FIXED_FORMATS:
                out += struct.pack("<" + _FIXED_FORMATS[t], v or 0)
            elif t in ("u128", "i128"):
                out += int(v or 0).to_bytes(16, "little", signed=t == "i128")
            elif t in ("pubkey", "publicKey"):
                raw = v if isinstance(v, (bytes, bytearray)) else (b58decode_pubkey(v) if v else bytes(32))
                if len(raw) != 32:
                    raise ValueError("pubkey must be 32 bytes")
                out += raw
            elif t == "string":
                data = (v or "").encode("utf-8")
                out += struct.pack("<I", len(data)) + data
            elif t == "bytes":
                data = bytes(v or b"")
                out += struct.pack("<I", len(data)) + data
            else:
                raise KeyError(t)
        elif "vec" in t:
            items = v or []
            out += struct.pack("<I", len(items))
            for item in items:
                self._write(out, t["vec"], item)
        elif "option" in t:
            if v is None:
                out.append(0)
            else:
                out.append(1)
                self._write(out, t["option"], v)
        elif "array" in t:
            item_type, length = t["array"]
            items = list(v or [])
            items += [None] * (length - len(items))
            for item in items[:length]:
                self._write(out, item_type, item)
        elif "defined" in t:
            ref = t["defined"]
            name = ref["name"] if isinstance(ref, dict) else ref
            spec = self._types[name]
            if spec.get("kind") != "struct":
                raise KeyError(f"encoder supports structs only, not {name}")
            for f in spec["fields"]:
                self._write(out, f["type"], (v or {}).get(f["name"]))
        else:
            raise KeyError(t)


def b58decode_pubkey(text: str) -> bytes:
    from .base58 import b58decode
    raw = b58decode(text)
    return raw.rjust(32, b"\0") if len(raw) < 32 else raw


def idl_sha256(path: Path = IDL_FILE) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


@lru_cache(maxsize=1)
def default_decoder() -> EventDecoder:
    return EventDecoder.from_file()
