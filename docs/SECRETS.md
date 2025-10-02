# TokPulse Secrets & Inputs (single source of truth)

## GitHub Actions (Repository → Settings → Secrets and variables)
- `VERCEL_HOOK_PROD` (optional): Vercel deploy hook URL (POST).
- `NETLIFY_HOOK_PROD` (optional): Netlify deploy hook URL (POST).
- `GH_TOKEN` (optional): repo-scope token for workflow dispatch via scripts.

## Meta (FB/IG) — put into your runtime env (and optionally GitHub Environments)
- `META_APP_ID`
- `META_APP_SECRET`
- `META_WEBHOOK_VERIFY_TOKEN`
- `META_ACCESS_TOKEN` (long-lived, if needed)
- `META_BUSINESS_ID`
- `META_AD_ACCOUNT_ID`
- `META_LOG_LEVEL` (info|debug)

## TokPulse runtime (optional)
- `PORT` (default 3001)
- `LOG_DIR` (default ./var/log)
- `DATA_DIR` (default ./var/data)
