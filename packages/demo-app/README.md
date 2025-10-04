/* TokPulse — © Hardonia. MIT. */

# TokPulse Demo App

A tiny zero-dependency Node build that stamps a time into `dist/index.html`.

## Commands
- `npm run build` → writes `dist/` from `src/`
- `npm start` → serves `dist/` on http://localhost:3000

This lives under `packages/demo-app`. Our CI "Run" workflow will prefer `packages/.current` if present.
