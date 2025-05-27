#!/bin/bash
# Test build script to verify everything works before deployment
set -euo pipefail

echo "🧪 Testing build process locally..."

# Set test environment variables
export NODE_ENV=production
export VITE_API_URL=https://www.tryrivu.com
export VITE_PLAID_ENV=production
export VITE_GOOGLE_CLIENT_ID=test

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist/
rm -rf client/dist/

# Test the build command
echo "🔨 Testing npm run build..."
npm run build

# Verify outputs
echo "🔍 Verifying build outputs..."
if [ -f "dist/index.js" ]; then
    echo "✅ Server build successful: dist/index.js exists"
else
    echo "❌ Server build failed: dist/index.js missing"
    exit 1
fi

if [ -d "dist/public" ] && [ -f "dist/public/index.html" ]; then
    echo "✅ Frontend build successful: dist/public/index.html exists"
else
    echo "❌ Frontend build failed: dist/public/index.html missing"
    exit 1
fi

echo "🎉 Build test completed successfully!"
echo "Your app is ready for deployment!"