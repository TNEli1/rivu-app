import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import cors from "cors";
import { setCsrfToken, validateCsrfToken } from "./middleware/csrfProtection";
import { pool } from "./db";
import { requestLogger, errorLogger } from "./middleware/requestLogger";
import { logger } from "./utils/logger";

// Load environment variables
dotenv.config();

const app = express();

// Basic security - hide Express fingerprint
app.disable('x-powered-by');

// Trust proxy - needed for rate limiting to work properly in Replit environment
app.set('trust proxy', 1);

// Global rate limiter to prevent abuse
const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 500 : 2000, // Stricter in production
  message: {
    message: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting in development mode when special header is present
  skip: (req, res) => process.env.NODE_ENV !== 'production' && req.get('X-Skip-Rate-Limit') === 'development'
});

// Apply global rate limiting based on environment
if (process.env.NODE_ENV === 'production') {
  // Always apply in production
  app.use(globalRateLimit);
  console.log('✅ Production rate limiting enabled');
} else {
  // In development, apply but with higher limits
  app.use(globalRateLimit);
  console.log('⚠️ Development rate limiting enabled (relaxed limits)');
  console.log('   To bypass: Include X-Skip-Rate-Limit: development header');
}

// Remove the explicit import since we'll use registerRoutes to handle this

// Configure CORS with proper security settings
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || 'https://tryrivu.com' // Production: specific origins
    : true, // Development: allow all origins but maintain credentials
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'CSRF-Token',
    'X-CSRF-Token'
  ]
};
app.use(cors(corsOptions));

// Add request logging middleware for production monitoring
app.use(requestLogger);

// Serve static files from the public directory
app.use(express.static('public'));

// Parse JSON request body with size limit
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser()); // Parse cookies

// Apply CSRF protection
app.use(setCsrfToken); // Set CSRF token for all routes
app.use('/api', validateCsrfToken); // Validate CSRF token for API routes

// Set comprehensive security headers
app.use((req, res, next) => {
  // Basic security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Set enhanced security headers in production
  if (process.env.NODE_ENV === 'production') {
    // Strict Transport Security for HTTPS enforcement
    res.setHeader(
      'Strict-Transport-Security', 
      'max-age=31536000; includeSubDomains; preload'
    );
    
    // Content Security Policy for production
    // Allow connections to trusted sources only
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' https://cdn.plaid.com https://*.vercel.app 'unsafe-inline'; " +
      "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self' https://api.tryrivu.com https://*.render.com https://cdn.plaid.com https://production.plaid.com; " +
      "frame-src 'self' https://cdn.plaid.com; " +
      "object-src 'none';"
    );
  }
  
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Load API routes using PostgreSQL database
  const server = await registerRoutes(app);

  // Health check endpoint for monitoring
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.APP_VERSION || '1.0.0'
    });
  });

  // 404 handler for API routes (must come after API routes are registered)
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      message: 'API endpoint not found',
      code: 'NOT_FOUND',
    });
  });
  
  // Add error logging middleware
  app.use(errorLogger);
  
  // Global error handler with improved error responses and production security
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Use the error ID from the error logger or generate a new one
    const errorId = err.errorId || `err_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    
    // Get status code from error or default to 500
    const status = err.status || err.statusCode || 500;
    
    // In production, avoid exposing detailed error messages
    const message = isProduction ? 
      (status === 500 ? "An unexpected error occurred" : err.message || "Error processing request") : 
      (err.message || "Internal Server Error");
    
    // Create standardized error response
    const errorResponse = {
      message,
      code: err.code || 'SERVER_ERROR',
      errorId, // Always include the error ID so users can reference it in support requests
      
      // Only include detailed error information in development
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        details: err.details || err.errors
      })
    };

    // Log to structured logger in addition to middleware logging
    if (status >= 500) {
      logger.error(`Server error: ${message}`, { errorId, status, code: err.code });
    }

    res.status(status).json(errorResponse);
    
    // Only rethrow in development for better debugging
    if (process.env.NODE_ENV === 'development') {
      throw err;
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use PORT environment variable with fallback for Render's dynamic port allocation
  // Default to 5000 for Replit and local development
  const port = process.env.PORT || 8080;
  const serverInstance = server.listen({
    port: Number(port),
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
  
  // Implement graceful shutdown logic for Render reboots
  const gracefulShutdown = async (signal: string) => {
    log(`${signal} received. Shutting down gracefully...`);
    
    // Close server first, stop accepting new connections
    serverInstance.close(() => {
      log('HTTP server closed');
      
      // Close database connections
      pool.end().then(() => {
        log('Database connections closed');
        process.exit(0);
      }).catch((error: Error) => {
        console.error('Error closing database connections:', error);
        process.exit(1);
      });
      
      // Force exit after 10 seconds
      setTimeout(() => {
        console.error('Forcing shutdown after timeout');
        process.exit(1);
      }, 10000);
    });
  };
  
  // Listen for termination signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
})();
