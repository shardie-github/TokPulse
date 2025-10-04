#!/usr/bin/env bash
set -euo pipefail
BASE="${1:-http://localhost:3000}"
echo "Smoke @ $BASE"
curl -fsSI "$BASE/healthz" | head -n 12 || true
curl -fsS  "$BASE/metrics" | head -n 5 || true
curl -fsS  "$BASE/readyz"  | head -n 5 || true
