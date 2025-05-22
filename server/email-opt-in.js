/**
 * Email Opt-In Migration Script
 * 
 * This script adds the email_opt_in field to the users table if it doesn't exist.
 * It runs as a standalone migration that won't interfere with other migrations.
 */

const { pool } = require('./db');

async function addEmailOptInColumn() {
  const client = await pool.connect();
  
  try {
    console.log('Starting email opt-in migration...');
    
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
      console.log('Adding email_opt_in field to users table...');
      
      const addColumnQuery = `
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS email_opt_in BOOLEAN DEFAULT false
      `;
      
      await client.query(addColumnQuery);
      console.log('email_opt_in field added successfully.');
    } else {
      console.log('email_opt_in field already exists in users table.');
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('Email opt-in migration completed successfully');
    return true;
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    console.error('Email opt-in migration failed:', error);
    return false;
  } finally {
    // Release client back to pool
    client.release();
  }
}

module.exports = { addEmailOptInColumn };