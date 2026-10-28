"""Hauptprogramm: echte Geodaten -> Minecraft-Java-Welt im Maßstab 1:1.

Beispiel:
    python -m sachsencraft.generate --data daten/lunzenau --out "Lunzenau 1zu1" --gebiet Lunzenau
"""

from __future__ import annotations

import argparse
import glob
import json
import math
import multiprocessing as mp
import os
import shutil
import sys
import time

import numpy as np
from rasterio.features import rasterize
from scipy import ndimage
from shapely.geometry import box
from shapely.ops import unary_union

from . import blocks as bk
from . import buildings as bld
from . import chunkgen
from . import details as dt
from . import landcover as lc
from . import overrides
from . import roads as rd
from . import terrain, water
from .anvil import RegionWriter
from .features import load
from .geo import Grid, lonlat_to_utm
from .level import write_level

_W: chunkgen.World | None = None


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, flush=True)


def _region_job(args):
    rx, rz, out_dir = args
    W = _W
    n = 0
    w = RegionWriter(os.path.join(out_dir, "region", f"r.{rx}.{rz}.mca"))
    for cz in range(rz * 32, rz * 32 + 32):
        for cx in range(rx * 32, rx * 32 + 32):
            root = chunkgen.build_chunk(W, cx, cz)
            if root is not None:
                w.add(cx, cz, root)
                n += 1
    size = w.close()
    return rx, rz, n, size


def find_area(data_dir: str, name: str):
    """Gemeindefläche (UTM) aus den Overture-Verwaltungsgrenzen."""
    from .features import load as _load

    best = None
    for f in _load(os.path.join(data_dir, "division_area.jsonl")):
        if f.name == name and f.get("subtype") in ("locality", "county", "localadmin", "region") and f.get("class") == "land":
            if best is None or f.geom.area > best.geom.area:
                best = f
    return best.geom if best else None


