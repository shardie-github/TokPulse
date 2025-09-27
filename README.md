# Hardonia Unified — MAX Upgrade

**What you get (10x upgrades):**
- Shopify-first checkout (Stripe fallback), embeddable widget for Wix/others
- SQLite-backed leads, events, licenses
- Admin dashboard (/admin) with MRR/Active/Referrer metrics
- Nightly backup workflow + data export script
- Notifications (Discord/Slack) on builds/promotions
- Rate limiting, Helmet security hardening
- A/B pricing variants (via PRICING_VARIANTS env)
- Tests (smoke), CI, artifact packaging
- One-command seeding (`scripts/seed_db.sh`) and CSV export (`scripts/export_data.sh`)

## Quickstart (Termux)
```bash
cd packages/feedback
npm install
# Shopify primary (set BUY_URL); Stripe fallback optional
export BUY_URL='https://YOUR-SHOPIFY-PAYMENT-LINK'
# Optional Stripe:
# export STRIPE_SECRET_KEY='sk_live_...'
# export STRIPE_PRICE_ID='price_...'
export ADMIN_PASSWORD='super-secret'
npm run serve   # API :8787
npm run dev     # Frontend :5173
```

**Admin:** open `/admin`, enter ADMIN_PASSWORD, see live metrics.

**Backups:** Nightly GitHub Action `nightly-backup.yml` archives data + marketing/ into artifact.

**Data:** `bash scripts/export_data.sh` → CSV of leads.

Wire `DISCORD_WEBHOOK` / `SLACK_WEBHOOK` as repo secrets to get notifications.
