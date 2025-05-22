import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import * as schema from './shared/schema.js';

// SSL configuration required for Render PostgreSQL
const { Pool } = pg;

async function main() {
  console.log('Starting database initialization with SSL configuration...');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connecting to the database...');
    const db = drizzle(pool, { schema });
    
    // Test the connection
    console.log('Testing connection...');
    const result = await pool.query('SELECT NOW()');
    console.log(`Connection successful! Server time: ${result.rows[0].now}`);
    
    // Push the schema to the database
    console.log('Pushing schema to database...');
    await db.insert(schema.users).values({
      username: 'test_user',
      email: 'test@example.com',
      passwordHash: 'test_hash',
      firstName: 'Test',
      lastName: 'User'
    }).onConflictDoNothing().execute();
    
    console.log('Database initialized successfully!');
    
    return { success: true };
  } catch (error) {
    console.error('Error initializing database:', error);
    return { success: false, error };
  } finally {
    await pool.end();
  }
}

main().then(result => {
  if (result.success) {
    console.log('Database initialization completed successfully.');
    process.exit(0);
  } else {
    console.error('Database initialization failed:', result.error);
    process.exit(1);
  }
});