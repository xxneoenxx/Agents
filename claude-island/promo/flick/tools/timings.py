#!/usr/bin/env python3
"""Szenen- und Wortzeiten (60 fps) für alle 14 Szenen → remotion/src/lib/timings.json.

Ohne Sprachaufnahmen: Tempo ca. 2,5 Wörter/s. Mit Aufnahmen (public/voice/NN.wav): die
echten Sprechpausen (ffmpeg silencedetect) werden den Satzzeichen zugeordnet; innerhalb
der Abschnitte verteilen sich die Wörter nach Silben. Jede Szene ist mindestens
Sprechdauer + Nachlauf lang.
"""
import json, os, re, subprocess, sys, wave
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from script import SCENES

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

def even(words, t0, t1):
    w = [syllables(x) for x in words]
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
    return list(zip(starts, ends))

SKIP_BREAK = {1: 0.25, 2: 0.4, 3: 0.6}  # Kosten, wenn an einem Satzzeichen keine Pause erkannt wird

def aligned(words, dur, pauses):
    """Wortanfänge in Sekunden: Pausen an Satzzeichen ausrichten, dazwischen nach Silben.

    Pausen und Satzzeichen werden der Reihe nach einander zugeordnet (beide dürfen ausfallen).
    Die erwartete Zeit eines Satzzeichens rechnet ab dem vorigen Anker mit den restlichen
    Silben, damit sich Tempoabweichungen nicht über die ganze Aufnahme aufsummieren.
    """
    syl = [syllables(w) for w in words]
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
                exp = t0 + (dur - t0) * (cum[breaks[b2] + 1] - s0) / max(1, total - s0)
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
    bounds = [(0, 0.0)] + [(i, e) for i, _, e in anchors]
    ends = [s for _, s, _ in anchors] + [dur]
    for k, (i0, t0) in enumerate(bounds):
        i1 = anchors[k][0] if k < len(anchors) else len(words)
        seg = even(words[i0:i1], t0, ends[k])
        times[i0:i1] = seg
    return times, len(anchors)

def wav_seconds(path):
    with wave.open(path) as f:
        return f.getnframes() / f.getframerate()

def main():
    data, total = {}, 0
    for n, (sid, planned, text) in enumerate(SCENES, start=1):
        words = text.split()
        start = 24 if sid.startswith('01') else 8
        tail = 162 if sid.startswith('14') else 30
        voice = os.path.join(REM, 'public', 'voice', f'{n:02d}.wav')
        if os.path.exists(voice):
            dur = wav_seconds(voice)
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
