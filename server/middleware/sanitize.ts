/**
 * Input sanitization middleware for API requests
 * Helps prevent common security issues like SQL injection
 */
import { Request, Response, NextFunction } from 'express';

// Characters that could be used for SQL injection or XSS attacks
const DANGEROUS_CHARS = /['";)(]/g;

/**
 * Simple sanitization function for string values
 * Removes potentially dangerous characters
 */
function sanitizeString(value: string): string {
  return value.replace(DANGEROUS_CHARS, '');
}

/**
 * Recursively sanitize an object's string values
 */
function sanitizeObject(obj: any): any {
  if (!obj) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized: Record<string, any> = {};
    
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    
    return sanitized;
  }
  
  return obj;
}

/**
 * Middleware to sanitize request bodies
 */
export function sanitizeInputs(req: Request, res: Response, next: NextFunction): void {
  // Skip sanitization for file uploads
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    return next();
  }
  
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  if (req.params) {
    req.params = sanitizeObject(req.params);
  }
  
  next();
}