import { sql } from 'drizzle-orm';
import { db } from '../db';

/**
 * Marks users as inactive if they haven't had activity for 90+ days
 * This prevents abandoned accounts from remaining active indefinitely
 */
export async function checkAndMarkInactiveUsers() {
  try {
    console.log('Checking for inactive users (90+ days without activity)...');
    
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    // Format date for SQL query
    const formattedDate = ninetyDaysAgo.toISOString();
    
    // First check if the last_login column exists
    const columnCheckResult = await db.execute(sql`
      SELECT COUNT(*) > 0 as exists
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'users' 
      AND column_name = 'last_login';
    `);
    
    // Check if column exists based on count result
    const resultRows = columnCheckResult as unknown as { exists: boolean }[];
    const hasLastLoginColumn = resultRows[0]?.exists === true;
    
    // Different query based on whether last_login column exists
    if (hasLastLoginColumn) {
      // If last_login column exists, use it in the query
      await db.execute(sql`
        UPDATE users 
        SET status = 'inactive' 
        WHERE 
          (last_login < ${formattedDate} OR 
           (last_login IS NULL AND last_activity_date < ${formattedDate}) OR
           (last_login IS NULL AND last_activity_date IS NULL AND created_at < ${formattedDate}))
          AND status = 'active'
      `);
    } else {
      // If last_login column doesn't exist, only use last_activity_date and created_at
      await db.execute(sql`
        UPDATE users 
        SET status = 'inactive' 
        WHERE 
          (last_activity_date < ${formattedDate} OR
           (last_activity_date IS NULL AND created_at < ${formattedDate}))
          AND status = 'active'
      `);
    }
    
    console.log('Inactive users check completed');
  } catch (error) {
    console.error('Error checking for inactive users:', error);
    // Continue with other migrations - don't throw error
  }
}