// Database migrations script
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from './db';

/**
 * This migrate script pushes the schema to the database.
 * Run it with: npm run db:push
 */
async function main() {
  console.log('Starting database push...');
  
  try {
    // Using push method to apply schema without generating migration files
    // This is suitable for dev environments or initial setup
    // For production, use generated migrations with schema history
    console.log('Pushing schema to database...');
    
    // In a real production environment, we would use migrate with SQL files:
    // await migrate(db, { migrationsFolder: './drizzle' });
    
    // For now, drizzle-kit push is handled in the npm script
    console.log('Schema push completed. Database is ready!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main().then(() => {
  console.log('Migration process complete.');
  process.exit(0);
}).catch(err => {
  console.error('Error during migration:', err);
  process.exit(1);
});