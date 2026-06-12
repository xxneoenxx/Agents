# -*- coding: utf-8 -*-
"""Erzeugt schematische Grafiken/Diagramme fuer die Aluminium-Praesentation."""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch, Circle, Rectangle
import numpy as np

# Farbschema (metallic / blau)
ALU   = "#9aa7b4"   # aluminium-grau
ALU_D = "#5c6b7a"   # dunkelgrau
BLUE  = "#1f6feb"   # akzent blau
BLUE_D= "#0b3d91"
LIGHT = "#eef2f6"
GREEN = "#2e9e5b"
RED   = "#d23b3b"
ORANGE= "#e08a1e"
plt.rcParams["font.family"] = "DejaVu Sans"

OUT = "assets/"

# ---------------------------------------------------------------------------
# 1) Haeufigkeit der Elemente in der Erdkruste (Aluminium = haeufigstes Metall)
# ---------------------------------------------------------------------------
def img_vorkommen():
    elemente = ["Sauerstoff", "Silicium", "Aluminium", "Eisen", "Calcium", "Natrium", "Übrige"]
    anteil   = [46.6, 27.7, 8.1, 5.0, 3.6, 2.8, 6.2]
    farben   = [ALU, ALU, BLUE, ALU_D, ALU, ALU, "#cdd5dd"]
    fig, ax = plt.subplots(figsize=(8, 4.5), dpi=200)
    bars = ax.bar(elemente, anteil, color=farben, edgecolor="white", linewidth=1.5)
    for b, v in zip(bars, anteil):
        ax.text(b.get_x()+b.get_width()/2, v+0.6, f"{v} %", ha="center",
                va="bottom", fontsize=10, fontweight="bold",
                color=BLUE_D if v == 8.1 else "#333")
    ax.set_ylabel("Massenanteil in der Erdkruste (%)", fontsize=10)
    ax.set_title("Aluminium = häufigstes Metall der Erdkruste (3. Platz aller Elemente)",
                 fontsize=11, fontweight="bold", color=BLUE_D)
    ax.set_ylim(0, 52)
    ax.spines[["top", "right"]].set_visible(False)
    ax.tick_params(axis="x", labelsize=9)
    plt.xticks(rotation=15)
    plt.tight_layout()
    plt.savefig(OUT+"vorkommen.png", bbox_inches="tight")
    plt.close()

# ---------------------------------------------------------------------------
# 2) Weltkarte-ersatz: groesste Bauxit-Abbaulaender (Balken)
# ---------------------------------------------------------------------------
def img_abbau():
    laender = ["Australien", "Guinea", "China", "Brasilien", "Indien", "Indonesien"]
    foerder = [98, 97, 93, 31, 23, 21]  # Mio. t Bauxit (Groessenordnung)
    fig, ax = plt.subplots(figsize=(8, 4.2), dpi=200)
    bars = ax.barh(laender[::-1], foerder[::-1], color=BLUE, edgecolor="white")
    bars[-1].set_color(BLUE_D); bars[-2].set_color(BLUE_D)
    for b, v in zip(bars, foerder[::-1]):
        ax.text(v+1, b.get_y()+b.get_height()/2, f"{v} Mio. t",
                va="center", fontsize=9, fontweight="bold", color="#333")
    ax.set_xlabel("Bauxit-Förderung (Größenordnung, Mio. t / Jahr)", fontsize=10)
    ax.set_title("Wichtigste Abbaugebiete von Bauxit (Aluminiumerz)",
                 fontsize=11, fontweight="bold", color=BLUE_D)
    ax.set_xlim(0, 115)
    ax.spines[["top", "right"]].set_visible(False)
    plt.tight_layout()
    plt.savefig(OUT+"abbau.png", bbox_inches="tight")
    plt.close()

# ---------------------------------------------------------------------------
# 3) Herstellung: Bayer-Verfahren + Schmelzflusselektrolyse (Prozesskette)
# ---------------------------------------------------------------------------
def box(ax, x, y, w, h, text, fc, tc="white", fs=10, bold=True):
    p = FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.02,rounding_size=0.08",
                       fc=fc, ec="white", lw=2)
    ax.add_patch(p)
    ax.text(x+w/2, y+h/2, text, ha="center", va="center", fontsize=fs,
            color=tc, fontweight="bold" if bold else "normal", wrap=True)

