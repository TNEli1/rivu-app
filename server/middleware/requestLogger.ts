/**
 * Middleware for logging HTTP requests
 * Uses the centralized logger to provide consistent formatting
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Logs information about each HTTP request including:
 * - Request method and URL
 * - Response status code
 * - Request duration
 * - User ID (if authenticated)
 * - IP address and user agent
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  // Record the start time
  const startTime = Date.now();
  
  // Record response data once response is finished
  res.on('finish', () => {
    // Calculate the request duration
    const duration = Date.now() - startTime;
    
    // Log the request using our structured logger
    logger.info(`HTTP ${req.method} ${req.originalUrl || req.url}`, {
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || 'unauthenticated',
      contentLength: res.get('Content-Length'),
      referrer: req.get('Referrer')
    });
  });
  
  next();
};

/**
 * Error logging middleware
 * Must be placed after all routes and before the global error handler
 */
export const errorLogger = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Generate a unique error reference ID
  const errorId = `err_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  
  // Log the error with all available context
  logger.error(`Request Error: ${err.message || 'Unknown error'}`, {
    errorId,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl || req.url,
    body: process.env.NODE_ENV === 'development' ? req.body : undefined,
    params: req.params,
    query: req.query,
    userId: req.user?.id || 'unauthenticated',
    statusCode: err.status || err.statusCode || 500
  });

  // Add the errorId to the error object for the error handler
  err.errorId = errorId;
  
  // Pass the error to the next error handler
  next(err);
};