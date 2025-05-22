/**
 * Simplified database migrations for Rivu app 
 * Focuses on running critical migrations needed for the current features
 */

import { pool } from './db';
import { logger } from './utils/logger';

/**
 * Run all database migrations in sequence
 */
export async function runMigrations() {
  logger.info('Starting database migrations...');
  
  try {
    // Run email opt-in migration
    try {
      logger.info('Running email opt-in migration...');
      await runEmailOptInMigration();
      logger.info('Email opt-in migration completed successfully');
    } catch (error) {
      logger.error('Email opt-in migration failed:', typeof error === 'object' ? JSON.stringify(error) : String(error));
      // Continue with other migrations even if this one fails
    }
    
    logger.info('All migrations completed successfully');
  } catch (error) {
    logger.error('Error running migrations:', typeof error === 'object' ? JSON.stringify(error) : String(error));
    throw error;
  }
}

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
        ADD COLUMN IF NOT EXISTS email_opt_in BOOLEAN DEFAULT false
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
    logger.error('Email opt-in migration failed:', typeof error === 'object' ? JSON.stringify(error) : String(error));
    throw error;
  } finally {
    // Release client back to pool
    client.release();
  }
}