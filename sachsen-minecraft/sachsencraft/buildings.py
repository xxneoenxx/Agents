"""Gebäude 1:1 aus Grundrissen: Wände, Fenster, Türen, Etagen, Leitern und Dächer (Sattel-, Walm-, Zelt-, Flach-, Pult-, Kuppeldach)."""

from __future__ import annotations

import hashlib
import math
from dataclasses import dataclass

import numpy as np
from affine import Affine
from rasterio.features import rasterize
from scipy import ndimage
from shapely.geometry import MultiPolygon, Polygon

from . import blocks as bk
from .geo import Grid

ROOF_MATS = {
    "brick": ("brick_stairs", "bricks", "brick_slab"),
    "deepslate_tile": ("deepslate_tile_stairs", "deepslate_tiles", "deepslate_tile_slab"),
    "mud_brick": ("mud_brick_stairs", "mud_bricks", "mud_brick_slab"),
    "nether_brick": ("nether_brick_stairs", "nether_bricks", "nether_brick_slab"),
    "spruce": ("spruce_stairs", "spruce_planks", "spruce_slab"),
    "stone_brick": ("stone_brick_stairs", "stone_bricks", "stone_brick_slab"),
    "copper": ("oxidized_cut_copper_stairs", "oxidized_cut_copper", "oxidized_cut_copper_slab"),
    "flat_gray": (None, "light_gray_concrete", "smooth_stone_slab"),
    "flat_dark": (None, "gray_concrete", "smooth_stone_slab"),
    "glass": (None, "glass", None),
}

HOUSE_WALLS = [("white_concrete", 3), ("white_terracotta", 3), ("smooth_sandstone", 2), ("calcite", 2), ("light_gray_concrete", 1), ("smooth_quartz", 1)]
HOUSE_ROOFS = [("brick", 6), ("deepslate_tile", 3), ("mud_brick", 2)]
INDUSTRIAL_WALLS = [("light_gray_concrete", 3), ("white_concrete", 2), ("bricks", 2), ("smooth_stone", 1), ("cyan_terracotta", 1)]
SHED_WALLS = [("spruce_planks", 3), ("dark_oak_planks", 1), ("bricks", 1), ("andesite", 1)]

SMALL_CLASSES = {"garage", "garages", "shed", "carport", "hut", "cabin", "allotment_house", "kiosk", "toilets", "roof", "bunker", "transformer_tower", "service", "hangar"}
HOUSE_CLASSES = {"house", "detached", "residential", "semidetached_house", "terrace", "farm", "bungalow", "dormitory", "static_caravan"}
BIG_CLASSES = {"industrial", "warehouse", "manufacture", "commercial", "retail", "supermarket", "agricultural", "barn", "farm_auxiliary", "cowshed", "stable", "sty", "greenhouse", "storage_tank", "silo", "riding_hall", "sports_hall", "sports_centre"}
CIVIC_CLASSES = {"school", "civic", "public", "office", "hospital", "kindergarten", "college", "university", "government", "townhall", "train_station", "fire_station", "hotel"}
CHURCH_CLASSES = {"church", "chapel", "cathedral", "religious", "monastery", "temple", "mosque", "synagogue", "shrine"}


def _hash(s: str) -> int:
    return int.from_bytes(hashlib.blake2b(s.encode(), digest_size=8).digest(), "big")


def _pick(options, h: int):
    total = sum(w for _, w in options)
    x = h % total
    for name, w in options:
        if x < w:
            return name
        x -= w
    return options[-1][0]


@dataclass
class Plan:
    eave: float  # Traufhöhe über dem Boden (m)
    roof_h: float  # Dachhöhe (m)
    shape: str  # gabled, hipped, pyramidal, flat, skillion, dome
    wall: str
    roof: str
    floors: int
    kind: str  # house, small, big, civic, church, castle, carport, greenhouse, roofonly
    slope: float
    min_height: float = 0.0


