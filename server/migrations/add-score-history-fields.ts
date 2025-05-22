import { db } from '../db';
import { sql } from 'drizzle-orm';

/**
 * Migration to create or update the score_history table
 * This will ensure our Rivu Score history tracking is properly set up
 */
export async function runMigration() {
  console.log('Running migration: Create or update score_history table');
  
  try {
    // First check if the table exists, create it if it doesn't
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS score_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        score INTEGER NOT NULL,
        previous_score INTEGER,
        change INTEGER,
        reason TEXT,
        notes TEXT,
        change_factors TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
      );
    `);
    
    console.log('Score history table created or verified');
    
    // Add foreign key constraint if it doesn't exist
    await db.execute(sql`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'score_history_user_id_fkey'
        ) THEN 
          ALTER TABLE score_history
          ADD CONSTRAINT score_history_user_id_fkey
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}