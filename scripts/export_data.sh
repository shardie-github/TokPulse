#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DB="$ROOT/packages/feedback/data/app.db"
OUT="$ROOT/packages/feedback/data/export_$(date +%Y%m%d%H%M%S).csv"
sqlite3 -header -csv "$DB" "SELECT * FROM leads" > "$OUT"
echo "Exported leads to $OUT"
