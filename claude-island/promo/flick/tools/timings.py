#!/usr/bin/env python3
"""Szenen- und Wortzeiten (60 fps) für alle 14 Szenen.

Ohne Sprachaufnahmen: Tempo ca. 2,5 Wörter/s. Mit Aufnahmen (remotion/public/voice/NN.wav):
die gemessene Sprechdauer wird nach Silben (plus Pausen an Satzzeichen) auf die Wörter
verteilt, und jede Szene ist mindestens Sprechdauer + Nachlauf lang.
Schreibt remotion/src/lib/timings.json.
"""
import json, os, re, sys, wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REM = os.path.join(ROOT, 'flick-output', 'remotion')
FPS = 60
SCENES = [
    ('01-hook-alt-tab', 216, 'Alt-Tab. Wartet Claude? Alt-Tab. Hängt er fest?'),
    ('02-problem-verpasst', 192, 'Ständig nachsehen. Und trotzdem die Freigabe verpassen.'),
    ('03-reveal-island', 168, 'Schluss damit. Das ist Claude Island.'),
    ('04-oben-im-vordergrund', 180, 'Eine kleine Insel, oben auf deinem Bildschirm.'),
    ('05-ein-blick', 180, 'Ein Blick genügt: Stimmung, Sitzung, Anzahl.'),
    ('06-mehrere-sitzungen', 210, 'Mehrere Sitzungen? Sie zeigt dir immer die dringendste.'),
    ('07-freigabe-klappt-auf', 258, 'Braucht Claude eine Freigabe, klappt die Insel von selbst auf.'),
    ('08-freigeben', 186, 'Freigeben oder ablehnen. Direkt hier, ohne Fensterwechsel.'),
    ('09-haengt-fest', 258, 'Hängt Claude fest? Gib einen Hinweis oder versuch es erneut.'),
    ('10-live-und-fertig', 294, 'Sieh live, woran Claude arbeitet. Fertig? Schick gleich die nächste Anweisung.'),
    ('11-modell-aufwand', 210, 'Modell und Aufwand stellst du pro Sitzung um.'),
    ('12-mini-claude', 246, 'Und Mini-Claude fiebert mit: schläft, tippt, winkt, zittert, jubelt.'),
    ('13-lokal-kostenlos', 258, 'Kostenlos, Open Source. Die Insel läuft lokal auf deinem PC.'),
    ('14-cta-loop', 420, 'Claude Island für Windows. Hol sie dir jetzt auf GitHub.'),
]
# Englische Wörter sprechen sich anders, als sie geschrieben sind (Silbenzahl gesprochen).
SYLL_OVERRIDE = {'claude': 1, 'island': 2, 'open': 2, 'source': 1, 'github': 2, 'windows': 2, 'alt-tab': 2, 'pc': 2, 'mini-claude': 3}

def syllables(word):
    w = re.sub(r'[^a-zäöüß-]', '', word.lower())
    if w in SYLL_OVERRIDE:
        return SYLL_OVERRIDE[w]
    groups = re.findall(r'(?:au|äu|eu|ei|ie|ai|[aeiouyäöü])+', w)
    return max(1, len(groups))

def pause_after(word):
    if re.search(r'[.?!]$', word):
        return 1.6
    if re.search(r'[:,]$', word):
        return 0.8
    return 0.0

def word_frames(text, start, dur_frames):
    words = text.split()
    weights = [syllables(w) for w in words]
    pauses = [pause_after(w) for w in words[:-1]] + [0.0]
    total = sum(weights) + sum(pauses)
    t = start
    out = []
    for w, p in zip(weights, pauses):
        out.append(round(t))
        t += dur_frames * (w + p) / total
    return out

def wav_seconds(path):
    with wave.open(path) as f:
        return f.getnframes() / f.getframerate()

def main():
    data = {}
    total = 0
    for i, (sid, planned, text) in enumerate(SCENES, start=1):
        start = 24 if sid.startswith('01') else 8
        voice = os.path.join(REM, 'public', 'voice', f'{i:02d}.wav')
        tail = 162 if sid.startswith('14') else 36  # 14: Endkarte + Loop nach dem letzten Wort
        if os.path.exists(voice):
            speech = round(wav_seconds(voice) * FPS)
            words_n = len(text.split())
            frames = max(planned, start + speech + tail)
            words = word_frames(text, start, speech * 0.97)
            data[sid] = {'frames': frames, 'start': start, 'speech': speech, 'words': words, 'voice': f'voice/{i:02d}.wav'}
        else:
            speech = round(len(text.split()) / 2.5 * FPS)
            words = word_frames(text, start, speech)
            data[sid] = {'frames': planned, 'start': start, 'speech': speech, 'words': words, 'voice': None}
        total += data[sid]['frames']
    out = os.path.join(REM, 'src', 'lib', 'timings.json')
    json.dump(data, open(out, 'w'), indent=1, ensure_ascii=False)
    print(f'{out}: {total} frames = {total / FPS:.1f} s, voice: {sum(1 for v in data.values() if v["voice"])}/14')

if __name__ == '__main__':
    main()
