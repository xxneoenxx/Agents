"""Gewässer: Flüsse, Bäche, Teiche mit ebenem Wasserspiegel und Ufern, die das Wasser halten."""

from __future__ import annotations

import numpy as np
from rasterio.features import rasterize
from scipy import ndimage
from scipy.spatial import cKDTree
from shapely.geometry import LineString

from .geo import Grid

# Wassertiefe in Blöcken und Breite (m) für Linien ohne Fläche
DEPTH = {"river": 3, "canal": 2, "reservoir": 3, "lake": 3, "pond": 2, "water": 2, "basin": 2, "swimming_pool": 2,
         "wastewater": 2, "fish_pass": 1, "stream": 1, "ditch": 1, "drain": 1, "spring": 1}
LINE_WIDTH = {"river": 12.0, "canal": 4.0, "stream": 2.0, "ditch": 1.2, "drain": 1.2, "fish_pass": 1.5}

KIND_NONE, KIND_NATURAL, KIND_POOL, KIND_POND = 0, 1, 2, 3


class WaterResult:
    def __init__(self, shape):
        self.mask = np.zeros(shape, dtype=bool)
        self.level = np.zeros(shape, dtype=np.float32)  # Wasserspiegel (m NHN)
        self.depth = np.zeros(shape, dtype=np.uint8)  # Tiefe in Blöcken
        self.kind = np.zeros(shape, dtype=np.uint8)


def _line_samples(line: LineString, step=1.0):
    n = max(2, int(line.length / step) + 1)
    d = np.linspace(0, line.length, n)
    pts = np.array([line.interpolate(x).coords[0] for x in d])
    return pts


def _bilinear(grid: Grid, field: np.ndarray, pts: np.ndarray) -> np.ndarray:
    r, c = grid.rc_of_utm(pts[:, 0], pts[:, 1])
    r = np.clip(r, 0, field.shape[0] - 1)
    c = np.clip(c, 0, field.shape[1] - 1)
    return field[r, c]


def build_water(grid: Grid, ground: np.ndarray, water_features) -> WaterResult:
    """Wasserflächen rastern, Pegel bestimmen und Bett/Ufer in `ground` (wird verändert) einarbeiten."""
    res = WaterResult(grid.shape)
    polys, lines = [], []
    for f in water_features:
        cls = f.get("class") or f.get("subtype")
        if f.get("is_intermittent") and cls in ("stream", "ditch", "drain"):
            continue
        g = f.geom
        if g.geom_type in ("Polygon", "MultiPolygon"):
            polys.append((g, cls, f.get("subtype")))
        elif g.geom_type in ("LineString", "MultiLineString"):
            lines.append((g, cls))

    # 1) Flächen (Fluss, Teich, Becken) ---------------------------------------
    if polys:
        ids = rasterize([(g, i + 1) for i, (g, _, _) in enumerate(polys)], grid.shape, transform=grid.transform, fill=0, dtype=np.int32)
        m = ids > 0
        # Pegel: tiefster Punkt der Umgebung, dann glätten (normierte Faltung nur über Wasser)
        low = ndimage.minimum_filter(np.where(m, ground, np.inf).astype(np.float32), size=21)
        low = np.where(np.isfinite(low), low, ground)
        w = m.astype(np.float32)
        num = ndimage.gaussian_filter(np.where(m, low, 0.0).astype(np.float32), 12)
        den = ndimage.gaussian_filter(w, 12)
        smooth = np.where(den > 1e-3, num / np.maximum(den, 1e-3), low)
        res.mask |= m
        res.level[m] = np.minimum(smooth[m], low[m] + 0.5)
        depth_of = np.zeros(len(polys) + 1, dtype=np.uint8)
        kind_of = np.zeros(len(polys) + 1, dtype=np.uint8)
        for i, (_, cls, sub) in enumerate(polys):
            depth_of[i + 1] = DEPTH.get(cls, DEPTH.get(sub, 2))
            if cls in ("swimming_pool",) or sub == "human_made":
                kind_of[i + 1] = KIND_POOL
            elif cls in ("pond", "basin", "reservoir", "water", "lake") and polys[i][0].area < 20000:
                kind_of[i + 1] = KIND_POND
            else:
                kind_of[i + 1] = KIND_NATURAL
        res.depth[m] = depth_of[ids[m]]
        res.kind[m] = kind_of[ids[m]]
        # Kleine Becken (Pools, Teiche): ein einziger Pegel je Fläche
        for i, (g, cls, sub) in enumerate(polys):
            if cls in ("river", "canal") or g.area > 20000:
                continue
            sel = ids == (i + 1)
            if sel.any():
                res.level[sel] = float(np.percentile(ground[sel], 15)) - (0.3 if kind_of[i + 1] == KIND_POOL else 0.6)

    # 2) Linien (Bäche, Gräben) mit Gefälle in Fließrichtung --------------------
    samples, levels, widths, depths = [], [], [], []
    for g, cls in lines:
        width = LINE_WIDTH.get(cls, 1.5)
        parts = g.geoms if g.geom_type == "MultiLineString" else [g]
        for part in parts:
            if part.length < 2:
                continue
            pts = _line_samples(part)
            h = _bilinear(grid, ground, pts) - 0.6
            h = np.minimum.accumulate(h)  # Wasser fließt nur bergab
            samples.append(pts)
            levels.append(h)
            widths.append(np.full(len(pts), width))
            depths.append(np.full(len(pts), DEPTH.get(cls, 1)))
    if samples:
        pts = np.vstack(samples)
        lev = np.concatenate(levels)
        wid = np.concatenate(widths)
        dep = np.concatenate(depths)
        geoms = []
        for g, cls in lines:
            geoms.append((g.buffer(LINE_WIDTH.get(cls, 1.5) / 2, cap_style="flat"), 1))
        lm = rasterize(geoms, grid.shape, transform=grid.transform, fill=0, dtype=np.uint8).astype(bool) & ~res.mask
        rr, cc = np.nonzero(lm)
        e, n = grid.utm_of_block(cc + grid.x0, rr + grid.z0)
        tree = cKDTree(pts)
        dist, j = tree.query(np.column_stack([e, n]), k=1)
        ok = dist <= wid[j] / 2 + 0.75
        rr, cc, j = rr[ok], cc[ok], j[ok]
        res.mask[rr, cc] = True
        res.level[rr, cc] = lev[j]
        res.depth[rr, cc] = dep[j]
        res.kind[rr, cc] = KIND_NATURAL

    # 3) Bett eingraben und Ufer so anheben, dass das Wasser gehalten wird ------
    m = res.mask
    if m.any():
        lvl = np.floor(res.level).astype(np.float32)
        res.level = np.where(m, lvl, 0).astype(np.float32)
        ground[m] = np.minimum(ground[m], lvl[m] - res.depth[m])
        # Ufer: Pegel der nächsten Wasserzelle; Gelände mindestens so hoch
        idx = ndimage.distance_transform_edt(~m, return_distances=False, return_indices=True)
        near_level = res.level[idx[0], idx[1]]
        bank = ndimage.binary_dilation(m, iterations=2) & ~m
        need = bank & (ground < near_level + 0.5)
        ground[need] = near_level[need] + 0.5
    return res
