#!/usr/bin/env bash
set -euo pipefail
IFS=$'\n\t'
MSG="${1:-Build complete}"
if [ -n "${DISCORD_WEBHOOK:-}" ]; then
  curl -sS -H 'Content-Type: application/json' -d "$(printf '{"content":"%s"}' "$MSG")" "$DISCORD_WEBHOOK" >/dev/null || true
fi
if [ -n "${SLACK_WEBHOOK:-}" ]; then
  curl -sS -H 'Content-Type: application/json' -d "$(printf '{"text":"%s"}' "$MSG")" "$SLACK_WEBHOOK" >/dev/null || true
fi
echo "Notified (if webhooks set)."
