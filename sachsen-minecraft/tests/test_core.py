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


class OverrideTest(unittest.TestCase):
    def _feat(self, geom, **props):
        from sachsencraft.features import Feature
        return Feature(geom, props)

    def test_castle_name_detection(self):
        from sachsencraft.buildings import CASTLE_RE
        for n in ("neues schloss", "der bergfried", "rochsburg", "pulverturm", "neue kemenate"):
            self.assertTrue(CASTLE_RE.search(n), n)
        for n in ("seniorenheim schlossblick", "burgstädter hof", "tischlerei hainich"):
            self.assertFalse(CASTLE_RE.search(n), n)

    def test_poi_rule_finds_building_and_applies(self):
        from shapely.geometry import Point, box
        from sachsencraft import overrides
        hall = self._feat(box(0, 0, 60, 40), id="abc12345-xxxx", names={"primary": "STM Montage GmbH"}, **{"class": "industrial"})
        other = self._feat(box(100, 0, 110, 10), id="zzz99999")
        poi = self._feat(Point(30, 20), names={"primary": "Niemeier Fahrzeugwerke GmbH"})
        rules = [{"finde": {"poi": "niemeier"}, "wand": "red_concrete", "dach": "flat_red", "dachform": "flat", "hoehe": 9}]
        n, warns = overrides.apply_rules(rules, [hall, other], [poi])
        self.assertEqual((n, warns), (1, []))
        self.assertEqual(hall.props["_wall"], "red_concrete")
        self.assertNotIn("_wall", other.props)
        n, warns = overrides.apply_rules([{"finde": {"poi": "gibt es nicht"}}], [hall], [poi])
        self.assertEqual(n, 0)
        self.assertEqual(len(warns), 1)

    def test_rules_are_validated(self):
        import json, os, tempfile
        from sachsencraft import overrides
        for bad in ({"finde": {"id": "a"}, "dachform": "kugel"}, {"finde": {"id": "a"}, "dach": "gold"}, {"finde": {"id": "a"}, "farbe": "rot"}, {"wand": "bricks"}):
            with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as fh:
                json.dump({"gebaeude": [bad]}, fh)
            with self.assertRaises(ValueError):
                overrides.load_rules(fh.name)
            os.unlink(fh.name)

    def test_plan_honours_overrides(self):
        from shapely.geometry import box
        from sachsencraft.buildings import plan
        poly = box(0, 0, 60, 40)
        base = plan({"id": "h1", "class": "industrial"}, poly)
        self.assertEqual(base.kind, "big")
        p = plan({"id": "h1", "class": "industrial", "_wall": "red_concrete", "_roof": "flat_red", "_shape": "flat", "_height": 9, "_corner": "keine"}, poly)
        self.assertEqual((p.wall, p.roof, p.shape, p.corner), ("red_concrete", "flat_red", "flat", None))
        self.assertAlmostEqual(p.eave, 9.0)
        with self.assertRaises(ValueError):
            plan({"id": "h1", "_roof": "gold"}, poly)

    def test_house_voxels(self):
        import numpy as np
        from shapely.geometry import box
        from sachsencraft import blocks as bk
        from sachsencraft.buildings import voxelize
        grid = Grid(1000, 2000, 0, 0, 64, 64, 100)
        ground = np.full(grid.shape, 150.0, dtype=np.float32)
        e, n = grid.utm_of_block(20, 20)
        poly = box(1020, 1980, 1030, 1988)  # 10 × 8 m
        r = voxelize({"id": "test-haus", "class": "house", "height": 8.0}, poly, grid, ground, None)
        self.assertIsNotNone(r)
        (X, Y, Z, I), (fr, fc), base = r
        names = {bk.name_of(int(i)) for i in set(I.tolist())}
        self.assertTrue(any(n.endswith("_door") for n in names), names)
        self.assertTrue(any(n.endswith("_stairs") for n in names), names)
        self.assertIn("minecraft:glass_pane", names)
        self.assertEqual(len(fr), 80)  # Grundriss 10 × 8 Blöcke
        top = int(Y.max())
        self.assertTrue(base + 4 <= top <= base + 12, (base, top))


if __name__ == "__main__":
    unittest.main()
