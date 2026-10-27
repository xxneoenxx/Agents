"""Chunks im Minecraft-Format (1.18+, hier DataVersion 3955 = 1.21.1) kodieren und Region-Dateien schreiben."""

from __future__ import annotations

import math
import os
import struct
import time
import zlib

import numpy as np

from . import blocks
from .nbt import Byte, Int, List, Long, LongArray, TAG_COMPOUND, TAG_LIST, TAG_STRING, dumps, to_signed64

DATA_VERSION = 3955  # Minecraft Java 1.21.1
MIN_SECTION = -4  # y = -64
MAX_SECTION = 19  # y = 304..319


def pack_indices(idx: np.ndarray, bits: int) -> np.ndarray:
    """Paletten-Indizes in Longs packen (seit 1.16 ohne Überlauf über Long-Grenzen)."""
    per_long = 64 // bits
    n = idx.size
    n_longs = math.ceil(n / per_long)
    padded = np.zeros(n_longs * per_long, dtype=np.uint64)
    padded[:n] = idx.astype(np.uint64)
    padded = padded.reshape(n_longs, per_long)
    shifts = (np.arange(per_long, dtype=np.uint64) * np.uint64(bits))
    longs = np.bitwise_or.reduce(padded << shifts, axis=1)
    return to_signed64(longs)


def encode_paletted(values: np.ndarray, min_bits: int, entry_fn, biome: bool = False) -> dict:
    """values: flache Liste (4096 Blöcke oder 64 Biome) -> {'palette': [...], 'data': [...]}."""
    uniq, inv = np.unique(values, return_inverse=True)
    palette = List(TAG_STRING if biome else TAG_COMPOUND, [entry_fn(int(u)) for u in uniq])
    out = {"palette": palette}
    if len(uniq) > 1:
        bits = max(min_bits, math.ceil(math.log2(len(uniq))))
        out["data"] = LongArray(pack_indices(inv.reshape(-1), bits))
    return out


def section_nbt(y: int, block_ids: np.ndarray | None, uniform: int | None, biome_names: list[str], biome_idx: np.ndarray | None) -> dict:
    """Ein Abschnitt (16×16×16). block_ids in Reihenfolge [y][z][x]."""
    sec = {"Y": Byte(y)}
    if uniform is not None:
        sec["block_states"] = {"palette": List(TAG_COMPOUND, [blocks.palette_entry(uniform)])}
    else:
        sec["block_states"] = encode_paletted(block_ids.reshape(-1), 4, blocks.palette_entry)
    if biome_idx is None:
        sec["biomes"] = {"palette": List(TAG_STRING, [biome_names[0]])}
    else:
        names = biome_names
        sec["biomes"] = encode_paletted(biome_idx.reshape(-1), 1, lambda i: names[i], biome=True)
    return sec


def chunk_nbt(cx: int, cz: int, sections: list[dict], block_entities: list[dict] | None = None) -> dict:
    return {
        "DataVersion": Int(DATA_VERSION),
        "xPos": Int(cx),
        "yPos": Int(MIN_SECTION),
        "zPos": Int(cz),
        "Status": "minecraft:full",
        "LastUpdate": Long(0),
        "InhabitedTime": Long(0),
        "isLightOn": Byte(0),  # Licht berechnet Minecraft beim Laden neu
        "sections": List(TAG_COMPOUND, sections),
        "block_entities": List(TAG_COMPOUND, block_entities or []),
        "fluid_ticks": List(TAG_COMPOUND, []),
        "block_ticks": List(TAG_COMPOUND, []),
        "PostProcessing": List(TAG_LIST, [List(0, []) for _ in range(MAX_SECTION - MIN_SECTION + 1)]),
        "Heightmaps": {},
        "structures": {"References": {}, "starts": {}},
    }


class RegionWriter:
    """Schreibt eine r.X.Z.mca-Datei (32×32 Chunks)."""

    def __init__(self, path: str):
        self.path = path
        self.chunks: dict[int, bytes] = {}

    def add(self, cx: int, cz: int, nbt_root: dict) -> int:
        raw = dumps(nbt_root)
        comp = zlib.compress(raw, 9)
        self.chunks[(cx & 31) + (cz & 31) * 32] = comp
        return len(comp)

    def close(self) -> int:
        if not self.chunks:
            return 0
        locations = bytearray(4096)
        timestamps = bytearray(4096)
        body = bytearray()
        sector = 2
        now = int(time.time())
        for idx in sorted(self.chunks):
            comp = self.chunks[idx]
            payload = struct.pack(">IB", len(comp) + 1, 2) + comp
            n_sectors = math.ceil(len(payload) / 4096)
            if n_sectors > 255:
                raise ValueError("Chunk zu groß für Region-Datei")
            payload += b"\x00" * (n_sectors * 4096 - len(payload))
            struct.pack_into(">I", locations, idx * 4, (sector << 8) | n_sectors)
            struct.pack_into(">I", timestamps, idx * 4, now)
            body += payload
            sector += n_sectors
        os.makedirs(os.path.dirname(self.path), exist_ok=True)
        with open(self.path, "wb") as fh:
            fh.write(locations)
            fh.write(timestamps)
            fh.write(body)
        return 8192 + len(body)
