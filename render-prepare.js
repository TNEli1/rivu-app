/**
 * Script to prepare the project for Render deployment
 * This script will:
 * 1. Copy all server files to the project root
 * 2. Update import paths in the copied files
 * 3. Create a deployment-ready structure
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directories to copy from server/ to root
const directories = [
  'controllers',
  'controllers-ts',
  'middleware',
  'models',
  'routes',
  'routes-ts',
  'services',
  'utils',
  'config'
];

// Files to copy from server/ to root
const files = [
  'index.ts',
  'routes.ts',
  'db.ts',
  'migrate.ts',
  'db-init.ts',
  'adapter.ts',
  'vite.ts',
  'storage.ts'
];

// Create directories if they don't exist
directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Copy files from server/ to root
files.forEach(file => {
  const sourcePath = path.join('server', file);
  if (fs.existsSync(sourcePath)) {
    console.log(`Copying ${sourcePath} to ${file}`);
    
    // Read file content
    let content = fs.readFileSync(sourcePath, 'utf8');
    
    // Replace imports that reference server/ with relative paths
    // (This step ensures all imports point to the new file locations)
    content = content.replace(/from ["']\.\.\/server\//g, 'from "./')
                     .replace(/from ["']\.\/server\//g, 'from "./')
                     .replace(/require\(["']\.\.\/server\//g, 'require("./')
                     .replace(/require\(["']\.\/server\//g, 'require("./');
    
    // Write file to root directory
    fs.writeFileSync(file, content);
  }
});

// Copy directory contents from server/ to root
directories.forEach(dir => {
  const sourcePath = path.join('server', dir);
  if (fs.existsSync(sourcePath)) {
    // Get all files in the directory
    try {
      const files = fs.readdirSync(sourcePath);
      
      files.forEach(file => {
        const sourceFilePath = path.join(sourcePath, file);
        const targetFilePath = path.join(dir, file);
        
        if (fs.statSync(sourceFilePath).isFile()) {
          console.log(`Copying ${sourceFilePath} to ${targetFilePath}`);
          
          // Read file content
          let content = fs.readFileSync(sourceFilePath, 'utf8');
          
          // Replace import paths (server/xxx/yyy → ./xxx/yyy)
          content = content.replace(/from ["']\.\.\/server\//g, 'from "../')
                           .replace(/from ["']\.\/server\//g, 'from "../')
                           .replace(/from ["']\.\.\/utils/g, 'from "../utils')
                           .replace(/from ["']\.\.\/middleware/g, 'from "../middleware')
                           .replace(/from ["']\.\.\/services/g, 'from "../services')
                           .replace(/from ["']\.\.\/models/g, 'from "../models')
                           .replace(/from ["']\.\.\/controllers/g, 'from "../controllers')
                           .replace(/from ["']\.\/utils/g, 'from "../utils')
                           .replace(/from ["']\.\/middleware/g, 'from "../middleware')
                           .replace(/from ["']\.\/services/g, 'from "../services')
                           .replace(/from ["']\.\/models/g, 'from "../models')
                           .replace(/from ["']\.\/controllers/g, 'from "../controllers');
          
          // Write file to target directory
          fs.writeFileSync(targetFilePath, content);
        }
      });
    } catch (error) {
      console.log(`Error reading directory ${sourcePath}: ${error.message}`);
    }
  }
});

// Create a Procfile for Render deployment
const procfileContent = `web: npm run start`;
fs.writeFileSync('Procfile', procfileContent);

// Create a .render-buildsteps.yaml file for custom build steps
const renderBuildStepsContent = `
build:
  steps:
    - npm install
    - npm run build
`;
fs.writeFileSync('.render-buildsteps.yaml', renderBuildStepsContent);

console.log('Project restructured for Render deployment!');
console.log('You still need to update package.json scripts manually:');
console.log('  "dev": "NODE_ENV=development tsx index.ts",');
console.log('  "build": "vite build && esbuild index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",');