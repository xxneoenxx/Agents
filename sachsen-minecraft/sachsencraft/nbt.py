"""Minimaler NBT-Schreiber (Named Binary Tag, Big Endian) für Minecraft-Java-Dateien."""

from __future__ import annotations

import gzip
import struct

import numpy as np

TAG_END, TAG_BYTE, TAG_SHORT, TAG_INT, TAG_LONG, TAG_FLOAT, TAG_DOUBLE = 0, 1, 2, 3, 4, 5, 6
TAG_BYTE_ARRAY, TAG_STRING, TAG_LIST, TAG_COMPOUND, TAG_INT_ARRAY, TAG_LONG_ARRAY = 7, 8, 9, 10, 11, 12


class _Num:
    __slots__ = ("v",)

    def __init__(self, v):
        self.v = v

    def __repr__(self):
        return f"{type(self).__name__}({self.v})"


class Byte(_Num):
    tag = TAG_BYTE


class Short(_Num):
    tag = TAG_SHORT


class Int(_Num):
    tag = TAG_INT


class Long(_Num):
    tag = TAG_LONG


class Float(_Num):
    tag = TAG_FLOAT


class Double(_Num):
    tag = TAG_DOUBLE


class ByteArray(_Num):
    tag = TAG_BYTE_ARRAY


class IntArray(_Num):
    tag = TAG_INT_ARRAY


class LongArray(_Num):
    """Werte als numpy-Array (int64) oder Liste."""

    tag = TAG_LONG_ARRAY


class List:
    __slots__ = ("elem_tag", "items")

    def __init__(self, elem_tag: int, items=None):
        self.elem_tag = elem_tag
        self.items = list(items or [])


def _tag_of(v) -> int:
    if isinstance(v, (_Num,)):
        return v.tag
    if isinstance(v, str):
        return TAG_STRING
    if isinstance(v, dict):
        return TAG_COMPOUND
    if isinstance(v, List):
        return TAG_LIST
    if isinstance(v, bool):
        return TAG_BYTE
    raise TypeError(f"NBT-Typ unklar für {type(v).__name__}: {v!r}")


def _str(s: str) -> bytes:
    b = s.encode("utf-8")
    return struct.pack(">H", len(b)) + b


def _payload(out: list, tag: int, v) -> None:
    if tag == TAG_BYTE:
        out.append(struct.pack(">b", int(v.v if isinstance(v, _Num) else v)))
    elif tag == TAG_SHORT:
        out.append(struct.pack(">h", v.v))
    elif tag == TAG_INT:
        out.append(struct.pack(">i", v.v))
    elif tag == TAG_LONG:
        out.append(struct.pack(">q", v.v))
    elif tag == TAG_FLOAT:
        out.append(struct.pack(">f", v.v))
    elif tag == TAG_DOUBLE:
        out.append(struct.pack(">d", v.v))
    elif tag == TAG_BYTE_ARRAY:
        a = np.asarray(v.v, dtype=">i1")
        out.append(struct.pack(">i", a.size))
        out.append(a.tobytes())
    elif tag == TAG_STRING:
        out.append(_str(v))
    elif tag == TAG_LIST:
        out.append(struct.pack(">bi", v.elem_tag if v.items else (v.elem_tag or TAG_END), len(v.items)))
        for item in v.items:
            _payload(out, v.elem_tag, item)
    elif tag == TAG_COMPOUND:
        for k, item in v.items():
            t = _tag_of(item)
            out.append(struct.pack(">b", t))
            out.append(_str(k))
            _payload(out, t, item)
        out.append(b"\x00")
    elif tag == TAG_INT_ARRAY:
        a = np.asarray(v.v, dtype=">i4")
        out.append(struct.pack(">i", a.size))
        out.append(a.tobytes())
    elif tag == TAG_LONG_ARRAY:
        a = np.asarray(v.v, dtype=">i8")
        out.append(struct.pack(">i", a.size))
        out.append(a.tobytes())
    else:
        raise ValueError(tag)


def dumps(root: dict, name: str = "") -> bytes:
    """Wurzel-Compound als unkomprimierte NBT-Bytes."""
    out = [struct.pack(">b", TAG_COMPOUND), _str(name)]
    _payload(out, TAG_COMPOUND, root)
    return b"".join(out)


def write_gzip(path: str, root: dict, name: str = "") -> None:
    with gzip.open(path, "wb") as fh:
        fh.write(dumps(root, name))


def to_signed64(arr: np.ndarray) -> np.ndarray:
    """uint64-Bitmuster als int64 (Minecraft speichert Longs vorzeichenbehaftet)."""
    return np.asarray(arr, dtype=np.uint64).view(np.int64)
