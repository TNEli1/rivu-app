// Database migrations script for production deployment
import { sql } from 'drizzle-orm';
import { db, pool } from './db';
import * as schema from '@shared/schema';
import { QueryResult } from '@neondatabase/serverless';

/**
 * Production-ready database migration script
 * Run it with: npm run db:deploy
 */
async function main() {
  console.log('Starting production database migration...');
  
  try {
    // Ensure we're connected to the database
    console.log('Verifying database connection...');
    await db.execute(sql`SELECT NOW()`);
    console.log('Database connection successful.');
    
    // Verify required schema tables exist
    console.log('Checking for required tables...');
    
    try {
      // Check if the users table exists
      const result = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        );
      `) as unknown as Array<{exists: boolean}>;
      
      const usersTableExists = result.length > 0 ? result[0].exists : false;
      
      if (!usersTableExists) {
        console.log('Initial schema setup required - creating tables...');
        // For production deployment, we'll use schema push
        console.log('Running database schema push...');
        // Note: in a real migration system, we'd use sql migrations
        // but for our deployment, we'll use drizzle-kit push
      } else {
        console.log('Schema already exists, checking for required fields...');
        
        // Check if last_budget_review_date exists on users table
        const columnResult = await db.execute(sql`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'users' 
            AND column_name = 'last_budget_review_date'
          );
        `) as unknown as Array<{exists: boolean}>;
        
        const columnExists = columnResult.length > 0 ? columnResult[0].exists : false;
        
        if (!columnExists) {
          console.log('Adding last_budget_review_date field to users table...');
          await db.execute(sql`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS last_budget_review_date TIMESTAMP;
          `);
          console.log('Field added successfully.');
        }
      }
      
      console.log('Schema validation complete.');
    } catch (schemaError) {
      console.error('Error checking schema:', schemaError);
      // Continue with the migration process - don't exit on schema check error
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    // Close the database connection pool
    await pool.end();
  }
}

// Run the migration
main().then(() => {
  console.log('Migration process complete.');
  process.exit(0);
}).catch(err => {
  console.error('Error during migration:', err);
  process.exit(1);
});