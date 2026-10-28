"""Prüfen und Vorschau: Region-Dateien unabhängig (mit nbtlib) zurücklesen und eine Karte von oben zeichnen."""

from __future__ import annotations

import io
import math
import os
import struct
import sys
import zlib

import nbtlib
import numpy as np
from PIL import Image

COLORS = {
    "grass_block": (98, 148, 60), "podzol": (106, 76, 40), "moss_block": (89, 110, 45), "dirt": (134, 96, 67),
    "coarse_dirt": (119, 85, 59), "dirt_path": (148, 122, 65), "farmland": (95, 62, 35), "sand": (219, 207, 163),
    "gravel": (131, 127, 126), "clay": (160, 166, 179), "mud": (60, 57, 60), "water": (52, 92, 190), "stone": (125, 125, 125),
    "andesite": (136, 136, 136), "granite": (149, 103, 85), "polished_andesite": (132, 134, 133), "stone_bricks": (122, 121, 122),
    "gray_concrete": (54, 57, 61), "black_concrete": (8, 10, 15), "white_concrete": (207, 213, 214), "light_gray_concrete": (125, 125, 115),
    "bricks": (150, 97, 83), "brick_stairs": (150, 97, 83), "deepslate_tiles": (54, 54, 55), "deepslate_tile_stairs": (54, 54, 55),
    "mud_bricks": (137, 103, 79), "mud_brick_stairs": (137, 103, 79), "nether_bricks": (44, 21, 26), "nether_brick_stairs": (44, 21, 26),
    "spruce_planks": (114, 84, 48), "spruce_stairs": (114, 84, 48), "oak_planks": (162, 130, 78), "smooth_stone": (158, 158, 158),
    "smooth_stone_slab": (158, 158, 158), "oxidized_cut_copper": (79, 153, 126), "oxidized_cut_copper_stairs": (79, 153, 126),
    "oak_leaves": (59, 110, 32), "spruce_leaves": (44, 74, 44), "birch_leaves": (96, 133, 60), "dark_oak_leaves": (50, 92, 28),
    "azalea_leaves": (90, 115, 44), "oak_log": (109, 85, 50), "spruce_log": (58, 37, 16), "birch_log": (216, 215, 210),
    "wheat": (196, 170, 86), "potatoes": (90, 140, 50), "carrots": (90, 140, 50), "beetroots": (90, 120, 50),
    "short_grass": (98, 148, 60), "tall_grass": (98, 148, 60), "fern": (80, 130, 50), "lily_pad": (40, 120, 40),
    "glass": (190, 220, 230), "glass_pane": (190, 220, 230), "rail": (110, 100, 90), "lantern": (230, 180, 90),
    "calcite": (223, 224, 220), "white_terracotta": (209, 178, 161), "smooth_sandstone": (223, 214, 170),
    "smooth_quartz": (235, 229, 222), "yellow_terracotta": (186, 133, 35), "cyan_terracotta": (86, 91, 91),
}


def read_region(path):
    with open(path, "rb") as fh:
        data = fh.read()
    for i in range(1024):
        loc = struct.unpack_from(">I", data, i * 4)[0]
        off, cnt = loc >> 8, loc & 0xFF
        if off == 0:
            continue
        length, comp = struct.unpack_from(">IB", data, off * 4096)
        raw = data[off * 4096 + 5: off * 4096 + 4 + length]
        assert comp == 2, comp
        nbt = nbtlib.File.parse(io.BytesIO(zlib.decompress(raw)))
        yield nbt


def decode_states(bs) -> list[str] | np.ndarray:
    pal = bs["palette"]
    names = [str(p["Name"]).split(":")[1] for p in pal]
    if len(pal) == 1:
        return np.full(4096, 0), names
    bits = max(4, math.ceil(math.log2(len(pal))))
    longs = np.array([int(v) & 0xFFFFFFFFFFFFFFFF for v in bs["data"]], dtype=np.uint64)
    per = 64 // bits
    assert len(longs) == math.ceil(4096 / per), (len(longs), bits)
    idx = np.zeros(4096, dtype=np.int64)
    mask = np.uint64((1 << bits) - 1)
    for k in range(per):
        vals = (longs >> np.uint64(k * bits)) & mask
        pos = np.arange(len(longs)) * per + k
        ok = pos < 4096
        idx[pos[ok]] = vals[ok].astype(np.int64)
    assert idx.max() < len(pal)
    return idx, names


def decode_states_props(bs):
    """Wie decode_states, gibt zusätzlich die Eigenschaften je Paletteneintrag zurück: (idx, namen, props)."""
    idx, names = decode_states(bs)
    props = [{str(k): str(v) for k, v in dict(p.get("Properties", {})).items()} for p in bs["palette"]]
    return idx, names, props


def chunk_columns(nbt):
    """Für jede Säule: Name und Höhe des obersten Nicht-Luft-Blocks."""
    top_name = np.full((16, 16), "", dtype=object)
    top_y = np.full((16, 16), -999, dtype=np.int32)
    secs = sorted(nbt["sections"], key=lambda s: int(s["Y"]))
    for sec in secs:
        if "block_states" not in sec:
            continue
        idx, names = decode_states(sec["block_states"])
        arr = np.array(names, dtype=object)[idx].reshape(16, 16, 16)
        for ly in range(16):
            layer = arr[ly]
            m = (layer != "air") & (layer != "cave_air")
            y = int(sec["Y"]) * 16 + ly
            top_name[m] = layer[m]
            top_y[m] = y
    return top_name, top_y


def render_map(world_dir: str, out_png: str, scale=1):
    files = [f for f in os.listdir(os.path.join(world_dir, "region")) if f.endswith(".mca")]
    chunks = {}
    for f in files:
        for nbt in read_region(os.path.join(world_dir, "region", f)):
            cx, cz = int(nbt["xPos"]), int(nbt["zPos"])
            chunks[(cx, cz)] = chunk_columns(nbt)
    xs = [k[0] for k in chunks]
    zs = [k[1] for k in chunks]
    cx0, cz0 = min(xs), min(zs)
    W = (max(xs) - cx0 + 1) * 16
    H = (max(zs) - cz0 + 1) * 16
    img = np.zeros((H, W, 3), dtype=np.float32)
    hgt = np.zeros((H, W), dtype=np.float32)
    unknown = {}
    for (cx, cz), (names, ys) in chunks.items():
        r, c = (cz - cz0) * 16, (cx - cx0) * 16
        for i in range(16):
            for j in range(16):
                n = names[i, j]
                col = COLORS.get(n)
                if col is None:
                    unknown[n] = unknown.get(n, 0) + 1
                    col = (200, 0, 200)
                img[r + i, c + j] = col
                hgt[r + i, c + j] = ys[i, j]
    # Schummerung
    gy, gx = np.gradient(hgt)
    shade = np.clip(1.0 + (-gx - gy) * 0.08, 0.6, 1.3)
    img = np.clip(img * shade[..., None], 0, 255).astype(np.uint8)
    im = Image.fromarray(img)
    if scale != 1:
        im = im.resize((W * scale, H * scale), Image.NEAREST)
    im.save(out_png)
    return len(chunks), unknown


if __name__ == "__main__":
    n, unk = render_map(sys.argv[1], sys.argv[2])
    print("chunks", n, "unbekannte Farben", sorted(unk.items(), key=lambda kv: -kv[1])[:20])
