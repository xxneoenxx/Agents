"""Einen Chunk (16×16 Säulen) aus den Rastern und Strukturen zusammensetzen und als NBT kodieren."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from . import anvil
from . import blocks as bk
from . import landcover as lc
from . import roads as rd
from . import vegetation as veg
from .geo import Grid

BIOMES = ["minecraft:plains", "minecraft:forest", "minecraft:river", "minecraft:swamp", "minecraft:the_void"]
B_PLAINS, B_FOREST, B_RIVER, B_SWAMP, B_VOID = range(5)

ROAD_BLOCK = {
    rd.ASPHALT: bk.ASPHALT, rd.LINE: bk.ROAD_LINE, rd.PAVING: bk.PAVING, rd.GRAVEL: bk.GRAVEL,
    rd.DIRT: bk.DIRT_PATH, rd.SIDEWALK: bk.SIDEWALK, rd.RAILBED: bk.GRAVEL, rd.RAIL: bk.GRAVEL, rd.PLAZA: bk.PAVING,
}

# Erzadern pro Chunk: (Name, Anzahl, y_min, y_max, Größe)
ORE_VEINS = [("coal", 3.0, 0, 200, 7), ("iron", 3.0, -48, 120, 5), ("copper", 1.2, -16, 96, 6), ("gold", 0.6, -64, 32, 4),
             ("redstone", 1.0, -64, 16, 5), ("lapis", 0.5, -64, 48, 4), ("diamond", 0.35, -64, 0, 4)]


@dataclass
class World:
    """Alle Raster des Gebiets (werden an die Arbeitsprozesse vererbt)."""

    grid: Grid
    top: np.ndarray  # int16: oberster fester Geländeblock (Y)
    cover: np.ndarray  # uint8
    road: np.ndarray  # uint8 Belag
    rail_dir: np.ndarray  # uint8
    water: np.ndarray  # bool
    water_top: np.ndarray  # int16: oberster Wasserblock (Y)
    water_kind: np.ndarray  # uint8
    field_id: np.ndarray  # uint16: Feldnummer für Feldfrüchte
    blocked: np.ndarray  # bool: keine Pflanzen/Bäume (Gebäude, Straße, Wasser, Strukturen)
    rock: np.ndarray  # bool: Felsoberfläche
    # Strukturen sortiert nach Chunk
    sx: np.ndarray
    sy: np.ndarray
    sz: np.ndarray
    sid: np.ndarray
    s_index: dict  # (cx, cz) -> (start, end)
    entities: dict  # (cx, cz) -> [nbt]
    seed: int = 1
    allowed: set | None = None  # nur diese Chunks erzeugen (None = alle)


def _choice(h, options):
    """options: Liste (Block, Gewicht in Hundertsteln); h: Hashwerte 0..99."""
    out = np.full(h.shape, options[-1][0], dtype=np.int32)
    acc = 0
    assigned = np.zeros(h.shape, bool)
    for blk, w in options:
        acc += w
        sel = (h < acc) & ~assigned
        out[sel] = blk
        assigned |= sel
    return out


SURFACE = {
    lc.FOREST: [(bk.GRASS, 55), (bk.PODZOL, 25), (bk.COARSE_DIRT, 8), (bk.MOSS, 12)],
    lc.SCRUB: [(bk.GRASS, 80), (bk.COARSE_DIRT, 20)],
    lc.INDUSTRIAL: [(bk.GRAVEL, 45), (bk.ASPHALT, 35), (bk.ANDESITE, 20)],
    lc.COMMERCIAL: [(bk.ASPHALT, 65), (bk.POLISHED_ANDESITE, 35)],
    lc.QUARRY: [(bk.GRANITE, 50), (bk.ANDESITE, 30), (bk.GRAVEL, 20)],
    lc.ROCK: [(bk.STONE, 40), (bk.ANDESITE, 35), (bk.GRANITE, 25)],
    lc.PLAZA: [(bk.PAVING, 70), (bk.POLISHED_ANDESITE, 30)],
    lc.RAILWAY: [(bk.GRAVEL, 100)],
    lc.FARMYARD: [(bk.COARSE_DIRT, 40), (bk.DIRT, 20), (bk.GRAVEL, 20), (bk.GRASS, 20)],
    lc.WETLAND: [(bk.GRASS, 50), (bk.MUD, 30), (bk.MOSS, 20)],
    lc.SAND: [(bk.SAND, 100)],
    lc.PARKING: [(bk.ASPHALT, 100)],
    lc.CONSTRUCTION: [(bk.COARSE_DIRT, 50), (bk.DIRT, 30), (bk.GRAVEL, 20)],
    lc.LANDFILL: [(bk.COARSE_DIRT, 50), (bk.GRAVEL, 50)],
    lc.BARREN: [(bk.COARSE_DIRT, 50), (bk.GRASS, 30), (bk.GRAVEL, 20)],
    lc.GREENHOUSE: [(bk.COARSE_DIRT, 100)],
}

PLANTS = {
    lc.MEADOW: [(bk.SHORT_GRASS, 22), (-1, 3), (bk.FLOWERS[0], 1), (bk.FLOWERS[3], 1), (bk.FLOWERS[2], 1)],
    lc.DEFAULT: [(bk.SHORT_GRASS, 10), (bk.FLOWERS[0], 1)],
    lc.PARK: [(bk.SHORT_GRASS, 6), (bk.FLOWERS[1], 1), (bk.FLOWERS[3], 1)],
    lc.LAWN: [(bk.SHORT_GRASS, 3)],
    lc.GARDEN: [(bk.SHORT_GRASS, 6), (bk.FLOWERS[1], 2), (bk.FLOWERS[4], 1), (bk.FLOWERS[5], 1)],
    lc.RESIDENTIAL: [(bk.SHORT_GRASS, 6), (bk.FLOWERS[1], 1), (bk.FLOWERS[5], 1)],
    lc.CEMETERY: [(bk.SHORT_GRASS, 4), (bk.FLOWERS[1], 2)],
    lc.ALLOTMENT: [(bk.SHORT_GRASS, 8), (bk.FLOWERS[4], 2)],
    lc.FOREST: [(bk.FERN, 7), (bk.SHORT_GRASS, 5)],
    lc.SCRUB: [(bk.SHORT_GRASS, 15), (bk.FERN, 5)],
    lc.ORCHARD: [(bk.SHORT_GRASS, 15), (bk.FLOWERS[0], 2), (bk.FLOWERS[3], 1)],
    lc.WETLAND: [(bk.SHORT_GRASS, 20), (-1, 5)],
    lc.BARREN: [(bk.SHORT_GRASS, 8)],
}
GRASSY = {bk.GRASS, bk.PODZOL, bk.MOSS}


def _hash(x, z, salt):
    return veg.hash2(x, z, salt)


def build_chunk(W: World, cx: int, cz: int):
    """Gibt die NBT-Wurzel des Chunks zurück (oder None außerhalb des Gebiets)."""
    g = W.grid
    if W.allowed is not None and (cx, cz) not in W.allowed:
        return None
    r0 = cz * 16 - g.z0
    c0 = cx * 16 - g.x0
    if r0 < 0 or c0 < 0 or r0 + 16 > g.height or c0 + 16 > g.width:
        return None
    sl = (slice(r0, r0 + 16), slice(c0, c0 + 16))
    top = W.top[sl].astype(np.int32)
    cover = W.cover[sl]
    road = W.road[sl]
    wmask = W.water[sl]
    wtop = W.water_top[sl].astype(np.int32)
    wkind = W.water_kind[sl]
    rock = W.rock[sl]
    blocked = W.blocked[sl]
    fid = W.field_id[sl]
    xs = np.arange(16)[None, :] + cx * 16
    zs = np.arange(16)[:, None] + cz * 16
    X = np.broadcast_to(xs, (16, 16))
    Z = np.broadcast_to(zs, (16, 16))
    h100 = (_hash(X, Z, W.seed + 11) % 100).astype(np.int32)

    # --- Oberfläche ---
    surf = np.full((16, 16), bk.GRASS, dtype=np.int32)
    for c, opts in SURFACE.items():
        m = cover == c
        if m.any():
            surf[m] = _choice(h100[m], opts)
    # Felder: Feldfrucht je Feldnummer
    crop = np.zeros((16, 16), dtype=np.int32)
    fm = (cover == lc.FARMLAND) & (fid > 0)
    if fm.any():
        fh = veg.hash2(fid[fm].astype(np.int64), 7, W.seed) % 100
        age_h = veg.hash2(fid[fm].astype(np.int64), 9, W.seed) % 3
        row = ((X[fm] + Z[fm]) % 2 == 0)
        f_surf = np.full(fh.shape, bk.FARMLAND, dtype=np.int32)
        f_crop = np.zeros(fh.shape, dtype=np.int32)
        wheat_age = np.array([bk.WHEAT[7], bk.WHEAT[6], bk.WHEAT[5]])[age_h]
        f_crop[fh < 45] = wheat_age[fh < 45]
        f_crop[(fh >= 45) & (fh < 58)] = bk.POTATOES[7]
        f_crop[(fh >= 58) & (fh < 68)] = bk.CARROTS[7]
        f_crop[(fh >= 68) & (fh < 73)] = bk.BEETROOTS[3]
        fallow = (fh >= 73) & (fh < 88)
        f_surf[fallow] = np.where(row[fallow], bk.COARSE_DIRT, bk.DIRT)
        grassland = fh >= 88
        f_surf[grassland] = bk.GRASS
        f_crop[grassland] = np.where((h100[fm][grassland] < 25), bk.SHORT_GRASS, 0)
        surf[fm] = f_surf
        crop[fm] = f_crop
    elif (cover == lc.FARMLAND).any():
        surf[cover == lc.FARMLAND] = bk.GRASS
    # Felsen an steilen Hängen (nicht auf Straßen/Gebäuden)
    rk = rock & ~blocked & (road == rd.NONE)
    if rk.any():
        surf[rk] = _choice(h100[rk], [(bk.STONE, 45), (bk.ANDESITE, 35), (bk.GRANITE, 20)])
        crop[rk] = 0
    # Straßen
    rm = road != rd.NONE
    if rm.any():
        rb = np.vectorize(lambda v: ROAD_BLOCK.get(int(v), bk.ASPHALT))(road[rm])
        dirt_mix = (road[rm] == rd.DIRT) & (h100[rm] < 30)
        rb = np.where(dirt_mix, bk.COARSE_DIRT, rb)
        surf[rm] = rb
        crop[rm] = 0
    # Unterboden
    sub = np.full((16, 16), bk.DIRT, dtype=np.int32)
    sub[np.isin(surf, [bk.SAND])] = bk.SAND
    sub[np.isin(surf, [bk.STONE, bk.ANDESITE, bk.GRANITE])] = bk.STONE
    sub[rm] = bk.GRAVEL

    # Wasserbett
    if wmask.any():
        bed = _choice(h100[wmask], [(bk.GRAVEL, 45), (bk.SAND, 30), (bk.CLAY, 15), (bk.MUD, 10)])
        pool = wkind[wmask] == 2
        bed = np.where(pool, bk.B("white_concrete"), bed)
        surf[wmask] = bed
        crop[wmask] = 0

    # --- Höhenbereich ---
    ys_list = [top.min() - 5, top.max() + 2]
    if wmask.any():
        ys_list.append(int(wtop[wmask].max()) + 2)
    s0, s1 = W.s_index.get((cx, cz), (0, 0))
    if s1 > s0:
        ys_list += [int(W.sy[s0:s1].min()), int(W.sy[s0:s1].max())]
    trees = veg.tree_candidates(cx * 16, cz * 16, cx * 16 + 16, cz * 16 + 16, lambda x, z: _cover_at(W, x, z), W.seed)
    tvox = _tree_voxels(W, trees, cx, cz)
    if tvox is not None and len(tvox):
        ys_list.append(int(tvox[:, 1].max()))
    ymin = max(-63, int(min(ys_list)))
    ymax = min(318, int(max(ys_list)) + 1)
    n = ymax - ymin + 1
    arr = np.zeros((n, 16, 16), dtype=np.uint16)
    yy = np.arange(ymin, ymax + 1)[:, None, None]
    T = top[None]
    arr[(yy <= T)] = bk.STONE
    arr[(yy <= T) & (yy < 0)] = bk.DEEPSLATE
    sub3 = (yy > T - 4) & (yy < T)
    arr[sub3] = np.broadcast_to(sub[None], arr.shape)[sub3]
    is_top = yy == T
    arr[is_top] = np.broadcast_to(surf[None], arr.shape)[is_top]
    if wmask.any():
        wcol = (yy > T) & (yy <= wtop[None]) & wmask[None]
        arr[wcol] = bk.WATER
        # Seerosen auf stillen Teichen
        lily = wmask & (wkind == 3) & (h100 < 4)
        ly = wtop + 1 - ymin
        li, lj = np.nonzero(lily & (ly < n) & (ly >= 0))
        if len(li):
            arr[ly[li, lj], li, lj] = bk.LILY_PAD

    # Pflanzen und Feldfrüchte auf der Oberfläche
    above = top + 1 - ymin
    plant = crop.copy()
    free = ~blocked & ~wmask & (crop == 0) & np.isin(surf, list(GRASSY))
    h2 = (_hash(X, Z, W.seed + 23) % 100).astype(np.int32)
    tall = np.zeros((16, 16), bool)
    for c, opts in PLANTS.items():
        m = free & (cover == c)
        if m.any():
            choice = _choice(h2[m], opts + [(0, 100)])
            plant[m] = np.where(choice == -1, bk.TALL_GRASS_LOWER, choice)
            tall[m] = choice == -1
    pi, pj = np.nonzero(plant > 0)
    ok = above[pi, pj] < n - 1
    pi, pj = pi[ok], pj[ok]
    arr[above[pi, pj], pi, pj] = plant[pi, pj]
    ti, tj = np.nonzero(tall)
    ok = above[ti, tj] + 1 < n
    arr[above[ti, tj][ok] + 1, ti[ok], tj[ok]] = bk.TALL_GRASS_UPPER

    # Schienen
    rails = (W.rail_dir[sl] > 0) & (road == rd.RAILBED)
    if rails.any():
        ri, rj = np.nonzero(rails)
        ok = above[ri, rj] < n
        shapes = np.where(W.rail_dir[sl][ri, rj] == 1, bk.rail("north_south"), bk.rail("east_west"))
        arr[above[ri, rj][ok], ri[ok], rj[ok]] = shapes[ok]

    # Bäume (Blätter nur in Luft, Stämme überall außer in Gebäuden)
    if tvox is not None and len(tvox):
        lx, ty, lz, tid = tvox[:, 0], tvox[:, 1] - ymin, tvox[:, 2], tvox[:, 3]
        ok = (ty >= 0) & (ty < n)
        lx, ty, lz, tid = lx[ok], ty[ok], lz[ok], tid[ok]
        is_leaf = np.isin(tid, [bk.OAK_LEAVES, bk.SPRUCE_LEAVES, bk.BIRCH_LEAVES, bk.DARK_OAK_LEAVES, bk.AZALEA_LEAVES])
        cur = arr[ty, lz, lx]
        plantish = np.isin(cur, [0, bk.SHORT_GRASS, bk.FERN, bk.TALL_GRASS_LOWER, bk.TALL_GRASS_UPPER] + bk.FLOWERS)
        put = (is_leaf & plantish) | (~is_leaf & (plantish | np.isin(cur, [bk.OAK_LEAVES, bk.SPRUCE_LEAVES, bk.BIRCH_LEAVES, bk.DARK_OAK_LEAVES, bk.AZALEA_LEAVES])))
        arr[ty[put], lz[put], lx[put]] = tid[put]

    # Strukturen (Gebäude, Brücken, Laternen, Schilder ...) in Reihenfolge
    if s1 > s0:
        sx = W.sx[s0:s1] - cx * 16
        sz = W.sz[s0:s1] - cz * 16
        sy = W.sy[s0:s1] - ymin
        sid = W.sid[s0:s1]
        ok = (sy >= 0) & (sy < n)
        arr[sy[ok], sz[ok], sx[ok]] = sid[ok]

    # --- Biome (4×4 Säulen) ---
    bio = np.full((16, 16), B_PLAINS, dtype=np.int32)
    bio[cover == lc.FOREST] = B_FOREST
    bio[cover == lc.WETLAND] = B_SWAMP
    bio[wmask & (wkind == 1)] = B_RIVER  # Fluss/Bach (Teiche behalten das Umgebungsbiom)
    b4 = np.zeros((4, 4), dtype=np.int32)
    for i in range(4):
        for j in range(4):
            vals, cnt = np.unique(bio[i * 4:i * 4 + 4, j * 4:j * 4 + 4], return_counts=True)
            b4[i, j] = vals[np.argmax(cnt)]
    biome_idx = np.broadcast_to(b4[None], (4, 4, 4)).copy()
    uniq_b = np.unique(b4)
    biome_names = [BIOMES[i] for i in uniq_b]
    remap = {int(b): k for k, b in enumerate(uniq_b)}
    biome_local = np.vectorize(remap.get)(biome_idx) if len(uniq_b) > 1 else None

    # --- Abschnitte ---
    rng = np.random.default_rng([cx & 0xFFFFFFFF, cz & 0xFFFFFFFF, W.seed])
    ores = _ore_voxels(rng, int(top.min()) - 6)
    sections = []
    for sy_ in range(anvil.MIN_SECTION, anvil.MAX_SECTION + 1):
        y_lo = sy_ * 16
        y_hi = y_lo + 15
        if y_lo > ymax:
            break
        sec_ores = ores.get(sy_)
        if y_hi < ymin and sy_ != anvil.MIN_SECTION and sec_ores is None:
            uniform = bk.DEEPSLATE if y_lo < 0 else bk.STONE
            sections.append(anvil.section_nbt(sy_, None, uniform, [biome_names[0]] if biome_local is None else biome_names, biome_local))
            continue
        blk = np.zeros((16, 16, 16), dtype=np.uint16)
        yv = np.arange(y_lo, y_hi + 1)
        below = yv < ymin
        blk[below] = np.where(yv[below] < 0, bk.DEEPSLATE, bk.STONE)[:, None, None]
        inside = (yv >= ymin) & (yv <= ymax)
        if inside.any():
            blk[inside] = arr[yv[inside] - ymin]
        if sy_ == anvil.MIN_SECTION:
            blk[0] = bk.BEDROCK
            bed_rand = rng.random((4, 16, 16))
            for k in range(1, 5):
                blk[k][bed_rand[k - 1] < (5 - k) / 5.0] = bk.BEDROCK
        if sec_ores is not None:
            oy, oz, ox, oname = sec_ores
            target = blk[oy, oz, ox]
            okm = (target == bk.STONE) | (target == bk.DEEPSLATE)
            if okm.any():
                ore_ids = np.array([(bk.ORES_DEEP if t == bk.DEEPSLATE else bk.ORES_STONE)[nm] for t, nm in zip(target[okm], oname[okm])], dtype=np.uint16)
                blk[oy[okm], oz[okm], ox[okm]] = ore_ids
        if not blk.any():
            continue
        sections.append(anvil.section_nbt(sy_, blk, None, biome_names, biome_local))
    ents = W.entities.get((cx, cz), [])
    return anvil.chunk_nbt(cx, cz, sections, ents)


def _cover_at(W: World, x, z):
    g = W.grid
    r = np.asarray(z) - g.z0
    c = np.asarray(x) - g.x0
    ok = (r >= 0) & (r < g.height) & (c >= 0) & (c < g.width)
    out = np.full(np.shape(x), 255, dtype=np.int32)
    out[ok] = W.cover[r[ok], c[ok]]
    bl = np.zeros(np.shape(x), bool)
    bl[ok] = W.blocked[r[ok], c[ok]] | W.rock[r[ok], c[ok]]
    out[bl] = 255
    return out


def _tree_voxels(W: World, trees, cx, cz):
    g = W.grid
    parts = []
    for x, z, sp, ti in trees:
        r, c = z - g.z0, x - g.x0
        if not (0 <= r < g.height and 0 <= c < g.width):
            continue
        base = int(W.top[r, c])
        t = veg.TEMPLATES[sp][ti]
        lx = t[:, 0] + x - cx * 16
        lz = t[:, 2] + z - cz * 16
        m = (lx >= 0) & (lx < 16) & (lz >= 0) & (lz < 16)
        if not m.any():
            continue
        parts.append(np.column_stack([lx[m], t[m, 1] + base, lz[m], t[m, 3]]))
    if not parts:
        return None
    return np.vstack(parts)


def _ore_voxels(rng, max_y):
    """Erzadern als {Abschnitt: (y, z, x, Erzname)} – nur unterhalb von max_y."""
    out = {}
    for name, count, y_min, y_max, size in ORE_VEINS:
        n = rng.poisson(count)
        hi = min(y_max, max_y)
        if hi <= y_min:
            continue
        for _ in range(n):
            x, y, z = rng.integers(0, 16), rng.integers(y_min, hi), rng.integers(0, 16)
            for _ in range(rng.integers(max(2, size - 2), size + 2)):
                sec = y >> 4
                ent = out.setdefault(sec, ([], [], [], []))
                ent[0].append(y & 15)
                ent[1].append(z)
                ent[2].append(x)
                ent[3].append(name)
                x = int(np.clip(x + rng.integers(-1, 2), 0, 15))
                y = int(y + rng.integers(-1, 2))
                z = int(np.clip(z + rng.integers(-1, 2), 0, 15))
                if y >= max_y or y < -63:
                    break
    return {k: (np.array(v[0]), np.array(v[1]), np.array(v[2]), np.array(v[3])) for k, v in out.items()}
