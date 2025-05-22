import { db } from '../db';
import { sql } from 'drizzle-orm';

/**
 * Migration to add account status fields to users table
 */
export async function addUserStatusFields() {
  console.log('Running migration: Add user account status fields');
  
  try {
    // Check if the columns already exist to avoid errors
    const checkColumnResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'status'
    `);
    
    // Get the result rows
    const rows = checkColumnResult.rows || [];
    
    // If status column doesn't exist, add the new columns
    if (rows.length === 0) {
      // Add status column
      await db.execute(sql`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'
      `);
      
      // Add last_activity_date column
      await db.execute(sql`
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS last_activity_date TIMESTAMP
      `);
      
      console.log('Added user account status fields successfully');
    } else {
      console.log('User account status fields already exist');
    }
    
    return true;
  } catch (error) {
    console.error('Failed to add user account status fields:', error);
    throw error;
  }
}