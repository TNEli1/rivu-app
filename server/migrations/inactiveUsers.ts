import { sql } from 'drizzle-orm';
import { db } from '../db';

/**
 * Marks users as inactive if they haven't logged in or had activity for 90+ days
 * This prevents abandoned accounts from remaining active indefinitely
 */
export async function checkAndMarkInactiveUsers() {
  try {
    console.log('Checking for inactive users (90+ days without activity)...');
    
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    // Format date for SQL query
    const formattedDate = ninetyDaysAgo.toISOString();
    
    // Mark users as inactive if their last login or activity date is older than 90 days
    // and they're currently marked as active
    const result = await db.execute(sql`
      UPDATE users 
      SET status = 'inactive' 
      WHERE 
        (last_login < ${formattedDate} OR 
         (last_login IS NULL AND last_activity_date < ${formattedDate}) OR
         (last_login IS NULL AND last_activity_date IS NULL AND created_at < ${formattedDate}))
        AND status = 'active'
    `);
    
    console.log('Inactive users check completed');
  } catch (error) {
    console.error('Error checking for inactive users:', error);
    // Continue with other migrations - don't throw error
  }
}