import { db } from '../db';
import { sql } from 'drizzle-orm';

/**
 * Migration to add privacy compliance columns to users table and create user_consents table
 */
export async function runPrivacyMigration() {
  console.log('Running privacy compliance migration...');
  try {
    // Add privacy fields to users table if they don't exist
    await db.execute(sql`
      DO $$ 
      BEGIN
        -- Add country_code column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'country_code') THEN
          ALTER TABLE users ADD COLUMN country_code TEXT;
        END IF;

        -- Add data_consent_given column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'data_consent_given') THEN
          ALTER TABLE users ADD COLUMN data_consent_given BOOLEAN DEFAULT FALSE;
        END IF;

        -- Add data_consent_date column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'data_consent_date') THEN
          ALTER TABLE users ADD COLUMN data_consent_date TIMESTAMP;
        END IF;

        -- Add marketing_consent_given column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'marketing_consent_given') THEN
          ALTER TABLE users ADD COLUMN marketing_consent_given BOOLEAN DEFAULT FALSE;
        END IF;

        -- Add last_privacy_policy_accepted column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_privacy_policy_accepted') THEN
          ALTER TABLE users ADD COLUMN last_privacy_policy_accepted TIMESTAMP;
        END IF;
      END $$;
    `);
    console.log('Privacy fields added to users table');

    // Create user_consents table if it doesn't exist
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS user_consents (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        consent_type TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        consent_value BOOLEAN DEFAULT TRUE,
        consent_version TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    console.log('user_consents table created or verified');

    console.log('Privacy compliance migration completed successfully');
  } catch (error) {
    console.error('Error during privacy compliance migration:', error);
    throw error;
  }
}