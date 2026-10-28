"""3D-Vorschau: Ausschnitt der fertigen Welt (aus den Region-Dateien zurückgelesen) für tools/view.html exportieren.

    python -m sachsencraft.render3d "Lunzenau 1zu1" X0 Z0 X1 Z1 ausschnitt.json
"""

from __future__ import annotations

import json
import os
import sys

import numpy as np

from .preview import COLORS, decode_states_props, read_region

EXTRA = {"poppy": (200, 40, 40), "dandelion": (240, 220, 40), "cornflower": (70, 90, 200), "oxeye_daisy": (235, 235, 225),
         "azure_bluet": (220, 225, 230), "white_tulip": (235, 235, 230), "stone_brick_wall": (122, 121, 122), "spruce_sign": (114, 84, 48),
         "oak_fence": (162, 130, 78), "spruce_fence": (114, 84, 48), "dark_oak_fence": (66, 43, 20), "oak_door": (140, 110, 60),
         "ladder": (140, 110, 60), "deepslate": (80, 80, 82), "bedrock": (60, 60, 60), "smooth_stone_slab": (158, 158, 158),
         "dark_oak_log": (60, 46, 26), "brick_slab": (150, 97, 83), "spruce_slab": (114, 84, 48),
         "red_concrete": (142, 33, 33), "red_terracotta": (143, 61, 46), "stone_brick_slab": (122, 121, 122),
         "stone_brick_stairs": (122, 121, 122), "cracked_stone_bricks": (118, 117, 118), "mossy_stone_bricks": (115, 121, 105),
         "polished_andesite_slab": (132, 134, 133), "iron_bars": (140, 140, 140), "spruce_trapdoor": (103, 79, 47),
         "iron_trapdoor": (200, 200, 200), "deepslate_tile_slab": (54, 54, 55), "mud_brick_slab": (137, 103, 79),
         "oxidized_cut_copper_slab": (79, 153, 126), "light_gray_concrete_slab": (125, 125, 115), "smooth_sandstone_slab": (223, 214, 170),
         "white_concrete": (207, 213, 214), "gray_concrete": (54, 57, 61), "light_gray_terracotta": (135, 106, 97),
         "brown_terracotta": (77, 51, 35), "orange_terracotta": (161, 83, 37), "stripped_spruce_log": (115, 89, 52),
         "spruce_planks": (114, 84, 48), "spruce_stairs": (114, 84, 48), "dark_oak_planks": (66, 43, 20), "chiseled_stone_bricks": (119, 118, 119),
         "andesite_wall": (136, 136, 136), "birch_planks": (192, 175, 121), "deepslate_bricks": (70, 70, 71), "smooth_stone": (158, 158, 158),
         "red_nether_bricks": (69, 7, 9), "red_nether_brick_stairs": (69, 7, 9), "red_nether_brick_slab": (69, 7, 9),
         "red_sandstone": (186, 99, 29), "red_sandstone_stairs": (186, 99, 29), "red_sandstone_slab": (186, 99, 29),
         "blackstone": (42, 36, 41), "blackstone_stairs": (42, 36, 41), "blackstone_slab": (42, 36, 41),
         "green_concrete": (73, 91, 36), "cyan_terracotta": (86, 91, 91), "dark_oak_planks": (66, 43, 20), "polished_diorite": (192, 193, 194), "lightning_rod": (200, 120, 80)}
SKIP = {"air", "short_grass", "tall_grass", "fern", "stone", "deepslate", "bedrock", "coal_ore", "iron_ore", "copper_ore", "gold_ore",
        "redstone_ore", "lapis_ore", "diamond_ore", "deepslate_coal_ore", "deepslate_iron_ore", "deepslate_copper_ore",
        "deepslate_gold_ore", "deepslate_redstone_ore", "deepslate_lapis_ore", "deepslate_diamond_ore"}  # Untergrund weglassen
TRANSPARENT = ("glass_pane", "oak_leaves", "spruce_leaves", "birch_leaves", "dark_oak_leaves", "azalea_leaves", "water", "glass", "iron_bars")


def export(world_dir, x0, z0, x1, z1, out_json, ymin_section=2):
    entries: dict[tuple, int] = {}
    pal: list[dict] = []
    vox: dict[tuple, int] = {}
    for f in os.listdir(os.path.join(world_dir, "region")):
        for nbt in read_region(os.path.join(world_dir, "region", f)):
            cx, cz = int(nbt["xPos"]), int(nbt["zPos"])
            if cx * 16 + 15 < x0 or cx * 16 > x1 or cz * 16 + 15 < z0 or cz * 16 > z1:
                continue
            for sec in nbt["sections"]:
                if "block_states" not in sec:
                    continue
                sy = int(sec["Y"])
                if sy < ymin_section:
                    continue
                idx, names, props = decode_states_props(sec["block_states"])
                if len(names) == 1 and names[0] in ("stone", "deepslate", "air"):
                    continue
                skip = np.array([n in SKIP for n in names])
                keep = ~skip[idx]
                flat = np.nonzero(keep.reshape(-1))[0]
                local = {}
                for k, (n, p) in enumerate(zip(names, props)):
                    if n in SKIP:
                        continue
                    key = (n, tuple(sorted(p.items())))
                    if key not in entries:
                        entries[key] = len(pal)
                        pal.append({"name": n, "props": p, "color": list(COLORS.get(n) or EXTRA.get(n) or (200, 0, 200))})
                    local[k] = entries[key]
                for i in flat:
                    ly, lz, lx = i >> 8, (i >> 4) & 15, i & 15
                    x, y, z = cx * 16 + lx, sy * 16 + ly, cz * 16 + lz
                    if x0 <= x <= x1 and z0 <= z <= z1:
                        vox[(x, y, z)] = local[int(idx[i])]
    keys = set(vox)
    solid = {i for i, e in enumerate(pal) if e["name"] not in TRANSPARENT and not any(t in e["name"] for t in ("stairs", "slab", "fence", "wall", "door", "ladder", "rail", "sign", "lantern", "torch", "trapdoor", "pane", "bars", "lightning"))}
    out = []
    for (x, y, z), n in vox.items():
        if n in solid:
            nb = [(x + 1, y, z), (x - 1, y, z), (x, y + 1, z), (x, y - 1, z), (x, y, z + 1), (x, y, z - 1)]
            if all(k in keys and vox[k] in solid for k in nb):
                continue
        out.append((x - x0, y, z - z0, n))
    arr = np.array(out, dtype=np.int32)
    with open(out_json, "w") as fh:
        json.dump({"palette": pal, "vox": arr.ravel().tolist(), "size": [x1 - x0 + 1, z1 - z0 + 1]}, fh)
    return len(out)


if __name__ == "__main__":
    a = sys.argv
    print(export(a[1], int(a[2]), int(a[3]), int(a[4]), int(a[5]), a[6]))
