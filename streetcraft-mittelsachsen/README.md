# StreetCraft Mittelsachsen

Ein Minecraft-artiges Browserspiel **in der echten Google-Street-View-Ansicht** des Landkreises Mittelsachsen:
Freiberg, Döbeln, Mittweida, Rochlitz, Hainichen, Frankenberg, Flöha, Burgstädt, Brand-Erbisdorf, Leisnig, Oederan und Augustusburg.

Du läufst als Blockfigur durch die Street-View-Fotos, fällst Bäume, gräbst Schächte in die Straße, baust Häuser,
craftest Werkzeuge, kämpfst nachts gegen Zombies und Creeper und schläfst im Bett, bis es Morgen wird.
Alle Blöcke bleiben an ihrer echten Position auf der Karte, auch wenn du weiterläufst und später wiederkommst.

> Kein offizielles Minecraft-Produkt, nicht von Mojang, Microsoft oder Google.
> Alle Texturen, Modelle und Geräusche sind selbst erzeugt. Original-Minecraft-Dateien werden nicht verwendet.

---

## 1. Google-Maps-API-Schlüssel besorgen (einmalig, ca. 10 Minuten)

Street View gibt es nur über die Google Maps Platform. Dafür brauchst du einen eigenen Schlüssel:

1. Öffne <https://console.cloud.google.com/> und melde dich mit deinem Google-Konto an.
2. Lege ein **neues Projekt** an (z. B. „StreetCraft“).
3. Richte unter **Abrechnung** ein Zahlungskonto ein. Google verlangt eine Kreditkarte. Für privates Spielen bleibt man
   normalerweise im kostenlosen monatlichen Kontingent. Prüfe die aktuellen Preise selbst unter
   <https://mapsplatform.google.com/pricing/>.
4. Gehe zu **APIs & Dienste → Bibliothek** und aktiviere die **Maps JavaScript API**.
5. Gehe zu **APIs & Dienste → Anmeldedaten → Anmeldedaten erstellen → API-Schlüssel**.
6. **Wichtig:** Beschränke den Schlüssel:
   - *Anwendungseinschränkungen*: **Websites (HTTP-Verweis-URLs)** mit `http://localhost:8080/*`
     (und ggf. deiner eigenen Domain)
   - *API-Einschränkungen*: nur **Maps JavaScript API**
7. Optional: Lege unter **Kontingente** ein Tageslimit fest, damit garantiert keine Kosten entstehen.

Den Schlüssel (`AIza…`) trägst du im Startbildschirm des Spiels ein. Er wird nur in deinem Browser gespeichert.

## 2. Spiel starten

Das Spiel braucht keinen Build-Schritt, nur einen kleinen lokalen Webserver
(direktes Öffnen der Datei per Doppelklick funktioniert wegen der JavaScript-Module nicht):

```bash
cd streetcraft-mittelsachsen
python3 -m http.server 8080
```

Dann im Browser (Chrome, Edge oder Firefox am PC) öffnen: <http://localhost:8080>

- **Schlüssel eintragen**, Startort und Spielmodus wählen, **Neue Welt starten**.
- Ohne Schlüssel kannst du den **Testmodus** anhaken: Er zeigt Wiese und Himmel statt Street View,
  sonst funktioniert alles gleich. Direktlink: <http://localhost:8080/?demo>

## 3. Steuerung

| Taste | Funktion |
|---|---|
| Maus | Umsehen (ins Bild klicken, um die Maus zu fangen) |
| **W / S** | Zum nächsten Street-View-Punkt vor / zurück (gedrückt halten = weiterlaufen) |
| **A / D** | Seitlich zum nächsten Street-View-Punkt |
| Pfeil links / rechts | Drehen |
| **Linksklick (halten)** | Block abbauen, im Boden graben, Mobs angreifen |
| **Rechtsklick** | Block setzen, Werkbank/Ofen/Truhe öffnen, essen, mit der Hacke Acker anlegen, säen, im Bett schlafen |
| 1–9 / Mausrad | Hotbar-Platz wählen |
| **E** | Inventar (im Kreativmodus: alle Blöcke) |
| Q | Gegenstand wegwerfen (Strg+Q: ganzer Stapel) |
| Leertaste | Springen |
| **F5** | Ich-Perspektive ↔ dritte Person |
| **M** | Große Karte von Mittelsachsen |
| T / Enter | Chat, `/` = Befehl |
| F3 | Debug-Infos (Koordinaten, Biom, Panorama-ID …) |
| + / − | Minikarte zoomen |
| Esc | Spielmenü (Einstellungen, Skin, Speichern) |

Im Inventar: Linksklick = Stapel nehmen/ablegen, Rechtsklick = halbieren bzw. einzeln ablegen, Shift-Klick = verschieben.

## 4. Was alles drin ist

- **Echte Welt**: Street View als Hintergrund, OpenStreetMap-Minikarte mit der Grenze des Landkreises.
  Mittelsachsen kann man nicht verlassen.
