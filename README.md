# TokPulse Monorepo (Shopify + Wix + CI Packages)

**Flow:** push ZIPs to `incoming/` → CI unboxes to `packages/<drop>` → test with **TokPulse Run** → promote with **TokPulse Promote** (writes `packages/.current` + deploy hooks).

## Quick Start
1. Put a build ZIP in `incoming/` and push.  
2. GitHub → Actions → **TokPulse Run** (runs against `.current` or latest).  
3. GitHub → Actions → **TokPulse Promote** → set `packages/<drop-name>` and (optionally) trigger deploy hooks.

## Deploy Hooks (optional)
- Add `VERCEL_HOOK_PROD` / `NETLIFY_HOOK_PROD` in **Settings → Secrets → Actions**.

## Docs
- See `/docs/TOKPULSE-NEXT-STEPS.md` for end-to-end CI details.
- See `/docs/HARDONIA-README.md` for Shopify system overview & history.
