#!/usr/bin/env python3
"""Szenen- und Wortzeiten (60 fps) für alle 14 Szenen → remotion/src/lib/timings.json.

Bei der Piper-Stimme kommen die Wortanfänge exakt aus deren Phonem-Ausrichtung (tools/voice.py).
Ohne Sprachaufnahmen: Tempo ca. 2,5 Wörter/s. Sonst (Pico, eigene Aufnahmen): die
echten Sprechpausen (ffmpeg silencedetect) werden den Satzzeichen zugeordnet; weitere Pausen
trennen innerhalb der Abschnitte. Dazwischen verteilen sich die Wörter nach ihrer Länge,
gemessen an Pico, das jedes Wort einzeln spricht (ohne Pico: nach Silben). Jede Szene ist
mindestens Sprechdauer + Nachlauf lang.
"""
import array, json, os, re, shutil, subprocess, sys, tempfile, wave
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from script import SCENES, spoken

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REM = os.path.join(ROOT, 'flick-output', 'remotion')
FFMPEG = os.path.join(REM, 'node_modules', 'ffmpeg-static', 'ffmpeg')
FPS = 60
SYLL = {'claude': 1, 'island': 2, 'open': 2, 'source': 1, 'github': 2, 'windows': 2, 'alt-tab': 2, 'pc': 2,
        'mini-claude': 3, 'code': 1, 'setup-datei': 4, 'plugin': 2, 'claude-app': 2, 'live': 1, 'sonnet': 2, 'opus': 2,
        'haiku': 2, 'modellaufruf': 4}

def syllables(word):
    w = re.sub(r'[^a-zäöüß-]', '', word.lower())
    if w in SYLL:
        return SYLL[w]
    return max(1, len(re.findall(r'(?:au|äu|eu|ei|ie|ai|[aeiouyäöü])+', w)))

def brk(word):
    """Stärke der Pause nach einem Wort (0 = keine)."""
    if re.search(r'[.?!]$', word):
        return 3
    if re.search(r':$', word):
        return 2
    if re.search(r',$', word):
        return 1
    return 0

_WEIGHT = {}

def weight(word):
    """Relative Sprechdauer eines Wortes: Pico spricht es einzeln (Stille abgeschnitten), sonst Silben."""
    w = re.sub(r'[^\w-]', '', word)
    if w not in _WEIGHT:
        secs = 0.0
        if shutil.which('pico2wave'):
            with tempfile.TemporaryDirectory() as d:
                path = os.path.join(d, 'w.wav')
                subprocess.run(['pico2wave', '-l', 'de-DE', '-w', path, spoken(w)], check=True, capture_output=True)
                with wave.open(path) as f:
                    a = array.array('h', f.readframes(f.getnframes()))
                    loud = [i for i, x in enumerate(a) if abs(x) > 300]
                    if loud:
                        secs = (loud[-1] - loud[0]) / f.getframerate()
        _WEIGHT[w] = secs or 0.18 * syllables(w)
    return _WEIGHT[w]

def even(words, t0, t1):
    w = [weight(x) for x in words]
    total = sum(w) or 1
    out, t = [], t0
    for x in w:
        out.append(t)
        t += (t1 - t0) * x / total
    return out

def silences(path):
    r = subprocess.run([FFMPEG, '-hide_banner', '-i', path, '-af', 'silencedetect=noise=-36dB:d=0.11', '-f', 'null', '-'],
                       capture_output=True, text=True)
    starts = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', r.stderr)]
    ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', r.stderr)]
    out = []
    for s, e in zip(starts, ends):
        if out and s - out[-1][1] < 0.08:  # durch ein kurzes Knacken geteilte Pause zusammenfassen
            out[-1] = (out[-1][0], e)
        else:
            out.append((s, e))
    return out

SKIP_BREAK = {1: 0.25, 2: 0.4, 3: 0.6}  # Kosten, wenn an einem Satzzeichen keine Pause erkannt wird

def aligned(words, dur, pauses):
    """Wortanfänge in Sekunden: Pausen an Satzzeichen ausrichten, dazwischen nach Silben.

    Pausen und Satzzeichen werden der Reihe nach einander zugeordnet (beide dürfen ausfallen).
    Die erwartete Zeit eines Satzzeichens rechnet ab dem vorigen Anker mit den restlichen
    Wortlängen, damit sich Tempoabweichungen nicht über die ganze Aufnahme aufsummieren.
    Übrige Pausen trennen danach innerhalb der Abschnitte (spread).
    """
    syl = [weight(w) for w in words]
    cum = [0]
    for x in syl:
        cum.append(cum[-1] + x)
    total = cum[-1]
    breaks = [i for i, w in enumerate(words[:-1]) if brk(w)]  # Pause nach words[i]
    pauses = [(s, e) for s, e in pauses if 0 < s and e < dur]  # Ränder sind schon beschnitten
    skip_pause = [0.15 + 1.5 * (e - s) for s, e in pauses]
    skip_break = [SKIP_BREAK[brk(words[i])] for i in breaks]
    # Zustand (p, b): Pause p wurde Satzzeichen b zugeordnet; (-1, -1) = Anfang
    best = {(-1, -1): (0.0, None)}
    order = [(-1, -1)] + [(p, b) for p in range(len(pauses)) for b in range(len(breaks))]
    for p, b in order:
        if (p, b) not in best:
            continue
        cost = best[(p, b)][0]
        t0 = pauses[p][1] if p >= 0 else 0.0
        s0 = cum[breaks[b] + 1] if b >= 0 else 0
        for p2 in range(p + 1, len(pauses)):
            for b2 in range(b + 1, len(breaks)):
                # erwartete Pausenmitte nach Silbenanteil ab dem vorigen Anker
                exp = t0 + (dur - t0) * (cum[breaks[b2] + 1] - s0) / max(1e-6, total - s0)
                mid = sum(pauses[p2]) / 2
                c = (cost + abs(exp - mid) - 0.1 * brk(words[breaks[b2]])
                     + sum(skip_pause[p + 1:p2]) + sum(skip_break[b + 1:b2]))
                if (p2, b2) not in best or c < best[(p2, b2)][0]:
                    best[(p2, b2)] = (c, (p, b))
    # Ende: nicht zugeordnete Pausen und Satzzeichen danach kosten ebenfalls
    end = min(best, key=lambda k: best[k][0] + sum(skip_pause[k[0] + 1:]) + sum(skip_break[k[1] + 1:]))
    anchors = []  # (Index des ersten Wortes danach, Pausenanfang, Pausenende)
    k = end
    while k != (-1, -1):
        p, b = k
        anchors.append((breaks[b] + 1, pauses[p][0], pauses[p][1]))
        k = best[k][1]
    anchors.reverse()
    times = [0.0] * len(words)
    used = {(s, e) for _, s, e in anchors}
    rest = [p for p in pauses if p not in used]
    bounds = [(0, 0.0)] + [(i, e) for i, _, e in anchors]
    ends = [s for _, s, _ in anchors] + [dur]
    for k, (i0, t0) in enumerate(bounds):
        i1 = anchors[k][0] if k < len(anchors) else len(words)
        spread(words, i0, i1, t0, ends[k], rest, times)
    return times, len(anchors)