def arrow(ax, x1, y1, x2, y2, color="#444"):
    ax.add_patch(FancyArrowPatch((x1, y1), (x2, y2),
                 arrowstyle="-|>", mutation_scale=20, lw=2.2, color=color))

def img_herstellung():
    fig, ax = plt.subplots(figsize=(9, 6.0), dpi=200)
    ax.set_xlim(0, 10); ax.set_ylim(0, 7.6); ax.axis("off")

    ax.text(5, 7.3, "Herstellung von Aluminium – zwei Stufen", ha="center",
            fontsize=13, fontweight="bold", color=BLUE_D)
    # Stufe 1
    ax.text(2.3, 6.55, "1. Bayer-Verfahren  (Tonerde-Gewinnung)", ha="center",
            fontsize=10.5, fontweight="bold", color=ORANGE)
    box(ax, 0.3, 5.25, 1.9, 0.9, "Bauxit\n(Al₂O₃ + Fe₂O₃ + …)", ALU_D, fs=9)
    box(ax, 2.7, 5.25, 1.9, 0.9, "Lösen in\nNatronlauge (heiß)", ORANGE, fs=9)
    box(ax, 5.1, 5.25, 1.9, 0.9, "Ausfällen &\nGlühen (>1000 °C)", ORANGE, fs=9)
    box(ax, 7.5, 5.25, 2.1, 0.9, "Aluminiumoxid\nAl₂O₃ (Tonerde)", BLUE, fs=9)
    arrow(ax, 2.2, 5.70, 2.7, 5.70); arrow(ax, 4.6, 5.70, 5.1, 5.70)
    arrow(ax, 7.0, 5.70, 7.5, 5.70)

    # Pfeil runter
    arrow(ax, 8.55, 5.25, 8.55, 4.55, BLUE_D)

    # Stufe 2
    ax.text(5.0, 4.25, "2. Schmelzflusselektrolyse  (Hall-Héroult-Verfahren)", ha="center",
            fontsize=10.5, fontweight="bold", color=GREEN)
    ax.text(4.8, 3.62, "+ Kohlenstoff-Anoden", ha="center", fontsize=8.5,
            color="#3a3a3a", fontweight="bold")
    # Anoden (Kohlenstoff)
    for ax0 in (3.3, 4.6, 5.9):
        ax.add_patch(Rectangle((ax0, 2.5), 0.55, 0.95, fc="#3a3a3a", ec="none"))
    # Elektrolyse-Zelle zeichnen
    cell = FancyBboxPatch((2.6, 0.95), 4.8, 1.95, boxstyle="round,pad=0.02,rounding_size=0.05",
                          fc=LIGHT, ec=ALU_D, lw=2)
    ax.add_patch(cell)
    # Schmelze
    ax.add_patch(Rectangle((2.8, 1.1), 4.4, 1.15, fc="#cfd8e0", ec="none"))
    ax.add_patch(Rectangle((2.8, 1.1), 4.4, 0.42, fc=ALU, ec="none"))  # fluessiges Alu unten
    ax.text(5.0, 1.30, "flüssiges Aluminium (sammelt sich unten)", ha="center",
            fontsize=8.5, color="white", fontweight="bold")
    ax.text(5.0, 1.90, "Schmelze: Al₂O₃ gelöst in Kryolith  (≈ 950 °C)",
            ha="center", fontsize=8.5, color=ALU_D)
    ax.text(2.85, 0.62, "– Kathode (Wanne)", ha="left", fontsize=8.5, color=ALU_D, fontweight="bold")
    # Strom-Symbol
    ax.text(8.7, 2.0, "Gleich-\nstrom", ha="center", fontsize=9, color=RED, fontweight="bold")
    arrow(ax, 8.3, 2.0, 7.45, 2.0, RED)
    # Reaktion
    ax.text(0.15, 2.05, "2 Al₂O₃ → 4 Al + 3 O₂\n(O₂ verbrennt Anode → CO₂)",
            ha="left", fontsize=8.5, color=GREEN, fontweight="bold")
    ax.text(0.15, 0.95, "Sehr energieintensiv:\n≈ 13–15 kWh / kg Alu", ha="left",
            fontsize=8.5, color=RED)
    plt.tight_layout()
    plt.savefig(OUT+"herstellung.png", bbox_inches="tight")
    plt.close()

