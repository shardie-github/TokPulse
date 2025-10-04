/* TokPulse — © Hardonia. MIT. */
# Deployment

## Shopify
1. Ensure you have Shopify CLI installed.
2. From `apps/shopify/theme/`, run:
   ```bash
   shopify theme dev
   shopify theme push
   ```
3. For snippets-only installs, copy files from `apps/shopify/snippets/` into your theme and include as directed.

## Wix (Velo)
1. Open your Wix site in the Editor.
2. Enable **Dev Mode (Velo)**.
3. Mirror the code structure from `apps/wix/velo-app/` into your site files.
4. Publish and verify pixel events with preview tools.

## GitHub Actions
- Optional `automation/github/workflows/unzip-on-push.yml` to unpack artifacts on push.
