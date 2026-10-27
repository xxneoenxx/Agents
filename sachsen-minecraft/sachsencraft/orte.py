"""Teleport-Liste: Koordinaten bekannter Orte in der fertigen Welt (für /tp)."""

from __future__ import annotations

import json
import math
import os
import struct
import sys
import zlib
import io

import nbtlib
import numpy as np

from .features import load
from .preview import chunk_columns

SOLID_SKIP = {"air", "short_grass", "tall_grass", "fern", "oak_leaves", "spruce_leaves", "birch_leaves", "dark_oak_leaves", "azalea_leaves"}


def _chunk(world, cx, cz):
    rx, rz = cx >> 5, cz >> 5
    p = os.path.join(world, "region", f"r.{rx}.{rz}.mca")
    if not os.path.exists(p):
        return None
    with open(p, "rb") as fh:
        data = fh.read()
    i = (cx & 31) + (cz & 31) * 32
    loc = struct.unpack_from(">I", data, i * 4)[0]
    off = loc >> 8
    if off == 0:
        return None
    length, comp = struct.unpack_from(">IB", data, off * 4096)
    return nbtlib.File.parse(io.BytesIO(zlib.decompress(data[off * 4096 + 5: off * 4096 + 4 + length])))


def ground_y(world, x, z):
    """Höhe des obersten festen Blocks (ohne Laub/Gras) + 1."""
    nbt = _chunk(world, x >> 4, z >> 4)
    if nbt is None:
        return None
    from .preview import decode_states

    best = None
    for sec in sorted(nbt["sections"], key=lambda s: int(s["Y"])):
        idx, names = decode_states(sec["block_states"])
        arr = np.array(names, dtype=object)[idx].reshape(16, 16, 16)
        col = arr[:, z & 15, x & 15]
        for ly in range(16):
            if col[ly] not in SOLID_SKIP and col[ly] != "water":
                best = int(sec["Y"]) * 16 + ly
            elif col[ly] == "water":
                best = int(sec["Y"]) * 16 + ly
    return None if best is None else best + 1


def places(world: str, data: str) -> list[tuple[str, int, int, int]]:
    meta = json.load(open(os.path.join(world, "sachsencraft.json"), encoding="utf-8"))
    e0, n0 = meta["e0"], meta["n0"]
    out = [("Markt Lunzenau (Spawn)", *meta["spawn"])]
    targets = []
    for f in load(os.path.join(data, "division_area.jsonl")):
        if f.get("region") == "DE-SN" and f.get("subtype") == "neighborhood" and f.name in (
            "Lunzenau", "Cossen", "Göritzhain", "Elsdorf", "Himmelhartha", "Rochsburg", "Berthelsdorf", "Schlaisdorf"):
            p = f.geom.representative_point()
            targets.append((f"Ortsteil {f.name}", p.x, p.y))
    for f in load(os.path.join(data, "building_part.jsonl")):
        if f.name == "Der Bergfried":
            p = f.geom.centroid
            targets.append(("Schloss Rochsburg (Bergfried)", p.x, p.y))
    for f in load(os.path.join(data, "building.jsonl")):
        if f.name == "St. Jakobus":
            p = f.geom.centroid
            targets.append(("Kirche St. Jakobus", p.x, p.y))
    seen = set()
    for name, e, n in targets:
        if name in seen:
            continue
        seen.add(name)
        x = int(math.floor(e - e0))
        z = int(math.floor(n0 - n))
        y = ground_y(world, x, z)
        if y is not None:
            out.append((name, x, y + 1, z))
    return out


if __name__ == "__main__":
    for name, x, y, z in places(sys.argv[1], sys.argv[2]):
        print(f"| {name} | `/tp @s {x} {y} {z}` |")
