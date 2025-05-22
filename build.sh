#!/bin/bash
# Unified build script for Render deployment

set -e # Exit immediately if a command exits with a non-zero status

echo "🚀 Starting unified build process for Render deployment..."

# Step 1: Build the frontend
echo "📦 Building frontend..."
cd client
npm install
npm run build
cd ..
echo "✅ Frontend build complete"

# Step 2: Build the backend
echo "📦 Building backend..."
npm install

# Step 3: Bundle server for production
echo "📦 Bundling server code..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Step 4: Make sure the dist directory exists
mkdir -p dist/public

# Step 5: Copy frontend build files to be served by Express
echo "📦 Copying frontend build to backend static directory..."
cp -r client/dist/* dist/public/

# Step 6: Prepare database (if DATABASE_URL is available)
if [ -n "$DATABASE_URL" ]; then
  echo "📊 Preparing database schema..."
  node prepare-database.js
  echo "✅ Database preparation complete"
else
  echo "⚠️ DATABASE_URL not available, skipping database preparation"
  echo "   Database schema will be applied on first run"
fi

# Step 7: Setup for production
echo "🔧 Setting up production environment..."
NODE_ENV=production

echo "🎉 Build process complete! Ready for Render deployment."