// Database initialization script
import { db, pool } from './db';
import * as schema from '@shared/schema';
import { sql } from 'drizzle-orm';

/**
 * Initializes the database by creating all tables defined in the schema.
 * This is an alternative to using drizzle-kit for simple deployments.
 */
async function initializeDatabase() {
  console.log('Starting database initialization...');
  
  try {
    // Create tables using the schema definitions
    console.log('Creating users table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(255) NOT NULL,
        last_name VARCHAR(255) NOT NULL,
        avatar_initials VARCHAR(10) NOT NULL,
        theme_preference VARCHAR(50) DEFAULT 'light',
        -- Demographics fields
        age_range VARCHAR(50),
        income_bracket VARCHAR(50),
        goals TEXT,
        risk_tolerance VARCHAR(50),
        experience_level VARCHAR(50),
        demographics_completed BOOLEAN DEFAULT FALSE,
        skip_demographics BOOLEAN DEFAULT FALSE,
        -- Metrics
        login_count INTEGER DEFAULT 0,
        last_login TIMESTAMP,
        last_transaction_date TIMESTAMP,
        last_budget_update_date TIMESTAMP,
        last_goal_update_date TIMESTAMP,
        onboarding_stage VARCHAR(50) DEFAULT 'new',
        onboarding_completed BOOLEAN DEFAULT FALSE,
        account_creation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        nudge_settings TEXT DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `);
    
    console.log('Creating budget_categories table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS budget_categories (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        budget_amount TEXT NOT NULL,
        spent_amount TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Creating transactions table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount TEXT NOT NULL,
        merchant VARCHAR(255),
        category VARCHAR(255),
        account VARCHAR(255),
        type VARCHAR(50) NOT NULL,
        date TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Creating savings_goals table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS savings_goals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        target_amount TEXT NOT NULL,
        current_amount TEXT NOT NULL,
        target_date TIMESTAMP,
        progress_percentage TEXT NOT NULL,
        monthly_savings TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Creating rivu_scores table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS rivu_scores (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        score INTEGER NOT NULL,
        rating VARCHAR(50) NOT NULL,
        budget_adherence TEXT,
        savings_progress TEXT,
        spending_pattern TEXT,
        last_calculated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Creating nudges table...');
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS nudges (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        status VARCHAR(50) NOT NULL,
        trigger_condition TEXT,
        due_date TIMESTAMP,
        dismissed_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Database initialization completed successfully!');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Run the initialization
initializeDatabase()
  .then(() => {
    console.log('Database setup complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database setup failed:', error);
    process.exit(1);
  });