def plan(props: dict, poly: Polygon) -> Plan:
    cls = (props.get("class") or "").lower()
    sub = (props.get("subtype") or "").lower()
    name = ((props.get("names") or {}).get("primary") or "").lower()
    h = _hash(props.get("id") or str(poly.centroid))
    area = poly.area
    obb = poly.minimum_rotated_rectangle
    xs, ys = obb.exterior.coords.xy
    sides = sorted([math.dist((xs[0], ys[0]), (xs[1], ys[1])), math.dist((xs[1], ys[1]), (xs[2], ys[2]))])
    w_half = max(1.0, sides[0] / 2)

    total = props.get("height")
    floors = props.get("num_floors")
    roof_shape = (props.get("roof_shape") or "").lower()
    roof_h_given = props.get("roof_height")
    min_h = props.get("min_height") or 0.0

    # Art des Gebäudes
    if props.get("_castle") or "schloss" in name or "burg" in name or cls in ("castle", "fortress", "tower") or "turm" in name or "bergfried" in name or "wendelstein" in name:
        kind = "castle"
    elif cls in CHURCH_CLASSES or sub == "religious":
        kind = "church"
    elif cls == "carport":
        kind = "carport"
    elif cls == "roof":
        kind = "roofonly"
    elif cls == "greenhouse" or "gewächshaus" in name:
        kind = "greenhouse"
    elif cls in SMALL_CLASSES or sub == "outbuilding" or area < 25:
        kind = "small"
    elif cls in BIG_CLASSES or sub in ("industrial", "agricultural", "commercial") or area > 1000:
        kind = "big"
    elif cls in CIVIC_CLASSES or sub in ("civic", "education", "medical", "service", "entertainment", "transportation"):
        kind = "civic"
    elif cls == "apartments":
        kind = "apartments"
    else:
        kind = "house" if area < 600 else "civic"

    # Standardwerte je Art
    defaults = {
        "house": (5.6, 1.0, "gabled"), "apartments": (11.5, 0.9, "gabled"), "civic": (8.6, 0.8, "hipped"),
        "big": (7.0, 0.35, "gabled" if area < 1500 else "flat"), "small": (2.6, 0.5, "flat" if cls in ("garage", "garages") else "gabled"),
        "church": (9.0, 1.5, "gabled"), "castle": (12.0, 1.2, "hipped"), "carport": (2.6, 0.0, "flat"),
        "roofonly": (2.6, 0.6, "gabled"), "greenhouse": (2.8, 0.6, "gabled"),
    }
    eave, slope, default_shape = defaults[kind]

    shape_map = {"gabled": "gabled", "half_hipped": "hipped", "half-hipped": "hipped", "hipped": "hipped", "saltbox": "gabled",
                 "gambrel": "gabled", "mansard": "hipped", "pyramidal": "pyramidal", "flat": "flat", "skillion": "skillion",
                 "lean_to": "skillion", "onion": "dome", "dome": "dome", "round": "gabled", "cone": "pyramidal"}
    shape = shape_map.get(roof_shape)
    if shape is None:
        shape = default_shape
        if kind == "house" and h % 5 == 0:
            shape = "hipped"
        if kind == "apartments" and area > 450:
            shape = "flat"
    if kind in ("small",) and area < 12:
        shape = "flat"

    roof_h = 0.0 if shape == "flat" else min(w_half * slope, {"church": 14, "castle": 14}.get(kind, 9.0))
    if roof_h_given:
        roof_h = float(roof_h_given)
    if total:
        total = float(total) - float(min_h)
        if shape == "flat":
            eave = total
            roof_h = 0.0
        else:
            roof_h = min(roof_h, total * 0.5)
            eave = total - roof_h
    elif floors:
        eave = float(floors) * 3.0 + (0.4 if kind != "small" else 0)
    eave = max(2.2, eave)
    n_floors = int(floors) if floors else max(1, int(round(eave / 3.0)))

    if kind == "church":
        wall, roof = _pick([("calcite", 2), ("white_concrete", 1), ("stone_bricks", 1)], h), "deepslate_tile"
    elif kind == "castle":
        wall, roof = _pick([("calcite", 2), ("white_terracotta", 1)], h), ("copper" if shape == "dome" else "deepslate_tile")
    elif kind == "big":
        wall = _pick(INDUSTRIAL_WALLS, h)
        roof = "flat_gray" if shape == "flat" else _pick([("deepslate_tile", 2), ("brick", 1), ("flat_dark", 0)], h >> 8)
    elif kind in ("small",):
        wall = _pick(SHED_WALLS, h)
        roof = "flat_dark" if shape == "flat" else _pick([("spruce", 2), ("deepslate_tile", 1), ("brick", 1)], h >> 8)
    elif kind == "greenhouse":
        wall, roof = "glass", "glass"
    elif kind in ("carport", "roofonly"):
        wall, roof = "spruce_fence", ("flat_dark" if shape == "flat" else "spruce")
    else:
        wall = _pick(HOUSE_WALLS, h)
        roof = "flat_gray" if shape == "flat" else _pick(HOUSE_ROOFS, h >> 8)
    if shape == "dome":
        roof = "copper"
    return Plan(eave, roof_h, shape, wall, roof, n_floors, kind, slope, float(min_h))


