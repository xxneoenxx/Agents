"""Baut eine Modrinth-Modpack-Datei (.mrpack) mit Fabric 26.3, der Welt und deutschen Grundeinstellungen.

Die Mods selbst werden danach in der Modrinth App mit einem Klick hinzugefügt (siehe ANLEITUNG.md),
weil die App dann automatisch die passende 26.3-Version jedes Mods wählt.

    python build_mrpack.py --welt "Lunzenau 1zu1" --aus Lunzenau-1zu1.mrpack
"""

from __future__ import annotations

import argparse
import json
import os
import zipfile

MINECRAFT = "26.3"
FABRIC_LOADER = "0.19.5"

OPTIONS = """version:4189
lang:de_de
renderDistance:12
simulationDistance:8
maxFps:120
enableVsync:true
graphicsMode:1
ao:true
biomeBlendRadius:2
entityDistanceScaling:0.75
mipmapLevels:4
guiScale:0
fov:0.0
autoJump:false
"""


def build(world_dir: str, out: str, name: str, version: str = "1.0.0") -> None:
    index = {
        "formatVersion": 1,
        "game": "minecraft",
        "versionId": version,
        "name": name,
        "summary": "Lunzenau (Mittelsachsen) im Maßstab 1:1 aus echten Geodaten. Fabric 26.3 – Mods in der App hinzufügen (siehe Anleitung).",
        "files": [],
        "dependencies": {"minecraft": MINECRAFT, "fabric-loader": FABRIC_LOADER},
    }
    world_name = os.path.basename(os.path.normpath(world_dir))
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        z.writestr("modrinth.index.json", json.dumps(index, ensure_ascii=False, indent=2))
        z.writestr("overrides/options.txt", OPTIONS)
        for root, _, files in os.walk(world_dir):
            for f in files:
                p = os.path.join(root, f)
                rel = os.path.relpath(p, world_dir)
                # Region-Dateien sind schon komprimiert -> nur speichern geht schneller
                ctype = zipfile.ZIP_STORED if f.endswith(".png") else zipfile.ZIP_DEFLATED
                z.write(p, f"overrides/saves/{world_name}/{rel}", compress_type=ctype)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--welt", required=True, help="Ordner der Minecraft-Welt")
    ap.add_argument("--aus", required=True, help="Ziel-.mrpack")
    ap.add_argument("--name", default="Lunzenau 1:1 – Sachsen in Minecraft")
    a = ap.parse_args()
    build(a.welt, a.aus, a.name)
    print("geschrieben:", a.aus, os.path.getsize(a.aus) // (1024 * 1024), "MB")
