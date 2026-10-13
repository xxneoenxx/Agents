"""Der Sprechertext aller 14 Szenen (Untertitel = gesprochener Text) und die
Mindestlänge jeder Szene in Frames (60 fps). Eine Quelle für voice.py und timings.py."""

SCENES = [
    ('01-hook-alt-tab', 216, 'Alt-Tab. Wartet Claude? Alt-Tab. Hängt er fest? Wer mit Claude Code arbeitet, kennt das.'),
    ('02-problem-verpasst', 192, 'Du schaust ständig nach, ob Claude etwas von dir braucht. Und trotzdem verpasst du die Freigabe, und Claude wartet einfach.'),
    ('03-reveal-island', 168, 'Schluss damit. Das ist Claude Island. Sie zeigt dir jederzeit, was Claude gerade macht.'),
    ('04-oben-im-vordergrund', 180, 'Die Insel schwebt klein oben auf deinem Bildschirm und bleibt immer im Vordergrund, auch über anderen Fenstern. Und Mini-Claude schaut deiner Maus hinterher.'),
    ('05-ein-blick', 180, 'Ein Blick genügt: Farbe und Text zeigen die Stimmung, darunter steht die dringendste Sitzung, und rechts siehst du, wie viele Sitzungen offen sind.'),
    ('06-mehrere-sitzungen', 210, 'Mehrere Sitzungen gleichzeitig? Kein Problem. Die Insel sortiert sie nach Dringlichkeit und zeigt dir immer die dringendste zuerst.'),
    ('07-freigabe-klappt-auf', 258, 'Braucht Claude deine Freigabe, zum Beispiel für einen Befehl, klappt die Insel von selbst auf. Ohne dir den Fokus zu stehlen: Du tippst einfach weiter.'),
    ('08-freigeben', 186, 'Du siehst genau, was Claude ausführen will, und entscheidest direkt hier: freigeben oder ablehnen. Ein Klick genügt, ohne Fensterwechsel.'),
    ('09-haengt-fest', 258, 'Hängt Claude fest, etwa wegen eines Fehlers, zeigt die Insel das sofort. Gib Claude einen Hinweis, wie es weitergehen soll, oder versuch es einfach erneut.'),
    ('10-live-und-fertig', 294, 'Während Claude arbeitet, siehst du live jeden Schritt. Ist Claude fertig, liest du die letzte Antwort und schickst gleich die nächste Anweisung.'),
    ('11-modell-aufwand', 210, 'Unten wählst du für jede Sitzung das Modell, also Opus, Sonnet oder Haiku, und den Aufwand von Niedrig bis Max. Das gilt ab dem nächsten Modellaufruf.'),
    ('12-mini-claude', 246, 'Und Mini-Claude fiebert mit: Er schläft, wenn nichts los ist, tippt, während Claude arbeitet, winkt, wenn er dich braucht, zittert bei Problemen und jubelt, wenn alles fertig ist.'),
    ('13-lokal-kostenlos', 258, 'Claude Island ist kostenlos, und der Quellcode liegt offen auf GitHub. Die Insel läuft lokal auf deinem PC.'),
    ('14-cta-loop', 420, 'So bekommst du Claude Island für Windows: Lade die Setup-Datei von GitHub herunter und klicke doppelt darauf. Warnt Windows davor, klickst du auf Weitere Informationen und dann auf Trotzdem ausführen. In der Insel klickst du auf Plugin aktivieren. Dann startest du die Claude-App neu. Fertig!'),
]

# Nur für die Sprachsynthese: englische Wörter so geschrieben, wie man sie spricht.
# „Max.“ liest Pico sonst als Abkürzung („Maximum“) und ohne Satzpause.
SAY = [
    ('Claude Code', 'Klohd Kohd'), ('Claude-App', 'Klohd-Äpp'), ('Mini-Claude', 'Mini-Klohd'), ('Claude', 'Klohd'),
    ('Island', 'Ailänd'), ('GitHub', 'Gitt-Habb'), ('Setup-Datei', 'Settapp-Datei'),
    ('Plugin', 'Plaggin'), ('Windows', 'Windous'), ('PC', 'Pe-Zeh'), (' live ', ' leif '), ('Sonnet', 'Sonnett'),
    ('Alt-Tab', 'Alt Tab'), ('Max.', 'Max!'),
]

# Für die neuronale Stimme (Piper „Thorsten“), die über espeak-ng in Laute umsetzt.
# Geprüft mit `espeak-ng -v de -x`: z. B. „Windohs“ → v'Indo:s, „Macks.“ → m'aks, „Gitt Habb“ → g'It h'app.
SAY_ESPEAK = [
    ('Claude Code', 'Klohd Kohd'), ('Claude-App', 'Klohd-Äpp'), ('Mini-Claude', 'Mini-Klohd'), ('Claude', 'Klohd'),
    ('Island', 'Ailänd'), ('GitHub', 'Gitt Habb'), ('Setup-Datei', 'Settapp-Datei'),
    ('Plugin', 'Plaggin'), ('Windows', 'Windohs'), ('PC', 'Pe-Zeh'), (' live ', ' leif '),
    ('Alt-Tab', 'Alt Tab'), ('Max.', 'Macks.'), ('Modellaufruf', 'Modell-Aufruf'), ('Quellcode', 'Quellkohd'),
]

def spoken(text, engine='pico'):
    for a, b in (SAY if engine == 'pico' else SAY_ESPEAK):
        text = text.replace(a, b)
    return text
