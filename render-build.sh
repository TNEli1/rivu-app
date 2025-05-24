#!/bin/bash

# Render-specific build script for Node.js + Express backend
echo "🚀 Starting Render build process..."

# Build server using esbuild only (no Vite)
echo "🔨 Building backend with esbuild..."
npx esbuild index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Verify build succeeded
if [ $? -eq 0 ]; then
  echo "✅ Backend build completed successfully!"
else
  echo "❌ Backend build failed!"
  exit 1
fi

# Create public directory if it doesn't exist
mkdir -p dist/public

echo "🎉 Build complete! Ready for Render deployment."