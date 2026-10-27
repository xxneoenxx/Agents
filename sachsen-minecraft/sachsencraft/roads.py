"""Straßen, Wege und Bahnstrecken: Belag, Breite, ebene Querprofile und Brücken."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from rasterio.features import rasterize
from scipy import ndimage
from scipy.spatial import cKDTree
from shapely.geometry import LineString, MultiLineString
from shapely.ops import substring

from .features import flag_ranges, rule_value
from .geo import Grid

# Belag-Klassen im Raster
NONE, ASPHALT, LINE, PAVING, GRAVEL, DIRT, SIDEWALK, RAILBED, RAIL, PLAZA = range(10)

WIDTH = {
    "motorway": 11.0, "trunk": 9.0, "primary": 8.0, "secondary": 7.0, "tertiary": 6.0,
    "unclassified": 5.0, "residential": 5.0, "living_street": 4.5, "service": 3.5, "pedestrian": 4.0,
    "track": 3.0, "footway": 2.0, "path": 1.5, "cycleway": 2.0, "steps": 2.0, "bridleway": 2.0, "unknown": 4.0,
}
SUBCLASS_WIDTH = {"driveway": 3.0, "parking_aisle": 5.0, "alley": 3.0, "sidewalk": 2.0, "crosswalk": 3.0}
# Zeichenreihenfolge: wichtigere Straßen später (gewinnen)
RANK = {"path": 1, "footway": 1, "cycleway": 1, "steps": 1, "bridleway": 1, "track": 2, "service": 3, "unknown": 3,
        "living_street": 4, "pedestrian": 4, "residential": 5, "unclassified": 5, "tertiary": 6, "secondary": 7,
        "primary": 8, "trunk": 9, "motorway": 10}
CENTER_LINE = {"motorway", "trunk", "primary", "secondary"}
NAMED_SIGN_CLASSES = {"primary", "secondary", "tertiary", "residential", "unclassified", "living_street", "pedestrian"}


@dataclass
class Bridge:
    line: LineString
    width: float
    material: int
    rail: bool
    rank: int


@dataclass
class RoadLine:
    line: LineString
    width: float
    material: int
    rank: int
    cls: str
    name: str | None
    rail: bool


def _material(cls: str, surface: str | None, subtype: str) -> int:
    if subtype == "rail":
        return RAIL
    s = (surface or "").lower()
    if s in ("paving_stones", "sett", "cobblestone", "unhewn_cobblestone", "bricks"):
        return PAVING
    if s in ("gravel", "fine_gravel", "compacted", "pebblestone"):
        return GRAVEL
    if s in ("dirt", "ground", "grass", "earth", "mud", "sand", "unpaved", "grass_paver", "wood"):
        return DIRT
    if cls in ("track", "path", "bridleway"):
        return DIRT if not s or s == "unknown" else (SIDEWALK if s == "paved" else DIRT)
    if cls in ("footway", "cycleway", "steps", "pedestrian"):
        return SIDEWALK
    return ASPHALT


def _parts(geom):
    if isinstance(geom, MultiLineString):
        return list(geom.geoms)
    return [geom]


def split_by_ranges(line: LineString, ranges):
    """Linie in (Teilstück, ist_markiert) zerlegen."""
    if not ranges:
        return [(line, False)]
    cuts = sorted({0.0, 1.0, *[max(0.0, min(1.0, a)) for a, b in ranges], *[max(0.0, min(1.0, b)) for a, b in ranges]})
    out = []
    for a, b in zip(cuts[:-1], cuts[1:]):
        if b - a < 1e-6:
            continue
        mid = (a + b) / 2
        flagged = any(lo <= mid <= hi for lo, hi in ranges)
        seg = substring(line, a, b, normalized=True)
        if seg.length > 0.3 and seg.geom_type == "LineString":
            out.append((seg, flagged))
    return out


def collect(segments) -> tuple[list[RoadLine], list[Bridge]]:
    roads, bridges = [], []
    for f in segments:
        subtype = f.get("subtype")
        if subtype not in ("road", "rail"):
            continue
        cls = f.get("class") or "unknown"
        sub = f.get("subclass")
        if subtype == "rail":
            rail_class = cls
            if rail_class in ("abandoned", "disused", "razed", "construction", "proposed"):
                continue
            width = 3.4
            material = RAIL if rail_class in ("standard_gauge", "narrow_gauge", "unknown", "funicular") else RAILBED
            rank = 6
        else:
            width = SUBCLASS_WIDTH.get(sub, WIDTH.get(cls, 4.0))
            wr = rule_value(f.get("width_rules"))
            if wr:
                try:
                    width = max(1.0, min(30.0, float(wr)))
                except (TypeError, ValueError):
                    pass
            material = _material(cls, rule_value(f.get("road_surface")), subtype)
            rank = RANK.get(cls, 3)
        flags = f.get("road_flags") or f.get("rail_flags")
        tunnels = flag_ranges(flags, "is_tunnel")
        bridges_r = flag_ranges(flags, "is_bridge")
        for part in _parts(f.geom):
            for seg, is_tunnel in split_by_ranges(part, tunnels):
                if is_tunnel:
                    continue
                # Brückenbereiche relativ zum Teilstück neu bestimmen
                for piece, is_bridge in split_by_ranges(seg, _relative(part, seg, bridges_r)):
                    if is_bridge:
                        bridges.append(Bridge(piece, width, material, subtype == "rail", rank))
                    else:
                        roads.append(RoadLine(piece, width, material, rank, cls, f.name, subtype == "rail"))
    return roads, bridges


def _relative(full: LineString, part: LineString, ranges):
    """Bereiche (Anteil an `full`) in Anteile an `part` umrechnen."""
    if not ranges:
        return []
    a = full.project(part.interpolate(0))
    b = full.project(part.interpolate(part.length))
    L = full.length
    if L <= 0 or b - a <= 0:
        return []
    out = []
    for lo, hi in ranges:
        s = (lo * L - a) / (b - a)
        e = (hi * L - a) / (b - a)
        if e > 0 and s < 1:
            out.append((max(0.0, s), min(1.0, e)))
    return out


def _samples(line: LineString, step=1.0):
    n = max(2, int(np.ceil(line.length / step)) + 1)
    d = np.linspace(0, line.length, n)
    return np.array([line.interpolate(x).coords[0] for x in d]), d


class RoadResult:
    def __init__(self, shape):
        self.material = np.zeros(shape, dtype=np.uint8)
        self.mask = np.zeros(shape, dtype=bool)
        self.rail_dir = np.zeros(shape, dtype=np.uint8)  # 1 = Nord-Süd, 2 = Ost-West


def build_roads(grid: Grid, ground: np.ndarray, roads: list[RoadLine], protect: np.ndarray | None = None) -> RoadResult:
    """Straßen rastern und das Gelände quer zur Fahrbahn eben machen (verändert `ground`)."""
    res = RoadResult(grid.shape)
    if not roads:
        return res
    roads = sorted(roads, key=lambda r: r.rank)
    shapes = []
    for r in roads:
        buf = r.line.buffer(r.width / 2, cap_style="round", join_style="round", quad_segs=4)
        shapes.append((buf, r.material if r.material != RAIL else RAILBED))
    res.material = rasterize(shapes, grid.shape, transform=grid.transform, fill=NONE, dtype=np.uint8)
    res.mask = res.material != NONE

    # Höhen entlang der Mittellinie glätten, dann jeder Straßenzelle die Höhe des nächsten Mittelpunkts geben
    pts_all, h_all, w_all, rank_all = [], [], [], []
    for r in roads:
        pts, _ = _samples(r.line)
        rr, cc = grid.rc_of_utm(pts[:, 0], pts[:, 1])
        inside = (rr >= 0) & (rr < grid.height) & (cc >= 0) & (cc < grid.width)
        h = np.empty(len(pts), dtype=np.float32)
        h[inside] = ground[rr[inside], cc[inside]]
        if (~inside).any():
            h[~inside] = h[inside].mean() if inside.any() else 0
        k = int(min(15, max(3, len(h) // 2 * 2 - 1)))
        if len(h) >= 3:
            h = ndimage.uniform_filter1d(h, size=k, mode="nearest")
        pts_all.append(pts)
        h_all.append(h)
        w_all.append(np.full(len(pts), r.width))
        rank_all.append(np.full(len(pts), r.rank))
    pts = np.vstack(pts_all)
    hh = np.concatenate(h_all)
    ww = np.concatenate(w_all)
    tree = cKDTree(pts)
    rr, cc = np.nonzero(res.mask)
    e, n = grid.utm_of_block(cc + grid.x0, rr + grid.z0)
    dist, j = tree.query(np.column_stack([e, n]), k=1)
    road_h = hh[j]
    if protect is not None:
        keep = ~protect[rr, cc]
        rr, cc, road_h, dist, j = rr[keep], cc[keep], road_h[keep], dist[keep], j[keep]
    ground[rr, cc] = road_h

    # Bankette: 3 m neben der Fahrbahn weich angleichen
    near = ndimage.binary_dilation(res.mask, iterations=3) & ~res.mask
    if near.any():
        target_idx = ndimage.distance_transform_edt(~res.mask, return_distances=True, return_indices=True)
        dists, idx = target_idx
        nr, nc = np.nonzero(near)
        tr, tc = idx[0][nr, nc], idx[1][nr, nc]
        t = np.clip(dists[nr, nc] / 4.0, 0, 1)
        ground[nr, nc] = ground[tr, tc] * (1 - t) + ground[nr, nc] * t

    # Mittellinien (gestrichelt) und Schienenrichtung
    line_shapes, rail_ns, rail_ew = [], [], []
    for r in roads:
        if r.cls in CENTER_LINE and r.material == ASPHALT and r.width >= 6:
            L = r.line.length
            d = 0.0
            while d < L:
                seg = substring(r.line, d, min(L, d + 3.0))
                if seg.length > 0.5:
                    line_shapes.append((seg.buffer(0.35, cap_style="flat"), LINE))
                d += 9.0
        if r.rail and r.material == RAIL:
            for a, b in zip(r.line.coords[:-1], r.line.coords[1:]):
                seg = LineString([a, b])
                (rail_ns if abs(b[1] - a[1]) >= abs(b[0] - a[0]) else rail_ew).append((seg.buffer(0.5, cap_style="flat"), 1))
    if line_shapes:
        lm = rasterize(line_shapes, grid.shape, transform=grid.transform, fill=0, dtype=np.uint8)
        res.material[(lm == LINE) & (res.material == ASPHALT)] = LINE
    if rail_ns:
        m = rasterize(rail_ns, grid.shape, transform=grid.transform, fill=0, dtype=np.uint8).astype(bool)
        res.rail_dir[m] = 1
    if rail_ew:
        m = rasterize(rail_ew, grid.shape, transform=grid.transform, fill=0, dtype=np.uint8).astype(bool)
        res.rail_dir[m & (res.rail_dir == 0)] = 2
    res.rail_dir[res.material != RAILBED] = 0
    return res
