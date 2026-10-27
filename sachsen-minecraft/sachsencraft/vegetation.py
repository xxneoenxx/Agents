"""Bäume in echter Größe (Fichte, Kiefer, Buche, Eiche, Linde, Birke), Büsche, Gras, Blumen und Feldfrüchte."""

from __future__ import annotations

import numpy as np

from . import blocks as bk
from . import landcover as lc

# Baumraster: ein möglicher Baum pro 4×4 m, angenommen mit Wahrscheinlichkeit je Bodenbedeckung
TREE_CELL = 4
TREE_PROB = {
    lc.FOREST: 0.62, lc.SCRUB: 0.30, lc.PARK: 0.10, lc.CEMETERY: 0.12, lc.ORCHARD: 0.22, lc.GARDEN: 0.07,
    lc.RESIDENTIAL: 0.035, lc.ALLOTMENT: 0.05, lc.MEADOW: 0.004, lc.DEFAULT: 0.012, lc.WETLAND: 0.10,
    lc.FARMYARD: 0.02, lc.LAWN: 0.03, lc.INDUSTRIAL: 0.006, lc.PLAYGROUND: 0.05, lc.COMMERCIAL: 0.01,
    lc.PITCH: 0.0, lc.FARMLAND: 0.0, lc.PLAZA: 0.01, lc.PARKING: 0.01, lc.RAILWAY: 0.005, lc.BARREN: 0.02,
}
MAX_RADIUS = 6


def hash2(a, b, seed=0):
    """Schneller ganzzahliger Hash für Arrays (deterministisch)."""
    a = np.asarray(a, dtype=np.int64)
    b = np.asarray(b, dtype=np.int64)
    h = (a * 0x9E3779B1 + b * 0x85EBCA77 + seed * 0xC2B2AE3D) & 0xFFFFFFFF
    h ^= h >> 15
    h = (h * 0x2C1B3C6D) & 0xFFFFFFFF
    h ^= h >> 12
    h = (h * 0x297A2D39) & 0xFFFFFFFF
    h ^= h >> 15
    return h


def rand01(a, b, seed=0):
    return hash2(a, b, seed) / 4294967296.0


# --- Baumvorlagen -----------------------------------------------------------------

def _disk(r):
    k = int(np.ceil(r))
    dx, dz = np.meshgrid(np.arange(-k, k + 1), np.arange(-k, k + 1))
    m = dx * dx + dz * dz <= r * r + 0.3
    return dx[m], dz[m]


def _spruce(h, r0, seed):
    vox = []
    y0 = max(2, int(h * 0.28))
    for y in range(y0, h + 1):
        t = (h + 1 - y) / (h + 1 - y0)
        r = r0 * t + 0.6
        if (y - y0) % 2 == 1:
            r *= 0.72
        dx, dz = _disk(r)
        vox += [(x, y, z, bk.SPRUCE_LEAVES) for x, z in zip(dx, dz) if (x, z) != (0, 0)]
    vox += [(0, h + 1, 0, bk.SPRUCE_LEAVES), (0, h + 2, 0, bk.SPRUCE_LEAVES)]
    vox += [(0, y, 0, bk.SPRUCE_LOG) for y in range(1, h + 1)]
    return vox


def _pine(h, r0, seed):
    rng = np.random.default_rng(seed)
    vox = []
    yc = h - 2
    for dy in range(-2, 3):
        r = r0 * np.sqrt(max(0.0, 1 - (dy / 2.6) ** 2))
        dx, dz = _disk(r)
        keep = rng.random(len(dx)) > 0.12
        vox += [(x, yc + dy, z, bk.SPRUCE_LEAVES) for x, z, k in zip(dx, dz, keep) if k]
    vox += [(0, y, 0, bk.SPRUCE_LOG) for y in range(1, h)]
    return vox


