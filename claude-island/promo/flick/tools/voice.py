#!/usr/bin/env python3
"""Sprachaufnahmen für alle 14 Szenen.

Engines (alle offline, frei):
- „pico“: SVOX Pico (pico2wave, Paket libttspico-utils), Apache-Lizenz. Klingt synthetisch.
- „thorsten“: Piper-Stimme „Thorsten“ (low, 16 kHz), Datensatz CC0. Modell aus dem GitHub-Release
  von rhasspy/piper; braucht `pip install "piper-tts[alignment]"`.
Ergebnis: remotion/public/voice/NN.wav, Stille vorn/hinten entfernt, ca. −16 LUFS, 48 kHz;
bei Thorsten zusätzlich voice/NN-thorsten-words.json mit den exakten Wortanfängen.
Danach tools/timings.py ausführen.  Aufruf: python3 tools/voice.py [thorsten|pico] [Szenennummern …]  (Standard: thorsten, alle)
"""
import os, shutil, subprocess, sys, tarfile, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from script import SCENES, spoken

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICE_DIR = os.path.join(ROOT, 'voice')
OUT = os.path.join(ROOT, 'flick-output', 'remotion', 'public', 'voice')
FFMPEG = os.path.join(ROOT, 'flick-output', 'remotion', 'node_modules', 'ffmpeg-static', 'ffmpeg')
PIPER_URL = 'https://github.com/rhasspy/piper/releases/download/v0.0.2/voice-de-thorsten-low.tar.gz'

# Pause zwischen zwei Sätzen bei Piper (Kommapausen setzt die Stimme selbst).
SENTENCE_GAP = 0.35

def fetch(url, archive, target):
    """Lädt und entpackt ein Modellarchiv einmal nach voice/dl/<target>."""
    dl = os.path.join(VOICE_DIR, 'dl')
    os.makedirs(dl, exist_ok=True)
    path = os.path.join(dl, target)
    if not os.path.isdir(path):
        # erst vollständig laden und entpacken, dann umbenennen: ein Abbruch hinterlässt keinen halben Stand
        file = os.path.join(dl, archive)
        if not os.path.exists(file):
            urllib.request.urlretrieve(url, file + '.part')
            os.replace(file + '.part', file)
        tmp = path + '.part'
        shutil.rmtree(tmp, ignore_errors=True)
        tarfile.open(file).extractall(tmp)
        os.replace(tmp, path)
    return path

PUNCT = set(',.;:!?—–-"„“()')

def piper_scene(voice, text):
    """Spricht einen Szenentext mit Piper. Die Sätze werden mit SENTENCE_GAP Stille verbunden.
    Ergebnis: (Audio float32, Abtastrate, Anfang jedes gesprochenen Wortes in Sekunden, Ende des letzten Lauts).
    Die Wortanfänge stammen aus Pipers Phonem-Ausrichtung (Dauer jedes Phonems in Samples)."""
    import numpy as np
    parts, onsets, pos, sr, speech_end = [], [], 0, None, 0
    for chunk in voice.synthesize(text, include_alignments=True):
        sr = chunk.sample_rate
        audio = chunk.audio_float_array.astype(np.float32)
        if parts:
            gap = np.zeros(int(SENTENCE_GAP * sr), np.float32)
            parts.append(gap); pos += len(gap)
        t, new_word = pos, True
        for a in chunk.phoneme_alignments or []:
            ph = a.phoneme
            if ph == ' ':
                new_word = True
            elif ph not in PUNCT and ph not in ('^', '$', '_') and new_word:
                onsets.append(t / sr); new_word = False
            t += int(a.num_samples)
            if ph != ' ' and ph not in PUNCT and ph not in ('^', '$', '_'):
                speech_end = t
        parts.append(audio); pos += len(audio)
    return np.concatenate(parts), sr, onsets, speech_end / sr

def synth_all(engine, items):
    """items: Liste (Text, Zieldatei). Schreibt die Rohaufnahmen; bei Piper auch die Wortanfänge (…-words.json)."""
    if engine == 'pico':
        for text, raw in items:
            subprocess.run(['pico2wave', '-l', 'de-DE', '-w', raw, text], check=True)
    elif engine == 'thorsten':
        import json, wave
        import numpy as np
        from piper import PiperVoice
        model = os.path.join(fetch(PIPER_URL, 'thorsten-low.tar.gz', 'thorsten-low'), 'de-thorsten-low.onnx')
        voice = PiperVoice.load(model, include_alignments=True)
        # Das Modell kennt „ç“ (ich-Laut) nur zusammengesetzt; Piper liefert es zerlegt als „c“ + Cedille.
        # Ohne Zusammensetzen fällt die Cedille weg und „ständig“, „nicht“, „gleich“ … klingen falsch.
        import unicodedata
        raw_phonemize = voice.phonemize
        voice.phonemize = lambda t: [list(unicodedata.normalize('NFC', ''.join(s))) for s in raw_phonemize(t)]
        for text, raw in items:
            audio, sr, onsets, end = piper_scene(voice, text)
            # Ränder schneiden (hier statt in ffmpeg, damit die Wortzeiten exakt bleiben); hinten nie
            # vor dem letzten Laut laut Ausrichtung, damit ein leise gesprochenes letztes Wort bleibt.
            loud = np.nonzero(np.abs(audio) > 0.003)[0]
            a, b = int(loud[0]), max(int(loud[-1]) + 1, int(end * sr))
            audio = audio[max(0, a - int(0.01 * sr)):b + int(0.03 * sr)]
            shift = max(0, a - int(0.01 * sr)) / sr
            with wave.open(raw, 'wb') as w:
                w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
                w.writeframes((np.clip(audio, -1, 1) * 32767).astype('<i2').tobytes())
            json.dump([round(max(0.0, o - shift), 4) for o in onsets], open(raw[:-4] + '-words.json', 'w'))
    else:
        raise SystemExit(f'Unbekannte Engine: {engine} (pico, thorsten)')

def main():
    engine = sys.argv[1] if len(sys.argv) > 1 else 'thorsten'
    if engine == 'piper':
        engine = 'thorsten'
    os.makedirs(VOICE_DIR, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    # Optional nur bestimmte Szenen (Nummern), z. B. „voice.py thorsten 01 04“; die übrigen bleiben unverändert.
    only = {int(x) for x in sys.argv[2:]}
    nums = [i for i in range(1, len(SCENES) + 1) if not only or i in only]
    items = [(spoken(SCENES[i - 1][2], engine), os.path.join(VOICE_DIR, f'{i:02d}-{engine}.wav')) for i in nums]
    synth_all(engine, items)
    open(os.path.join(VOICE_DIR, 'engine.txt'), 'w').write(engine + '\n')
    for i, (_, raw) in zip(nums, items):
        out = os.path.join(OUT, f'{i:02d}.wav')
        if engine == 'pico':
            # Stille an den Rändern weg, Sprechpausen in der Mitte kürzen, etwas flotter.
            chain = ('silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,'
                     'silenceremove=stop_periods=-1:stop_duration=0.2:stop_threshold=-42dB:stop_silence=0.2,atempo=1.16,')
        else:
            # Piper: schon geschnitten; nichts, was die Zeit verändert, damit die Wortzeiten stimmen.
            chain = ''
        chain += 'highpass=f=70,loudnorm=I=-16:TP=-1.5:LRA=11'
        subprocess.run([FFMPEG, '-y', '-loglevel', 'error', '-i', raw, '-af', chain, '-ar', '48000', '-ac', '1', out], check=True)
        print('ok', out)

if __name__ == '__main__':
    main()
