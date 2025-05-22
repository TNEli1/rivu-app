
import { runMigration as createScoreHistory } from './add-score-history-fields';
import { runMigration as addUserStatusFields } from './add-user-status-fields';
import { runMigration as addLastLoginColumn } from './add-last-login-column';
import { checkAndMarkInactiveUsers } from './inactiveUsers';

/**
 * Run all migrations in the correct order
 */
export async function runMigrations() {
  console.log('Starting database migrations...');
  
  try {
    // Add new migrations here in sequence
    await createScoreHistory();
    
    // Ensure user status fields are in the schema
    await addUserStatusFields();
    
    // Add last_login column for tracking user login activity
    await addLastLoginColumn();
    
    // Check for users who haven't been active in 90+ days and mark them as inactive
    await checkAndMarkInactiveUsers();
    
    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration process failed:', error);
    // Don't throw here to allow server to continue starting
    // even if migrations fail
  }
}
