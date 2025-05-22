import { pool } from '../db';
import { logger } from '../utils/logger';

/**
 * Migration to ensure email_opt_in field exists in users table
 * This allows us to track users who have opted in to receive marketing emails
 */
export async function runEmailOptInMigration() {
  const client = await pool.connect();
  
  try {
    logger.info('Starting email opt-in migration...');
    
    // Begin transaction
    await client.query('BEGIN');
    
    // Check if the column exists already
    const columnCheckQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'email_opt_in'
    `;
    
    const columnCheckResult = await client.query(columnCheckQuery);
    
    // If column doesn't exist, add it
    if (columnCheckResult.rowCount === 0) {
      logger.info('Adding email_opt_in field to users table...');
      
      const addColumnQuery = `
        ALTER TABLE users
        ADD COLUMN email_opt_in BOOLEAN DEFAULT false
      `;
      
      await client.query(addColumnQuery);
      logger.info('email_opt_in field added successfully.');
    } else {
      logger.info('email_opt_in field already exists in users table.');
    }
    
    // Commit transaction
    await client.query('COMMIT');
    logger.info('Email opt-in migration completed successfully');
    return true;
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    logger.error('Email opt-in migration failed:', error instanceof Error ? error.message : String(error));
    throw error;
  } finally {
    // Release client back to pool
    client.release();
  }
}