def main(argv=None):
    ap = argparse.ArgumentParser(description="Echte Geodaten als Minecraft-Welt (1:1)")
    ap.add_argument("--data", required=True, help="Ordner mit den Overture-.jsonl-Dateien und dem Höhenmodell (dem/*.tif)")
    ap.add_argument("--out", required=True, help="Zielordner der Minecraft-Welt")
    ap.add_argument("--name", default=None, help="Weltname im Spiel")
    ap.add_argument("--gebiet", default="Lunzenau", help="Name der Gemeinde (aus division_area.jsonl)")
    ap.add_argument("--rand", type=float, default=150.0, help="Rand um das Gebiet in Metern")
    ap.add_argument("--nur-gemeinde", action="store_true", help="Nur Chunks innerhalb der Gemeindegrenze (+Rand) erzeugen")
    ap.add_argument("--e0", type=float, default=None, help="UTM-Ostwert für x=0 (Standard: Gebietsmitte)")
    ap.add_argument("--n0", type=float, default=None, help="UTM-Nordwert für z=0 (Standard: Gebietsmitte)")
    ap.add_argument("--y-offset", type=int, default=100, help="Y = Höhe über NHN minus diesen Wert")
    ap.add_argument("--ausschnitt", type=float, nargs=4, default=None, metavar=("E_MIN", "N_MIN", "E_MAX", "N_MAX"), help="Nur dieses UTM-Rechteck (zum Testen)")
    ap.add_argument("--prozesse", type=int, default=max(1, (os.cpu_count() or 2)))
    ap.add_argument("--modus", choices=["kreativ", "ueberleben"], default="kreativ")
    ap.add_argument("--anpassungen", default=None, help="JSON mit Einzelanpassungen (Standard: anpassungen/<gebiet>.json)")
    args = ap.parse_args(argv)

    t0 = time.time()
    data = args.data
    area = find_area(data, args.gebiet)
    if area is None:
        sys.exit(f"Gebiet '{args.gebiet}' nicht in {data}/division_area.jsonl gefunden")
    bounds = area.bounds if args.ausschnitt is None else tuple(args.ausschnitt)
    e0 = args.e0 if args.e0 is not None else round((bounds[0] + bounds[2]) / 2000) * 1000
    n0 = args.n0 if args.n0 is not None else round((bounds[1] + bounds[3]) / 2000) * 1000
    margin = args.rand if args.ausschnitt is None else 0.0
    grid = Grid.around(*bounds, e0=e0, n0=n0, y_offset=args.y_offset, margin=margin)
    log(f"Gebiet {args.gebiet}: {area.area / 1e6:.1f} km², Raster {grid.width}×{grid.height} m, {grid.width * grid.height // 256} Chunks, Ursprung E={e0} N={n0}")
    clip = box(*grid.utm_bounds)

    def L(name):
        return load(os.path.join(data, f"{name}.jsonl"), clip=clip)

    land, land_cover, land_use = L("land"), L("land_cover"), L("land_use")
    waters, segments, infra, places = L("water"), L("segment"), L("infrastructure"), L("place")
    buildings, parts = L("building"), L("building_part")
    log(f"Daten: {len(buildings)} Gebäude, {len(parts)} Gebäudeteile, {len(segments)} Wege, {len(waters)} Gewässer, {len(land) + len(land_use)} Flächen, {len(infra)} Kleinobjekte")

    # Einzelanpassungen (Farben, Dachformen ... einzelner Gebäude)
    rules_path = args.anpassungen or overrides.default_path(args.gebiet)
    rules = overrides.load_rules(rules_path)
    if rules:
        n_ov, warns = overrides.apply_rules(rules, buildings, places)
        log(f"Einzelanpassungen: {len(rules)} Regeln aus {os.path.basename(rules_path)} -> {n_ov} Gebäude")
        for w in warns:
            log("  Warnung:", w)

    # 1) Gelände
    dems = sorted(glob.glob(os.path.join(data, "dem", "*.tif")))
    is_dsm = not any("dgm" in os.path.basename(p).lower() for p in dems)
    ground = terrain.load_dem(dems, grid)
    corr = terrain.surface_correction(grid, lc.forest_geoms(land, land_cover), [b.geom for b in buildings], is_dsm=is_dsm)
    ground -= corr
    del corr
    log(f"Gelände: {ground.min():.0f}–{ground.max():.0f} m NHN (DSM-Korrektur: {is_dsm})")

    # 2) Bodenbedeckung
    cover = lc.build_cover(grid, land_cover, land, land_use, infra)
    farm = [(f.geom, i + 1) for i, f in enumerate(land_use) if f.get("class") == "farmland" and f.geom.geom_type in ("Polygon", "MultiPolygon")]
    field_id = rasterize(farm, grid.shape, transform=grid.transform, fill=0, dtype=np.uint16) if farm else np.zeros(grid.shape, np.uint16)

    # 3) Gewässer, 4) Straßen
    wres = water.build_water(grid, ground, waters)
    roads, bridges = rd.collect(segments)
    rres = rd.build_roads(grid, ground, roads)
    culvert = wres.mask & rres.mask
    wres.mask &= ~culvert
    log(f"Gewässer: {wres.mask.sum() / 1e4:.1f} ha, Straßen/Wege: {len(roads)} Abschnitte, {len(bridges)} Brückenteile")

    # 5) Gebäude
    vox = []
    bmask = np.zeros(grid.shape, dtype=bool)
    by_id = {b.props.get("id"): b for b in buildings}
    castle_words = ("schloss", "burg", "bergfried", "wendelstein", "turm", "kapelle")
    for p in parts:
        parent = by_id.get(p.get("building_id"))
        if parent is not None and any(w in (p.name or "").lower() for w in castle_words):
            parent.props["_castle"] = True
    nb = 0
    order = sorted(buildings, key=lambda b: b.geom.area, reverse=True)
    for b in order:
        if b.get("is_underground"):
            continue
        r = bld.voxelize(b.props, b.geom, grid, ground, rres.mask)
        if r is None:
            continue
        (X, Y, Z, I), (fr, fc), base = r
        vox.append((X, Y, Z, I))
        bmask[fr, fc] = True
        nb += 1
    for p in parts:
        if p.get("is_underground"):
            continue
        parent = by_id.get(p.get("building_id"))
        props = dict(p.props)
        if parent is not None:
            for k in ("class", "subtype", "names"):
                props.setdefault(k, parent.props.get(k))
                if props.get(k) is None:
                    props[k] = parent.props.get(k)
            for k, v in parent.props.items():  # Einzelanpassungen gelten auch für die Gebäudeteile
                if k.startswith("_") and k not in props:
                    props[k] = v
        r = bld.voxelize(props, p.geom, grid, ground, rres.mask)
        if r is not None:
            vox.append(r[0])
            bmask[r[1]] = True
    log(f"Gebäude: {nb} gebaut, {sum(len(v[0]) for v in vox) / 1e6:.1f} Mio. Blöcke")

    # 6) Höhen in Blöcken, Felsen, gesperrte Zellen
    top = (np.floor(ground + 0.5) - grid.y_offset).astype(np.int16)
    water_top = (np.floor(wres.level) - grid.y_offset).astype(np.int16)
    natural = np.isin(cover, [lc.FOREST, lc.SCRUB, lc.MEADOW, lc.DEFAULT, lc.ROCK, lc.QUARRY, lc.BARREN])
    rock = terrain.slope_mask(top, 3) & natural & ~rres.mask & ~wres.mask
    cliffs = [f.geom.buffer(2.5) for f in land if f.get("class") == "cliff"]
    if cliffs:
        cm = rasterize([(g, 1) for g in cliffs], grid.shape, transform=grid.transform, fill=0, dtype=np.uint8).astype(bool)
        rock |= cm & terrain.slope_mask(top, 2) & ~rres.mask & ~wres.mask
    rock |= np.isin(cover, [lc.ROCK, lc.QUARRY]) & terrain.slope_mask(top, 2)
    blocked = bmask | rres.mask | wres.mask
    del ground

    # 7) Details: Brücken, Laternen, Zäune, Schilder
    st = dt.Structures()
    ground_m = (top.astype(np.float32) + grid.y_offset)
    nbr = dt.add_bridges(st, grid, ground_m, wres.level, wres.mask, bridges)
    counts = dt.add_infrastructure(st, grid, top, blocked, infra)
    nss = dt.add_street_signs(st, grid, top, blocked, roads)
    nps = dt.add_place_signs(st, grid, top, blocked, places)
    sx, sy, sz, sid = st.arrays()
    if len(sx):
        r_, c_ = grid.rc_of_block(sx, sz)
        ok = (r_ >= 0) & (r_ < grid.height) & (c_ >= 0) & (c_ < grid.width)
        blocked[r_[ok], c_[ok]] = True
    log(f"Details: {nbr} Brücken, {nss} Straßenschilder, {nps} Ortsschilder, {counts}")

    # 8) Strukturen nach Chunks sortieren (Reihenfolge bleibt erhalten: spätere gewinnen)
    allv = vox + [(sx, sy, sz, sid)]
    X = np.concatenate([v[0] for v in allv]).astype(np.int32)
    Y = np.concatenate([v[1] for v in allv]).astype(np.int16)
    Z = np.concatenate([v[2] for v in allv]).astype(np.int32)
    I = np.concatenate([v[3] for v in allv]).astype(np.uint16)
    keep = (Y >= -63) & (Y <= 318)
    X, Y, Z, I = X[keep], Y[keep], Z[keep], I[keep]
    # Mehrfach belegte Positionen (z. B. Tür in der Wand): der zuletzt gesetzte Block gewinnt – eindeutig und
    # unabhängig davon, in welcher Reihenfolge NumPy später schreibt.
    pk = ((X.astype(np.int64) + (1 << 21)) << 32) | ((Z.astype(np.int64) + (1 << 21)) << 10) | (Y.astype(np.int64) + 64)
    _, first_rev = np.unique(pk[::-1], return_index=True)
    sel = np.sort(len(pk) - 1 - first_rev)
    log(f"Blöcke: {len(sel) / 1e6:.1f} Mio. ({len(pk) - len(sel)} doppelt belegte Positionen aufgelöst)")
    X, Y, Z, I = X[sel], Y[sel], Z[sel], I[sel]
    del pk
    key = (np.floor_divide(Z, 16).astype(np.int64) << 32) + (np.floor_divide(X, 16).astype(np.int64) & 0xFFFFFFFF)
    order = np.argsort(key, kind="stable")
    X, Y, Z, I, key = X[order], Y[order], Z[order], I[order], key[order]
    uniq, starts = np.unique(key, return_index=True)
    ends = np.append(starts[1:], len(key))
    s_index = {}
    for k, a, b in zip(uniq, starts, ends):
        cz = int(k >> 32)
        cx = int(k & 0xFFFFFFFF)
        if cx >= 2**31:
            cx -= 2**32
        s_index[(cx, cz)] = (int(a), int(b))
    entities = {}
    for (x, y, z, nbt_) in st.entities:
        entities.setdefault((x // 16, z // 16), []).append(nbt_)

    # Chunks außerhalb der Gemeinde weglassen?
    allowed = None
    if args.nur_gemeinde and args.ausschnitt is None:
        from shapely import contains_xy

        zone = area.buffer(args.rand)
        allowed = set()
        for cx, cz in grid.chunks():
            e, n = grid.utm_of_block(cx * 16 + 8, cz * 16 + 8)
            if contains_xy(zone, e, n):
                allowed.add((cx, cz))
        log(f"Nur Gemeinde: {len(allowed)} Chunks")

    global _W
    _W = chunkgen.World(grid, top, cover, rres.material, rres.rail_dir, wres.mask, water_top, wres.kind, field_id,
                        blocked, rock, X, Y, Z, I, s_index, entities, allowed=allowed)

    # 9) Region-Dateien parallel schreiben
    out = args.out
    if os.path.exists(os.path.join(out, "region")):
        shutil.rmtree(os.path.join(out, "region"))
    os.makedirs(os.path.join(out, "region"), exist_ok=True)
    rx0, rx1 = grid.x0 // 512, (grid.x0 + grid.width - 1) // 512
    rz0, rz1 = grid.z0 // 512, (grid.z0 + grid.height - 1) // 512
    jobs = [(rx, rz, out) for rz in range(rz0, rz1 + 1) for rx in range(rx0, rx1 + 1)]
    log(f"Schreibe {len(jobs)} Region-Dateien mit {args.prozesse} Prozessen …")
    total_chunks = 0
    total_size = 0
    ctx = mp.get_context("fork")
    with ctx.Pool(args.prozesse) as pool:
        for i, (rx, rz, n, size) in enumerate(pool.imap_unordered(_region_job, jobs), 1):
            total_chunks += n
            total_size += size
            if i % 5 == 0 or i == len(jobs):
                log(f"  {i}/{len(jobs)} Regionen, {total_chunks} Chunks, {total_size / 1e6:.0f} MB")

    # Kartenbild und Welt-Symbol
    try:
        make_pictures(out, grid, top, cover, wres.mask, rres.mask, bmask, allowed)
    except Exception as exc:  # Bilder sind nur Beiwerk
        log(f"Kartenbild übersprungen: {exc}")

    # 10) level.dat mit Spawn am Markt
    spawn = find_spawn(grid, top, places, land_use, segments, area)
    write_level(out, args.name or f"{args.gebiet} 1:1 (echte Geodaten)", spawn, game_type=1 if args.modus == "kreativ" else 0)
    meta = {"gebiet": args.gebiet, "e0": e0, "n0": n0, "y_offset": grid.y_offset, "x0": grid.x0, "z0": grid.z0,
            "breite": grid.width, "hoehe": grid.height, "spawn": spawn, "chunks": total_chunks,
            "quellen": ["Overture Maps Foundation (ODbL: © OpenStreetMap-Mitwirkende; CDLA)", "Copernicus DEM GLO-30 (© DLR e.V. 2010-2014 und © Airbus Defence and Space GmbH 2014-2018, bereitgestellt unter COPERNICUS durch die Europäische Union und ESA)"]}
    with open(os.path.join(out, "sachsencraft.json"), "w", encoding="utf-8") as fh:
        json.dump(meta, fh, ensure_ascii=False, indent=2)
    log(f"Fertig in {time.time() - t0:.0f} s: {total_chunks} Chunks, {total_size / 1e6:.0f} MB, Spawn {spawn}")
    return grid, top, cover, rres, wres, bmask


def make_pictures(out, grid, top, cover, wmask, rmask, bmask, allowed=None):
    """icon.png (64×64, Welt-Auswahl im Spiel) und karte.png (Übersicht) aus den Rastern."""
    from PIL import Image

    col = np.zeros(grid.shape + (3,), dtype=np.float32)
    pal = {lc.FOREST: (52, 92, 40), lc.FARMLAND: (196, 170, 86), lc.MEADOW: (110, 160, 70), lc.RESIDENTIAL: (120, 165, 85),
           lc.INDUSTRIAL: (140, 140, 140), lc.COMMERCIAL: (130, 130, 130), lc.QUARRY: (150, 105, 85), lc.SCRUB: (90, 130, 60)}
    col[:] = (105, 155, 70)
    for k, v in pal.items():
        col[cover == k] = v
    col[rmask] = (70, 72, 76)
    col[bmask] = (170, 80, 60)
    col[wmask] = (60, 100, 190)
    gy, gx = np.gradient(top.astype(np.float32))
    shade = np.clip(1.0 + (-gx - gy) * 0.12, 0.55, 1.35)
    img = np.clip(col * shade[..., None], 0, 255).astype(np.uint8)
    if allowed is not None:
        cm = np.zeros(grid.shape, bool)
        for cx, cz in allowed:
            r, c = cz * 16 - grid.z0, cx * 16 - grid.x0
            cm[r:r + 16, c:c + 16] = True
        img[~cm] = (20, 20, 28)
    im = Image.fromarray(img)
    scale = 2048 / max(grid.width, grid.height)
    im.resize((int(grid.width * scale), int(grid.height * scale)), Image.LANCZOS).save(os.path.join(out, "karte.png"))
    side = min(grid.width, grid.height)
    r0 = (grid.height - side) // 2
    c0 = (grid.width - side) // 2
    im.crop((c0, r0, c0 + side, r0 + side)).resize((64, 64), Image.LANCZOS).save(os.path.join(out, "icon.png"))


def find_spawn(grid: Grid, top, places, land_use, segments, area=None):
    """Spawn auf dem Marktplatz (oder der Gebietsmitte)."""
    cand = None
    gb = box(*grid.utm_bounds)
    ok = lambda g: g.intersects(gb) and (area is None or g.intersects(area))
    for f in land_use:
        if f.get("class") == "plaza" and (f.name or "").lower().startswith("markt") and ok(f.geom):
            cand = f.geom.representative_point()
            break
    if cand is None:
        for f in segments:
            if (f.name or "") in ("Markt", "Marktplatz", "Am Markt") and ok(f.geom):
                cand = f.geom.interpolate(0.5, normalized=True)
                break
    if cand is None:
        e = grid.e0 + grid.x0 + grid.width / 2
        n = grid.n0 - grid.z0 - grid.height / 2
    else:
        e, n = cand.x, cand.y
    x, z = (int(math.floor(v)) for v in grid.block_of_utm(e, n))
    r, c = grid.rc_of_block(x, z)
    y = int(top[r, c]) + 1
    return (x, y, z)


if __name__ == "__main__":
    main()
