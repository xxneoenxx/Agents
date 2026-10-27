"""Kleinkram aus den Karten: Straßenlaternen, Bänke, Zäune, Hecken, Mauern, Masten, Brücken und Schilder."""

from __future__ import annotations

import json
import math
from dataclasses import dataclass, field

import numpy as np
from rasterio.features import rasterize
from shapely.geometry import LineString, Point

from . import blocks as bk
from .geo import Grid
from .nbt import Byte, Int, List, TAG_STRING
from .roads import ASPHALT, DIRT, GRAVEL, LINE, NAMED_SIGN_CLASSES, PAVING, RAIL, RAILBED, SIDEWALK, Bridge


@dataclass
class Structures:
    """Gesammelte Blöcke außerhalb von Gelände/Gebäuden: Listen (x, y, z, id) und Block-Entities (Schilder)."""

    xs: list = field(default_factory=list)
    ys: list = field(default_factory=list)
    zs: list = field(default_factory=list)
    ids: list = field(default_factory=list)
    entities: list = field(default_factory=list)  # (x, y, z, nbt)

    def add(self, x, y, z, block):
        x, y, z, b = np.broadcast_arrays(np.atleast_1d(np.asarray(x, dtype=np.int32)), np.asarray(y, dtype=np.int32),
                                         np.asarray(z, dtype=np.int32), np.asarray(block, dtype=np.int32))
        self.xs.append(x.ravel().copy())
        self.ys.append(y.ravel().copy())
        self.zs.append(z.ravel().copy())
        self.ids.append(b.ravel().copy())

    def arrays(self):
        if not self.xs:
            e = np.zeros(0, np.int32)
            return e, e, e, e
        return (np.concatenate(self.xs), np.concatenate(self.ys), np.concatenate(self.zs), np.concatenate(self.ids))


def _top(grid: Grid, gy: np.ndarray, x, z):
    r, c = grid.rc_of_block(x, z)
    if 0 <= r < grid.height and 0 <= c < grid.width:
        return int(gy[r, c])
    return None


def _free(grid, mask_blocked, x, z, radius=6):
    """Nächster freier Block (kein Gebäude/Straße/Wasser) um (x, z)."""
    for rad in range(0, radius + 1):
        for dx in range(-rad, rad + 1):
            for dz in range(-rad, rad + 1):
                if max(abs(dx), abs(dz)) != rad:
                    continue
                r, c = grid.rc_of_block(x + dx, z + dz)
                if 0 <= r < grid.height and 0 <= c < grid.width and not mask_blocked[r, c]:
                    return x + dx, z + dz
    return None


def _line_cells(grid: Grid, geom):
    m = rasterize([(geom, 1)], grid.shape, transform=grid.transform, fill=0, dtype=np.uint8, all_touched=True)
    r, c = np.nonzero(m)
    return m.astype(bool), r, c


def connected(mask, r, c):
    """Nachbarn (n, e, s, w) im selben Linienmuster -> für Zäune/Mauern/Scheiben."""
    H, W = mask.shape
    def at(rr, cc):
        ok = (rr >= 0) & (rr < H) & (cc >= 0) & (cc < W)
        out = np.zeros(len(rr), bool)
        out[ok] = mask[rr[ok], cc[ok]]
        return out
    return at(r - 1, c), at(r, c + 1), at(r + 1, c), at(r, c - 1)


