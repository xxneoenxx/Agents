"""Geodaten (Overture-Zeilen-JSON) laden und nach UTM 33N projizieren."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field

import shapely
from shapely import wkb

from .geo import project_geometry


@dataclass
class Feature:
    geom: object  # shapely-Geometrie in UTM
    props: dict = field(default_factory=dict)

    def get(self, k, default=None):
        v = self.props.get(k)
        return default if v is None else v

    @property
    def name(self) -> str | None:
        n = self.props.get("names")
        return n.get("primary") if isinstance(n, dict) else None


def load(path: str, clip=None) -> list[Feature]:
    """Alle Objekte einer .jsonl-Datei; optional nur die, die clip (UTM-Polygon) schneiden."""
    if not os.path.exists(path):
        return []
    out = []
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            r = json.loads(line)
            g = r.pop("geometry", None)
            if not g:
                continue
            try:
                geom = project_geometry(wkb.loads(bytes.fromhex(g)))
            except Exception:
                continue
            if geom.is_empty:
                continue
            if clip is not None and not geom.intersects(clip):
                continue
            if not geom.is_valid:
                geom = shapely.make_valid(geom)
            out.append(Feature(geom, r))
    return out


def rule_value(rules, default=None):
    """Overture-'Regeln' wie road_surface=[{'value': 'paved', 'between': None}] -> erster Wert."""
    if not rules:
        return default
    for r in rules:
        if r.get("between") is None and r.get("value") is not None:
            return r["value"]
    return rules[0].get("value", default)


def flag_ranges(flags, name: str) -> list[tuple[float, float]]:
    """Bereiche (Anteil 0..1 entlang der Linie), in denen ein Straßen-Flag (z. B. is_bridge) gilt."""
    out = []
    for f in flags or []:
        if name in (f.get("values") or []):
            b = f.get("between")
            out.append((0.0, 1.0) if not b else (float(b[0]), float(b[1])))
    return out
