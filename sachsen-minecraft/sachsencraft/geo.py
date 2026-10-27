"""Koordinaten: echte Welt (ETRS89 / UTM 33N, EPSG:25833) <-> Minecraft-Blöcke.

1 Block = 1 m. Minecraft-x zeigt nach Osten, Minecraft-z nach Süden.
Block (x, z) deckt UTM [E0 + x, E0 + x + 1) × (N0 - z - 1, N0 - z] ab.
Y = Höhe über NHN - y_offset.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import shapely
from affine import Affine
from pyproj import Transformer

UTM = "EPSG:25833"
WGS84 = "EPSG:4326"

_to_utm = Transformer.from_crs(WGS84, UTM, always_xy=True)
_to_wgs = Transformer.from_crs(UTM, WGS84, always_xy=True)


def lonlat_to_utm(lon, lat):
    return _to_utm.transform(lon, lat)


def utm_to_lonlat(e, n):
    return _to_wgs.transform(e, n)


def project_geometry(geom):
    """Shapely-Geometrie von WGS84 (lon/lat) nach UTM 33N."""

    def f(coords):
        e, n = _to_utm.transform(coords[:, 0], coords[:, 1])
        return np.column_stack([e, n])

    return shapely.transform(geom, f)


@dataclass
class Grid:
    """Rechteckiges Generierungsgebiet in Minecraft-Koordinaten."""

    e0: float  # UTM-Ostwert von Minecraft x = 0
    n0: float  # UTM-Nordwert von Minecraft z = 0
    x0: int  # kleinste Minecraft-x (Vielfaches von 16)
    z0: int  # kleinste Minecraft-z (Vielfaches von 16)
    width: int  # Anzahl Blöcke in x
    height: int  # Anzahl Blöcke in z
    y_offset: int  # Y = Höhe über NHN - y_offset

    @property
    def transform(self) -> Affine:
        """Affine Abbildung Rasterzelle (Spalte, Zeile) -> UTM der linken oberen Ecke."""
        return Affine(1.0, 0.0, self.e0 + self.x0, 0.0, -1.0, self.n0 - self.z0)

    @property
    def shape(self) -> tuple[int, int]:
        return (self.height, self.width)

    @property
    def utm_bounds(self):
        return (self.e0 + self.x0, self.n0 - self.z0 - self.height, self.e0 + self.x0 + self.width, self.n0 - self.z0)

    def block_of_utm(self, e, n):
        """UTM -> Minecraft (x, z) als Gleitkommazahlen."""
        return np.asarray(e) - self.e0, self.n0 - np.asarray(n)

    def utm_of_block(self, x, z):
        """Mittelpunkt von Block (x, z) in UTM."""
        return self.e0 + np.asarray(x) + 0.5, self.n0 - np.asarray(z) - 0.5

    def rc_of_block(self, x, z):
        """Rasterindex (Zeile, Spalte) eines Blocks."""
        return np.asarray(z) - self.z0, np.asarray(x) - self.x0

    def rc_of_utm(self, e, n):
        x, z = self.block_of_utm(e, n)
        return np.floor(z).astype(int) - self.z0, np.floor(x).astype(int) - self.x0

    def chunks(self):
        for cz in range(self.z0 // 16, (self.z0 + self.height) // 16):
            for cx in range(self.x0 // 16, (self.x0 + self.width) // 16):
                yield cx, cz

    @staticmethod
    def around(e_min, n_min, e_max, n_max, e0, n0, y_offset, margin=0.0) -> "Grid":
        """Kleinstes chunkgenaues Gitter, das das UTM-Rechteck (plus Rand) enthält."""
        x_min = int(np.floor((e_min - margin - e0) / 16.0)) * 16
        x_max = int(np.ceil((e_max + margin - e0) / 16.0)) * 16
        z_min = int(np.floor((n0 - (n_max + margin)) / 16.0)) * 16
        z_max = int(np.ceil((n0 - (n_min - margin)) / 16.0)) * 16
        return Grid(e0, n0, x_min, z_min, x_max - x_min, z_max - z_min, y_offset)
