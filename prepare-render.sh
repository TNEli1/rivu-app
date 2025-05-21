#!/bin/bash

echo "Preparing project for Render deployment..."

# Create a temporary restructured directory
mkdir -p render_ready

# First, copy all the directory structure
echo "Setting up directory structure..."
find server -type d | while read dir; do
  # Skip the server root directory itself
  if [ "$dir" != "server" ]; then
    # Get the relative path from server/
    rel_path=${dir#server/}
    # Create the directory in render_ready
    mkdir -p "render_ready/$rel_path"
  fi
done

# Then, copy all the files preserving the structure
echo "Copying files with preserved structure..."
find server -type f | while read file; do
  # Get the relative path from server/
  rel_path=${file#server/}
  # Copy to render_ready
  cp "$file" "render_ready/$rel_path"
done

# Create Procfile for Render
echo "web: npm run start" > render_ready/Procfile

# Copy shared directory and client directory
cp -r shared render_ready/
cp -r client render_ready/

# Copy necessary config files
cp vite.config.ts render_ready/
cp tsconfig.json render_ready/
cp package.json render_ready/
cp package-lock.json render_ready/
cp -r public render_ready/ 2>/dev/null || echo "No public directory found"
cp .env.example render_ready/ 2>/dev/null || echo "No .env.example found"
cp drizzle.config.ts render_ready/ 2>/dev/null || echo "No drizzle.config.ts found"
cp -r tmp render_ready/ 2>/dev/null || echo "No tmp directory found"

echo "Project restructured for Render in render_ready/ directory"
echo "You can now zip this directory and upload it to Render"