# Lunzenau 1:1 in Minecraft Java 26.3 – Installation

Du bekommst **eine Datei**: `Lunzenau-1zu1.mrpack`. Darin sind Fabric für Minecraft 26.3, die fertige Welt und
deutsche Grundeinstellungen. Die Leistungs-Mods, Distant Horizons und den Shader holst du mit wenigen Klicks direkt
in der Modrinth App. So bekommst du immer genau die Version, die zu 26.3 passt.

Dauer: etwa 10 Minuten.

---

## 1. Modrinth App installieren

1. Lade die kostenlose **Modrinth App** herunter: <https://modrinth.com/app> und installiere sie.
2. Melde dich beim ersten Start mit deinem Microsoft-/Minecraft-Konto an.
   Die App installiert Java 25, das Minecraft 26.3 braucht, automatisch selbst.

## 2. Modpack mit der Welt importieren

1. Klicke in der Modrinth App links unten auf das **„+“** („Create instance“ / „Instanz erstellen“).
2. Wähle oben den Reiter **„From File“ / „Aus Datei“** und dann **„Import from file“ / „Datei importieren“**.
3. Wähle `Lunzenau-1zu1.mrpack` aus.
4. Die App legt die Instanz **„Lunzenau 1:1 – Sachsen in Minecraft“** an (Minecraft 26.3 + Fabric Loader 0.19.5).
   Die Welt liegt schon im Ordner `saves`.

> **Wichtig:** Die `.mrpack`-Datei **nicht** in eine geöffnete Instanz ziehen und **nicht** unter „Content“ → „Add content“
> auswählen. Dort erwartet die App Mods oder Resourcepacks und meldet:
> *„Invalid input: unable to infer project type for input file“*. Das ist **kein** Fehler der Datei. Importiere sie
> einfach über das **„+“** wie oben. Klappt das nicht, nimm die Methode unten
> **„Wenn der Import nicht klappt“** mit `Lunzenau-1zu1-Welt.zip`.

## 3. Mods hinzufügen (je ein Klick)

Öffne die Instanz, dann **„Content“ → „Browse content“ / „Inhalte hinzufügen“**. Suche jeden Namen und klicke **Install**.
Die App zeigt automatisch nur Versionen für **26.3 + Fabric** an.

| Mod | Wofür |
|---|---|
| **Fabric API** | Grundbaustein, den viele Mods brauchen |
| **Sodium** | Viel mehr FPS (neue Render-Engine) |
| **Iris Shaders** | Shader-Unterstützung (braucht Sodium, die App installiert es mit) |
| **Distant Horizons** | Sicht bis zum Horizont – du siehst ganz Lunzenau auf einmal |
| **Lithium** | Schnellere Spiellogik (Mobs, Wasser, Chunks) |
| **FerriteCore** | Weniger Arbeitsspeicher |
| **ImmediatelyFast** | Schnellere Darstellung von Text, Schildern und Oberfläche – gut für die vielen Straßenschilder |
| **Entity Culling** | Unsichtbare Tiere und Blockobjekte werden nicht gezeichnet |

Optional, falls sie für 26.3 angezeigt werden: **More Culling** (noch mehr FPS) und **Dynamic FPS** (spart Strom im Hintergrund).

## 4. Shader: Complementary Reimagined

1. In der Instanz: **„Content“ → Filter „Shaders“** → suche **Complementary Reimagined** → **Install**.
2. Warum dieser Shader: Er sieht realistisch aus (Sonne, Schatten, Wasser, Nebel im Muldental), hat Profile von
   „Potato“ bis „Ultra“ und funktioniert mit Distant Horizons zusammen.

## 5. Arbeitsspeicher

Instanz-Einstellungen (Zahnrad) → **„Java and memory“** → **6 GB** (bei 16 GB RAM im PC) oder **8 GB** (bei 32 GB RAM).
Distant Horizons braucht für die Fernsicht etwas mehr Speicher.

## 6. Spielen

1. **Play** drücken → **Einzelspieler** → **„Lunzenau 1:1 (echte Geodaten)“**.
2. Minecraft fragt: **„Upgrade and Play“ / „Aktualisieren und spielen“** – bestätigen.
   Die Welt ist im Format von 1.21.1 gespeichert und wird einmalig auf 26.3 umgestellt. Das ist normal und dauert ein paar Minuten.
