import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

// Ensure DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure Pool with production settings optimized for Render
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  // Add production-optimized settings
  max: process.env.NODE_ENV === 'production' ? 10 : 3, // More connections for production
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 5000, // 5 second connection timeout
  ssl: {
    rejectUnauthorized: false // Required for Render PostgreSQL service
  },
  // Add connection retries for Render's managed databases
  allowExitOnIdle: true // Close idle connections for scaling environments
};

// Initialize connection pool
export const pool = new Pool(poolConfig);

// Log database connection attempt
console.log(`Initializing PostgreSQL connection ${process.env.NODE_ENV === 'production' ? '(production mode)' : '(development mode)'}`);

// Set up Drizzle ORM with the pool
export const db = drizzle(pool, { schema });
