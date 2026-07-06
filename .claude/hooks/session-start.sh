#!/bin/bash
# SessionStart hook: bring up Headroom's compression proxy so the headroom MCP
# server (see .mcp.json) can reach it at 127.0.0.1:8787.
#
# Design goals:
#   - best-effort: never block or fail session startup if headroom is missing
#     or PyPI is unreachable (no `set -e`; every step guarded).
#   - idempotent: safe to run every session; won't start a second proxy.
#   - non-interactive: no prompts.
#
# Diagnostics go to stderr so stdout stays clean (SessionStart stdout is added
# to the session as context).
set -uo pipefail

PORT="${HEADROOM_PROXY_PORT:-8787}"
LOG="/tmp/headroom-proxy.log"

log() { echo "headroom-hook: $*" >&2; }

# 1) Install Headroom if the CLI is missing (best-effort).
if ! command -v headroom >/dev/null 2>&1; then
  log "headroom CLI not found — attempting 'pip install headroom-ai[all]'"
  if ! pip install --quiet "headroom-ai[all]" >&2; then
    log "install failed (offline PyPI?) — skipping proxy start"
    exit 0
  fi
fi

# 2) Start the proxy in the background only if nothing already answers on PORT.
if curl -sf "http://127.0.0.1:${PORT}/stats" >/dev/null 2>&1; then
  log "proxy already running on port ${PORT}"
  exit 0
fi

log "starting proxy on port ${PORT} (log: ${LOG})"
nohup headroom proxy --port "${PORT}" >"${LOG}" 2>&1 &
disown 2>/dev/null || true

# Give it a moment and report whether it came up (non-fatal either way).
for _ in 1 2 3 4 5; do
  if curl -sf "http://127.0.0.1:${PORT}/stats" >/dev/null 2>&1; then
    log "proxy is up on port ${PORT}"
    break
  fi
  sleep 1
done

exit 0
