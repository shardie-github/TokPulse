/* TokPulse — © Hardonia. MIT. */
# Hardonia — Full Project README (v1.0 → v5.6)

**Hardonia** is a high‑performance Shopify ecosystem with automation, CRO, SEO, and creative ops integrated end‑to‑end. This README captures the full context, architecture, and version history through **v5.6** (TokPulse integration and CI unboxing).

---

## 1) Project Overview

- **Storefront:** Shopify Dawn 15.20 (2.0, sectioned)  
- **CRO/UX:** Sticky ATC, trust badges, responsive grids, quiz, shoppable video, countdowns, affiliate landing, bundle builder, back‑in‑stock logic  
- **SEO/Schema:** JSON‑LD for products/collections/organization/breadcrumbs; FAQ/video when metafields present; Areviews integration  
- **Performance:** Deferred JS, preload targeting, optimized fonts, lazy images, minimized layout shift, caching strategy, DOM reduction  
- **Automation:** AutoDS compatibility, AI content engines, Klaviyo flows & pixel events, UTM tracking, Google Sheets reporting, app‑free utilities  
- **Creative Ops:** CapCut‑ready scripts, Veo/Imagen prompts, TikTok/TikTok Shop automations, daily intel suites

---

## 2) Repo Structure (typical)
```
/theme/                       # Shopify theme (Dawn 15.20) with custom sections/snippets
  layout/theme.liquid
  sections/*.liquid
  snippets/*.liquid
  assets/*
/ops/                         # scripts, guides, automations
/feeds/                       # XML/CSV feeds for GMC/Meta/TikTok (AutoDS-safe)
/sheets/                      # Google Sheets templates + Apps Script
/creative/                    # CapCut kits, SRT, prompts, shotlists
/tokpulse/                    # TikTok data automation (scrapers, schedulers)
/packages/                    # CI-unboxed drops (for versioned deploys)
/incoming/                    # ZIP drop zone (GitHub Actions unboxes here)
.github/workflows/            # CI (unboxers, runners, promotions)
```
> Not all folders exist in every branch; structure reflects the unified operating system.

---

## 3) End‑to‑End Deploy

### Shopify theme
1. Upload **final theme ZIP** via Shopify admin or Shopify CLI.  
2. Ensure metafields exist: `custom.faq_list`, `custom.video_url`, AutoDS fields.  
3. Verify Areviews widgets (carousel + product card stars).

### CI unboxing (TokPulse)
- Push ZIPs to `incoming/` → unboxed under `packages/<drop>/`.  
- Runner operates from `.current` (or latest).  
- Promotion flips prod by writing `packages/.current` and hitting deploy hooks.

### External deploys
- **Vercel** prod root: `packages/current`  
- **Netlify** base: `packages/current` (via `netlify.toml`)

---

## 4) Version History (Changelog)

### v1.0 — Foundation
- Dawn 15.x baseline; initial SEO schema; core UX patterns; AutoDS compatibility.

### v1.5 — SEO & Performance Pass
- JSON‑LD expansions (products/collections/organization/breadcrumbs).  
- Font & image delivery optimization; defer legacy JS; preload criticals.

### v2.0 — CRO Essentials
- Sticky Add‑to‑Cart, trust badges, urgency banners, improved product grid.  
- Lazy images, CLS fixes, mobile‑first adjustments.

### v2.5 — Metafields & Media
- Video tab via `custom.video_url`; FAQ via `custom.faq_list`.  
- Areviews integration (carousel + grid stars), smart spacing/layout.

### v3.0 — Marketing & Analytics
- Klaviyo identify/track; Meta/TikTok pixel custom events.  
- UTM automation and reporting hooks; GMC‑friendly feeds.

### v3.5 — Automation Layer
- Google Sheets intelligence (profit, UTM, variants, returns).  
- Apps Script triggers; alerting; AutoDS sync helpers.

### v4.0 — AI Content & Creative
- AI product recommendations; GPT SEO/FAQ generators; shoppable video module.  
- CapCut‑ready scripts (SPEAK/VISUAL/OVERLAY), Veo/Imagen prompts.

### v4.5 — UX Upgrades
- Enhanced collections grid with filters/sorting/pagination; AJAX quick add.  
- New/sale/sold‑out badges with smart detection; forced reflow fixes.

### v5.0 — Enterprise Polish
- AAAA visual styling; animations; sticky headers; deferred loading; reduced JS/CSS payload; audit sweeps.

### v5.3 — Advanced Apps & Feeds
- Infinity Feeds; AI Bundle Experimenter; email AI; TikTok AutoScript Generator; Silent Loyalty Layer scaffolding.

### v5.5 — Gamification & Interactivity
- Spin‑to‑win, quiz‑based selectors, enhanced popups; micro‑interactions; mobile polish.

### v5.6 — TokPulse CI & Zero‑Downtime Deploys
- **Unboxer CI** (ZIP → `packages/<drop>`), **Runner** from `.current`/latest.  
- **Promote** workflow writes `packages/.current` and triggers **Vercel/Netlify**.  
- Side‑by‑side package testing; instant rollback via re‑promotion.

> Next: Timestamped package variant, “promote‑and‑tag”, and canary auto‑hooks.

---

## 5) Required Secrets (GitHub → Settings → Secrets → Actions)
- `VERCEL_HOOK_PROD` — (optional) Vercel prod deploy hook
- `NETLIFY_HOOK_PROD` — (optional) Netlify build hook
- App/API keys required by your scrapers or backend tasks

---

## 6) Ops Commands & One‑Liners

**Rename/move a misplaced workflow path (case fix):**
```bash
git mv -f .GitHub .github
git mv -f .github/Workflows .github/workflows
git commit -m "fix: correct GitHub Actions path casing"
git push
```

**Promote a package to prod (manual file edit):**
```bash
echo "packages/<drop-name>" > packages/.current
git add packages/.current && git commit -m "promote: <drop-name>" && git push
```

**Trigger runner manually (API):**
```bash
curl -X POST -H "Authorization: token <GITHUB_TOKEN>"   -H "Accept: application/vnd.github+json"   https://api.github.com/repos/<owner>/<repo>/actions/workflows/tokpulse-run-from-packages.yml/dispatches   -d '{"ref":"main"}'
```

---

## 7) Support & Maintenance
- Keep 2–3 packages for rollback; prune older ones.  
- Maintain CHANGELOG for each promoted drop (tie to marketing/ads cutovers).  
- Run Lighthouse & Shopify performance audits after theme changes.

---

© 2025 Hardonia. All rights reserved.
