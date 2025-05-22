#!/bin/bash
# Script to prepare the application for Render deployment
# This builds both frontend and backend, and sets up the combined deployment

# Exit on error
set -e

echo "=== Starting Render build process ==="

# Set production environment
export NODE_ENV=production

# Step 1: Build frontend (React app)
echo "Building frontend..."
cd client
npm run build
cd ..

# Step 2: Ensure dist/public directory exists
mkdir -p dist/public

# Step 3: Copy frontend build to the location expected by the backend
echo "Copying frontend build to dist/public..."
cp -r client/dist/* dist/public/

# Step 4: Build backend (Express server)
echo "Building backend..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

echo "=== Build completed successfully ==="
echo "The application is now ready for Render deployment."
echo "Backend will serve the frontend static files in production mode."