/**
 * Enhanced logger utility for production deployments
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogMetadata {
  [key: string]: any;
}

class Logger {
  private environment: string;

  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
  }

  /**
   * Format a log message with JSON structure for better production parsing
   */
  private formatMessage(
    level: LogLevel,
    message: string,
    metadata?: LogMetadata
  ): string {
    const timestamp = new Date().toISOString();
    
    // In production, output structured JSON for better log parsing
    if (this.environment === 'production') {
      return JSON.stringify({
        timestamp,
        level,
        message,
        ...metadata,
        environment: this.environment
      });
    }
    
    // In development, use a more readable format
    let formattedMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    if (metadata) {
      formattedMessage += ` ${JSON.stringify(metadata)}`;
    }
    
    return formattedMessage;
  }

  debug(message: string, metadata?: LogMetadata): void {
    // Skip debug logs in production to reduce noise
    if (this.environment !== 'production') {
      console.debug(this.formatMessage('debug', message, metadata));
    }
  }

  info(message: string, metadata?: LogMetadata): void {
    console.info(this.formatMessage('info', message, metadata));
  }

  warn(message: string, metadata?: LogMetadata): void {
    console.warn(this.formatMessage('warn', message, metadata));
  }

  error(message: string, metadata?: LogMetadata): void {
    console.error(this.formatMessage('error', message, metadata));
  }
}

export const logger = new Logger();