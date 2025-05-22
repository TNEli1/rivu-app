import { execSync } from 'child_process';

console.log('Running database migrations with SSL enabled...');

try {
  // Set NODE_TLS_REJECT_UNAUTHORIZED=0 to allow self-signed certificates
  // This is similar to setting ssl: { rejectUnauthorized: false }
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  
  // Run the migration command
  execSync('npx drizzle-kit push', { 
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_TLS_REJECT_UNAUTHORIZED: '0'
    }
  });
  
  console.log('Migration completed successfully!');
} catch (error) {
  console.error('Migration failed:', error.message);
  process.exit(1);
}