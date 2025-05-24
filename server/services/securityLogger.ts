/**
 * Security Event Logger
 * 
 * Centralized logging for security-related events in the Rivu app.
 * This helps with security auditing, compliance requirements, and troubleshooting.
 */

import fs from 'fs';
import path from 'path';

// Define event types for better type safety
export enum SecurityEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_SUCCESS = 'PASSWORD_RESET_SUCCESS',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  ACCOUNT_UPDATE = 'ACCOUNT_UPDATE',
  BANK_CONNECT = 'BANK_CONNECT',
  BANK_DISCONNECT = 'BANK_DISCONNECT',
  API_KEY_ACCESS = 'API_KEY_ACCESS'
}

interface SecurityEvent {
  timestamp: string;
  type: SecurityEventType;
  userId?: number | string;
  username?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

/**
 * Log a security event.
 */
export async function logSecurityEvent(
  type: SecurityEventType,
  userId?: number | string,
  username?: string,
  req?: any, // Express request object
  details?: Record<string, any>
): Promise<void> {
  try {
    const event: SecurityEvent = {
      timestamp: new Date().toISOString(),
      type,
      userId,
      username,
      details
    };

    // Add request-specific info if available
    if (req) {
      event.ipAddress = req.ip || req.headers['x-forwarded-for'] || 'unknown';
      event.userAgent = req.headers['user-agent'] || 'unknown';
    }

    // For sensitive operations, mask any potentially sensitive data
    if (details) {
      // Deep clone to avoid modifying the original object
      event.details = JSON.parse(JSON.stringify(details));
      
      // Mask sensitive fields if they exist
      const sensitiveFields = ['password', 'token', 'accessToken', 'secret', 'key'];
      sensitiveFields.forEach(field => {
        if (event.details && event.details[field]) {
          event.details[field] = '********';
        }
      });
    }

    console.log(`[SECURITY_EVENT] ${event.type} - User: ${event.userId || 'anonymous'} - ${JSON.stringify(event.details || {})}`);
    
    // In production, we might also want to store in a database or send to a security monitoring service
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

export default {
  logSecurityEvent,
  SecurityEventType
};