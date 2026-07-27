# Bild-Inventar und Foto-Shotlist

## Ehrliche Bewertung des vorhandenen Materials

**Es liegt derzeit kein verwendbares eigenes Bildmaterial vor.**

| Quelle | Ergebnis |
|---|---|
| Logo `Logo-La-Bonta_kurv.png` | Existiert auf der alten Seite, **konnte nicht geladen werden** — die Netzwerkpolicy dieser Arbeitsumgebung blockiert `la-bonta.de` (403). Muss vom Betreiber geliefert werden. |
| Porträt Emirjon Ndrepepaj (`Miris-225x300.jpg`) | Ebenfalls nicht erreichbar. Zudem mit 225 × 300 px **zu klein** für jede prominente Verwendung auf einer heutigen Seite. |
| Eigene Essens- oder Innenraumfotos | Auf der alten Seite nach aktuellem Kenntnisstand nicht vorhanden. |
| Stock-Bilder (Unsplash, Pexels, Foodiesfeed) | **Nicht beschaffbar** — alle drei Quellen sind in dieser Umgebung blockiert. |

**Folge:** Die Seite ist vollständig ohne Fotos gebaut. Keine Sektion fällt ohne Bild
zusammen; der Eindruck entsteht aus Typografie, Farbwelt, Körnung und Bewegung.
Fotos sind damit kein Notbehelf mehr, sondern eine echte Verbesserung obendrauf.

## Aktuell eingesetzte Bilder

Keine. Es gibt **null Bilddateien** im Projekt und **null externe Bildanfragen**.

Die drei Bildplätze sind gestaltete Flächen mit festem Seitenverhältnis und einem
sichtbaren Hinweis, welches Foto dort hingehört:

| Ort | Seitenverhältnis | Hinweis im Platzhalter |
|---|---|---|
| Startseite, Abschnitt „Unser Haus" | 3 : 4 (hoch) | Familie oder Emirjon Ndrepepaj im Gastraum |
| Startseite, Abschnitt „Mittags" | 4 : 3 (quer) | Mittagsgericht am Fenster |
| Kontaktseite, Anfahrt | 16 : 10 (quer) | Hinweis auf die bewusst fehlende Kartendarstellung |

## So werden Fotos eingesetzt

1. Datei als **WebP** nach `assets/img/` legen.
2. Im HTML den `<div class="bildplatz">` durch ein `<img>` ersetzen:
   ```html
   <img src="assets/img/gastraum.webp" alt="Beschreibender Text"
        width="1200" height="1600" loading="lazy"
        style="aspect-ratio:3/4; object-fit:cover; border-radius:3px">
   ```
   Beim Hero-Bild `loading="lazy"` **weglassen**.
3. `alt` beschreibt, was zu sehen ist — nicht „Bild" oder „Foto".

## Die verbindliche Grenze

Fremdes Bildmaterial darf **niemals** eingesetzt werden für:

- Gasträume, Terrasse oder das Haus selbst
- die Familie, den Geschäftsführer oder das Team
- konkrete Gerichte oder Eissorten, die als Speisen des Hauses gezeigt werden

Grund: In Deutschland kann es als irreführende Werbung gelten, fremde Speisefotos als
eigene Gerichte darzustellen. Für Zutaten, Textur und Stimmung wäre Stock zulässig —
verwendet wird derzeit keines.

---

# Foto-Shotlist

Der größte Hebel für die Wirkung der Seite. Ein halber Tag mit einer guten Kamera bringt
mehr als jede weitere Animation.

## Vorrangig — diese sechs zuerst

| # | Motiv | Licht | Format | Wofür |
|---|---|---|---|---|
| 1 | **Die Familie oder Emirjon Ndrepepaj** im Gastraum, ruhig stehend, in die Kamera | weiches Fensterlicht am späten Nachmittag, kein Blitz | **hoch** 3:4 | Abschnitt „Unser Haus" — das wichtigste Bild der ganzen Seite |
| 2 | **Die Eisvitrine**, frontal, Sorten gut erkennbar | hell und klar, Vitrinenlicht plus Tageslicht | **quer** 3:2 | Eis-Sektion; liefert außerdem die echten Sortenfarben |
| 3 | **Gastraum am Abend**, gedeckte Tische, Kerzen | warm und dunkel, lange Belichtung vom Stativ | **quer** 16:9 | Hero-Hintergrund oder Abschnitt „Anlässe" |
| 4 | **Pizza aus dem Ofen**, von schräg oben, direkt nach dem Herausholen | dunkel und kontrastreich, Licht von der Seite | **quer** 4:3 | Abschnitt „Die Küche" |
| 5 | **Pasta beim Anrichten**, Hände im Bild | dunkel, seitliches Licht, tiefe Schatten | **hoch** 4:5 | Abschnitt „Die Küche" |
| 6 | **Die Hausfassade** in der Kirchgasse | Vormittag, gerade Perspektive, ganze Fassade | **hoch** 3:4 | Anfahrt; ersetzt jede Kartendarstellung |

## Später ergänzen

| # | Motiv | Licht | Format |
|---|---|---|---|
| 7 | Eishörnchen in der Hand, Straße im Hintergrund | pralles Tageslicht | hoch 4:5 |
| 8 | Eisbecher von oben auf hellem Tisch | hell, weiche Schatten | quadratisch 1:1 |
| 9 | Mittagsgericht am Fenstertisch | Tageslicht | quer 4:3 |
| 10 | Gedeckte Tafel für eine Feier | warm, Abend | quer 16:9 |
| 11 | Detail: Teig, Mehl, Hände | dunkel, hart | quer 3:2 |
| 12 | Dessert, etwa Tiramisu | dunkel, Spotlicht | hoch 4:5 |

## Praktische Hinweise für den Fototermin

- **Zwei Lichtwelten, bewusst getrennt.** Küche und Gastraum dunkel, warm, kontrastreich mit
  tiefen Schatten. Die Eis-Motive genau umgekehrt: hell, farbig, verspielt. Dieser Bruch ist
  gestalterische Absicht und trägt den Doppelcharakter — bitte nicht angleichen.
- **Kein Blitz auf der Kamera.** Fensterlicht genügt fast immer; abends lieber Stativ und
  längere Belichtung.
- **Hoch- und Querformat vom selben Motiv** aufnehmen. Die Seite braucht beides.
- **Nicht zu nah.** Etwas Luft um das Motiv lassen — `object-fit: cover` schneidet je nach
  Bildschirmgröße unterschiedlich an.
- **Menschen im Bild** wirken stärker als perfekt arrangiertes Essen. Für die Startseite ist
  ein ehrliches Bild der Familie mehr wert als zehn Tellerfotos.
- **Einverständnis** aller abgebildeten Personen vor der Veröffentlichung einholen.