def _largest(poly):
    if isinstance(poly, MultiPolygon):
        return max(poly.geoms, key=lambda g: g.area)
    return poly


def _roof_field(M: np.ndarray, e: np.ndarray, n: np.ndarray, poly: Polygon, p: Plan) -> np.ndarray:
    """Dachhöhe über der Traufe (Meter) für jede Zelle des Grundrisses."""
    if p.shape == "flat" or p.roof_h <= 0:
        return np.zeros(M.shape, dtype=np.float32)
    obb = poly.minimum_rotated_rectangle
    c = np.array(obb.exterior.coords[:4])
    v1 = c[1] - c[0]
    v2 = c[2] - c[1]
    if np.linalg.norm(v1) >= np.linalg.norm(v2):
        long_v, short_v = v1, v2
    else:
        long_v, short_v = v2, v1
    L = np.linalg.norm(long_v) / 2
    W = np.linalg.norm(short_v) / 2
    u = long_v / max(1e-9, np.linalg.norm(long_v))
    w = short_v / max(1e-9, np.linalg.norm(short_v))
    ctr = c.mean(axis=0)
    dx = e - ctr[0]
    dy = n - ctr[1]
    d_par = np.abs(dx * u[0] + dy * u[1])
    d_perp_signed = dx * w[0] + dy * w[1]
    d_perp = np.abs(d_perp_signed)
    rect = poly.area / max(1.0, obb.area)
    slope = p.roof_h / max(0.5, W)
    edt = ndimage.distance_transform_edt(M) - 0.5
    if p.shape == "gabled" and rect >= 0.8:
        R = (W - d_perp) * slope
    elif p.shape == "hipped" and rect >= 0.8:
        R = np.minimum(W - d_perp, L - d_par) * slope
    elif p.shape == "skillion":
        R = (d_perp_signed + W) * (p.roof_h / max(1.0, 2 * W))
    elif p.shape == "dome":
        t = np.clip(edt / max(0.5, edt.max()), 0, 1)
        R = p.roof_h * np.sqrt(1 - (1 - t) ** 2)
    else:  # pyramidal, oder unregelmäßige Grundrisse: Walmdach über den Randabstand
        R = edt * slope
    R = np.clip(R, 0, p.roof_h)
    return np.where(M, R, 0).astype(np.float32)


DIRS = {"north": (-1, 0), "south": (1, 0), "west": (0, -1), "east": (0, 1)}


def column_ranges(ri, ci, lo, hi):
    """Für jede Zelle (ri, ci) alle y von lo bis hi (einschließlich) -> flache Arrays."""
    lo = np.asarray(lo, dtype=np.int64)
    hi = np.asarray(hi, dtype=np.int64)
    n = np.maximum(hi - lo + 1, 0)
    total = int(n.sum())
    if total == 0:
        return np.zeros(0, int), np.zeros(0, int), np.zeros(0, int)
    starts = np.repeat(np.cumsum(n) - n, n)
    ys = np.repeat(lo, n) + (np.arange(total) - starts)
    return np.repeat(ri, n), np.repeat(ci, n), ys
