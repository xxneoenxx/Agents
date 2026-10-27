"""Overture-Maps-Daten (GeoParquet auf AWS S3) für ein Rechteck laden.

Es werden nur die Parquet-Zeilengruppen gelesen, deren bbox-Statistik das Rechteck schneidet.
"""

from __future__ import annotations

import json
import os
import re
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor

import fsspec
import pyarrow as pa
import pyarrow.parquet as pq
import requests

BUCKET_URL = "https://overturemaps-us-west-2.s3.us-west-2.amazonaws.com"
DEFAULT_RELEASE = "2026-10-21.0"


def _session() -> requests.Session:
    s = requests.Session()
    ca = os.environ.get("REQUESTS_CA_BUNDLE") or os.environ.get("SSL_CERT_FILE")
    if ca:
        s.verify = ca
    return s


def latest_release() -> str:
    xml = _session().get(f"{BUCKET_URL}/?list-type=2&prefix=release/&delimiter=/", timeout=30).text
    rel = sorted(re.findall(r"<Prefix>release/([^<]+)/</Prefix>", xml))
    return rel[-1] if rel else DEFAULT_RELEASE


def list_files(release: str, theme: str, typ: str) -> list[str]:
    """Alle Parquet-Dateien eines Overture-Typs auflisten."""
    sess = _session()
    prefix = f"release/{release}/theme={theme}/type={typ}/"
    keys, token = [], None
    while True:
        url = f"{BUCKET_URL}/?list-type=2&prefix={prefix}"
        if token:
            url += "&continuation-token=" + requests.utils.quote(token, safe="")
        root = ET.fromstring(sess.get(url, timeout=60).content)
        ns = {"s3": root.tag.split("}")[0].strip("{")}
        keys += [k.text for k in root.findall("s3:Contents/s3:Key", ns) if k.text.endswith(".parquet")]
        nxt = root.find("s3:NextContinuationToken", ns)
        if nxt is None:
            break
        token = nxt.text
    return [f"{BUCKET_URL}/{k}" for k in keys]


def _fs():
    return fsspec.filesystem("http", client_kwargs={"trust_env": True}, block_size=4 * 1024 * 1024)


def _bbox_index(md: pq.FileMetaData) -> dict[str, int]:
    names = {}
    schema = md.schema
    for i in range(len(schema)):
        names[schema.column(i).path] = i
    return names


def _rowgroup_hits(md: pq.FileMetaData, bbox) -> list[int]:
    xmin, ymin, xmax, ymax = bbox
    idx = _bbox_index(md)
    need = ["bbox.xmin", "bbox.xmax", "bbox.ymin", "bbox.ymax"]
    if not all(n in idx for n in need):
        return list(range(md.num_row_groups))
    hits = []
    for rg in range(md.num_row_groups):
        g = md.row_group(rg)
        st = {n: g.column(idx[n]).statistics for n in need}
        if any(s is None or not s.has_min_max for s in st.values()):
            hits.append(rg)
            continue
        if st["bbox.xmin"].min > xmax or st["bbox.xmax"].max < xmin:
            continue
        if st["bbox.ymin"].min > ymax or st["bbox.ymax"].max < ymin:
            continue
        hits.append(rg)
    return hits


def read_bbox(release: str, theme: str, typ: str, bbox, columns: list[str] | None = None, workers: int = 8) -> pa.Table:
    """Alle Objekte eines Typs, deren bbox das Rechteck (lng/lat) schneidet."""
    files = list_files(release, theme, typ)
    fs = _fs()
    xmin, ymin, xmax, ymax = bbox

    def one(url):
        with fs.open(url, "rb") as f:
            pf = pq.ParquetFile(f)
            rgs = _rowgroup_hits(pf.metadata, bbox)
            if not rgs:
                return None
            cols = None
            if columns:
                avail = set(pf.schema_arrow.names)
                cols = [c for c in columns if c in avail]
                for c in ("bbox", "geometry", "id"):
                    if c in avail and c not in cols:
                        cols.append(c)
            t = pf.read_row_groups(rgs, columns=cols)
        b = t.column("bbox").combine_chunks()
        bx0 = b.field("xmin").to_numpy(zero_copy_only=False)
        bx1 = b.field("xmax").to_numpy(zero_copy_only=False)
        by0 = b.field("ymin").to_numpy(zero_copy_only=False)
        by1 = b.field("ymax").to_numpy(zero_copy_only=False)
        import numpy as np

        mask = (bx0 <= xmax) & (bx1 >= xmin) & (by0 <= ymax) & (by1 >= ymin)
        return t.filter(pa.array(mask)) if mask.any() else None

    with ThreadPoolExecutor(workers) as ex:
        parts = [p for p in ex.map(one, files) if p is not None and p.num_rows]
    if not parts:
        return pa.table({})
    return pa.concat_tables(parts, promote_options="default")


def save_geojsonl(table: pa.Table, path: str) -> int:
    """Tabelle als Zeilen-JSON speichern (Geometrie als WKB-Hex), damit Läufe ohne Netz gehen."""
    rows = table.to_pylist()
    with open(path, "w", encoding="utf-8") as fh:
        for r in rows:
            g = r.get("geometry")
            if isinstance(g, (bytes, bytearray)):
                r["geometry"] = g.hex()
            fh.write(json.dumps(r, ensure_ascii=False, default=str) + "\n")
    return len(rows)
