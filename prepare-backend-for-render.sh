#!/bin/bash

# Script to prepare the backend for Render deployment without Vite dependencies
echo "Preparing backend for Render deployment..."

# Create a clean backend deployment directory
DEPLOY_DIR="render-backend-deploy"
mkdir -p $DEPLOY_DIR

# Copy all necessary backend files
echo "Copying backend files..."
cp -r server/controllers server/controllers-ts server/middleware server/models server/routes server/routes-ts server/services server/utils $DEPLOY_DIR/
cp server/*.ts $DEPLOY_DIR/ 2>/dev/null || echo "No TS files in server root"

# Copy configuration files
cp package.json package-lock.json tsconfig.json $DEPLOY_DIR/
cp -r shared $DEPLOY_DIR/

# Create Procfile for Render
echo "web: NODE_ENV=production tsx index.ts" > $DEPLOY_DIR/Procfile

# Create .gitignore for deployment
cat > $DEPLOY_DIR/.gitignore << EOF
node_modules
.env
.DS_Store
dist
*.log
EOF

# Fix Vite references in index.ts
echo "Fixing Vite references in index.ts..."
sed -i 's/import { setupVite, serveStatic, log } from ".\/vite";/import path from "path";\nimport fs from "fs";\n\n\/\/ Simple logging function\nfunction log(message, source = "express") {\n  const time = new Date().toLocaleTimeString();\n  console.log(`${time} [${source}] ${message}`);\n}/' $DEPLOY_DIR/index.ts

# Replace Vite setup with simple Express static file serving
sed -i '/\/\/ importantly only setup vite/,/serveStatic(app);/c\
  // Serve static files in production\n  if (app.get("env") === "production") {\n    const publicPath = path.join(process.cwd(), "dist/public");\n    console.log(`Serving static files from: ${publicPath}`);\n    app.use(express.static(publicPath));\n\n    // Handle SPA routes\n    app.get("*", (req, res) => {\n      // Skip API routes\n      if (req.url.startsWith("/api/")) {\n        return res.status(404).json({ error: "API endpoint not found" });\n      }\n\n      const indexPath = path.join(publicPath, "index.html");\n      if (fs.existsSync(indexPath)) {\n        return res.sendFile(indexPath);\n      } else {\n        console.warn(`Index file not found at: ${indexPath}`);\n        return res.status(404).send("Application not found");\n      }\n    });\n  }' $DEPLOY_DIR/index.ts

echo "Deployment package prepared in $DEPLOY_DIR"
echo "You can now zip this directory and deploy it to Render"