def add_infrastructure(st: Structures, grid: Grid, gy: np.ndarray, blocked: np.ndarray, infra) -> dict:
    counts = {}
    for f in infra:
        cls = f.get("class")
        g = f.geom
        if cls == "street_lamp" and g.geom_type == "Point":
            x, z = (int(math.floor(v)) for v in grid.block_of_utm(g.x, g.y))
            p = _free(grid, blocked, x, z, 2)
            if not p:
                continue
            t = _top(grid, gy, *p)
            if t is None:
                continue
            st.add(p[0], np.arange(t + 1, t + 5), p[1], bk.fence("dark_oak_fence"))
            st.add(p[0], t + 5, p[1], bk.LANTERN)
        elif cls == "bench" and g.geom_type == "Point":
            x, z = (int(math.floor(v)) for v in grid.block_of_utm(g.x, g.y))
            p = _free(grid, blocked, x, z, 2)
            t = _top(grid, gy, *p) if p else None
            if t is not None:
                st.add(p[0], t + 1, p[1], bk.stairs("spruce", "north"))
        elif cls in ("power_pole",) and g.geom_type == "Point":
            x, z = (int(math.floor(v)) for v in grid.block_of_utm(g.x, g.y))
            t = _top(grid, gy, x, z)
            r, c = grid.rc_of_block(x, z)
            if t is not None and not blocked[r, c]:
                st.add(x, np.arange(t + 1, t + 9), z, bk.fence("spruce_fence"))
        elif cls in ("fence", "hedge", "wall", "retaining_wall", "city_wall") and g.geom_type in ("LineString", "MultiLineString"):
            m, r, c = _line_cells(grid, g)
            keep = ~blocked[r, c]
            r, c = r[keep], c[keep]
            if not len(r):
                continue
            m[:] = False
            m[r, c] = True
            n, e, s, w = connected(m, r, c)
            x = c + grid.x0
            z = r + grid.z0
            t = gy[r, c]
            if cls == "fence":
                for i in range(len(r)):
                    st.add(x[i], t[i] + 1, z[i], bk.fence("oak_fence", bool(n[i]), bool(e[i]), bool(s[i]), bool(w[i])))
            elif cls == "hedge":
                st.add(x, t + 1, z, bk.OAK_LEAVES)
                st.add(x, t + 2, z, bk.OAK_LEAVES)
            else:
                lvl = lambda b: "low" if b else "none"
                for i in range(len(r)):
                    blk = bk.wall("stone_brick_wall", lvl(n[i]), lvl(e[i]), lvl(s[i]), lvl(w[i]), up=not ((n[i] and s[i] and not e[i] and not w[i]) or (e[i] and w[i] and not n[i] and not s[i])))
                    st.add(x[i], t[i] + 1, z[i], blk)
                    if cls == "city_wall":
                        st.add(x[i], t[i] + 2, z[i], blk)
        else:
            continue
        counts[cls] = counts.get(cls, 0) + 1
    return counts


# --- Brücken ------------------------------------------------------------------

DECK = {ASPHALT: "gray_concrete", LINE: "gray_concrete", PAVING: "stone_bricks", GRAVEL: "gravel", DIRT: "spruce_planks",
        SIDEWALK: "polished_andesite", RAIL: "gravel", RAILBED: "gravel"}


def add_bridges(st: Structures, grid: Grid, ground: np.ndarray, water_level: np.ndarray, water_mask: np.ndarray, bridges: list[Bridge]) -> int:
    n_built = 0
    for b in bridges:
        line = b.line
        if line.length < 2:
            continue
        a = line.interpolate(0)
        z_ = line.interpolate(line.length)
        ha = _sample(grid, ground, a.x, a.y)
        hb = _sample(grid, ground, z_.x, z_.y)
        if ha is None or hb is None:
            continue
        poly = line.buffer(b.width / 2 + 0.6, cap_style="flat")
        m = rasterize([(poly, 1)], grid.shape, transform=grid.transform, fill=0, dtype=np.uint8)
        r, c = np.nonzero(m)
        if not len(r):
            continue
        e, n = grid.utm_of_block(c + grid.x0, r + grid.z0)
        t = np.array([line.project(Point(ei, ni)) for ei, ni in zip(e, n)]) / line.length
        deck_m = ha + (hb - ha) * t
        over_water = water_mask[r, c]
        if over_water.any():
            deck_m = np.where(over_water, np.maximum(deck_m, water_level[r, c] + 2.5), deck_m)
            # gleichmäßig: über dem Wasser den Höchstwert nehmen und weich zu den Enden führen
            peak = float(deck_m[over_water].max())
            ramp = np.minimum(t, 1 - t) * line.length / 6.0
            deck_m = np.maximum(deck_m, np.minimum(peak, ha + (hb - ha) * t + ramp))
        deck = np.floor(deck_m + 0.5).astype(np.int32) - grid.y_offset
        x = c + grid.x0
        z = r + grid.z0
        dist = np.array([Point(ei, ni).distance(line) for ei, ni in zip(e, n)])
        edge = dist > b.width / 2 - 0.4
        surface = bk.B(DECK.get(b.material, "gray_concrete"))
        # Luft über der Fahrbahn (falls Gelände im Weg), Fahrbahn, Tragwerk
        for k in range(1, 5):
            st.add(x, deck + k, z, bk.AIR)
        st.add(x, deck - 1, z, bk.STONE_BRICKS)
        st.add(x[~edge], deck[~edge], z[~edge], surface)
        st.add(x[edge], deck[edge], z[edge], bk.STONE_BRICKS)
        rail_ns = bk.wall("stone_brick_wall", "low", "none", "low", "none", up=False)
        rail_ew = bk.wall("stone_brick_wall", "none", "low", "none", "low", up=False)
        horiz = abs(z_.x - a.x) >= abs(z_.y - a.y)
        st.add(x[edge], deck[edge] + 1, z[edge], rail_ew if horiz else rail_ns)
        if b.rail:
            mid = dist < 0.6
            st.add(x[mid], deck[mid] + 1, z[mid], bk.rail("east_west" if horiz else "north_south"))
        # Pfeiler alle ~15 m
        L = line.length
        for d in np.arange(8.0, L - 4.0, 15.0):
            p = line.interpolate(d)
            px, pz = (int(math.floor(v)) for v in grid.block_of_utm(p.x, p.y))
            rr, cc = grid.rc_of_block(px, pz)
            if not (0 <= rr < grid.height and 0 <= cc < grid.width):
                continue
            top = int(np.floor(ha + (hb - ha) * d / L + 0.5)) - grid.y_offset
            sel = (np.abs(x - px) <= 1) & (np.abs(z - pz) <= 1)
            if sel.any():
                top = int(deck[sel].min())
            g = int(np.floor(ground[rr, cc] + 0.5)) - grid.y_offset
            if water_mask[rr, cc]:
                g = int(np.floor(water_level[rr, cc])) - grid.y_offset - 3
            if top - 2 > g:
                for dx in (0, 1):
                    for dz in (0, 1):
                        st.add(px + dx, np.arange(g, top - 1), pz + dz, bk.STONE_BRICKS)
        n_built += 1
    return n_built


