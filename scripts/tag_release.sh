#!/usr/bin/env bash
set -euo pipefail
STAMP="$(date +%Y.%m.%d-%H%M%S)"
TAG="v${STAMP}"
git tag -a "$TAG" -m "TokPulse release ${STAMP}"
git push origin "$TAG"
echo "Tagged ${TAG}"
