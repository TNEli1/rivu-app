#!/bin/bash

# Script to prepare the project for Render deployment
echo "Preparing project for Render deployment..."

# Create directories at root level if they don't exist
for dir in controllers controllers-ts middleware models routes routes-ts services utils config; do
  mkdir -p $dir
done

# Copy all server files to the root directory
echo "Copying server files to root directory..."
for file in $(find server -type f -name "*.ts" -not -path "*/node_modules/*"); do
  # Get the relative path within the server directory
  rel_path=${file#server/}
  
  # Create destination directory if it doesn't exist
  dest_dir=$(dirname "$rel_path")
  mkdir -p "$dest_dir"
  
  # Copy the file
  cp "$file" "$rel_path"
  
  # Update import paths in the file
  if [ -f "$rel_path" ]; then
    echo "Processing $rel_path"
    # Replace server/ imports with ./ imports
    sed -i 's/from "\.\/server\//from "\.\//g' "$rel_path"
    sed -i "s/from '\.\\/server\\//from '.\\//" "$rel_path"
    sed -i 's/from "\.\.\\/server\//from "\.\.\//g' "$rel_path"
    sed -i "s/from '..\\\/server\\\/'/from '..\\\/'/" "$rel_path"
  fi
done

# Create Procfile for Render
echo "Creating Procfile for Render..."
echo "web: npm run start" > Procfile

# Update tsconfig.json to include files in root directory
echo "Updating tsconfig.json..."
sed -i 's/"include": \["client\/src\/\*\*\/\*", "shared\/\*\*\/\*", "server\/\*\*\/\*"\]/"include": \["client\/src\/\*\*\/\*", "shared\/\*\*\/\*", "\*\*\/\*.ts", "\*\*\/\*.tsx"\]/' tsconfig.json

echo "Project restructured for Render deployment!"
echo "NOTE: You will need to update package.json scripts to use the new file paths. For Render deployment:"
echo "  - build: npm install"
echo "  - start: NODE_ENV=production tsx index.ts"