
import { runMigration as createScoreHistory } from './add-score-history-fields';

/**
 * Run all migrations in the correct order
 */
export async function runMigrations() {
  console.log('Starting database migrations...');
  
  try {
    // Add new migrations here in sequence
    await createScoreHistory();
    
    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration process failed:', error);
    // Don't throw here to allow server to continue starting
    // even if migrations fail
  }
}
