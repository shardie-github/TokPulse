/* TokPulse — © Hardonia. MIT. */
# Integrations Map

This document explains how components connect across Shopify and Wix.

## Sources
- Product Catalog: Shopify (primary), mirrored via feeds to channels.
- Reviews: Areviews (Shopify) parity via static badges on Wix when required.
- Pixels: TikTok, Meta, GA4 — standardized event names and parameters.

## Shopify
- Theme: `apps/shopify/theme/` (Dawn 15.20+ compatible)
- Snippets: pixels, trustboxes, JSON-LD, predictive search enhancements
- Scripts: utility helpers for bundling and deployment

## Wix (Velo)
- App scaffolding in `apps/wix/velo-app/`
- Site code: `/public/` shared utilities, `/backend/` server functions, `/pages/` page hooks
- Tracking parity: `/analytics/` holds scripts mirroring Shopify pixel events

## Cross-Platform Parity
- Structured Data (JSON-LD): product, breadcrumb, org; optional FAQ and video
- Feed parity: identical GTIN/MPN/SKU → ad channels
- UTM handling & landing page logic
