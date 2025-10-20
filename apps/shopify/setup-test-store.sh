#!/bin/bash

# TokPulse Shopify Test Store Setup Script
# For store: shopify.com/store/jb4izh-tz

set -e

echo "🚀 Setting up TokPulse for Shopify test store: jb4izh-tz.myshopify.com"

# Check if required tools are installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    exit 1
fi

if ! command -v shopify &> /dev/null; then
    echo "⚠️  Shopify CLI not found. Install it with: npm install -g @shopify/cli @shopify/theme"
fi

# Create necessary directories
mkdir -p private
mkdir -p var/shopify

# Generate encryption key if not exists
if [ ! -f "private/kms.key" ]; then
    echo "🔐 Generating encryption key..."
    openssl rand -base64 32 > private/kms.key
    echo "✅ Encryption key generated"
fi

# Set up environment variables
echo "📝 Setting up environment variables..."
echo "Please update the following in apps/shopify/.env:"
echo ""
echo "SHOPIFY_API_KEY=your_api_key_here"
echo "SHOPIFY_API_SECRET=your_api_secret_here" 
echo "SHOPIFY_APP_URL=https://your-app-domain.com"
echo ""

# Create webhook replay database
echo "📊 Initializing webhook replay database..."
echo '{}' > var/shopify/webhook-ids.json

# Install dependencies
echo "📦 Installing dependencies..."
cd "$(dirname "$0")"
npm install

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Create a Shopify app in your Partner Dashboard"
echo "2. Update apps/shopify/.env with your API credentials"
echo "3. Set up your app URL and webhook endpoints"
echo "4. Run: npm start"
echo ""
echo "Test store: https://shopify.com/store/jb4izh-tz"
echo "Store domain: jb4izh-tz.myshopify.com"