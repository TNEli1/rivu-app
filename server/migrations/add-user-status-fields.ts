import { sql } from 'drizzle-orm';
import { db } from '../db';

/**
 * Ensures that the users table has the status field and last_activity_date fields
 * These are needed for tracking account status (active, inactive, deleted)
 */
export async function runMigration() {
  try {
    console.log('Adding user status fields if they do not exist...');
    
    // First check if the status column exists
    const statusResult = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'status'
      );
    `) as unknown as Array<{exists: boolean}>;
    
    const statusExists = statusResult.length > 0 ? statusResult[0].exists : false;
    
    if (!statusExists) {
      console.log('Adding status field to users table...');
      await db.execute(sql`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
      `);
      console.log('Status field added successfully.');
    }
    
    // Check if the last_activity_date column exists
    const lastActivityResult = await db.execute(sql`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'last_activity_date'
      );
    `) as unknown as Array<{exists: boolean}>;
    
    const lastActivityExists = lastActivityResult.length > 0 ? lastActivityResult[0].exists : false;
    
    if (!lastActivityExists) {
      console.log('Adding last_activity_date field to users table...');
      await db.execute(sql`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS last_activity_date TIMESTAMP;
      `);
      console.log('Last activity date field added successfully.');
    }
    
    console.log('User status fields migration completed.');
  } catch (error) {
    console.error('Error in user status fields migration:', error);
    // Continue with other migrations - don't throw error
  }
}