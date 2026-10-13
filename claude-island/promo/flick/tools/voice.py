#!/usr/bin/env python3
"""Sprachaufnahmen mit Piper (Stimme „Thorsten“, Deutsch, high) für alle 14 Szenen.

Lädt das Modell einmal von huggingface.co, spricht jede Zeile (englische Wörter in
Lautschrift-Schreibweise), normalisiert auf ca. −16 LUFS und legt
remotion/public/voice/NN.wav ab. Danach tools/timings.py ausführen.
"""
import os, subprocess, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOICE_DIR = os.path.join(ROOT, 'voice')
OUT = os.path.join(ROOT, 'flick-output', 'remotion', 'public', 'voice')
FFMPEG = os.path.join(ROOT, 'flick-output', 'remotion', 'node_modules', 'ffmpeg-static', 'ffmpeg')
BASE = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE/thorsten/high/'
MODEL = 'de_DE-thorsten-high.onnx'

LINES = [
    'Alt Tab. Wartet Klohd? Alt Tab. Hängt er fest?',
    'Ständig nachsehen. Und trotzdem die Freigabe verpassen.',
    'Schluss damit. Das ist Klohd Ailänd.',
    'Eine kleine Insel, oben auf deinem Bildschirm.',
    'Ein Blick genügt: Stimmung, Sitzung, Anzahl.',
    'Mehrere Sitzungen? Sie zeigt dir immer die dringendste.',
    'Braucht Klohd eine Freigabe, klappt die Insel von selbst auf.',
    'Freigeben oder ablehnen. Direkt hier, ohne Fensterwechsel.',
    'Hängt Klohd fest? Gib einen Hinweis oder versuch es erneut.',
    'Sieh leif, woran Klohd arbeitet. Fertig? Schick gleich die nächste Anweisung.',
    'Modell und Aufwand stellst du pro Sitzung um.',
    'Und Mini-Klohd fiebert mit: schläft, tippt, winkt, zittert, jubelt.',
    'Kostenlos, Oupen Sohrs. Die Insel läuft lokal auf deinem Pe-Ze.',
    'Klohd Ailänd für Windous. Hol sie dir jetzt auf Git-Habb.',
]

def fetch(name):
    os.makedirs(VOICE_DIR, exist_ok=True)
    path = os.path.join(VOICE_DIR, name)
    if not os.path.exists(path) or os.path.getsize(path) < 1000:
        print('lade', name)
        urllib.request.urlretrieve(BASE + name + '?download=true', path)
    return path

def main():
    model = fetch(MODEL)
    config = fetch(MODEL + '.json')
    os.makedirs(OUT, exist_ok=True)
    for i, text in enumerate(LINES, start=1):
        raw = os.path.join(VOICE_DIR, f'{i:02d}-raw.wav')
        subprocess.run([sys.executable, '-m', 'piper', '-m', model, '-c', config, '-f', raw,
                        '--length-scale', '0.95', '--sentence-silence', '0.22'],
                       input=text.encode('utf-8'), check=True, capture_output=True)
        out = os.path.join(OUT, f'{i:02d}.wav')
        # Stille vorn/hinten weg, Lautheit −16 LUFS, 48 kHz Mono.
        subprocess.run([FFMPEG, '-y', '-loglevel', 'error', '-i', raw, '-af',
                        'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,'
                        'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '48000', '-ac', '1', out], check=True)
        print('ok', out)

if __name__ == '__main__':
    main()
