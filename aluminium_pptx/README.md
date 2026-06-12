# Aluminium – PowerPoint-Präsentation (Referat Chemie)

Eine strukturierte, übersichtliche Schul-Präsentation über **Aluminium** mit
Quellenangaben und selbst erstellten Diagrammen.

## Datei
- **`Aluminium_Praesentation.pptx`** – die fertige Präsentation (13 Folien, 16:9).

## Aufbau der Folien
1. Titel  ·  2. Gliederung  ·  3. Steckbrief / Element-Daten  ·
4. Eigenschaften  ·  5. Vorkommen (mit Erdkruste-Diagramm)  ·
6. Geschichte (Zeitstrahl)  ·  7. Herstellung (Bayer-Verfahren & Elektrolyse)  ·
8. Weltproduktion 2024 (Diagramm)  ·  9. Verwendung im Alltag  ·
10. Recycling (Kreislauf-Grafik)  ·  11. Vor- & Nachteile  ·
12. Fazit  ·  13. Quellenverzeichnis.

## Selbst erstellte Grafiken (`images/`)
- `atom_model.png` – Bohrsches Atommodell (2–8–3)
- `process_diagram.png` – Herstellungsprozess Bauxit → Tonerde → Aluminium
- `recycling_cycle.png` – Recycling-Kreislauf (bis zu 95 % Energieersparnis)

## Neu erzeugen
```bash
cd aluminium_pptx
npm install                 # pptxgenjs, react-icons, sharp …
python3 make_images.py      # erzeugt die Diagramme in images/
node build.js               # erzeugt Aluminium_Praesentation.pptx
```

## Quellen (Auswahl)
USGS – Mineral Commodity Summaries 2025 · Gesamtverband der Aluminiumindustrie (GDA) ·
Holleman/Wiberg, Anorganische Chemie · Römpp Chemie-Lexikon · Umweltbundesamt.
Alle Produktionszahlen: Stand 2024 (USGS).
