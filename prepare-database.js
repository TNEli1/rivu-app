/**
 * Database initialization script for Render deployment
 * Run during build process to ensure database schema is properly created
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Environment setup
const isProduction = process.env.NODE_ENV === 'production';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/rivu';

console.log('🔧 Preparing database for deployment...');

// Print environment info
console.log(`Environment: ${isProduction ? 'Production' : 'Development'}`);

try {
  // Run database migration using drizzle-kit
  console.log('📊 Pushing database schema...');
  execSync('npm run db:push', { stdio: 'inherit' });
  
  console.log('✅ Database schema updated successfully!');
} catch (error) {
  console.error('❌ Error updating database schema:', error.message);
  process.exit(1);
}

console.log('🎉 Database preparation complete!');