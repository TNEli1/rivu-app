import { sql } from 'drizzle-orm';
import { db } from '../db';

/**
 * Adds last_login column to users table for tracking user login activity
 * This is needed for user inactivity tracking functionality
 */
export async function runMigration() {
  try {
    console.log('Adding last_login column to users table if it does not exist...');
    
    // Check if the last_login column exists
    const columnCheckResult = await db.execute(sql`
      SELECT COUNT(*) > 0 as exists
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'users' 
      AND column_name = 'last_login';
    `);
    
    // Check if column exists based on count result
    const resultRows = columnCheckResult as unknown as { exists: boolean }[];
    const hasLastLoginColumn = resultRows[0]?.exists === true;
    
    if (!hasLastLoginColumn) {
      console.log('Adding last_login field to users table...');
      await db.execute(sql`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
      `);
      console.log('last_login field added successfully.');
    } else {
      console.log('last_login field already exists.');
    }
    
    return true;
  } catch (error) {
    console.error('Failed to add last_login field to users table:', error);
    // Continue with other migrations
    return false;
  }
}