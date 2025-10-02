
#!/usr/bin/env bash
# TokPulse helper: unbox latest ZIP, set .current, commit, and push

set -euo pipefail

ZIP="${1:-}"
if [ -z "$ZIP" ]; then
  echo "Usage: $0 incoming/<file>.zip" >&2
  exit 1
fi

if [ ! -f "$ZIP" ]; then
  echo "ZIP not found: $ZIP" >&2
  exit 1
fi

base="$(basename "$ZIP" .zip)"
dest="packages/$base"
mkdir -p "$dest"
rm -rf "$dest"
unzip -q "$ZIP" -d "$dest"

echo "packages/$base" > packages/.current

git add packages/.current "$dest"
git commit -m "local promote: $base" || true
git push || true

echo "Done. Current package set to: packages/$base"
