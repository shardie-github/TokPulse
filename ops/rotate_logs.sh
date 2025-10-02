#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
find "$ROOT/var" -type f -name "*.log" -mtime +30 -print -delete || true
find "$ROOT/var/data" -type f -name "*.jsonl" -mtime +30 -print -delete || true