OPP = {"north": "south", "south": "north", "west": "east", "east": "west"}


def voxelize(props: dict, geom, grid: Grid, ground: np.ndarray, road_mask: np.ndarray | None = None):
    """Gebäude in Blöcke umwandeln. Gibt (x, y, z, id) als Arrays und den Grundriss (Zeilen, Spalten) zurück."""
    poly = _largest(geom)
    if poly.is_empty or poly.area < 4:
        return None
    p = plan(props, poly)
    bid = props.get("id") or ""
    hsh = _hash(bid)

    minx, miny, maxx, maxy = poly.bounds
    bx0 = int(math.floor(minx - grid.e0))
    bx1 = int(math.ceil(maxx - grid.e0))
    bz0 = int(math.floor(grid.n0 - maxy))
    bz1 = int(math.ceil(grid.n0 - miny))
    H, W = bz1 - bz0, bx1 - bx0
    if H <= 0 or W <= 0:
        return None
    tr = Affine(1, 0, grid.e0 + bx0, 0, -1, grid.n0 - bz0)
    M = rasterize([(poly, 1)], (H, W), transform=tr, fill=0, dtype=np.uint8).astype(bool)
    # Nur innerhalb des Generierungsgebiets
    r0 = bz0 - grid.z0
    c0 = bx0 - grid.x0
    rr = np.arange(H)[:, None] + r0
    cc = np.arange(W)[None, :] + c0
    inside = (rr >= 0) & (rr < grid.height) & (cc >= 0) & (cc < grid.width)
    M &= inside
    if M.sum() < 4:
        return None
    # Ränder als Pad, damit Nachbarschaften einfach sind
    Mp = np.pad(M, 1)
    gr = np.clip(rr, 0, grid.height - 1)
    gc = np.clip(cc, 0, grid.width - 1)
    gfloat = ground[gr, gc]
    gy = np.floor(gfloat + 0.5).astype(np.int32) - grid.y_offset
    base_m = float(np.median(gfloat[M]))
    base = int(math.floor(base_m + 0.5)) - grid.y_offset + int(round(p.min_height))

    jj, ii = np.meshgrid(np.arange(W), np.arange(H))
    e = grid.e0 + bx0 + jj + 0.5
    n = grid.n0 - (bz0 + ii) - 0.5
    R = _roof_field(M, e, n, poly, p)
    Rint = np.floor(R + 1e-3).astype(np.int32)
    eave_b = max(2, int(round(p.eave)))
    eave_y = base + eave_b
    floors = max(1, min(p.floors, max(1, eave_b // 2)))

    # Kanten (Wandzellen) und Ecken
    out_n = ~Mp[:-2, 1:-1] & M
    out_s = ~Mp[2:, 1:-1] & M
    out_w = ~Mp[1:-1, :-2] & M
    out_e = ~Mp[1:-1, 2:] & M
    edge = out_n | out_s | out_w | out_e
    corner = ((out_n | out_s) & (out_w | out_e))

    xs, ys, zs, ids = [], [], [], []

    def put(mask_or_idx, y, block):
        if isinstance(mask_or_idx, tuple):
            ri, ci = mask_or_idx
        else:
            ri, ci = np.nonzero(mask_or_idx)
        if len(ri) == 0:
            return
        xs.append(bx0 + ci)
        zs.append(bz0 + ri)
        ys.append(np.broadcast_to(np.asarray(y, dtype=np.int32), ri.shape) if np.ndim(y) == 0 else np.asarray(y, dtype=np.int32))
        ids.append(np.broadcast_to(np.asarray(block, dtype=np.int32), ri.shape) if np.ndim(block) == 0 else np.asarray(block, dtype=np.int32))

    roof_stairs, roof_full, roof_slab = ROOF_MATS.get(p.roof, ROOF_MATS["brick"])
    wall_id = bk.B(p.wall) if p.kind not in ("carport", "roofonly") else bk.fence("spruce_fence", True, True, True, True)
    found_id = bk.STONE_BRICKS
    floor_id = bk.OAK_PLANKS if p.kind not in ("big", "small") else bk.B("smooth_stone")
    roof_full_id = bk.B(roof_full)

    interior = M & ~edge
    ii_all, jj_all = np.nonzero(M)
    top_y = eave_y + Rint  # höchster Block unter dem Dach

    # 1) Fundament und Luft im Innern (Hang abgraben)
    gcell = gy[ii_all, jj_all]
    ri, ci, ys_f = column_ranges(ii_all, jj_all, gcell + 1, np.full(len(ii_all), base))
    if len(ri):
        put((ri, ci), ys_f, np.where(edge[ri, ci], found_id, bk.STONE))
    ri, ci, ys_a = column_ranges(ii_all, jj_all, np.full(len(ii_all), base + 1), np.maximum(gcell, top_y[ii_all, jj_all]))
    if len(ri):
        put((ri, ci), ys_a, bk.AIR)

    # 2) Böden (Erdgeschoss und Etagen)
    slab_levels = sorted({base + int(round(k * eave_b / floors)) for k in range(floors + 1)})
    if p.kind in ("carport", "roofonly"):
        slab_levels = [base]
    for y in slab_levels:
        put(interior if y > base else M, y, floor_id if y > base or p.kind != "carport" else bk.B("gray_concrete"))

    # 3) Wände mit Fenstern
    if p.kind in ("carport", "roofonly"):
        posts = corner.copy()
        for y in range(base + 1, eave_y + 1):
            put(posts, y, wall_id)
    else:
        ei, ej = np.nonzero(edge)
        along_x = (out_n | out_s)[ei, ej]  # Wand verläuft in x-Richtung
        tcoord = np.where(along_x, bx0 + ej, bz0 + ei)
        is_corner = corner[ei, ej]
        period = 3 if p.kind in ("house", "apartments", "civic", "castle") else (2 if p.kind in ("church",) else 4)
        win_col = ((tcoord + (hsh % period)) % period == 1) & ~is_corner
        pane_ns = bk.pane("glass_pane", north=True, south=True)
        pane_ew = bk.pane("glass_pane", east=True, west=True)
        storeys = list(zip(slab_levels[:-1], slab_levels[1:])) or [(base, eave_y)]
        for y in range(base, eave_y + 1):
            blk = np.full(len(ei), wall_id, dtype=np.int32)
            if y == base:
                blk[:] = found_id if p.kind not in ("greenhouse",) else wall_id
            for lo, hi in storeys:
                rows = (lo + 1, lo + 2) if p.kind != "church" else tuple(range(lo + 2, max(lo + 3, hi - 1)))
                if y in rows and hi - lo >= 3 and p.kind not in ("small", "greenhouse"):
                    blk = np.where(win_col, np.where(along_x, pane_ew, pane_ns), blk)
            put((ei, ej), y, blk)
        # Giebelwände bis unter das Dach
        gable = edge & (Rint > 0)
        gi, gj = np.nonzero(gable)
        if len(gi):
            ri, ci, ys_g = column_ranges(gi, gj, np.full(len(gi), eave_y + 1), eave_y + Rint[gi, gj])
            if len(ri):
                put((ri, ci), ys_g, wall_id)
        # Giebelfenster
        if p.kind in ("house", "apartments", "civic") and len(gi):
            k = int(np.argmax(Rint[gi, gj]))
            if Rint[gi[k], gj[k]] >= 3:
                along = (out_n | out_s)[gi[k], gj[k]]
                put((np.array([gi[k]]), np.array([gj[k]])), eave_y + 2, pane_ew if along else pane_ns)

        # 4) Tür zur nächsten Straße und Leiter im Innern
        if p.kind not in ("greenhouse",) and edge.sum() > 4:
            cand = edge & ~corner
            ci_, cj_ = np.nonzero(cand)
            if len(ci_):
                score = np.zeros(len(ci_))
                if road_mask is not None:
                    for d, (di, dj) in DIRS.items():
                        outm = {"north": out_n, "south": out_s, "west": out_w, "east": out_e}[d][ci_, cj_]
                        for step in range(1, 12):
                            r_ = np.clip(ci_ + di * step + r0, 0, grid.height - 1)
                            c_ = np.clip(cj_ + dj * step + c0, 0, grid.width - 1)
                            hit = outm & road_mask[r_, c_] & (score == 0)
                            score[hit] = 100 - step
                k = int(np.argmax(score)) if score.max() > 0 else int(hsh % len(ci_))
                i, j = ci_[k], cj_[k]
                outdir = next(d for d, m in (("north", out_n), ("south", out_s), ("west", out_w), ("east", out_e)) if m[i, j])
                put((np.array([i]), np.array([j])), base + 1, bk.door("oak", OPP[outdir], "lower"))
                put((np.array([i]), np.array([j])), base + 2, bk.door("oak", OPP[outdir], "upper"))
                if floors > 1 and interior.any():
                    # Leiter an einer Innenwand gegenüber der Tür
                    li, lj = np.nonzero(interior)
                    far = np.argmax((li - i) ** 2 + (lj - j) ** 2)
                    li, lj = li[far], lj[far]
                    for d, (di, dj) in DIRS.items():
                        if 0 <= li + di < H and 0 <= lj + dj < W and edge[li + di, lj + dj]:
                            ys_l = np.arange(base + 1, eave_y + 1)
                            put((np.full(len(ys_l), li), np.full(len(ys_l), lj)), ys_l, bk.ladder(OPP[d]))
                            break

    # 5) Dach
    roof_y = eave_y + 1 + Rint
    if p.shape == "flat" or roof_stairs is None:
        put(M, roof_y[M], roof_full_id)
        if p.kind not in ("carport", "roofonly", "greenhouse", "small") and M.sum() > 150:
            put(edge, eave_y + 2, bk.B("smooth_stone_slab", type="bottom", waterlogged=False))  # Attika
    else:
        Rp = np.pad(Rint, 1, constant_values=-1)
        Rp[1:-1, 1:-1][~M] = -1
        neigh = {"north": Rp[:-2, 1:-1], "south": Rp[2:, 1:-1], "west": Rp[1:-1, :-2], "east": Rp[1:-1, 2:]}
        best_dir = np.full(M.shape, "", dtype=object)
        best_val = Rint.copy()
        for d, nv in neigh.items():
            better = nv > best_val
            best_dir[better] = d
            best_val = np.where(better, nv, best_val)
        stair_ids = {d: bk.stairs(roof_stairs.replace("_stairs", ""), d) for d in DIRS}
        rid = np.full(M.shape, roof_full_id, dtype=np.int32)
        for d in DIRS:
            rid[best_dir == d] = stair_ids[d]
        put(M, roof_y[M], rid[M])
        # Schornstein auf Wohnhäusern
        if p.kind in ("house", "apartments") and hsh % 10 < 6:
            ridge = M & (best_dir == "") & ~edge
            ri, rj = np.nonzero(ridge)
            if len(ri):
                k = hsh % len(ri)
                i, j = ri[k], rj[k]
                ys_c = np.arange(int(roof_y[i, j]) - 1, int(roof_y[i, j]) + 2)
                put((np.full(len(ys_c), i), np.full(len(ys_c), j)), ys_c, bk.B("bricks"))

    if not xs:
        return None
    X = np.concatenate(xs).astype(np.int32)
    Y = np.concatenate(ys).astype(np.int32)
    Z = np.concatenate(zs).astype(np.int32)
    I = np.concatenate(ids).astype(np.int32)
    fr, fc = np.nonzero(M)
    return (X, Y, Z, I), (fr + r0, fc + c0), base
