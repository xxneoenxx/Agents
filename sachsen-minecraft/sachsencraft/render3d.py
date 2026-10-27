"""3D-Vorschau: Ausschnitt der fertigen Welt als sichtbare Blöcke (für eine Web-Ansicht mit three.js) exportieren."""

from __future__ import annotations

import json
import os
import sys

import numpy as np

from .preview import COLORS, decode_states, read_region

EXTRA = {"poppy": (200, 40, 40), "dandelion": (240, 220, 40), "cornflower": (70, 90, 200), "oxeye_daisy": (235, 235, 225),
         "azure_bluet": (220, 225, 230), "white_tulip": (235, 235, 230), "stone_brick_wall": (122, 121, 122), "spruce_sign": (114, 84, 48),
         "oak_fence": (162, 130, 78), "spruce_fence": (114, 84, 48), "dark_oak_fence": (66, 43, 20), "oak_door": (140, 110, 60),
         "ladder": (140, 110, 60), "deepslate": (80, 80, 82), "bedrock": (60, 60, 60), "smooth_stone_slab": (158, 158, 158),
         "dark_oak_log": (60, 46, 26), "brick_slab": (150, 97, 83), "spruce_slab": (114, 84, 48)}
SKIP = {"air", "short_grass", "tall_grass", "fern"}


def export(world_dir, x0, z0, x1, z1, out_json):
    pal = {}
    cols = []
    vox = {}
    for f in os.listdir(os.path.join(world_dir, "region")):
        for nbt in read_region(os.path.join(world_dir, "region", f)):
            cx, cz = int(nbt["xPos"]), int(nbt["zPos"])
            if cx * 16 + 15 < x0 or cx * 16 > x1 or cz * 16 + 15 < z0 or cz * 16 > z1:
                continue
            for sec in nbt["sections"]:
                if "block_states" not in sec:
                    continue
                sy = int(sec["Y"])
                if sy < 2:
                    continue
                idx, names = decode_states(sec["block_states"])
                if len(names) == 1 and names[0] in ("stone", "deepslate", "air"):
                    continue
                arr = np.array(names, dtype=object)[idx].reshape(16, 16, 16)
                for ly, lz, lx in zip(*np.nonzero(~np.isin(arr, list(SKIP)))):
                    x, y, z = cx * 16 + lx, sy * 16 + ly, cz * 16 + lz
                    if x0 <= x <= x1 and z0 <= z <= z1:
                        vox[(x, y, z)] = arr[ly, lz, lx]
    keys = set(vox)
    out = []
    for (x, y, z), n in vox.items():
        nb = [(x + 1, y, z), (x - 1, y, z), (x, y + 1, z), (x, y - 1, z), (x, y, z + 1), (x, y, z - 1)]
        if all(k in keys and vox[k] not in ("glass_pane", "oak_leaves", "spruce_leaves", "birch_leaves", "dark_oak_leaves", "azalea_leaves", "water") for k in nb):
            continue
        if n not in pal:
            pal[n] = len(cols)
            cols.append(COLORS.get(n) or EXTRA.get(n) or (200, 0, 200))
        out.append((x - x0, y, z - z0, pal[n]))
    arr = np.array(out, dtype=np.int32)
    with open(out_json, "w") as fh:
        json.dump({"colors": cols, "names": list(pal), "vox": arr.ravel().tolist(), "size": [x1 - x0 + 1, z1 - z0 + 1]}, fh)
    return len(out)


if __name__ == "__main__":
    a = sys.argv
    print(export(a[1], int(a[2]), int(a[3]), int(a[4]), int(a[5]), a[6]))
