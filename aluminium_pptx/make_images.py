#!/usr/bin/env python3
"""Erzeugt die Diagramme/Illustrationen fuer die Aluminium-Praesentation."""
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, FancyArrowPatch, FancyBboxPatch, Wedge
from matplotlib.lines import Line2D

# Farbpalette (passend zum Deck)
DARK   = "#22303A"   # Stahl-Anthrazit
STEEL  = "#37474F"
BLUE   = "#2E7DA1"   # Stahlblau Akzent
LBLUE  = "#5FB0D4"
SILVER = "#C9D2D9"
HOT    = "#E8923A"   # "fluessiges Aluminium" Akzent
PANEL  = "#F2F5F7"
WHITE  = "#FFFFFF"
INK    = "#22303A"

OUT = "/home/user/Agents/aluminium_pptx/images/"

# ----------------------------------------------------------------------------
# 1) Bohrsches Atommodell von Aluminium (13 Protonen, Schalen 2-8-3)
# ----------------------------------------------------------------------------
def atom_model():
    fig, ax = plt.subplots(figsize=(6.2, 6.2), dpi=200)
    ax.set_xlim(-6, 6); ax.set_ylim(-6, 6); ax.set_aspect("equal"); ax.axis("off")
    fig.patch.set_alpha(0)

    shells = [(2.0, 2), (3.7, 8), (5.3, 3)]
    # Schalenbahnen
    for r, _ in shells:
        ax.add_patch(Circle((0, 0), r, fill=False, ec=SILVER, lw=1.6, zorder=1))

    # Kern
    ax.add_patch(Circle((0, 0), 1.25, fc=HOT, ec="white", lw=2.5, zorder=5))
    ax.text(0, 0.12, "13", ha="center", va="center", fontsize=26,
            color="white", fontweight="bold", zorder=6)
    ax.text(0, -0.62, "Protonen", ha="center", va="center", fontsize=10.5,
            color="white", zorder=6)

    # Elektronen (Startwinkel leicht versetzt, damit keine Beschriftung getroffen wird)
    for (r, n), start in zip(shells, [np.pi/2, np.pi/2 + np.pi/8, np.pi/2]):
        for k in range(n):
            ang = start + 2 * np.pi * k / n
            x, y = r * np.cos(ang), r * np.sin(ang)
            ax.add_patch(Circle((x, y), 0.34, fc=BLUE, ec="white", lw=1.6, zorder=4))

    # Schalen-Legende oben links (kollidiert nicht mit den Bahnen)
    leg = [("K-Schale", "2 e⁻", SILVER), ("L-Schale", "8 e⁻", SILVER), ("M-Schale", "3 e⁻", SILVER)]
    lx, ly = -5.6, 5.4
    for i, (nm, cnt, _) in enumerate(leg):
        yy = ly - i * 0.62
        ax.add_patch(Circle((lx, yy), 0.16, fc=BLUE, ec="white", lw=1.2, zorder=6))
        ax.text(lx + 0.42, yy, f"{nm}:  {cnt}", ha="left", va="center",
                fontsize=10.5, color=STEEL, fontweight="bold", zorder=6)

    ax.text(0, -5.95, "Elektronenkonfiguration:  2 – 8 – 3", ha="center",
            va="center", fontsize=12, color=INK, fontweight="bold")
    plt.savefig(OUT + "atom_model.png", transparent=True,
                bbox_inches="tight", pad_inches=0.05)
    plt.close()

# ----------------------------------------------------------------------------
# 2) Herstellungsprozess: Bauxit -> Bayer -> Tonerde -> Elektrolyse -> Aluminium
# ----------------------------------------------------------------------------
def process_diagram():
    fig, ax = plt.subplots(figsize=(12.6, 4.4), dpi=200)
    ax.set_xlim(0, 12.6); ax.set_ylim(0, 4.4); ax.axis("off")
    fig.patch.set_alpha(0)

    def box(cx, cy, w, h, title, sub, fc, tc="white", sc=None):
        ax.add_patch(FancyBboxPatch((cx - w/2, cy - h/2), w, h,
                     boxstyle="round,pad=0.02,rounding_size=0.16",
                     fc=fc, ec="none", zorder=3))
        ax.text(cx, cy + 0.30, title, ha="center", va="center",
                fontsize=15, fontweight="bold", color=tc, zorder=4)
        ax.text(cx, cy - 0.34, sub, ha="center", va="center",
                fontsize=10, color=(sc or tc), zorder=4)

    def step_arrow(x0, x1, y, label):
        ax.add_patch(FancyArrowPatch((x0, y), (x1, y),
                     arrowstyle="-|>", mutation_scale=24,
                     lw=3, color=STEEL, zorder=2))
        ax.text((x0 + x1)/2, y + 0.42, label, ha="center", va="bottom",
                fontsize=10.5, color=BLUE, fontweight="bold")

    ycb = 2.55
    box(1.5, ycb, 2.5, 1.5, "Bauxit", "Aluminium-Erz\n(rötliches Gestein)", STEEL, sc=SILVER)
    step_arrow(2.95, 4.35, ycb, "Bayer-\nVerfahren")
    box(5.85, ycb, 2.7, 1.5, "Aluminium-\noxid (Al₂O₃)", "„Tonerde“ – weißes Pulver", BLUE, sc="#E8F2F8")
    step_arrow(7.35, 8.75, ycb, "Schmelzfluss-\nelektrolyse")
    box(10.5, ycb, 2.7, 1.5, "Aluminium", "reines Metall (Al)", HOT, sc="#FFF3E6")

    # Mengen-/Energie-Hinweis unten
    ax.add_patch(FancyBboxPatch((0.4, 0.25), 11.8, 0.95,
                 boxstyle="round,pad=0.02,rounding_size=0.12",
                 fc=PANEL, ec=SILVER, lw=1.2, zorder=1))
    ax.text(6.3, 0.93, "Faustregel:  ca. 4 t Bauxit  →  2 t Tonerde  →  1 t Aluminium",
            ha="center", va="center", fontsize=11.5, color=INK, fontweight="bold")
    ax.text(6.3, 0.50,
            "Die Schmelzflusselektrolyse (Hall-Héroult, bei ~960 °C) ist sehr energie­intensiv: ~13–15 kWh Strom je kg Aluminium",
            ha="center", va="center", fontsize=9.8, color=STEEL)
    plt.savefig(OUT + "process_diagram.png", transparent=True,
                bbox_inches="tight", pad_inches=0.05)
    plt.close()

