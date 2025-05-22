/**
 * Central logging utility for Rivu application
 * 
 * Provides structured logging for production environments
 * with fallback to console in development
 */

import { Request, Response } from 'express';

// Simple logger implementation - can be replaced with Winston, Pino, etc.
class Logger {
  private env: string;
  
  constructor() {
    this.env = process.env.NODE_ENV || 'development';
  }
  
  // Log levels
  info(message: string, meta?: any): void {
    this.log('INFO', message, meta);
  }
  
  warn(message: string, meta?: any): void {
    this.log('WARN', message, meta);
  }
  
  error(message: string, meta?: any): void {
    this.log('ERROR', message, meta);
  }
  
  debug(message: string, meta?: any): void {
    // Only log debug in development
    if (this.env !== 'production') {
      this.log('DEBUG', message, meta);
    }
  }
  
  /**
   * HTTP request logger
   * Logs details about HTTP requests in a structured format
   */
  httpRequest(req: Request, res: Response, duration: number): void {
    // Extract important information from the request/response
    const data = {
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      userId: req.user?.id || 'unauthenticated',
      contentLength: res.getHeader('content-length'),
      referrer: req.headers.referer || req.headers.referrer
    };
    
    // Build a readable message for the log
    const message = `HTTP ${data.method} ${data.url} ${data.status} ${data.duration}`;
    
    // Log at appropriate level based on status code
    if (res.statusCode >= 500) {
      this.error(message, data);
    } else if (res.statusCode >= 400) {
      this.warn(message, data);
    } else {
      this.info(message, data);
    }
  }
  
  private log(level: string, message: string, meta?: any): void {
    const timestamp = new Date().toISOString();
    
    // In production, we'd likely use a proper logging service
    // For now, use structured console logs
    if (this.env === 'production') {
      const logObject = {
        timestamp,
        level,
        message,
        ...(meta || {})
      };
      
      // Use different console methods based on level
      if (level === 'ERROR') {
        console.error(JSON.stringify(logObject));
      } else if (level === 'WARN') {
        console.warn(JSON.stringify(logObject));
      } else {
        console.log(JSON.stringify(logObject));
      }
    } else {
      // More readable format for development
      const metaString = meta ? ` ${JSON.stringify(meta)}` : '';
      console.log(`[${timestamp}] ${level}: ${message}${metaString}`);
    }
  }
}

// Export a singleton instance
export const logger = new Logger();