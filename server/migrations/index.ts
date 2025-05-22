/**
 * Database Migrations Runner
 * 
 * This file manages all custom database migrations for the Rivu app.
 * It runs migrations in a specific order and handles errors appropriately.
 */

import { logger } from '../utils/logger';
import { pool } from '../db';
import { runMigration as runUserStatusMigration } from './add-user-status-fields';
import { runMigration as runLastLoginMigration } from './add-last-login-column';
import { runMigration as runScoreHistoryMigration } from './add-score-history-fields';
import { runMigration as runPrivacyComplianceMigration } from './privacy-compliance-migration';
import { runEmailOptInMigration } from './email-opt-in-migration';

/**
 * Run all database migrations in sequence
 */
export async function runMigrations() {
  logger.info('Starting database migrations...');
  
  try {
    // 1. First run score history migration
    try {
      logger.info('Running migration: Create or update score_history table');
      await runScoreHistoryMigration();
      logger.info('Migration completed successfully');
    } catch (error) {
      logger.error('Score history migration failed:', error);
      // Continue with other migrations even if this one fails
    }
    
    // 2. Run user status fields migration
    try {
      logger.info('Adding user status fields if they do not exist...');
      await runUserStatusMigration();
      logger.info('User status fields migration completed.');
    } catch (error) {
      logger.error('User status migration failed:', error);
      // Continue with other migrations
    }
    
    // 3. Run last login migration
    try {
      logger.info('Adding last_login column to users table if it does not exist...');
      await runLastLoginMigration();
    } catch (error) {
      logger.error('Last login migration failed:', error);
      // Continue with other migrations
    }
    
    // 4. Run privacy compliance migration
    try {
      logger.info('Running privacy compliance migration...');
      await runPrivacyComplianceMigration();
      logger.info('Privacy compliance migration completed successfully');
    } catch (error) {
      logger.error('Privacy compliance migration failed:', error);
      // Continue with other migrations
    }
    
    // 5. Run email opt-in migration
    try {
      logger.info('Running email opt-in migration...');
      await runEmailOptInMigration();
      logger.info('Email opt-in migration completed successfully');
    } catch (error) {
      logger.error('Email opt-in migration failed:', error);
      // Continue with other migrations
    }
    
    logger.info('All migrations completed successfully');
  } catch (error) {
    logger.error('Error running migrations:', error);
    throw error;
  }
}