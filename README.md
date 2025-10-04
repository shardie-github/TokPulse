/* TokPulse — © Hardonia. MIT. */

# TokPulse + Hardonia — Shareable Repo Snapshot

This snapshot contains:
- TokPulse CI package unboxing, runner, and promotion workflows
- Next steps playbook and Hardonia project README
- A ready-made repo structure with `incoming/` and `packages/` for ZIP-based drops
- Netlify config (optional)

## How to use

1. Create a new GitHub repo and push these files.
2. Drop any build ZIP into `incoming/` and push — the unbox workflow will extract to `packages/<zipname>/`.
3. Run the **TokPulse Run** workflow to test from `packages/.current` (or latest if not set).
4. Use **TokPulse Promote** to flip production to a chosen package and optionally trigger Vercel/Netlify hooks.

> For details see `TOKPULSE-NEXT-STEPS.md` and `HARDONIA-README.md`.


## Demo package
- Pre-set `packages/.current` → `packages/demo-app` for a green CI build immediately.
