#!/usr/bin/env bash
set -euo pipefail
PKG="${1:-}"
if [ -z "$PKG" ]; then echo "Usage: $0 packages/<name>"; exit 1; fi
echo "$PKG" > packages/.current
git add packages/.current
git commit -m "promote: $PKG" || true
git push origin main || true
echo "Now run the 'TokPulse Promote' workflow if you want hooks fired."