# ----------------------------------------------------------------------------
# 3) Recycling-Kreislauf
# ----------------------------------------------------------------------------
def recycling_cycle():
    fig, ax = plt.subplots(figsize=(7.4, 7.4), dpi=200)
    ax.set_xlim(-7.6, 7.6); ax.set_ylim(-7.2, 7.2); ax.set_aspect("equal"); ax.axis("off")
    fig.patch.set_alpha(0)

    R = 3.5
    stages = [
        ("1. Sammeln", "Dosen, Folien, Schrott", 90),
        ("2. Sortieren", "Trennen nach Material", 18),
        ("3. Einschmelzen", "nur ~5 % der Energie", -54),
        ("4. Gießen", "neue Barren & Bleche", -126),
        ("5. Neues Produkt", "Kreislauf beginnt neu", 162),
    ]
    cols = [BLUE, LBLUE, HOT, "#D77A2B", STEEL]

    # Pfeile auf dem Kreis
    for i in range(len(stages)):
        a0 = np.radians(stages[i][2])
        a1 = np.radians(stages[(i + 1) % len(stages)][2])
        # entlang Bogen
        amid = a0 + (((a1 - a0) % (-2*np.pi)) )  # not used
    # Bogenpfeile zeichnen
    thetas = np.radians([s[2] for s in stages])
    for i in range(len(stages)):
        t0 = thetas[i]; t1 = thetas[(i+1) % len(stages)]
        # gehe im Uhrzeigersinn
        if t1 >= t0:
            t1 -= 2*np.pi
        arc = np.linspace(t0 - 0.32, t1 + 0.32, 30)
        xs = R * np.cos(arc); ys = R * np.sin(arc)
        ax.plot(xs[:-1], ys[:-1], color=SILVER, lw=3, zorder=1)
        ax.add_patch(FancyArrowPatch((xs[-2], ys[-2]), (xs[-1], ys[-1]),
                     arrowstyle="-|>", mutation_scale=22, color=SILVER, lw=3, zorder=1))

    for (title, sub, deg), c in zip(stages, cols):
        a = np.radians(deg)
        x, y = R * np.cos(a), R * np.sin(a)
        ax.add_patch(Circle((x, y), 0.95, fc=c, ec="white", lw=2.5, zorder=4))
        ax.text(x, y, title.split(". ")[0] + ".", ha="center", va="center",
                fontsize=13, color="white", fontweight="bold", zorder=5)
        # Beschriftung außen – seitliche Knoten horizontal nach außen verankern,
        # damit der Text nicht in den Kreis läuft
        name = title.split(". ", 1)[1]
        if abs(np.sin(a)) < 0.4:                       # rechts / links
            ha = "left" if np.cos(a) > 0 else "right"
            lx = x + (1.25 if np.cos(a) > 0 else -1.25)
            ax.text(lx, y + 0.22, name, ha=ha, va="center",
                    fontsize=12, color=INK, fontweight="bold", zorder=5)
            ax.text(lx, y - 0.22, sub, ha=ha, va="center",
                    fontsize=9.2, color=STEEL, zorder=5)
        else:                                          # oben / unten
            lx, ly = (R + 2.35) * np.cos(a), (R + 2.35) * np.sin(a)
            dy1, dy2 = (0.12, -0.38) if np.sin(a) >= 0 else (0.0, -0.42)
            ax.text(lx, ly + dy1, name, ha="center", va="center",
                    fontsize=12, color=INK, fontweight="bold", zorder=5)
            ax.text(lx, ly + dy2, sub, ha="center", va="center",
                    fontsize=9.2, color=STEEL, zorder=5)

    # Zentrum
    ax.add_patch(Circle((0, 0), 1.85, fc=DARK, ec="none", zorder=3))
    ax.text(0, 0.45, "bis zu", ha="center", va="center", fontsize=11, color=SILVER, zorder=4)
    ax.text(0, -0.18, "95 %", ha="center", va="center", fontsize=30, color=HOT,
            fontweight="bold", zorder=4)
    ax.text(0, -0.85, "Energie gespart", ha="center", va="center", fontsize=10,
            color="white", zorder=4)
    plt.savefig(OUT + "recycling_cycle.png", transparent=True,
                bbox_inches="tight", pad_inches=0.1)
    plt.close()

if __name__ == "__main__":
    atom_model()
    process_diagram()
    recycling_cycle()
    print("Bilder erstellt.")
