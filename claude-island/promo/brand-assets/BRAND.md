# Claude Island – Brand-Kurzinfo für Flick

Inoffizielles Community-Tool für Claude Code unter Windows, nicht von Anthropic.

## Farben

| Rolle | Hex |
| :- | :- |
| Hintergrund | `#15110E` |
| Text | `#F6EFE8` |
| Gedämpft | `#A99C90` |
| Akzent (Knöpfe, Auswahl) | `#FF9A62` |
| Mini-Claude (Körper) | `#D97757` |
| Augen / Tinte | `#2A1A12` |
| Wartet auf dich | `#FFC857` |
| Hängt fest | `#FF7A6B` |
| Arbeitet | `#8FB8FF` |
| Fertig | `#7ED6A8` |
| Ruhig | `#A99C90` |

## Schriften (alle Google Fonts, frei)

- **Bricolage Grotesque** 600/700: Überschriften, Stimmungen
- **Figtree** 400–600: Fließtext, Knöpfe
- **IBM Plex Mono** 400/500: Befehle, Statuszeilen

## Formen und Bewegung

- Dunkle, abgerundete Flächen (Pille: Radius 24 px bei 232×48; Panel: Radius 26 px bei 720×436).
- Mini-Claude ist Pixel-Art. Er wird nur mit harten Kanten skaliert (Nearest Neighbor), nie weichgezeichnet.
- Bewegungen sind kurz, weich und federnd: Hopser, Squash and Stretch, Überschwingen beim Herauswachsen der Arme und Beine.
- Der Status-Pixel über dem Kopf leuchtet in der Farbe der Stimmung.

## Dateien

| Datei | Inhalt |
| :- | :- |
| `icon.png` | App-Icon (512×512) |
| `mascot-idle.png` … `mascot-done.png` | Mini-Claude in allen fünf Stimmungen, freigestellt |
| `mascot-head.png`, `grow-1.png` … `grow-4.png` | Verwandlung: Kopf → Arme → Beine → ganzer Mini-Claude |
| `pill-idle.png` … `pill-done.png` | zugeklappte Insel (Pille) je Stimmung, transparente Ecken |
| `panel-approval.png` | aufgeklappt, Freigabe mit **Freigeben** / **Ablehnen** |
| `panel-working.png` | Arbeitet: Prompt und letzte Schritte |
| `panel-problem.png` | Hängt fest: **Hinweis geben** / **Erneut versuchen** |
| `panel-done.png` | Fertig: letzte Antwort und Feld für die nächste Anweisung |
| `panel-idle.png` | Ruhig |
| `panel-models.png` | Leiste Modell (Opus/Sonnet/Haiku) und Aufwand (Niedrig … Max) |

Alle Screenshots stammen aus der echten App (Größe 100 %, doppelte Pixeldichte).
