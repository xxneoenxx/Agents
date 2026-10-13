#!/bin/bash
# Hängt die 14 Szenen-MP4s framegenau aneinander: Ton jeder Szene exakt auf die Bildlänge
# gekürzt bzw. aufgefüllt, dann einmal sauber kodiert (H.264 High, 60 fps, AAC 48 kHz).
set -e
cd $(cd "$(dirname "$0")/.." && pwd)/flick-output
FF=remotion/node_modules/ffmpeg-static/ffmpeg
OUT="${1:-claude-island-promo-1080x1920-60fps.mp4}"
python3 - "$FF" "$OUT" <<'PY'
import json, subprocess, sys
ff, out = sys.argv[1], sys.argv[2]
t = json.load(open('remotion/src/lib/timings.json'))
ids = list(t.keys())
args = [ff, '-y', '-loglevel', 'error']
for i in ids:
    args += ['-i', f'scenes/{i}/{i}.mp4']
parts = []
for n, i in enumerate(ids):
    d = t[i]['frames'] / 60
    parts.append(f'[{n}:v]trim=end_frame={t[i]["frames"]},setpts=PTS-STARTPTS[v{n}];[{n}:a]atrim=0:{d:.6f},asetpts=PTS-STARTPTS,apad=whole_dur={d:.6f}[a{n}]')
graph = ';'.join(parts) + ';' + ''.join(f'[v{n}][a{n}]' for n in range(len(ids))) + f'concat=n={len(ids)}:v=1:a=1[v][a0];[a0]alimiter=limit=0.89:attack=5:release=60:level=disabled[a]'
args += ['-filter_complex', graph, '-map', '[v]', '-map', '[a]',
         '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', '60', '-g', '120',
         '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart', out]
subprocess.run(args, check=True)
print(out, sum(v['frames'] for v in t.values()), 'frames erwartet')
PY
