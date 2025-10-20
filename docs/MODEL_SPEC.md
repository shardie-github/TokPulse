# TokPulse — MODEL_SPEC v1.3

## Mission
Autonomous ad-intel and creative engine for TikTok & Meta with daily trend sweep, KPI reporting, and auto-generated CapCut packs.

## Inputs (Secrets/Config)
- TikTok: TIKTOK_APP_ID, TIKTOK_APP_SECRET, TIKTOK_ADS_ACCESS_TOKEN, TIKTOK_REFRESH_TOKEN, TIKTOK_AD_ACCOUNT_ID, TIKTOK_PIXEL_ID
- Meta: META_APP_ID, META_APP_SECRET, META_SYSTEM_USER_TOKEN, META_AD_ACCOUNT_ID, META_PIXEL_ID, META_PAGE_ID, IG_BUSINESS_ACCOUNT_ID
- Messaging: KLAVIYO_PUBLIC_KEY/PRIVATE_KEY, RESEND_API_KEY
- Storage/Sheets: GOOGLE_SERVICE_ACCOUNT_JSON_BASE64, GOOGLE_SHEETS_DB_SPREADSHEET_ID (optional)

## Outputs
- reports/intel/latest/kpi.{md,json}
- reports/creative/<date>/capcut.json + script.srt
- Draft Release attachments (intel.yml)

## KPIs
Spend, Impressions, Clicks, Conversions, Revenue, CPC, CPM, CPA, ROAS.

## Workflows
- intel.yml (07:40/16:40 Toronto)
- finance-daily.yml (daily)
- release-verify.yml (tags)
- secrets-watch.yml (daily)
- ops-monitor.yml (5-min)

## Guardrails
- Never commit secrets. Placeholder <TODO> allowed; code must no-op safely.
