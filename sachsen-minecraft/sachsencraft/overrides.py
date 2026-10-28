"""Einzelanpassungen: Gebäude, die anders aussehen sollen, als es die Karten-Daten hergeben.

Die Karten (OpenStreetMap) kennen weder Farben noch Dachformen der meisten Häuser. Wer ein Gebäude vor Ort oder auf
Fotos kennt, trägt es in `anpassungen/<gebiet>.json` ein. Beim nächsten Erzeugen der Welt wird es genau so gebaut.

Aufbau einer Regel (alle Felder außer „finde“ sind optional):

    {
      "bezeichnung": "Niemeier Fahrzeugwerke",
      "finde": {"poi": "Niemeier Fahrzeugwerke"},
      "wand": "red_concrete", "dach": "flat_red", "dachform": "flat", "hoehe": 9
    }

„finde“ (eines davon reicht):
    poi      Name eines Ortes/Betriebs; gebaut wird das Gebäude, in dem er liegt (oder das nächste im Umkreis von 40 m)
    name     Name des Gebäudes in den Kartendaten (Teilwort, Groß-/Kleinschreibung egal)
    id       Gebäude-ID aus den Kartendaten (die ersten 8 Zeichen genügen)
    lonlat   [Länge, Breite] eines Punktes im Gebäude, z. B. aus Google Maps kopiert
    umkreis  optional zusammen mit poi/lonlat: Suchradius in Metern

Eigenschaften:
    wand      Block für die Wände (Vollblock, z. B. white_concrete, red_concrete, bricks, yellow_terracotta)
    dach      Dachmaterial: brick, deepslate_tile, mud_brick, spruce, stone_brick, copper, red, orange, black,
              flat_gray, flat_dark, flat_red, flat_white, flat_green, glass
    dachform  flat, gabled, hipped, pyramidal, skillion, dome
    hoehe     Gesamthöhe in Metern (Traufe + Dach)
    dachhoehe Höhe des Daches in Metern
    stockwerke Anzahl Geschosse
    art       house, apartments, civic, big, small, church, castle, greenhouse
    ecken     Block für die Hausecken (Eckquader), "keine" = keine
    band      Block für ein Gesimsband zwischen den Geschossen, "keine" = keins
    sockel    Block für den Sockel
    giebel    Block für die Giebelwand unter dem Dach
    fenster   normal, keine, band
    tuer      Holzart der Tür: oak, spruce, birch, dark_oak, jungle, acacia, crimson
"""

from __future__ import annotations

import json
import os

from shapely.geometry import Point

from .geo import lonlat_to_utm

FIELDS = {
    "wand": "_wall", "dach": "_roof", "dachform": "_shape", "hoehe": "_height", "dachhoehe": "_roof_h",
    "stockwerke": "_floors", "art": "_kind", "ecken": "_corner", "band": "_band", "sockel": "_plinth",
    "giebel": "_gable", "fenster": "_windows", "tuer": "_door",
}
SHAPES = {"flat", "gabled", "hipped", "pyramidal", "skillion", "dome"}
KINDS = {"house", "apartments", "civic", "big", "small", "church", "castle", "greenhouse"}


def default_path(gebiet: str) -> str:
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(root, "anpassungen", f"{gebiet.lower()}.json")


def load_rules(path: str) -> list[dict]:
    if not path or not os.path.exists(path):
        return []
    with open(path, encoding="utf-8") as fh:
        data = json.load(fh)
    rules = data["gebaeude"] if isinstance(data, dict) else data
    for r in rules:
        if "finde" not in r:
            raise ValueError(f"Regel ohne „finde“: {r}")
        bad = set(r) - set(FIELDS) - {"finde", "bezeichnung", "hinweis"}
        if bad:
            raise ValueError(f"Unbekannte Felder {sorted(bad)} in Regel „{r.get('bezeichnung', r['finde'])}“")
        if "dachform" in r and r["dachform"] not in SHAPES:
            raise ValueError(f"dachform muss eines von {sorted(SHAPES)} sein, nicht {r['dachform']!r}")
        if "dach" in r:
            from .buildings import ROOF_MATS
            if r["dach"] not in ROOF_MATS:
                raise ValueError(f"dach muss eines von {sorted(ROOF_MATS)} sein, nicht {r['dach']!r}")
        if "art" in r and r["art"] not in KINDS:
            raise ValueError(f"art muss eines von {sorted(KINDS)} sein, nicht {r['art']!r}")
    return rules


def _poly(f):
    g = f.geom
    return max(g.geoms, key=lambda x: x.area) if g.geom_type == "MultiPolygon" else g


def _building_at(buildings, pt: Point, radius: float):
    inside = [b for b in buildings if _poly(b).contains(pt)]
    if inside:
        return min(inside, key=lambda b: _poly(b).area)  # innerstes Gebäude gewinnt
    near = [(b.geom.distance(pt), b) for b in buildings if b.geom.distance(pt) <= radius]
    return min(near, key=lambda t: t[0])[1] if near else None


def apply_rules(rules: list[dict], buildings, places) -> tuple[int, list[str]]:
    """Trägt die Eigenschaften in die props der passenden Gebäude ein. Gibt (Anzahl, Warnungen) zurück."""
    warnings, n = [], 0
    for r in rules:
        f = r["finde"]
        label = r.get("bezeichnung") or json.dumps(f, ensure_ascii=False)
        radius = float(f.get("umkreis", 40))
        hits = []
        if "id" in f:
            hits = [b for b in buildings if str(b.props.get("id", "")).startswith(str(f["id"]))]
        elif "name" in f:
            hits = [b for b in buildings if f["name"].lower() in (b.name or "").lower()]
        elif "poi" in f:
            pts = [p for p in places if f["poi"].lower() in (p.name or "").lower() and p.geom.geom_type == "Point"]
            for p in pts:
                b = _building_at(buildings, p.geom, radius)
                if b is not None and b not in hits:
                    hits.append(b)
        elif "lonlat" in f:
            e, nn = lonlat_to_utm(*f["lonlat"])
            b = _building_at(buildings, Point(e, nn), radius if "umkreis" in f else 15.0)
            hits = [b] if b is not None else []
        if not hits:
            warnings.append(f"Kein Gebäude gefunden für: {label}")
            continue
        for b in hits:
            for k, v in r.items():
                if k in FIELDS:
                    b.props[FIELDS[k]] = v
        n += len(hits)
    return n, warnings
