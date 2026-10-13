#!/usr/bin/env python3
"""Sprachaufnahmen für alle 14 Szenen.

Engine „pico“ (Standard): SVOX Pico, Deutsch (pico2wave, Paket libttspico-utils), offline, Apache-Lizenz.
Engine „piper“: Piper-Stimme „Thorsten“ (lädt das Modell von huggingface.co).
Ergebnis: remotion/public/voice/NN.wav, Stille vorn/hinten entfernt, ca. −16 LUFS, 48 kHz.
Danach tools/timings.py ausführen.  Aufruf: python3 tools/voice.py [pico|piper]
"""
import os, subprocess, sys, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from script import SCENES, spoken

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICE_DIR = os.path.join(ROOT, 'voice')
OUT = os.path.join(ROOT, 'flick-output', 'remotion', 'public', 'voice')
FFMPEG = os.path.join(ROOT, 'flick-output', 'remotion', 'node_modules', 'ffmpeg-static', 'ffmpeg')
PIPER = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE/thorsten/high/'
MODEL = 'de_DE-thorsten-high.onnx'
TEMPO = {'pico': 1.16, 'piper': 1.0}

def piper_model():
    os.makedirs(VOICE_DIR, exist_ok=True)
    paths = []
    for name in (MODEL, MODEL + '.json'):
        p = os.path.join(VOICE_DIR, name)
        if not os.path.exists(p) or os.path.getsize(p) < 1000:
            urllib.request.urlretrieve(PIPER + name + '?download=true', p)
        paths.append(p)
    return paths

def synth(engine, text, raw):
    if engine == 'pico':
        subprocess.run(['pico2wave', '-l', 'de-DE', '-w', raw, text], check=True)
    else:
        model, config = piper_model()
        subprocess.run([sys.executable, '-m', 'piper', '-m', model, '-c', config, '-f', raw, '--sentence-silence', '0.22'],
                       input=text.encode('utf-8'), check=True, capture_output=True)

def main():
    engine = sys.argv[1] if len(sys.argv) > 1 else 'pico'
    os.makedirs(VOICE_DIR, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    for i, (_, _, text) in enumerate(SCENES, start=1):
        raw = os.path.join(VOICE_DIR, f'{i:02d}-{engine}.wav')
        synth(engine, spoken(text), raw)
        out = os.path.join(OUT, f'{i:02d}.wav')
        # Stille an den Rändern weg, Sprechpausen in der Mitte auf höchstens ~0,2 s kürzen, etwas flotter.
        chain = ('silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,'
                 'silenceremove=stop_periods=-1:stop_duration=0.2:stop_threshold=-42dB:stop_silence=0.2,'
                 f'atempo={TEMPO[engine]},highpass=f=70,loudnorm=I=-16:TP=-1.5:LRA=11')
        subprocess.run([FFMPEG, '-y', '-loglevel', 'error', '-i', raw, '-af', chain, '-ar', '48000', '-ac', '1', out], check=True)
        print('ok', out)

if __name__ == '__main__':
    main()