def _sample(grid, field, e, n):
    r, c = grid.rc_of_utm(e, n)
    r = int(np.clip(r, 0, grid.height - 1))
    c = int(np.clip(c, 0, grid.width - 1))
    return float(field[r, c])


# --- Schilder -------------------------------------------------------------------

def wrap(text: str, width=15, lines=4):
    words = text.split()
    out, cur = [], ""
    for w in words:
        if len(w) > width:
            w = w[: width - 1] + "."
        if not cur:
            cur = w
        elif len(cur) + 1 + len(w) <= width:
            cur += " " + w
        else:
            out.append(cur)
            cur = w
    if cur:
        out.append(cur)
    out = out[:lines]
    while len(out) < lines:
        out.append("")
    return out


def sign_entity(x, y, z, text_lines):
    msgs = List(TAG_STRING, [json.dumps({"text": t}, ensure_ascii=False) for t in text_lines])
    side = lambda: {"has_glowing_text": Byte(0), "color": "black", "messages": List(TAG_STRING, list(msgs.items))}
    return {"id": "minecraft:sign", "x": Int(int(x)), "y": Int(int(y)), "z": Int(int(z)), "keepPacked": Byte(0),
            "is_waxed": Byte(1), "front_text": side(), "back_text": side()}


def rotation_towards(dx, dz) -> int:
    """Schild-Drehung (0-15), damit die Vorderseite in Richtung (dx, dz) zeigt."""
    phi = math.degrees(math.atan2(-dx, dz)) % 360
    return int(round(phi / 22.5)) % 16


def add_sign(st: Structures, grid, gy, blocked, x, z, lines, face_dx=0.0, face_dz=1.0, radius=4):
    p = _free(grid, blocked, x, z, radius)
    if not p:
        return False
    t = _top(grid, gy, *p)
    if t is None:
        return False
    st.add(p[0], t + 1, p[1], bk.sign("spruce", rotation_towards(face_dx, face_dz)))
    st.entities.append((p[0], t + 1, p[1], sign_entity(p[0], t + 1, p[1], lines)))
    r, c = grid.rc_of_block(*p)
    blocked[r, c] = True
    return True


def add_street_signs(st, grid, gy, blocked, roads, every=140.0) -> int:
    n = 0
    seen = {}
    for rd in roads:
        if not rd.name or rd.cls not in NAMED_SIGN_CLASSES or rd.line.length < 25:
            continue
        L = rd.line.length
        d = 12.0
        while d < L - 5:
            p = rd.line.interpolate(d)
            q = rd.line.interpolate(min(L, d + 1.0))
            tx, ty = q.x - p.x, q.y - p.y
            norm = math.hypot(tx, ty) or 1.0
            nx, ny = ty / norm, -tx / norm  # rechts der Fahrtrichtung
            off = rd.width / 2 + 1.2
            sx, sy = p.x + nx * off, p.y + ny * off
            key = (rd.name, int(sx // 60), int(sy // 60))
            if key not in seen:
                bx, bz = (int(math.floor(v)) for v in grid.block_of_utm(sx, sy))
                # Vorderseite zur Straße hin (in Blockkoordinaten ist z = -Nord)
                if add_sign(st, grid, gy, blocked, bx, bz, wrap(rd.name), -nx, ny, radius=2):
                    n += 1
                    seen[key] = True
            d += every
    return n


def add_place_signs(st, grid, gy, blocked, places) -> int:
    n = 0
    for f in places:
        name = f.name
        if not name or f.geom.geom_type != "Point":
            continue
        conf = f.get("confidence") or 0
        if conf < 0.5:
            continue
        x, z = (int(math.floor(v)) for v in grid.block_of_utm(f.geom.x, f.geom.y))
        if add_sign(st, grid, gy, blocked, x, z, wrap(name), 0.0, 1.0, radius=6):
            n += 1
    return n
