"""The tape: an append-only recording of everything the recorder sees.

One JSON array per line, one file per UTC hour (`tape-YYYYMMDD-HH.jsonl`).
Closed hours are gzip-compressed in a background thread. Readers tolerate a
truncated last line or gzip stream, so a crash never makes a tape unreadable.
"""

from __future__ import annotations

import gzip
import json
import logging
import os
import re
import shutil
import threading
import time
import zlib
from collections.abc import Callable, Iterable, Iterator
from pathlib import Path

log = logging.getLogger(__name__)

TAPE_VERSION = 1
_NAME = re.compile(r"^(?P<prefix>.+)-(?P<day>\d{8})-(?P<hour>\d{2})\.jsonl(?P<gz>\.gz)?$")


def hour_key(path: Path) -> str | None:
    m = _NAME.match(path.name)
    return f"{m['day']}{m['hour']}" if m else None


def _hour_name(prefix: str, hour: int) -> str:
    return f"{prefix}-{time.strftime('%Y%m%d-%H', time.gmtime(hour * 3600))}.jsonl"


def _compress(path: Path) -> None:
    target = path.with_name(path.name + ".gz")
    tmp = path.with_name(path.name + ".gz.tmp")
    try:
        with path.open("rb") as src, gzip.open(tmp, "wb", compresslevel=6) as dst:
            shutil.copyfileobj(src, dst, 1024 * 1024)
        os.replace(tmp, target)
        path.unlink()
    except OSError as exc:
        log.warning("Komprimieren von %s fehlgeschlagen: %s", path.name, exc)
        tmp.unlink(missing_ok=True)


