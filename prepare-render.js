/**
 * Script to prepare the project for unified Render deployment
 * This script will ensure the client build is properly set up for backend serving
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Log with timestamp
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

// Create directory if it doesn't exist
function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    log(`Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Main function
async function prepareForRender() {
  try {
    log('Starting Render deployment preparation');
    
    // 1. Build client (frontend)
    log('Building frontend...');
    try {
      execSync('cd client && npm run build', { stdio: 'inherit' });
    } catch (error) {
      log('Error building frontend. Continuing anyway...');
    }

    // 2. Create dist/public directory if it doesn't exist
    const publicDir = path.join(process.cwd(), 'dist', 'public');
    ensureDirectoryExists(publicDir);
    
    // 3. Copy client build to dist/public if client/dist exists
    const clientDistDir = path.join(process.cwd(), 'client', 'dist');
    if (fs.existsSync(clientDistDir)) {
      log('Copying frontend build to dist/public...');
      
      // On Unix-like systems
      try {
        execSync(`cp -r ${clientDistDir}/* ${publicDir}/`, { stdio: 'inherit' });
        log('Frontend assets copied successfully');
      } catch (error) {
        log('Error copying frontend assets:');
        console.error(error);
      }
    } else {
      log('Warning: Client build directory not found. Backend will serve APIs but frontend may be missing.');
    }

    // 4. Build server (backend)
    log('Building backend...');
    try {
      execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', { stdio: 'inherit' });
      log('Backend built successfully');
    } catch (error) {
      log('Error building backend:');
      console.error(error);
      throw error;
    }

    log('Render deployment preparation completed successfully!');
  } catch (error) {
    log('Preparation failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run the preparation
prepareForRender();