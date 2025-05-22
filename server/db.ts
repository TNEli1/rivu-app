import { drizzle } from "drizzle-orm/node-postgres";
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from "../shared/schema";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Initialize PostgreSQL connection
console.log("Initializing PostgreSQL connection using NeonDB (development mode)");

// Parse the database URL from environment variables
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

// Configure the connection pool
const poolConfig = {
  connectionString: databaseUrl,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 5000, // How long to wait for a connection to be established
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
};

export const pool = new Pool(poolConfig);

// Add event listeners for connection management
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

pool.on('connect', () => {
  console.log('New client connected to PostgreSQL');
});

// Export the drizzle instance
export const db = drizzle(pool, { schema });

// Export a health check function
export const checkDatabaseConnection = async (): Promise<boolean> => {
  try {
    const result = await pool.query('SELECT 1');
    return result.rowCount === 1;
  } catch (error) {
    console.error('Database connection check failed:', error);
    return false;
  }
};