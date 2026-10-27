"""Tests für Dateiformat und Geometrie (python -m unittest discover -s tests)."""

import io
import math
import unittest
import zlib

import numpy as np

from sachsencraft import anvil, blocks as bk
from sachsencraft.details import rotation_towards, wrap
from sachsencraft.geo import Grid
from sachsencraft.nbt import dumps
from sachsencraft.preview import decode_states


class FormatTest(unittest.TestCase):
    def test_pack_roundtrip(self):
        rng = np.random.default_rng(1)
        for n_pal in (2, 5, 16, 17, 40, 300):
            vals = rng.integers(0, n_pal, 4096)
            bits = max(4, math.ceil(math.log2(n_pal)))
            longs = anvil.pack_indices(vals, bits)
            self.assertEqual(len(longs), math.ceil(4096 / (64 // bits)))
            bs = {"palette": [{"Name": f"minecraft:b{i}"} for i in range(n_pal)], "data": [int(x) for x in longs]}
            idx, _ = decode_states(bs)
            np.testing.assert_array_equal(idx, vals)

    def test_chunk_nbt_parses(self):
        import nbtlib
        blk = np.zeros((16, 16, 16), dtype=np.uint16)
        blk[0] = bk.STONE
        blk[1, 3, 4] = bk.GRASS
        sec = anvil.section_nbt(0, blk, None, ["minecraft:plains"], None)
        root = anvil.chunk_nbt(2, -3, [sec])
        nbt = nbtlib.File.parse(io.BytesIO(dumps(root)))
        self.assertEqual(int(nbt["xPos"]), 2)
        self.assertEqual(str(nbt["Status"]), "minecraft:full")
        idx, names = decode_states(nbt["sections"][0]["block_states"])
        arr = np.array(names)[idx].reshape(16, 16, 16)
        self.assertEqual(arr[1, 3, 4], "grass_block")
        self.assertEqual(arr[0, 7, 7], "stone")
        self.assertEqual(arr[5, 0, 0], "air")


class GeoTest(unittest.TestCase):
    def test_grid(self):
        g = Grid.around(1000.4, 2000.2, 1100.0, 2100.0, e0=1000, n0=2100, y_offset=100)
        self.assertEqual(g.x0 % 16, 0)
        self.assertEqual(g.z0 % 16, 0)
        e, n = g.utm_of_block(0, 0)
        self.assertAlmostEqual(e, 1000.5)
        self.assertAlmostEqual(n, 2099.5)  # z wächst nach Süden

    def test_sign_rotation(self):
        self.assertEqual(rotation_towards(0, 1), 0)  # Süden
        self.assertEqual(rotation_towards(-1, 0), 4)  # Westen
        self.assertEqual(rotation_towards(0, -1), 8)  # Norden
        self.assertEqual(rotation_towards(1, 0), 12)  # Osten

    def test_wrap(self):
        self.assertEqual(wrap("Straße des Friedens"), ["Straße des", "Friedens", "", ""])


if __name__ == "__main__":
    unittest.main()
