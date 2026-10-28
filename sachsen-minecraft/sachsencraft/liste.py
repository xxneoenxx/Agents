"""Prüfliste der auffälligsten Gebäude eines Gebiets.

Für jedes Gebäude: Name, Größe, wie es jetzt gebaut wird und je ein Link zu Google Maps (Satellit) und Street View.
Du schaust dort selbst nach und trägst Wandfarbe, Dachfarbe und Dachform ein (oder sagst sie mir). Daraus entstehen
Einzelanpassungen (anpassungen/<gebiet>.json), und die Welt wird mit genau diesen Angaben neu gebaut.

    python -m sachsencraft.liste --data daten/lunzenau --gebiet Lunzenau --aus anpassungen/liste-lunzenau.md
"""

from __future__ import annotations

import argparse
import os

from shapely.geometry import Point

from . import buildings as bld
from . import overrides
from .features import load
from .geo import utm_to_lonlat

SAT = "https://www.google.com/maps/@?api=1&map_action=map&center={lat:.6f},{lng:.6f}&zoom=19&basemap=satellite"
PANO = "https://www.google.com/maps/@?api=1&map_action=pano&viewpoint={lat:.6f},{lng:.6f}"

WALL_DE = {
    "white_concrete": "weiß", "white_terracotta": "beige", "smooth_sandstone": "creme", "calcite": "hellweiß", "light_gray_concrete": "hellgrau",
    "smooth_quartz": "weiß", "birch_planks": "hellgelb", "cyan_terracotta": "graugrün", "bricks": "Ziegelrot", "smooth_stone": "grau",
    "red_concrete": "rot", "spruce_planks": "Holz braun", "dark_oak_planks": "Holz dunkel", "andesite": "grau", "stone_bricks": "Naturstein",
}
ROOF_DE = {
    "brick": "ziegelrot", "deepslate_tile": "dunkelgrau (Schiefer)", "mud_brick": "braun", "spruce": "Holz", "copper": "grün (Kupfer)",
    "flat_gray": "hellgrau", "flat_dark": "dunkelgrau", "flat_red": "rot", "red": "dunkelrot", "orange": "orange", "black": "schwarz",
    "stone_brick": "Naturstein", "nether_brick": "dunkelbraun", "flat_white": "weiß", "flat_green": "grün", "glass": "Glas",
}
SHAPE_DE = {"gabled": "Satteldach", "hipped": "Walmdach", "flat": "Flachdach", "pyramidal": "Zeltdach", "skillion": "Pultdach", "dome": "Kuppel/Haube"}
KIND_DE = {"house": "Wohnhaus", "apartments": "Mehrfamilienhaus", "civic": "öffentl./Büro/Schule", "big": "Halle/Gewerbe", "small": "Nebengebäude",
           "church": "Kirche", "castle": "Schloss/Turm", "greenhouse": "Gewächshaus"}


def area_of(data: str, name: str):
    best = None
    for f in load(os.path.join(data, "division_area.jsonl")):
        if f.name == name and f.get("subtype") == "locality" and f.get("class") == "land":
            if best is None or f.geom.area > best.geom.area:
                best = f
    return best.geom if best else None


def run(data: str, gebiet: str, out: str, n: int = 45) -> int:
    area = area_of(data, gebiet)
    if area is None:
        raise SystemExit(f"Gebiet {gebiet!r} nicht gefunden")
    bs = [b for b in load(os.path.join(data, "building.jsonl"), clip=area) if b.geom.centroid.within(area)]
    places = [p for p in load(os.path.join(data, "place.jsonl"), clip=area) if p.geom.geom_type == "Point" and p.name]
    # bereits eingetragene Einzelanpassungen berücksichtigen, damit „jetzt“ dem entspricht, was gebaut wird
    overrides.apply_rules(overrides.load_rules(overrides.default_path(gebiet)), bs, places)
    rows = []
    for b in bs:
        poly = max(b.geom.geoms, key=lambda g: g.area) if b.geom.geom_type == "MultiPolygon" else b.geom
        pl = bld.plan(b.props, poly)
        inside = [p for p in places if poly.buffer(3).contains(p.geom)]
        poi = ", ".join(sorted({p.name for p in inside}))[:70]
        addr = ""
        for p in inside:
            a = (p.props.get("addresses") or [{}])[0]
            if a.get("freeform"):
                addr = f"{a['freeform']}, {a.get('locality') or ''}".strip(", ")
                break
        label = " / ".join(dict.fromkeys([x for x in (b.name, poi) if x]))
        interesting = bool(b.name) or bool(poi) or pl.kind in ("big", "civic", "church", "castle")
        if not interesting or pl.kind == "small":
            continue
        rows.append((poly.area, b, pl, label, addr, poly))
    rows.sort(key=lambda r: -r[0])
    rows = rows[:n]
    lines = [f"# Prüfliste Gebäude – {gebiet}", "",
             "Schau dir jedes Gebäude über die Links in Google Maps (Satellit) und Street View an und trage ein, was nicht stimmt.",
             "Am wichtigsten sind **Wandfarbe**, **Dachfarbe** und **Dachform**. Leer lassen = so lassen wie jetzt.", "",
             "Mögliche Farben: weiß, hellgrau, grau, dunkelgrau, beige/creme, gelb, orange, ziegelrot, rot, braun, grün, blau. "
             "Dachformen: Satteldach, Walmdach, Flachdach, Zeltdach, Pultdach.", "",
             "| Nr | Gebäude | m² | Höhe | Art | jetzt: Wand / Dach / Form | Links | **Deine Angabe** |", "|---|---|---|---|---|---|---|---|"]
    for i, (a, b, pl, label, addr, poly) in enumerate(rows, 1):
        c = poly.representative_point()
        lng, lat = utm_to_lonlat(c.x, c.y)
        h = b.get("height")
        height = f"{h:.0f} m" if h else "unbekannt"
        name = (label or KIND_DE.get(pl.kind, pl.kind)) + (f"<br><sub>{addr}</sub>" if addr else "")
        now = f"{WALL_DE.get(pl.wall, pl.wall)} / {ROOF_DE.get(pl.roof, pl.roof)} / {SHAPE_DE.get(pl.shape, pl.shape)}"
        links = f"[Satellit]({SAT.format(lat=lat, lng=lng)}) · [Street View]({PANO.format(lat=lat, lng=lng)})"
        lines.append(f"| {i} | {name} | {a:.0f} | {height} | {KIND_DE.get(pl.kind, pl.kind)} | {now} | {links} | |")
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    with open(out, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")
    return len(rows)


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Prüfliste der auffälligsten Gebäude")
    ap.add_argument("--data", required=True)
    ap.add_argument("--gebiet", default="Lunzenau")
    ap.add_argument("--aus", required=True)
    ap.add_argument("--anzahl", type=int, default=45)
    a = ap.parse_args()
    print(run(a.data, a.gebiet, a.aus, a.anzahl), "Gebäude geschrieben ->", a.aus)
