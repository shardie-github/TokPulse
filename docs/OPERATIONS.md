# TokPulse Operations

## CI Flow
- **Unbox**: push ZIP to `incoming/` → workflow extracts to `packages/<zip>`.
- **Run**: Actions → "TokPulse Run" (prefers `packages/.current`).
- **Promote**: Actions → "TokPulse Promote" → flips `.current` and posts deploy hooks.

## Meta Service
- Start locally: `npm run dev:meta` (PORT 3001). Health: `/healthz`. Webhook: `/webhook`.
- Verify token: set `META_WEBHOOK_VERIFY_TOKEN` in env; Meta will call GET with the same token.
- Signature: requires `META_APP_SECRET`. Rejects if absent or invalid.

## Safety
- HMAC verify all commerce webhooks.
- Idempotency: de-duplicate via payload fingerprint.
- Logs: JSONL in `var/log/meta.jsonl`. No PII storage recommended.

## Release
- Tag: `npm run tag:release` (creates `vYYYY.MM.DD-HHMMSS`).
- Flip package: `npm run flip:current packages/<name>`
