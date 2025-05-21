// Render Deployment Preparation Script
// This script will move server files to root and update paths

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Create server directory backup
console.log('Creating backup of server directory...');
execSync('cp -r server server-backup');

// Create necessary directories
const dirs = [
  'controllers',
  'controllers-ts', 
  'middleware',
  'models',
  'routes',
  'routes-ts',
  'services',
  'utils'
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Move files from server to root with proper path adjustments
console.log('Moving server files to root...');

// Copy root level server files
const serverFiles = fs.readdirSync('server')
  .filter(file => file.endsWith('.ts') && fs.statSync(`server/${file}`).isFile());

serverFiles.forEach(file => {
  const content = fs.readFileSync(`server/${file}`, 'utf8');
  const updatedContent = content
    .replace(/from ['"]\.\/([^'"]+)['"]/g, (match, p1) => {
      return `from './${p1}'`;
    });
  fs.writeFileSync(file, updatedContent);
  console.log(`Moved ${file} to root`);
});

// Copy subdirectory files
dirs.forEach(dir => {
  if (fs.existsSync(`server/${dir}`)) {
    const files = fs.readdirSync(`server/${dir}`)
      .filter(file => fs.statSync(`server/${dir}/${file}`).isFile());
    
    files.forEach(file => {
      const content = fs.readFileSync(`server/${dir}/${file}`, 'utf8');
      const updatedContent = content
        .replace(/from ['"]\.\.\/([^'"]+)['"]/g, (match, p1) => {
          return `from '../${p1}'`;
        });
      fs.writeFileSync(`${dir}/${file}`, updatedContent);
      console.log(`Moved ${dir}/${file}`);
    });
  }
});

// Create Procfile for Render
fs.writeFileSync('Procfile', 'web: npm run start');

// Update tsconfig.json
const tsConfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
tsConfig.include = ["client/src/**/*", "shared/**/*", "**/*.ts", "**/*.tsx"];
fs.writeFileSync('tsconfig.json', JSON.stringify(tsConfig, null, 2));

console.log('Project restructured for Render deployment!');
console.log('NOTE: You\'ll need to update package.json scripts to use new paths:');
console.log('  - build: npm install');
console.log('  - start: NODE_ENV=production tsx index.ts');