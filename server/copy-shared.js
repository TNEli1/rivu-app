// Simple script to copy shared folder to server during build
const fs = require('fs');
const path = require('path');

// Define source and destination paths
const sourcePath = path.join(__dirname, '../shared');
const destPath = path.join(__dirname, 'shared');

// Create destination directory if it doesn't exist
if (!fs.existsSync(destPath)) {
  fs.mkdirSync(destPath, { recursive: true });
  console.log('Created shared directory in server folder');
}

// Copy files recursively
function copyDir(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied: ${srcPath} -> ${destPath}`);
    }
  }
}

// Execute the copy
try {
  copyDir(sourcePath, destPath);
  console.log('Successfully copied shared directory to server');
} catch (error) {
  console.error('Error copying shared directory:', error);
  process.exit(1);
}