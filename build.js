#!/usr/bin/env node

// Custom build script for production deployment on Render
// This script bypasses the Vite build process and only builds the backend using esbuild

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🔨 Starting production build process for Render deployment...');

// Create dist directory if it doesn't exist
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
  console.log('✅ Created dist directory');
}

try {
  // Build the backend using esbuild directly
  console.log('🔨 Building backend with esbuild...');
  
  execSync(
    'esbuild index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist',
    { stdio: 'inherit' }
  );
  
  console.log('✅ Backend build completed successfully');
  
  // Copy any necessary static files
  if (fs.existsSync('public')) {
    console.log('📂 Copying static assets to distribution folder...');
    
    if (!fs.existsSync('dist/public')) {
      fs.mkdirSync('dist/public', { recursive: true });
    }
    
    // Simple recursive copy function for the public directory
    const copyDir = (src, dest) => {
      const entries = fs.readdirSync(src, { withFileTypes: true });
      
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
          if (!fs.existsSync(destPath)) {
            fs.mkdirSync(destPath, { recursive: true });
          }
          copyDir(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
    };
    
    copyDir('public', 'dist/public');
    console.log('✅ Static assets copied successfully');
  }
  
  console.log('🚀 Build completed successfully! Ready for deployment.');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}