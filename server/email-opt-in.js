import { pool } from './db';

/**
 * Email Opt-In Migration Script
 *
 * Adds the `email_opt_in` field to the `users` table if it doesn't exist.
 * This script is safe to run multiple times and uses a transaction for atomicity.
 */

export async function addEmailOptInColumn() {
  const client = await pool.connect();

  try {
    console.log('[Migration] Starting email_opt_in migration...');

    await client.query('BEGIN');

    const checkColumnExists = `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
          AND column_name = 'email_opt_in'
      ) AS exists;
    `;
    const { rows } = await client.query(checkColumnExists);
    const columnExists = rows[0]?.exists;

    if (!columnExists) {
      console.log('[Migration] email_opt_in column not found. Adding...');
      const addColumnSQL = `
        ALTER TABLE users
        ADD COLUMN IF NOT EXISTS email_opt_in BOOLEAN DEFAULT false;
      `;
      await client.query(addColumnSQL);
      console.log('[Migration] email_opt_in column added.');
    } else {
      console.log('[Migration] email_opt_in column already exists. No changes made.');
    }

    await client.query('COMMIT');
    console.log('[Migration] Migration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Migration] Migration failed. Rolled back transaction.', error);
    throw error;
  } finally {
    client.release();
  }
}

// If running as standalone script
if (require.main === module) {
  addEmailOptInColumn()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}