# ---------------------------------------------------------------------------
# 4) Legierungs-Klassifikation (Baum)
# ---------------------------------------------------------------------------
def img_legierungen():
    fig, ax = plt.subplots(figsize=(9, 5.0), dpi=200)
    ax.set_xlim(0, 10); ax.set_ylim(0, 6); ax.axis("off")
    box(ax, 3.7, 5.1, 2.6, 0.75, "Aluminium-\nLegierungen", BLUE_D, fs=10)
    # Ebene 2: Knet vs Guss
    box(ax, 0.6, 3.6, 3.4, 0.85, "Knetlegierung\n(Walzen, Pressen, Schmieden)", BLUE, fs=9)
    box(ax, 6.0, 3.6, 3.4, 0.85, "Gusslegierung\n(Formguss, Druckguss)", ALU_D, fs=9)
    arrow(ax, 4.6, 5.1, 2.3, 4.45); arrow(ax, 5.4, 5.1, 7.7, 4.45)
    # Ebene 3: aushaertbar / nicht
    box(ax, 0.3, 2.0, 1.9, 0.85, "aushärtbar\nz.B. AlCuMg,\nAlMgSi", GREEN, fs=8)
    box(ax, 2.4, 2.0, 1.9, 0.85, "nicht aushärtbar\nz.B. AlMg, AlMn", ORANGE, fs=8)
    box(ax, 5.7, 2.0, 1.9, 0.85, "aushärtbar\nz.B. AlSiMg", GREEN, fs=8)
    box(ax, 7.8, 2.0, 1.9, 0.85, "nicht aushärtbar\nz.B. AlSi", ORANGE, fs=8)
    arrow(ax, 1.7, 3.6, 1.25, 2.85); arrow(ax, 2.9, 3.6, 3.35, 2.85)
    arrow(ax, 7.3, 3.6, 6.65, 2.85); arrow(ax, 7.9, 3.6, 8.75, 2.85)
    # Legende
    ax.text(5.0, 0.9, "aushärtbar  = Festigkeit durch Wärmebehandlung (Ausscheidungshärtung) steigerbar",
            ha="center", fontsize=8.5, color=GREEN, fontweight="bold")
    ax.text(5.0, 0.45, "nicht aushärtbar = Festigkeit nur durch Kaltverfestigung / Legieren steigerbar",
            ha="center", fontsize=8.5, color=ORANGE, fontweight="bold")
    plt.tight_layout()
    plt.savefig(OUT+"legierungen.png", bbox_inches="tight")
    plt.close()

