"""Bodenbedeckung (Wald, Feld, Wiese, Siedlung ...) als Raster mit einer Klasse pro Block."""

from __future__ import annotations

import numpy as np
from rasterio.features import rasterize

from .geo import Grid

# Klassen
DEFAULT, MEADOW, FARMLAND, FOREST, SCRUB, RESIDENTIAL, INDUSTRIAL, COMMERCIAL = range(8)
QUARRY, CEMETERY, ALLOTMENT, PARK, PITCH, PLAZA, RAILWAY, FARMYARD = range(8, 16)
ROCK, WETLAND, SAND, ORCHARD, GARDEN, PLAYGROUND, PARKING, CONSTRUCTION = range(16, 24)
GREENHOUSE, LANDFILL, LAWN, BARREN = range(24, 28)

NAMES = {
    DEFAULT: "Gras", MEADOW: "Wiese", FARMLAND: "Feld", FOREST: "Wald", SCRUB: "Gebüsch",
    RESIDENTIAL: "Wohngebiet", INDUSTRIAL: "Industrie", COMMERCIAL: "Gewerbe", QUARRY: "Steinbruch",
    CEMETERY: "Friedhof", ALLOTMENT: "Kleingärten", PARK: "Park", PITCH: "Sportplatz", PLAZA: "Platz",
    RAILWAY: "Bahngelände", FARMYARD: "Hof", ROCK: "Fels", WETLAND: "Feuchtgebiet", SAND: "Sand",
    ORCHARD: "Obstwiese", GARDEN: "Garten", PLAYGROUND: "Spielplatz", PARKING: "Parkplatz",
    CONSTRUCTION: "Baustelle", GREENHOUSE: "Gewächshaus", LANDFILL: "Deponie", LAWN: "Rasen", BARREN: "Brachland",
}

# Overture land_cover (grobe Satellitenklassen) – nur als Grundlage
LAND_COVER = {"forest": FOREST, "crop": FARMLAND, "grass": MEADOW, "shrub": SCRUB, "urban": RESIDENTIAL, "barren": BARREN, "wetland": WETLAND, "moss": MEADOW}

# Overture land_use – flächige Nutzung (Stufe 1)
LAND_USE_BROAD = {
    "residential": RESIDENTIAL, "industrial": INDUSTRIAL, "commercial": COMMERCIAL, "retail": COMMERCIAL,
    "farmland": FARMLAND, "meadow": MEADOW, "farmyard": FARMYARD, "quarry": QUARRY, "railway": RAILWAY,
    "landfill": LANDFILL, "construction": CONSTRUCTION, "brownfield": BARREN, "garages": PARKING,
    "orchard": ORCHARD, "vineyard": ORCHARD, "plant_nursery": GARDEN, "greenfield": MEADOW,
}

# Overture land – natürliche Bedeckung (Stufe 2)
LAND = {
    "grassland": MEADOW, "grass": MEADOW, "scrub": SCRUB, "shrub": SCRUB, "heath": SCRUB,
    "forest": FOREST, "wood": FOREST, "rock": ROCK, "stone": ROCK, "shingle": ROCK, "bare_rock": ROCK,
    "scree": ROCK, "wetland": WETLAND, "sand": SAND, "beach": SAND,
}

# Overture land_use – kleinteilige Nutzung (Stufe 3, gewinnt)
LAND_USE_DETAIL = {
    "park": PARK, "cemetery": CEMETERY, "grave_yard": CEMETERY, "allotments": ALLOTMENT, "garden": GARDEN,
    "pitch": PITCH, "playground": PLAYGROUND, "plaza": PLAZA, "track": PITCH, "recreation_ground": PARK,
    "grass": LAWN, "village_green": LAWN, "greenhouse_horticulture": GREENHOUSE, "dog_park": PARK,
}


def _polys(features, mapping, key="class"):
    out = []
    for f in features:
        cls = mapping.get(f.get(key)) if key else None
        if cls is None:
            cls = mapping.get(f.get("subtype"))
        if cls is None:
            continue
        g = f.geom
        if g.geom_type in ("Polygon", "MultiPolygon"):
            out.append((g, cls))
    return out


def build_cover(grid: Grid, land_cover, land, land_use, infrastructure) -> np.ndarray:
    """Klassenraster in Prioritätsreihenfolge (später gezeichnete Flächen gewinnen)."""
    layers = []
    layers += _polys(land_cover, LAND_COVER, key=None)
    layers += _polys(land_use, LAND_USE_BROAD)
    layers += _polys(land, LAND)
    layers += _polys(land_use, LAND_USE_DETAIL)
    layers += [(f.geom, PARKING) for f in infrastructure if f.get("class") in ("parking",) and f.geom.geom_type in ("Polygon", "MultiPolygon")]
    cover = np.zeros(grid.shape, dtype=np.uint8)
    # rasterize zeichnet in Listenreihenfolge; spätere Formen überschreiben frühere
    if layers:
        cover = rasterize(layers, grid.shape, transform=grid.transform, fill=DEFAULT, dtype=np.uint8)
    return cover


def forest_geoms(land, land_cover):
    g = [f.geom for f in land if f.get("subtype") == "forest" and f.geom.geom_type in ("Polygon", "MultiPolygon")]
    g += [f.geom for f in land_cover if f.get("subtype") == "forest" and f.geom.geom_type in ("Polygon", "MultiPolygon")]
    return g
