// Script to check and update client package.json
const fs = require('fs');
const path = require('path');

// Paths
const clientDir = path.join(__dirname, 'client');
const packageJsonPath = path.join(clientDir, 'package.json');

// Read the package.json
console.log('Checking client package.json...');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Verify scripts
if (!packageJson.scripts || !packageJson.scripts.build || !packageJson.scripts.dev) {
  console.log('Adding required scripts to package.json');
  packageJson.scripts = packageJson.scripts || {};
  packageJson.scripts.dev = packageJson.scripts.dev || 'vite';
  packageJson.scripts.build = packageJson.scripts.build || 'vite build';
  packageJson.scripts.preview = packageJson.scripts.preview || 'vite preview';
} else {
  console.log('Scripts already configured correctly');
}

// Verify dependencies
const requiredDeps = [
  '@vitejs/plugin-react',
  'vite',
  'typescript',
  'react',
  'react-dom'
];

const missingDeps = requiredDeps.filter(dep => {
  return !packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep];
});

if (missingDeps.length > 0) {
  console.log(`Missing dependencies: ${missingDeps.join(', ')}`);
  console.log('Please add these to package.json or install them with npm');
} else {
  console.log('All required dependencies present');
}

// Update package.json if changes were made
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
console.log('Client package.json is ready for Vercel deployment');

// Create vercel.json if it doesn't exist
const vercelJsonPath = path.join(clientDir, 'vercel.json');
if (!fs.existsSync(vercelJsonPath)) {
  console.log('Creating vercel.json');
  const vercelConfig = {
    "version": 2,
    "buildCommand": "npm run build",
    "outputDirectory": "dist",
    "framework": "vite",
    "rewrites": [
      { "source": "/api/(.*)", "destination": "https://api.tryrivu.com/api/$1" },
      { "source": "/(.*)", "destination": "/index.html" }
    ]
  };
  fs.writeFileSync(vercelJsonPath, JSON.stringify(vercelConfig, null, 2));
  console.log('vercel.json created');
} else {
  console.log('vercel.json already exists');
}

console.log('\nTo complete preparation, run:');
console.log('  cd client && npm install');
console.log('\nAfter that, the client directory will be ready for deployment to Vercel!');