# ---------------------------------------------------------------------------
# 5) Drei Mechanismen der Festigkeitssteigerung
# ---------------------------------------------------------------------------
def img_festigkeit():
    fig, ax = plt.subplots(figsize=(9, 4.4), dpi=200)
    ax.set_xlim(0, 12); ax.set_ylim(0, 6); ax.axis("off")
    titel = ["1. Mischkristall-\nverfestigung", "2. Kaltverfestigung\n(Kaltverformung)", "3. Ausscheidungs-\nhärtung (Aushärten)"]
    farbe = [BLUE, ORANGE, GREEN]
    cx = [2.0, 6.0, 10.0]
    for x, t, c in zip(cx, titel, farbe):
        box(ax, x-1.7, 4.6, 3.4, 1.0, t, c, fs=9.5)
    # Schemata darunter
    # MK
    for i in range(5):
        for j in range(5):
            ax.add_patch(Circle((1.1+i*0.45, 1.6+j*0.45), 0.16, fc=ALU, ec="white"))
    # Fremdatome
    for (i, j) in [(1,1),(3,2),(2,4),(0,3),(4,0)]:
        ax.add_patch(Circle((1.1+i*0.45, 1.6+j*0.45), 0.16, fc=BLUE, ec="white"))
    ax.text(2.0, 0.8, "Fremdatome verspannen\ndas Gitter", ha="center", fontsize=8, color="#444")
    # Kaltverfestigung – Versetzungslinien
    for k in range(6):
        ax.plot([4.6+k*0.25, 5.0+k*0.25], [1.5+k*0.18, 3.4-k*0.05], color=ORANGE, lw=1.6)
    ax.text(6.0, 0.8, "Versetzungen stauen sich,\nbehindern sich gegenseitig", ha="center", fontsize=8, color="#444")
    # Ausscheidung – kleine Teilchen in Matrix
    rng = np.random.default_rng(3)
    for _ in range(40):
        x = 8.5+rng.random()*2.6; y = 1.5+rng.random()*1.9
        ax.add_patch(Circle((x, y), 0.07, fc=GREEN, ec="none"))
    ax.add_patch(Rectangle((8.5, 1.5), 2.6, 1.9, fc="none", ec=ALU_D, lw=1.4))
    ax.text(10.0, 0.8, "feine Ausscheidungen\nblockieren Versetzungen", ha="center", fontsize=8, color="#444")
    ax.set_title("Drei Möglichkeiten zur Festigkeitssteigerung von Aluminiumlegierungen",
                 fontsize=12, fontweight="bold", color=BLUE_D, y=1.02)
    plt.tight_layout()
    plt.savefig(OUT+"festigkeit.png", bbox_inches="tight")
    plt.close()

# ---------------------------------------------------------------------------
# 6) Titelgrafik: stilisierter LKW + Alu-Bloecke
# ---------------------------------------------------------------------------
def img_titel():
    fig, ax = plt.subplots(figsize=(9, 4.0), dpi=200)
    ax.set_xlim(0, 12); ax.set_ylim(0, 5); ax.axis("off")
    fig.patch.set_facecolor("white")
    # LKW (stark vereinfacht, Seitenansicht)
    # Auflieger
    ax.add_patch(FancyBboxPatch((3.3, 1.4), 5.2, 1.9, boxstyle="round,pad=0.02,rounding_size=0.08",
                 fc=ALU, ec=ALU_D, lw=2))
    # Fahrerhaus
    ax.add_patch(FancyBboxPatch((1.2, 1.4), 2.0, 1.6, boxstyle="round,pad=0.02,rounding_size=0.12",
                 fc=BLUE, ec=BLUE_D, lw=2))
    ax.add_patch(FancyBboxPatch((1.5, 2.15), 1.2, 0.7, boxstyle="round,pad=0.02,rounding_size=0.06",
                 fc="#cfe0ff", ec=BLUE_D, lw=1.5))  # Scheibe
    # Raeder
    for cx in (2.2, 5.0, 6.2, 7.6):
        ax.add_patch(Circle((cx, 1.25), 0.5, fc="#2a2a2a", ec="#111", lw=1))
        ax.add_patch(Circle((cx, 1.25), 0.2, fc=ALU, ec="#111"))
    # Alu-Bloecke
    for i, x in enumerate((9.3, 10.0, 10.7)):
        ax.add_patch(FancyBboxPatch((x, 1.4+0.0), 0.55, 0.9, boxstyle="round,pad=0.01,rounding_size=0.05",
                     fc=ALU, ec=ALU_D, lw=1.5))
    ax.text(10.05, 1.05, "Al-Rohblöcke", ha="center", fontsize=8.5, color=ALU_D, fontweight="bold")
    ax.text(6.0, 0.45, "Leichtbau im Nutzfahrzeug – Werkstoff Aluminium",
            ha="center", fontsize=11, color=ALU_D, style="italic")
    # Al-Symbol gross
    ax.text(0.9, 4.3, "Al", ha="center", fontsize=34, fontweight="bold", color=BLUE_D)
    ax.text(0.9, 3.75, "13", ha="center", fontsize=11, color=ALU_D)
    plt.tight_layout()
    plt.savefig(OUT+"titel.png", bbox_inches="tight")
    plt.close()

for f in (img_titel, img_vorkommen, img_abbau, img_herstellung,
          img_legierungen, img_festigkeit):
    f()
    print("ok:", f.__name__)
print("Alle Grafiken erstellt.")
