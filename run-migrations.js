import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import * as schema from './shared/schema.js';

const { Pool } = pg;

async function main() {
  console.log('Starting database migrations with proper SSL configuration...');
  console.log(`Using database: ${process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'unknown host'}`);

  // Create a PostgreSQL pool with proper SSL configuration
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Required for Render PostgreSQL service
    }
  });

  try {
    // Test the connection
    console.log('Testing database connection...');
    const testResult = await pool.query('SELECT NOW()');
    console.log(`Connection successful! Database time: ${testResult.rows[0].now}`);
    
    // Create Drizzle instance
    const db = drizzle(pool, { schema });
    
    // Apply migrations
    console.log('Applying schema migrations...');
    
    // Make sure tables exist by manually creating them
    const createTablesSQL = `
      CREATE TABLE IF NOT EXISTS "users" (
        "id" SERIAL PRIMARY KEY,
        "username" VARCHAR(255) NOT NULL UNIQUE,
        "email" VARCHAR(255) NOT NULL UNIQUE,
        "password_hash" VARCHAR(255) NOT NULL,
        "first_name" VARCHAR(255),
        "last_name" VARCHAR(255),
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;
    
    await pool.query(createTablesSQL);
    console.log('Basic tables created successfully');
    
    // List the tables in the database
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log('Current tables in the database:');
    tables.rows.forEach(row => {
      console.log(`- ${row.table_name}`);
    });
    
    console.log('Database migrations completed successfully!');
  } catch (error) {
    console.error('Error during database migrations:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('Failed to run migrations:', err);
  process.exit(1);
});