def _broadleaf(h, r0, seed, leaves, log):
    rng = np.random.default_rng(seed)
    vox = []
    yc = int(h * 0.68)
    ry = max(2.5, r0 * 0.85)
    k = int(np.ceil(r0))
    kr = int(np.ceil(ry))
    for dy in range(-kr, kr + 1):
        for dx in range(-k, k + 1):
            for dz in range(-k, k + 1):
                d = (dx * dx + dz * dz) / (r0 * r0) + (dy * dy) / (ry * ry)
                if d <= 1.0 and not (d > 0.7 and rng.random() < 0.25):
                    vox.append((dx, yc + dy, dz, leaves))
    trunk_top = yc + 1
    vox += [(0, y, 0, log) for y in range(1, trunk_top)]
    # ein paar Äste
    for ang in rng.uniform(0, 2 * np.pi, 3):
        for s in range(1, int(r0 * 0.6) + 1):
            vox.append((int(round(np.cos(ang) * s)), yc - 1 + s // 2, int(round(np.sin(ang) * s)), log))
    return vox


def _birch(h, r0, seed):
    rng = np.random.default_rng(seed)
    vox = []
    yc = h - 3
    for dy in range(-4, 4):
        r = r0 * np.sqrt(max(0.0, 1 - (dy / 4.2) ** 2))
        dx, dz = _disk(r)
        keep = rng.random(len(dx)) > 0.15
        vox += [(x, yc + dy, z, bk.BIRCH_LEAVES) for x, z, kk in zip(dx, dz, keep) if kk]
    vox += [(0, y, 0, bk.BIRCH_LOG) for y in range(1, h - 1)]
    return vox


def _bush(r0, seed):
    rng = np.random.default_rng(seed)
    vox = []
    for dy in range(1, 3):
        dx, dz = _disk(r0 - (dy - 1) * 0.6)
        vox += [(x, dy, z, bk.OAK_LEAVES) for x, z in zip(dx, dz) if rng.random() > 0.2]
    return vox


def _arr(vox):
    a = np.array(vox, dtype=np.int32)
    return a


TEMPLATES: dict[str, list[np.ndarray]] = {
    "spruce": [_arr(_spruce(h, r, h * 7 + i)) for i, (h, r) in enumerate([(14, 2.6), (17, 3.0), (20, 3.2), (23, 3.6), (26, 3.8)])],
    "pine": [_arr(_pine(h, r, h * 5 + i)) for i, (h, r) in enumerate([(18, 3.0), (22, 3.4), (25, 3.6)])],
    "beech": [_arr(_broadleaf(h, r, h * 3 + i, bk.DARK_OAK_LEAVES, bk.OAK_LOG)) for i, (h, r) in enumerate([(16, 4.0), (20, 4.6), (24, 5.0)])],
    "oak": [_arr(_broadleaf(h, r, h * 11 + i, bk.OAK_LEAVES, bk.OAK_LOG)) for i, (h, r) in enumerate([(10, 3.6), (13, 4.4), (17, 5.2)])],
    "linden": [_arr(_broadleaf(h, r, h * 13 + i, bk.OAK_LEAVES, bk.DARK_OAK_LOG)) for i, (h, r) in enumerate([(14, 4.6), (18, 5.4)])],
    "birch": [_arr(_birch(h, r, h * 17 + i)) for i, (h, r) in enumerate([(11, 2.2), (14, 2.5), (17, 2.8)])],
    "fruit": [_arr(_broadleaf(h, r, h * 19 + i, bk.AZALEA_LEAVES, bk.OAK_LOG)) for i, (h, r) in enumerate([(6, 2.6), (7, 3.0)])],
    "bush": [_arr(_bush(r, i)) for i, r in enumerate([1.4, 1.9, 2.3])],
}

FOREST_MIX = [("spruce", 0.38), ("pine", 0.10), ("beech", 0.20), ("oak", 0.14), ("birch", 0.18)]
TOWN_MIX = [("linden", 0.25), ("oak", 0.25), ("birch", 0.2), ("spruce", 0.12), ("fruit", 0.18)]
ORCHARD_MIX = [("fruit", 0.85), ("oak", 0.15)]
SCRUB_MIX = [("bush", 0.7), ("birch", 0.15), ("oak", 0.15)]


def _choose(mix, u):
    acc = 0.0
    for name, w in mix:
        acc += w
        if u < acc:
            return name
    return mix[-1][0]


def species_for(cover: int, u: float) -> str:
    if cover == lc.FOREST:
        return _choose(FOREST_MIX, u)
    if cover == lc.ORCHARD:
        return _choose(ORCHARD_MIX, u)
    if cover in (lc.SCRUB, lc.WETLAND, lc.BARREN):
        return _choose(SCRUB_MIX, u)
    return _choose(TOWN_MIX, u)


def tree_candidates(x0, z0, x1, z1, cover_at, seed=1):
    """Baumstandorte (x, z, Art, Vorlagenindex) im Bereich [x0, x1) × [z0, z1)."""
    gx0 = (x0 - MAX_RADIUS) // TREE_CELL
    gx1 = (x1 + MAX_RADIUS) // TREE_CELL + 1
    gz0 = (z0 - MAX_RADIUS) // TREE_CELL
    gz1 = (z1 + MAX_RADIUS) // TREE_CELL + 1
    gx, gz = np.meshgrid(np.arange(gx0, gx1), np.arange(gz0, gz1))
    gx = gx.ravel()
    gz = gz.ravel()
    jx = hash2(gx, gz, seed) % TREE_CELL
    jz = hash2(gx, gz, seed + 1) % TREE_CELL
    x = gx * TREE_CELL + jx
    z = gz * TREE_CELL + jz
    cov = cover_at(x, z)
    prob = np.zeros(len(x))
    for c, p in TREE_PROB.items():
        prob[cov == c] = p
    u = rand01(gx, gz, seed + 2)
    keep = u < prob
    out = []
    u2 = rand01(gx, gz, seed + 3)
    u3 = hash2(gx, gz, seed + 4)
    for xi, zi, ci, a, b in zip(x[keep], z[keep], cov[keep], u2[keep], u3[keep]):
        sp = species_for(int(ci), float(a))
        out.append((int(xi), int(zi), sp, int(b) % len(TEMPLATES[sp])))
    return out
