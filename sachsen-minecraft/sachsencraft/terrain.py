"""Gelände: Höhenmodell auf das 1-m-Blockraster bringen und Wald/Gebäude aus dem Oberflächenmodell herausrechnen."""

from __future__ import annotations

import numpy as np
import rasterio
from affine import Affine
from rasterio.features import rasterize
from rasterio.warp import Resampling, reproject
from scipy import ndimage

from .geo import UTM, Grid

# Copernicus GLO-30 ist ein Oberflächenmodell (DSM): im Wald misst es die Baumkronen.
# Gemessen in Lunzenau: Sprung an Waldrändern ca. 3,5 m nach 20 m und 9-10 m nach 50 m.
CANOPY_BIAS_M = 10.0
CANOPY_RAMP_M = 50.0
BUILDING_BIAS_M = 4.0
COARSE = 5  # Meter pro Zelle für die Korrekturfelder


def load_dem(paths: list[str], grid: Grid, resampling=Resampling.cubic_spline) -> np.ndarray:
    """Alle Höhenmodell-Kacheln (GeoTIFF, beliebiges KBS) in das Blockraster (Zellmitte) projizieren."""
    out = np.full(grid.shape, np.nan, dtype=np.float32)
    for p in paths:
        with rasterio.open(p) as ds:
            tmp = np.full(grid.shape, np.nan, dtype=np.float32)
            reproject(
                rasterio.band(ds, 1),
                tmp,
                dst_transform=grid.transform,
                dst_crs=UTM,
                dst_nodata=np.nan,
                resampling=resampling,
            )
            m = ~np.isnan(tmp)
            out[m] = tmp[m]
    if np.isnan(out).any():
        # Lücken am Rand mit dem nächsten bekannten Wert füllen
        idx = ndimage.distance_transform_edt(np.isnan(out), return_distances=False, return_indices=True)
        out = out[tuple(idx)]
    return out


def _coarse_transform(grid: Grid) -> Affine:
    t = grid.transform
    return Affine(COARSE, 0, t.c, 0, -COARSE, t.f)


def _smoothstep(t):
    t = np.clip(t, 0.0, 1.0)
    return t * t * (3 - 2 * t)


def surface_correction(grid: Grid, forest_geoms, building_geoms, is_dsm: bool = True) -> np.ndarray:
    """Wie viele Meter das Oberflächenmodell über dem Boden liegt (Wald, dichte Bebauung)."""
    if not is_dsm:
        return np.zeros(grid.shape, dtype=np.float32)
    h = int(np.ceil(grid.height / COARSE))
    w = int(np.ceil(grid.width / COARSE))
    tr = _coarse_transform(grid)
    corr = np.zeros((h, w), dtype=np.float32)
    forest = [(g, 1) for g in forest_geoms if not g.is_empty]
    if forest:
        fm = rasterize(forest, (h, w), transform=tr, fill=0, dtype=np.uint8).astype(bool)
        dist = ndimage.distance_transform_edt(fm) * COARSE
        corr += CANOPY_BIAS_M * _smoothstep(dist / CANOPY_RAMP_M)
    bld = [(g, 1) for g in building_geoms if not g.is_empty]
    if bld:
        bm = rasterize(bld, (h, w), transform=tr, fill=0, dtype=np.uint8, all_touched=True).astype(np.float32)
        cov = ndimage.gaussian_filter(bm, 12 / COARSE)
        corr += BUILDING_BIAS_M * np.clip(cov * 1.6, 0, 1)
    corr = ndimage.gaussian_filter(corr, 1.0)
    fine = ndimage.zoom(corr, COARSE, order=1)[: grid.height, : grid.width]
    if fine.shape != grid.shape:
        pad = np.zeros(grid.shape, dtype=np.float32)
        pad[: fine.shape[0], : fine.shape[1]] = fine
        fine = pad
    return fine.astype(np.float32)


def slope_mask(height_int: np.ndarray, threshold: int = 3) -> np.ndarray:
    """Zellen, deren Nachbar mindestens `threshold` Blöcke höher oder tiefer liegt (Felswände)."""
    h = height_int.astype(np.int16)
    d = np.zeros(h.shape, dtype=np.int16)
    d[1:, :] = np.maximum(d[1:, :], np.abs(h[1:, :] - h[:-1, :]))
    d[:-1, :] = np.maximum(d[:-1, :], np.abs(h[:-1, :] - h[1:, :]))
    d[:, 1:] = np.maximum(d[:, 1:], np.abs(h[:, 1:] - h[:, :-1]))
    d[:, :-1] = np.maximum(d[:, :-1], np.abs(h[:, :-1] - h[:, 1:]))
    return d >= threshold