class TapeWriter:
    def __init__(self, directory: str | os.PathLike, prefix: str = "tape", compress: bool = True,
                 flush_interval: float = 0.5, clock: Callable[[], float] = time.time,
                 header: dict | None = None):
        self.dir = Path(directory)
        self.dir.mkdir(parents=True, exist_ok=True)
        self.prefix = prefix
        self.compress = compress
        self.flush_interval = flush_interval
        self.clock = clock
        self.header = header or {}
        self.bytes_written = 0
        self.records_written = 0
        self._fh = None
        self._hour: int | None = None
        self._path: Path | None = None
        self._last_flush = 0.0
        self._threads: list[threading.Thread] = []
        self._compress_leftovers()

    @property
    def current_path(self) -> Path | None:
        return self._path

    def write(self, record: list) -> None:
        now = self.clock()
        hour = int(now // 3600)
        if hour != self._hour:
            self._rotate(hour, now)
        line = json.dumps(record, separators=(",", ":"), ensure_ascii=False) + "\n"
        self._fh.write(line)
        self.bytes_written += len(line)
        self.records_written += 1
        if now - self._last_flush >= self.flush_interval:
            self.flush()

    def flush(self) -> None:
        if self._fh:
            self._fh.flush()
            self._last_flush = self.clock()

    def close(self) -> None:
        if self._fh:
            self._fh.flush()
            self._fh.close()
            self._fh = None
        for t in self._threads:
            t.join(timeout=60)

    def _rotate(self, hour: int, now: float) -> None:
        old = self._path
        new = self.dir / _hour_name(self.prefix, hour)
        if self._fh:
            self._fh.write(json.dumps(["E", now, new.name]) + "\n")
            self._fh.close()
            self._fh = None
            if self.compress and old:
                self._spawn_compress(old)
        needs_newline = new.exists() and new.stat().st_size > 0 and self._last_byte(new) != b"\n"
        empty = not new.exists() or new.stat().st_size == 0
        self._fh = new.open("a", encoding="utf-8")
        if needs_newline:
            self._fh.write("\n")  # previous process died mid-line
        if empty:
            self._fh.write(json.dumps(["H", now, TAPE_VERSION, self.header], separators=(",", ":")) + "\n")
        self._path = new
        self._hour = hour

    @staticmethod
    def _last_byte(path: Path) -> bytes:
        with path.open("rb") as fh:
            fh.seek(-1, os.SEEK_END)
            return fh.read(1)

    def _spawn_compress(self, path: Path) -> None:
        self._threads = [t for t in self._threads if t.is_alive()]
        t = threading.Thread(target=_compress, args=(path,), name=f"compress-{path.name}", daemon=True)
        t.start()
        self._threads.append(t)

    def _compress_leftovers(self) -> None:
        if not self.compress:
            return
        current = _hour_name(self.prefix, int(self.clock() // 3600))
        for path in sorted(self.dir.glob(f"{self.prefix}-*.jsonl")):
            if path.name != current:
                self._spawn_compress(path)
        for tmp in self.dir.glob(f"{self.prefix}-*.gz.tmp"):
            tmp.unlink(missing_ok=True)


def tape_files(directory: str | os.PathLike, prefix: str = "tape") -> list[Path]:
    """All tape files sorted by hour. If both plain and gzip exist (compression in
    progress), the plain file is the complete one."""
    by_hour: dict[str, Path] = {}
    for path in Path(directory).glob(f"{prefix}-*.jsonl*"):
        key = hour_key(path)
        if key is None:
            continue
        if key not in by_hour or not path.name.endswith(".gz"):
            by_hour[key] = path
    return [by_hour[k] for k in sorted(by_hour)]


class ReadStats:
    def __init__(self) -> None:
        self.files = 0
        self.records = 0
        self.bad_lines = 0
        self.truncated_files = 0


def _iter_gzip_lines(path: Path, stats: "ReadStats") -> Iterator[bytes]:
    """Stream-decompress so a truncated gzip still yields every complete line."""
    d = zlib.decompressobj(16 + zlib.MAX_WBITS)
    in_member = False
    pending = b""
    with path.open("rb") as fh:
        while chunk := fh.read(1024 * 1024):
            while chunk:
                in_member = True
                try:
                    pending += d.decompress(chunk)
                except zlib.error as exc:
                    log.warning("Tape-Datei %s beschädigt: %s", path.name, exc)
                    stats.truncated_files += 1
                    return
                *lines, pending = pending.split(b"\n")
                yield from lines
                if d.eof:  # member finished; any bytes after it start the next member
                    chunk = d.unused_data
                    d = zlib.decompressobj(16 + zlib.MAX_WBITS)
                    in_member = False
                else:
                    chunk = b""
    if in_member:
        stats.truncated_files += 1
        log.warning("Tape-Datei %s endet mitten im gzip-Strom", path.name)
    if pending:
        yield pending


def _iter_plain_lines(path: Path) -> Iterator[bytes]:
    with path.open("rb") as fh:
        for line in fh:
            yield line.rstrip(b"\n")


def read_records(paths: Iterable[str | os.PathLike], stats: ReadStats | None = None) -> Iterator[list]:
    stats = stats or ReadStats()
    for p in paths:
        path = Path(p)
        stats.files += 1
        lines = _iter_gzip_lines(path, stats) if path.name.endswith(".gz") else _iter_plain_lines(path)
        try:
            for raw in lines:
                if not raw.strip():
                    continue
                try:
                    record = json.loads(raw.decode("utf-8", errors="replace"))
                except json.JSONDecodeError:
                    stats.bad_lines += 1
                    continue
                if isinstance(record, list) and record:
                    stats.records += 1
                    yield record
                else:
                    stats.bad_lines += 1
        except OSError as exc:
            stats.truncated_files += 1
            log.warning("Tape-Datei %s nicht lesbar: %s", path.name, exc)


def apply_retention(directory: str | os.PathLike, keep_days: float, min_free_bytes: int, now: float,
                    protect: Iterable[Path] = (), prefix: str = "tape",
                    disk_free: Callable[[Path], int] | None = None) -> list[Path]:
    """Delete tape files older than `keep_days`, then the oldest ones while less
    than `min_free_bytes` are free. Protected files (the open hour) stay."""
    directory = Path(directory)
    free = disk_free or (lambda d: shutil.disk_usage(d).free)
    protected = {Path(p).resolve() for p in protect}
    cutoff = time.strftime("%Y%m%d%H", time.gmtime(now - keep_days * 86400))
    files = [p for p in tape_files(directory, prefix) if p.resolve() not in protected]
    deleted: list[Path] = []
    for path in list(files):
        if keep_days > 0 and hour_key(path) < cutoff:
            path.unlink(missing_ok=True)
            deleted.append(path)
            files.remove(path)
    while files and min_free_bytes > 0 and free(directory) < min_free_bytes:
        path = files.pop(0)
        path.unlink(missing_ok=True)
        deleted.append(path)
    return deleted
