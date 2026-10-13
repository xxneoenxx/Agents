#!/bin/bash
# Rendert die Szenen über Flicks render-scene.mjs (60 fps, 1080x1920) und legt Poster an.
set -e
ROOT=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT"
# Ohne Argumente alle Szenen, sonst nur die genannten (z. B. tools/render-all.sh 13-lokal-kostenlos).
IDS="$*"
[ -n "$IDS" ] || IDS=$(python3 -c "import json; print(' '.join(json.load(open('flick-output/remotion/src/lib/timings.json')).keys()))")
for id in $IDS; do
  t0=$(date +%s)
  FLICK_CONCURRENCY=4 node "${FLICK_SKILL:?Pfad zu flick/skills/flick setzen}/scripts/render-scene.mjs" --project flick-output --composition $id --name $id > "$ROOT/render-$id.log" 2>&1 || { echo "FAIL $id"; tail -20 "$ROOT/render-$id.log"; exit 1; }
  node "$FLICK_SKILL/scripts/create-poster.mjs" --project flick-output --name $id --timestamp 1 > /dev/null 2>&1 || true
  echo "ok $id $(( $(date +%s) - t0 ))s"
done
echo ALL-DONE
