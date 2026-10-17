import gzip
import os

from memecoin_bot.tape import ReadStats, TapeWriter, apply_retention, read_records, tape_files

T0 = 1_792_232_400.0  # 2026-10-17 10:20 UTC


class Clock:
    def __init__(self, t):
        self.t = t

    def __call__(self):
        return self.t


def test_rotation_compression_and_reading(tmp_path):
    clock = Clock(T0)
    w = TapeWriter(tmp_path, clock=clock, header={"idl": "x"})
    w.write(["X", 1, "a"])
    clock.t += 3600  # next hour
    w.write(["X", 2, "b"])
    w.close()
    files = tape_files(tmp_path)
    assert [f.name for f in files] == ["tape-20261017-10.jsonl.gz", "tape-20261017-11.jsonl"]
    records = list(read_records(files))
    kinds = [r[0] for r in records]
    assert kinds == ["H", "X", "E", "H", "X"]
    assert records[0][3] == {"idl": "x"} and records[2][2] == "tape-20261017-11.jsonl"


def test_restart_in_same_hour_appends_after_partial_line(tmp_path):
    clock = Clock(T0)
    w = TapeWriter(tmp_path, clock=clock)
    w.write(["X", 1])
    w.close()
    path = tape_files(tmp_path)[0]
    with path.open("a") as fh:
        fh.write('["X", 2, "cut')  # crash mid-line
    w2 = TapeWriter(tmp_path, clock=clock)
    w2.write(["X", 3])
    w2.close()
    stats = ReadStats()
    records = list(read_records(tape_files(tmp_path), stats))
    assert [r[0] for r in records] == ["H", "X", "X"] and records[-1] == ["X", 3]
    assert stats.bad_lines == 1


def test_leftover_plain_files_get_compressed_on_start(tmp_path):
    clock = Clock(T0)
    w = TapeWriter(tmp_path, clock=clock)
    w.write(["X", 1])
    w.close()  # current hour stays plain on clean shutdown
    clock.t += 2 * 3600
    w2 = TapeWriter(tmp_path, clock=clock)
    w2.close()
    assert [f.name for f in tape_files(tmp_path)] == ["tape-20261017-10.jsonl.gz"]


def test_truncated_gzip_is_tolerated(tmp_path):
    path = tmp_path / "tape-20261017-09.jsonl.gz"
    lines = b"".join(b'["X",%d,"%s"]\n' % (i, os.urandom(16).hex().encode()) for i in range(2000))
    data = gzip.compress(b'["H",1,1,{}]\n' + lines)
    path.write_bytes(data[: len(data) // 2])
    stats = ReadStats()
    records = list(read_records([path], stats))
    assert records[0][0] == "H" and 500 < len(records) < 1500
    assert stats.truncated_files == 1 and stats.bad_lines <= 1


def test_retention_by_age_and_free_space(tmp_path):
    for day, hour in [("20261001", "00"), ("20261015", "00"), ("20261016", "00"), ("20261017", "10")]:
        (tmp_path / f"tape-{day}-{hour}.jsonl.gz").write_bytes(b"x")
    current = tmp_path / "tape-20261017-10.jsonl.gz"
    deleted = apply_retention(tmp_path, keep_days=7, min_free_bytes=0, now=T0, protect=[current])
    assert [p.name for p in deleted] == ["tape-20261001-00.jsonl.gz"]

    class Disk:
        calls = 0

    def disk_free_counting(_):
        Disk.calls += 1
        return 100 if Disk.calls == 1 else 10_000

    deleted = apply_retention(tmp_path, keep_days=0, min_free_bytes=5000, now=T0, protect=[current],
                       disk_free=disk_free_counting)
    assert [p.name for p in deleted] == ["tape-20261015-00.jsonl.gz"]
    assert current.exists()