def spread(words, i0, i1, t0, t1, pauses, times):
    """Wörter i0..i1 über t0..t1 verteilen; eine Pause darin trennt an der Wortgrenze, an der
    das Wort davor nach Wortlängen enden würde (längste Pause zuerst, dann rekursiv)."""
    inner = [(s, e) for s, e in pauses if t0 < s and e < t1]
    if inner and i1 - i0 >= 2:
        s, e = max(inner, key=lambda p: p[1] - p[0])
        w = [weight(x) for x in words[i0:i1]]
        speak = (t1 - t0) - (e - s)
        best, acc = None, 0.0
        for j in range(i0 + 1, i1):
            acc += w[j - 1 - i0]
            d = abs(t0 + speak * acc / sum(w) - s)
            if best is None or d < best[1]:
                best = (j, d)
        others = [p for p in inner if p != (s, e)]
        if best[1] <= 0.25:  # sonst liegt die Pause eher in einem Wort (z. B. „Modell|aufruf“)
            spread(words, i0, best[0], t0, s, others, times)
            spread(words, best[0], i1, e, t1, others, times)
            return
        return spread(words, i0, i1, t0, t1, others, times)
    times[i0:i1] = even(words[i0:i1], t0, t1)

def wav_seconds(path):
    with wave.open(path) as f:
        return f.getnframes() / f.getframerate()

def engine():
    """Welche Stimme tools/voice.py zuletzt erzeugt hat (voice/engine.txt), sonst „pico“."""
    try:
        return open(os.path.join(ROOT, 'voice', 'engine.txt')).read().strip() or 'pico'
    except OSError:
        return 'pico'

def piper_words(n, words, eng):
    """Exakte Wortanfänge aus Pipers Phonem-Ausrichtung (voice/NN-<engine>-words.json), auf die Wörter
    des Untertitels umgelegt; None, wenn es die Datei nicht gibt oder die Wortzahl nicht passt."""
    path = os.path.join(ROOT, 'voice', f'{n:02d}-{eng}-words.json')
    if eng == 'pico' or not os.path.exists(path):
        return None
    onsets = json.load(open(path))
    counts = [len(spoken(w, eng).split()) for w in words]
    if sum(counts) != len(onsets):
        return None
    out, k = [], 0
    for c in counts:
        out.append(onsets[k])
        k += c
    return out

def main():
    data, total = {}, 0
    eng = engine()
    for n, (sid, planned, text) in enumerate(SCENES, start=1):
        words = text.split()
        start = 24 if sid.startswith('01') else 8
        tail = 162 if sid.startswith('14') else 30
        voice = os.path.join(REM, 'public', 'voice', f'{n:02d}.wav')
        if os.path.exists(voice):
            dur = wav_seconds(voice)
            secs = piper_words(n, words, eng)
            anchored = 'piper'
            if secs is None:
                secs, anchored = aligned(words, dur, silences(voice))
            speech = round(dur * FPS)
            frames = max(planned, start + speech + tail)
            data[sid] = {'frames': frames, 'start': start, 'speech': speech, 'words': [start + round(t * FPS) for t in secs],
                         'voice': f'voice/{n:02d}.wav', 'text': text, 'anchors': anchored}
        else:
            speech = round(len(words) / 2.5 * FPS)
            secs = even(words, 0, speech / FPS)
            data[sid] = {'frames': planned, 'start': start, 'speech': speech, 'words': [start + round(t * FPS) for t in secs],
                         'voice': None, 'text': text, 'anchors': 0}
        total += data[sid]['frames']
    out = os.path.join(REM, 'src', 'lib', 'timings.json')
    json.dump(data, open(out, 'w'), indent=1, ensure_ascii=False)
    for sid, d in data.items():
        print(f"{sid:26s} {d['frames']:4d} f  Sprache {d['speech'] / FPS:5.2f} s  Anker {d['anchors']}")
    print(f'{out}: {total} Frames = {total / FPS:.1f} s, Stimme: {sum(1 for v in data.values() if v["voice"])}/14')

if __name__ == '__main__':
    main()