- **Biome aus OpenStreetMap**: Im Wald gibt es viele Eichen und Fichten, in der Stadt Kopfsteinpflaster,
  am Fluss Sand, Kies und Ton, im Steinbruch Stein. Ist OpenStreetMap nicht erreichbar, rät das Spiel.
- **Graben**: Jedes Feld lässt sich Schicht für Schicht abtragen, also Gras, Erde, Kies und dann Stein mit Kohle-,
  Eisen-, Gold- und Diamanterz bis zum Grundgestein in 32 m Tiefe. Rund um **Freiberg und Brand-Erbisdorf**
  gibt es dabei **Silbererz**, eine Anspielung auf den alten Bergbau. Daraus wird im Ofen Silber und daraus die
  *Bergmannslampe*.
- **Bauen**: über 30 Blöcke, darunter Erde, Stein, Bruchstein, Holz, Bretter, Glas, Ziegel, Wolle, Fackeln, Werkbank,
  Ofen, Truhe und Bett. Löcher lassen sich mit Erde oder Stein wieder auffüllen.
- **Crafting** wie in Minecraft: 2×2 im Inventar, 3×3 an der Werkbank, Rezepte mit fester Form (auch gespiegelt).
  Es gibt Werkzeuge aus Holz, Stein, Eisen und Diamant (Spitzhacke, Axt, Schaufel, Schwert, Hacke) mit Haltbarkeit.
- **Ofen** mit Brennstoff (Kohle, Holz …) zum Schmelzen von Erz, Sand, Bruchstein, Fleisch und Ton.
- **Landwirtschaft**: Mit der Hacke Acker anlegen, Weizen säen, wachsen lassen, ernten und Brot backen.
  Setzlinge werden zu Bäumen.
- **Überleben**: 10 Herzen, Hunger, Regeneration, Essen, Tod mit Fallenlassen des Inventars, Wiederbeleben am
  Spawnpunkt. Ein Bett setzt den Spawnpunkt.
- **Tag und Nacht** (ein Tag dauert 20 Minuten). Nachts wird das Street-View-Bild dunkel und Fackeln leuchten.
- **Mobs**: Kühe, Schweine und Schafe (Fleisch, Leder, Wolle) sowie Zombies, Skelette, die mit Pfeilen schießen,
  und Creeper, die explodieren. Untote verbrennen bei Tag.
- **Kreativmodus**: alle Blöcke unbegrenzt, sofort abbauen, keine Monster, Teleport per Klick auf die große Karte.
- **Eigener Skin**: Lade deinen Minecraft-Skin (64×64- oder 64×32-PNG) hoch. Standardmäßig spielst du einen
  Freiberger Bergmann in Habit und Schachthut.
- **Chat-Befehle**: `/help`, `/tp freiberg`, `/tp 50.92 13.34`, `/orte`, `/time set day|night`,
  `/gamemode creative|survival`, `/give <gegenstand> [anzahl]` (nur kreativ), `/items`, `/spawn`, `/kill`, `/clear`
- **Speichern** automatisch im Browser alle 30 Sekunden und beim Schließen. Über das Menü kannst du den Spielstand
  als Datei exportieren und wieder importieren.

## 5. Ehrliche Grenzen

- Street View besteht aus festen Fotos. Man **springt von Foto-Punkt zu Foto-Punkt** (etwa alle 10 m) und kann nur
  dorthin laufen, wo das Google-Auto war. Echte Häuser lassen sich nicht abreißen.
- Blöcke, Mobs und Figur liegen als 3D-Ebene über dem Foto. Der Boden wird als flach angenommen.
  An Hängen schweben Blöcke deshalb manchmal etwas oder versinken.
- Falls Blöcke beim Umsehen gegenüber dem Foto „rutschen“: im Menü den **Sichtfeld-Abgleich** anpassen.
- Nicht enthalten: Redstone, Nether/End, Rüstung, Bogen, Wasser/Lava-Eimer, Mehrspieler. Gedacht ist es für PC mit
  Maus und Tastatur.

## 6. Für Entwickler

```
index.html, style.css   Oberfläche
src/main.js             Spielschleife, Eingabe, Spiellogik
src/streetview.js       Google Street View + Testmodus
src/overlay.js          three.js-Ebene (Blöcke, Löcher, Drops, Partikel)
src/world.js            Blockwelt, Bäume, Graben, Strahlverfolgung
src/items.js            alle Blöcke und Gegenstände
src/crafting.js         Rezepte und Ofen
src/inventory.js        Inventar
src/mobs.js             Tiere und Monster
src/character.js        Spielerfigur und Skins
src/textures.js         prozedurale Pixeltexturen
src/biome.js            Biome aus OpenStreetMap (Overpass API)
src/minimap.js          Leaflet-Karten
src/survival.js         Leben, Hunger, Tageszeit
src/chat.js             Chat-Befehle
src/save.js, sound.js   Speichern, Geräusche
tests/                  Tests für die Spielregeln
```

Tests ausführen (Node.js 18+):

```bash
npm test
```

Fremde Bibliotheken werden per CDN geladen: three.js 0.160.0 und Leaflet 1.9.4.
Kartendaten © OpenStreetMap-Mitwirkende. Street-View-Bilder © Google.
