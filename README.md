# TokPulse Monorepo

Unified package for Shopify + Wix deliverables, documentation, automations, and business assets.
Generated on 2025-09-20.

## Quick Start

1. **Unzip** this package into your working directory.
2. Choose a path:
   - **Shopify** → `apps/shopify/` (theme/snippets/sections + install guides)
   - **Wix** (Velo) → `apps/wix/` (Velo app scaffolding + page hooks)
3. Review **docs/** (integration, deployment, and business checklists).
4. Optional: enable **GitHub Actions** in `.github/workflows/`.
5. Store sensitive documents in **private/** (kept out of source control by default).

## Repo Structure

```
TokPulse-Repo-Package-2025-09-20/
  apps/
    shopify/
      theme/
      snippets/
      sections/
      scripts/
      README.md
    wix/
      velo-app/
      README.md
  automation/
    github/
      workflows/
        unzip-on-push.yml
  docs/
    BUSINESS-SETUP.md
    INTEGRATIONS.md
    DEPLOYMENT.md
    CHANGELOG.md
  private/
    BUSINESS/
      01_Strategy/
      02_Contracts/
      03_Finance/
      04_Assets/
    .gitkeep
    README-PRIVATE.md
  scripts/
    local/
      create-env-example.sh
      bundle-theme.sh
    ops/
      release-notes-template.md
  packages/
    placeholders.txt
  .gitignore
  LICENSE
```

## How Shopify and Wix pieces connect

- **Shared brand assets** live in `private/BUSINESS/04_Assets/` and are referenced by both app folders.
- **Tracking/analytics** snippets are provided in `apps/shopify/snippets/` and `apps/wix/velo-app/analytics/`.
- **Docs** detail how to keep parity of pixels, feeds, and structured data across both platforms.

See **docs/INTEGRATIONS.md** for end‑to‑end connection maps.
