/**
 * Production-ready logger for Rivu application
 * Handles structured logging with different severity levels
 */

// Log levels in order of increasing severity
type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

interface LogMessage {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
}

/**
 * Centralized logger for the application
 * In production, we could extend this to write to a file or send to a logging service
 */
class Logger {
  private minLevel: LogLevel;
  private isProduction: boolean;

  constructor() {
    // In production, default to 'info' level, otherwise use 'debug'
    this.isProduction = process.env.NODE_ENV === 'production';
    this.minLevel = this.isProduction ? 'info' : 'debug';
  }

  /**
   * Log a message at the specified level
   */
  private log(level: LogLevel, message: string, context?: Record<string, any>): void {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
      critical: 4
    };

    // Only log if the level is at or above the minimum level
    if (levels[level] >= levels[this.minLevel]) {
      const logEntry: LogMessage = {
        timestamp: new Date().toISOString(),
        level,
        message,
        context: this.isProduction ? this.sanitizeContext(context) : context
      };

      // In production, use structured logging for easier parsing
      if (this.isProduction) {
        // For production, we'll output a clean JSON object
        console[level === 'critical' ? 'error' : level](JSON.stringify(logEntry));
      } else {
        // For development, more readable format with colors
        const colors: Record<LogLevel, string> = {
          debug: '\x1b[90m', // Gray
          info: '\x1b[32m',  // Green
          warn: '\x1b[33m',  // Yellow
          error: '\x1b[31m', // Red
          critical: '\x1b[41m\x1b[37m' // White on red background
        };
        
        const reset = '\x1b[0m';
        const coloredLevel = `${colors[level]}${level.toUpperCase()}${reset}`;
        
        console[level === 'critical' ? 'error' : level](
          `[${logEntry.timestamp}] ${coloredLevel}: ${message}`,
          context || ''
        );
      }
    }
  }

  /**
   * Sanitize sensitive data from logs in production
   */
  private sanitizeContext(context?: Record<string, any>): Record<string, any> | undefined {
    if (!context) return undefined;
    
    const sanitized = {...context};
    
    // List of sensitive fields to redact
    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'accessToken', 'refreshToken',
      'auth', 'authorization', 'cookie', 'jwt', 'ssn', 'credit_card',
      'cardNumber', 'cvv', 'pin'
    ];
    
    // Recursively sanitize the context object
    const sanitizeObj = (obj: Record<string, any>): Record<string, any> => {
      for (const key in obj) {
        // Check if the key contains any sensitive terms
        const isSensitive = sensitiveFields.some(field => 
          key.toLowerCase().includes(field.toLowerCase())
        );
        
        if (isSensitive) {
          // Redact sensitive value but indicate the type of value that was there
          obj[key] = typeof obj[key] === 'string' 
            ? '[REDACTED]' 
            : `[REDACTED ${typeof obj[key]}]`;
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          // Recursively sanitize nested objects
          obj[key] = sanitizeObj(obj[key]);
        }
      }
      return obj;
    };
    
    return sanitizeObj(sanitized);
  }

  /**
   * Debug level logging (development only)
   */
  debug(message: string, context?: Record<string, any>): void {
    this.log('debug', message, context);
  }

  /**
   * Information level logging
   */
  info(message: string, context?: Record<string, any>): void {
    this.log('info', message, context);
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: Record<string, any>): void {
    this.log('warn', message, context);
  }

  /**
   * Error level logging
   */
  error(message: string, context?: Record<string, any>): void {
    this.log('error', message, context);
  }

  /**
   * Critical error logging (highest severity)
   */
  critical(message: string, context?: Record<string, any>): void {
    this.log('critical', message, context);
  }

  /**
   * HTTP request logging
   */
  httpRequest(req: any, res: any, duration: number): void {
    const context = {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      duration: `${duration}ms`,
      contentLength: res.getHeader('content-length'),
      userId: req.user?.id || 'unauthenticated'
    };

    const level: LogLevel = res.statusCode >= 500 
      ? 'error' 
      : res.statusCode >= 400 
        ? 'warn' 
        : 'info';
    
    this.log(level, `HTTP ${req.method} ${req.originalUrl || req.url} ${res.statusCode}`, context);
  }
}

// Export a singleton instance
export const logger = new Logger();