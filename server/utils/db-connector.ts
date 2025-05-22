/**
 * Enhanced database connection handler for production deployments
 */
import { pool } from '../db';
import { logger } from './logger';

/**
 * Attempts to connect to the database with retries
 * Useful during deployment when the database might not be immediately available
 */
export async function ensureDatabaseConnection(maxRetries = 5, retryDelay = 5000): Promise<boolean> {
  let attempts = 0;
  let connected = false;
  
  while (attempts < maxRetries && !connected) {
    try {
      const client = await pool.connect();
      // Test the connection with a simple query
      await client.query('SELECT 1');
      client.release();
      
      logger.info(`Successfully connected to database on attempt ${attempts + 1}`);
      connected = true;
      return true;
    } catch (error) {
      attempts++;
      const isLastAttempt = attempts >= maxRetries;
      
      logger.warn(
        `Database connection attempt ${attempts}/${maxRetries} failed: ${(error as Error).message}`,
        { error: error, isLastAttempt }
      );
      
      if (isLastAttempt) {
        logger.error('Failed to connect to database after maximum retries', { error });
        return false;
      }
      
      // Wait before retrying
      logger.info(`Waiting ${retryDelay}ms before next database connection attempt...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  return connected;
}

/**
 * Gracefully handle database disconnect
 */
export function setupGracefulDatabaseShutdown(): void {
  // Handle process termination signals
  ['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach(signal => {
    process.once(signal, async () => {
      logger.info(`${signal} received, closing database pool...`);
      
      try {
        await pool.end();
        logger.info('Database pool closed successfully');
      } catch (error) {
        logger.error('Error closing database pool', { error });
      }
      
      process.exit(0);
    });
  });
}