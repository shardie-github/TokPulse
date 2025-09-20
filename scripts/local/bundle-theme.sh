#!/usr/bin/env bash
set -e
ZIP_NAME=theme-bundle.zip
cd apps/shopify/theme
zip -r ../../packages/$ZIP_NAME .
echo "Bundled theme to packages/$ZIP_NAME"
