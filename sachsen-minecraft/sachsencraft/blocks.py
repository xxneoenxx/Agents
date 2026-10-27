"""Blockzustände als kleine Zahlen (uint16) und ihre NBT-Palette-Einträge.

Alle Namen und Eigenschaften entsprechen Minecraft Java 1.21.1 (DataVersion 3955).
Neuere Versionen (z. B. 26.3) aktualisieren die Welt beim Öffnen automatisch.
"""

from __future__ import annotations

_states: list[tuple[str, tuple]] = []
_index: dict[tuple[str, tuple], int] = {}


def B(name: str, **props) -> int:
    """Block-ID für einen Blockzustand, z. B. B('oak_stairs', facing='north', half='bottom')."""
    if ":" not in name:
        name = "minecraft:" + name
    key = (name, tuple(sorted((k, _val(v)) for k, v in props.items())))
    i = _index.get(key)
    if i is None:
        i = len(_states)
        _states.append(key)
        _index[key] = i
    return i


def _val(v) -> str:
    if isinstance(v, bool):
        return "true" if v else "false"
    return str(v)


def state(i: int) -> tuple[str, tuple]:
    return _states[i]


def name_of(i: int) -> str:
    return _states[i][0]


def palette_entry(i: int) -> dict:
    name, props = _states[i]
    entry = {"Name": name}
    if props:
        entry["Properties"] = {k: v for k, v in props}
    return entry


def count() -> int:
    return len(_states)


# --- Häufige Blöcke (Reihenfolge egal, AIR muss 0 sein) ---------------------
AIR = B("air")
assert AIR == 0
STONE = B("stone")
DEEPSLATE = B("deepslate", axis="y")
BEDROCK = B("bedrock")
DIRT = B("dirt")
COARSE_DIRT = B("coarse_dirt")
GRASS = B("grass_block", snowy=False)
PODZOL = B("podzol", snowy=False)
MOSS = B("moss_block")
SAND = B("sand")
GRAVEL = B("gravel")
CLAY = B("clay")
MUD = B("mud")
WATER = B("water", level=0)
ANDESITE = B("andesite")
GRANITE = B("granite")
DIORITE = B("diorite")
POLISHED_ANDESITE = B("polished_andesite")
STONE_BRICKS = B("stone_bricks")
COBBLESTONE = B("cobblestone")
MOSSY_COBBLE = B("mossy_cobblestone")
SMOOTH_STONE = B("smooth_stone")
DIRT_PATH = B("dirt_path")
FARMLAND = B("farmland", moisture=7)
ROOTED_DIRT = B("rooted_dirt")

ASPHALT = B("gray_concrete")
ASPHALT_DARK = B("black_concrete")
ROAD_LINE = B("white_concrete")
PAVING = B("stone_bricks")
SIDEWALK = B("polished_andesite")

SHORT_GRASS = B("short_grass")
TALL_GRASS_LOWER = B("tall_grass", half="lower")
TALL_GRASS_UPPER = B("tall_grass", half="upper")
FERN = B("fern")
FLOWERS = [B("dandelion"), B("poppy"), B("cornflower"), B("oxeye_daisy"), B("azure_bluet"), B("white_tulip")]
WHEAT = [B("wheat", age=a) for a in range(8)]
CARROTS = [B("carrots", age=a) for a in range(8)]
POTATOES = [B("potatoes", age=a) for a in range(8)]
BEETROOTS = [B("beetroots", age=a) for a in range(4)]
LILY_PAD = B("lily_pad")

OAK_LOG = B("oak_log", axis="y")
SPRUCE_LOG = B("spruce_log", axis="y")
BIRCH_LOG = B("birch_log", axis="y")
DARK_OAK_LOG = B("dark_oak_log", axis="y")


def leaves(kind: str) -> int:
    return B(f"{kind}_leaves", persistent=True, distance=1, waterlogged=False)


OAK_LEAVES = leaves("oak")
SPRUCE_LEAVES = leaves("spruce")
BIRCH_LEAVES = leaves("birch")
DARK_OAK_LEAVES = leaves("dark_oak")
AZALEA_LEAVES = leaves("azalea")

GLASS = B("glass")
OAK_PLANKS = B("oak_planks")
SPRUCE_PLANKS = B("spruce_planks")

ORES_STONE = {
    "coal": B("coal_ore"),
    "iron": B("iron_ore"),
    "copper": B("copper_ore"),
    "gold": B("gold_ore"),
    "redstone": B("redstone_ore", lit=False),
    "lapis": B("lapis_ore"),
    "diamond": B("diamond_ore"),
}
ORES_DEEP = {
    "coal": B("deepslate_coal_ore"),
    "iron": B("deepslate_iron_ore"),
    "copper": B("deepslate_copper_ore"),
    "gold": B("deepslate_gold_ore"),
    "redstone": B("deepslate_redstone_ore", lit=False),
    "lapis": B("deepslate_lapis_ore"),
    "diamond": B("deepslate_diamond_ore"),
}

HORIZONTAL = ("north", "east", "south", "west")


def stairs(material: str, facing: str, half: str = "bottom", shape: str = "straight") -> int:
    return B(f"{material}_stairs", facing=facing, half=half, shape=shape, waterlogged=False)


def slab(material: str, typ: str = "bottom") -> int:
    return B(f"{material}_slab", type=typ, waterlogged=False)


def pane(material: str, north=False, east=False, south=False, west=False) -> int:
    return B(material, north=north, east=east, south=south, west=west, waterlogged=False)


def fence(material: str, north=False, east=False, south=False, west=False) -> int:
    return B(material, north=north, east=east, south=south, west=west, waterlogged=False)


def wall(material: str, north="none", east="none", south="none", west="none", up=True) -> int:
    return B(material, north=north, east=east, south=south, west=west, up=up, waterlogged=False)


def door(material: str, facing: str, half: str, hinge: str = "left") -> int:
    return B(f"{material}_door", facing=facing, half=half, hinge=hinge, open=False, powered=False)


def ladder(facing: str) -> int:
    return B("ladder", facing=facing, waterlogged=False)


def sign(material: str, rotation: int) -> int:
    return B(f"{material}_sign", rotation=rotation % 16, waterlogged=False)


def rail(shape: str) -> int:
    return B("rail", shape=shape, waterlogged=False)


LANTERN = B("lantern", hanging=False, waterlogged=False)
