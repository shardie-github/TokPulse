#!/usr/bin/env bash
cat > .env.example << EOF
# Copy to .env and fill in values
TIKTOK_PIXEL_ID=
META_PIXEL_ID=
GA4_ID=
SHOPIFY_STORE=
SHOPIFY_THEME_ID=
EOF
echo "Created .env.example"
