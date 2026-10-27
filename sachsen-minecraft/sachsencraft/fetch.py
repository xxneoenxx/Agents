"""Geodaten für ein Gebiet herunterladen: Overture Maps (Gebäude, Wege, Gewässer, Flächen) und Copernicus-Höhenmodell.

    python -m sachsencraft.fetch --ziel daten/lunzenau --bbox 12.675 50.930 12.825 50.997
"""

from __future__ import annotations

import argparse
import math
import os
import time

import requests

from . import overture as ov

TYPES = [
    ("divisions", "division_area"), ("base", "water"), ("base", "land_use"), ("base", "land_cover"), ("base", "land"),
    ("base", "infrastructure"), ("transportation", "segment"), ("places", "place"), ("buildings", "building_part"),
    ("buildings", "building"),
]
COP_URL = "https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_{ns}{lat:02d}_00_{ew}{lon:03d}_00_DEM/Copernicus_DSM_COG_10_{ns}{lat:02d}_00_{ew}{lon:03d}_00_DEM.tif"


def dem_tiles(bbox):
    lon0, lat0, lon1, lat1 = bbox
    for lat in range(math.floor(lat0), math.floor(lat1) + 1):
        for lon in range(math.floor(lon0), math.floor(lon1) + 1):
            yield lat, lon


def fetch(target: str, bbox, release: str | None = None) -> None:
    os.makedirs(os.path.join(target, "dem"), exist_ok=True)
    release = release or ov.latest_release()
    print("Overture-Version", release)
    for theme, typ in TYPES:
        t = time.time()
        tab = ov.read_bbox(release, theme, typ, bbox, workers=16)
        n = ov.save_geojsonl(tab, os.path.join(target, f"{typ}.jsonl")) if tab.num_rows else 0
        print(f"  {typ}: {n} Objekte ({time.time() - t:.0f} s)")
    sess = requests.Session()
    ca = os.environ.get("REQUESTS_CA_BUNDLE")
    if ca:
        sess.verify = ca
    for lat, lon in dem_tiles(bbox):
        url = COP_URL.format(ns="N" if lat >= 0 else "S", lat=abs(lat), ew="E" if lon >= 0 else "W", lon=abs(lon))
        out = os.path.join(target, "dem", f"cop30_N{lat}_E{lon:03d}.tif")
        if os.path.exists(out):
            continue
        r = sess.get(url, timeout=300)
        r.raise_for_status()
        with open(out, "wb") as fh:
            fh.write(r.content)
        print("  Höhenmodell", os.path.basename(out), len(r.content) // 1024, "KB")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description="Geodaten für SachsenCraft laden")
    ap.add_argument("--ziel", required=True)
    ap.add_argument("--bbox", type=float, nargs=4, required=True, metavar=("LON_MIN", "LAT_MIN", "LON_MAX", "LAT_MAX"))
    ap.add_argument("--release", default=None)
    a = ap.parse_args()
    fetch(a.ziel, tuple(a.bbox), a.release)
