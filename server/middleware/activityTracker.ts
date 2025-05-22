import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

/**
 * Middleware to track user activity timestamps
 * Updates last_activity_date field whenever an authenticated user makes a request
 */
export const activityTracker = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Only track for authenticated users
    if (req.user && req.user.id) {
      const userId = parseInt(req.user.id.toString(), 10);
      
      // Skip tracking for certain endpoints that might be called frequently
      const skipPaths = [
        '/api/health',
        '/api/ping',
        '/api/metrics',
        '/api/analytics'
      ];
      
      if (!skipPaths.some(path => req.path.startsWith(path))) {
        // Update last activity date for the user
        // We don't await this to avoid slowing down requests
        storage.updateUser(userId, {
          lastActivityDate: new Date()
        }).catch(err => {
          console.warn('Failed to update user activity timestamp:', err);
          // Don't block the request if this fails
        });
      }
    }
    
    // Continue processing the request
    next();
  } catch (error) {
    // Log error but don't stop the request
    console.error('Error in activity tracking middleware:', error);
    next();
  }
};