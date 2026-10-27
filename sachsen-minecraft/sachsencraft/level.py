"""level.dat im Format von Minecraft Java 1.21.1 (neuere Versionen aktualisieren die Welt beim Öffnen)."""

from __future__ import annotations

import os
import time

from .anvil import DATA_VERSION
from .nbt import Byte, Double, Float, Int, List, Long, TAG_COMPOUND, TAG_STRING, write_gzip


def _noise_dim(kind: str) -> dict:
    if kind == "nether":
        return {"type": "minecraft:the_nether", "generator": {"type": "minecraft:noise", "settings": "minecraft:nether",
                "biome_source": {"type": "minecraft:multi_noise", "preset": "minecraft:nether"}}}
    return {"type": "minecraft:the_end", "generator": {"type": "minecraft:noise", "settings": "minecraft:end",
            "biome_source": {"type": "minecraft:the_end"}}}


def write_level(world_dir: str, name: str, spawn: tuple[int, int, int], game_type: int = 1, seed: int = 20260915,
                cheats: bool = True, gamerules: dict | None = None) -> None:
    os.makedirs(world_dir, exist_ok=True)
    rules = {
        "doFireTick": "false",  # keine Waldbrände in der echten Landschaft
        "mobGriefing": "false",  # Creeper sprengen keine echten Häuser
        "spawnRadius": "0",
        "doDaylightCycle": "true",
        "doWeatherCycle": "true",
        "keepInventory": "false",
        "doMobSpawning": "true",
        "playersSleepingPercentage": "100",
    }
    if gamerules:
        rules.update(gamerules)
    data = {
        "DataVersion": Int(DATA_VERSION),
        "version": Int(19133),
        "Version": {"Id": Int(DATA_VERSION), "Name": "1.21.1", "Series": "main", "Snapshot": Byte(0)},
        "LevelName": name,
        "GameType": Int(game_type),
        "Difficulty": Byte(1),
        "DifficultyLocked": Byte(0),
        "hardcore": Byte(0),
        "allowCommands": Byte(1 if cheats else 0),
        "initialized": Byte(1),
        "SpawnX": Int(spawn[0]),
        "SpawnY": Int(spawn[1]),
        "SpawnZ": Int(spawn[2]),
        "SpawnAngle": Float(0.0),
        "Time": Long(0),
        "DayTime": Long(1000),
        "LastPlayed": Long(int(time.time() * 1000)),
        "raining": Byte(0),
        "rainTime": Int(60000),
        "thundering": Byte(0),
        "thunderTime": Int(90000),
        "clearWeatherTime": Int(0),
        "WasModded": Byte(0),
        "ServerBrands": List(TAG_STRING, ["vanilla"]),
        "GameRules": rules,
        "DataPacks": {"Enabled": List(TAG_STRING, ["vanilla"]), "Disabled": List(TAG_STRING, [])},
        "enabled_features": List(TAG_STRING, ["minecraft:vanilla"]),
        "BorderCenterX": Double(spawn[0]),
        "BorderCenterZ": Double(spawn[2]),
        "BorderSize": Double(59999968.0),
        "BorderSafeZone": Double(5.0),
        "BorderWarningBlocks": Double(5.0),
        "BorderWarningTime": Double(15.0),
        "BorderSizeLerpTarget": Double(59999968.0),
        "BorderSizeLerpTime": Long(0),
        "BorderDamagePerBlock": Double(0.2),
        "WanderingTraderSpawnChance": Int(25),
        "WanderingTraderSpawnDelay": Int(24000),
        "ScheduledEvents": List(TAG_COMPOUND, []),
        "WorldGenSettings": {
            "seed": Long(seed),
            "generate_features": Byte(0),
            "bonus_chest": Byte(0),
            "dimensions": {
                # Außerhalb der echten Landschaft: leere Leere (keine Fantasie-Berge am Rand)
                "minecraft:overworld": {"type": "minecraft:overworld", "generator": {"type": "minecraft:flat", "settings": {
                    "biome": "minecraft:the_void", "features": Byte(0), "lakes": Byte(0),
                    "layers": List(TAG_COMPOUND, [{"block": "minecraft:air", "height": Int(1)}]),
                    "structure_overrides": List(TAG_STRING, [])}}},
                "minecraft:the_nether": _noise_dim("nether"),
                "minecraft:the_end": _noise_dim("end"),
            },
        },
    }
    write_gzip(os.path.join(world_dir, "level.dat"), {"Data": data})
