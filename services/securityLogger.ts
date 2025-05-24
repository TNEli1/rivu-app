/**
 * Security Event Logger
 * 
 * Centralized logging for security-related events in the Rivu app.
 * This helps with security auditing, compliance requirements, and troubleshooting.
 */

import { logger } from '../utils/logger';

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
  API_KEY_ACCESS = 'API_KEY_ACCESS',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  DATA_ACCESS_DENIED = 'DATA_ACCESS_DENIED',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY'
}

// Interface for security event
export interface SecurityEvent {
  type: SecurityEventType;
  userId?: number | string;  // Optional because some events may occur before authentication
  details?: Record<string, any>;
  timestamp?: Date;
}

/**
 * Log a security-related event
 * In production, these would typically be stored in a secure database
 * or sent to a dedicated security monitoring service
 */
function logSecurityEvent(event: SecurityEvent): void {
  try {
    // Add timestamp if not present
    const eventWithTimestamp = {
      ...event,
      timestamp: event.timestamp || new Date()
    };
    
    // Log the security event
    logger.info(`[SECURITY_EVENT] ${event.type} - User: ${event.userId || 'anonymous'}`, event.details || {});
    
    // In production, we might also want to store in a database or send to a security monitoring service
  } catch (error) {
    logger.error('Failed to log security event:', error);
  }
}

export default {
  logSecurityEvent,
  SecurityEventType
};