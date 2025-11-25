#!/bin/bash
# Deploy widget to Cloudflare R2
# Usage: ./scripts/deploy.sh

set -e

# Configuration
R2_BUCKET="${R2_BUCKET:-vakkya-widget}"
R2_ENDPOINT="${R2_ENDPOINT:-https://<account-id>.r2.cloudflarestorage.com}"

# Build the widget
echo "Building widget..."
pnpm build

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "Error: wrangler CLI not found. Install with: npm install -g wrangler"
    exit 1
fi

# Upload to R2 with cache headers
echo "Uploading to R2..."
wrangler r2 object put "${R2_BUCKET}/widget.js" \
    --file dist/widget.js \
    --content-type "application/javascript" \
    --cache-control "public, max-age=3600"

echo "✅ Widget deployed successfully!"
echo "CDN URL: https://cdn.vakkya.ai/widget.js"