3. Beim ersten Betreten berechnet Minecraft das Licht. In den ersten Sekunden kann es kurz ruckeln.
4. **Shader einschalten:** Optionen → Grafikeinstellungen → **Shaderpakete** → *Complementary Reimagined* → **Fertig**.
   Danach im Shader-Menü **„Profile“ → „Medium“** wählen. Bei schwächerer Grafikkarte nimm **„Low“**, bei starker **„High“**.
5. **Distant Horizons:** Im Optionsmenü auf das DH-Symbol klicken.
   Empfehlung: Qualität **„Medium“**, CPU-Last **„Balanced“**, LOD-Sichtweite **128–192 Chunks**.
   Beim ersten Mal baut DH die Fernsicht im Hintergrund auf. Das dauert ein paar Minuten und geht danach sofort.
6. Normale Sichtweite in Minecraft: **10–12 Chunks** reicht, den Rest übernimmt Distant Horizons.

## Gut zu wissen

- **Echte Höhen:** **Y + 100 = Höhe über dem Meer** (Normalhöhennull). Der Markt liegt bei Y 81 → 181 m.
  Mit F3 siehst du deine Höhe.
- Du startest im **Kreativmodus** (Fliegen mit doppelt Leertaste). Überleben: `/gamemode survival`.
  Unter der Erde gibt es Kohle, Eisen, Kupfer, Gold, Redstone, Lapis und Diamanten.
- **Feuer** breitet sich nicht aus und **Creeper** sprengen keine Häuser, damit die echte Landschaft heil bleibt.
  Wieder einschalten geht mit `/gamerule doFireTick true` und `/gamerule mobGriefing true`.
- Die Häuser sind innen leer, haben aber Etagen, Fenster, Türen und Leitern. Du kannst sie einrichten.
- Außerhalb der Gemeinde Lunzenau ist die Welt leer (Leere). Am Rand also nicht hinunterfallen.

## Schnellreise (im Chat eintippen)

| Ort | Befehl |
|---|---|
| Markt Lunzenau (Startpunkt) | `/tp @s 399 81 -13` |
| Kirche St. Jakobus | `/tp @s 387 90 42` |
| Schloss Rochsburg – oben auf dem Bergfried | `/tp @s 963 187 2016` |
| Rochsburg | `/tp @s 586 140 1700` |
| Cossen | `/tp @s 1407 112 -1510` |
| Göritzhain | `/tp @s 2851 143 -327` |
| Berthelsdorf | `/tp @s 1789 151 910` |
| Elsdorf | `/tp @s -2298 157 -454` |
| Himmelhartha | `/tp @s -831 180 -2582` |

Umrechnung für eigene Ziele: **x = Ostwert − 342000**, **z = 5648000 − Nordwert** (UTM 33N, z. B. aus dem Geoportal Sachsen),
**Y = Höhe − 100**.

## Wenn der Import nicht klappt (Welt von Hand einsetzen)

Das geht immer und braucht die zweite Datei **`Lunzenau-1zu1-Welt.zip`** (nur die Welt, ohne Modpack):

1. Lege in der Modrinth App eine **leere Instanz** an: **„+“ → „Custom“** → Name z. B. „Lunzenau“ →
   Spielversion **26.3** → Mod-Loader **Fabric** → **Create**.
2. Öffne die Instanz und klicke oben auf das **Ordner-Symbol („Open folder“ / „Ordner öffnen“)**. Dort liegt der Ordner `saves`.
3. Entpacke `Lunzenau-1zu1-Welt.zip` **in den Ordner `saves`**. Danach muss es genau diese Datei geben:
   `saves/Lunzenau 1zu1/level.dat`. Es darf **kein** zweiter Ordner dazwischen liegen
   (also nicht `saves/Lunzenau-1zu1-Welt/Lunzenau 1zu1/...`).
4. Weiter mit **Schritt 3** (Mods hinzufügen) und **Schritt 4** (Shader). Danach **Play** → Einzelspieler →
   *Lunzenau 1:1 (echte Geodaten)*.

## Ohne Modrinth App (offizieller Launcher)

1. Fabric-Installer von <https://fabricmc.net/use/installer/> ausführen → Minecraft **26.3** wählen → installieren.
2. Die Mods aus der Tabelle oben von <https://modrinth.com> (Version **26.3**, Loader **Fabric**) in den Ordner
   `%APPDATA%\.minecraft\mods` legen. Den Shader legst du in `%APPDATA%\.minecraft\shaderpacks`.
3. `Lunzenau-1zu1-Welt.zip` in den Ordner `%APPDATA%\.minecraft\saves` entpacken, sodass
   `saves\Lunzenau 1zu1\level.dat` existiert.
4. Im Launcher das Profil **„fabric-loader-26.3“** starten.
