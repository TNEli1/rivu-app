import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import cors from "cors";
import helmet from "helmet";
import { setCsrfToken, validateCsrfToken } from "./middleware/csrfProtection";
import { pool } from "./db";
import { requestLogger, errorLogger } from "./middleware/requestLogger";
import { logger } from "./utils/logger";
import { configureStaticFileServing } from "./static";
import { configureDevelopmentProxy } from "./dev-proxy";
import { activityTracker } from "./middleware/activityTracker";
import path from 'path';
import fs from 'fs';
import { runMigrations } from './db-migrations';

// Simple logging function to replace the one from vite
function log(message: string, source = "express") {
  const time = new Date().toLocaleTimeString();
  console.log(`${time} [${source}] ${message}`);
}

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
  // In production, we need to explicitly handle origins to support credentials
  origin: function(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // For development/testing requests with no origin
    if (!origin) {
      console.log('Request with no origin allowed');
      callback(null, true);
      return;
    }
    
    // Log all origins in development to help with debugging
    if (process.env.NODE_ENV !== 'production') {
      console.log(`CORS request from origin: ${origin}`);
    }
    
    // Specific allowed origins based on environment
    const allowedDomains = process.env.NODE_ENV === 'production'
      ? [
          'https://tryrivu.com',
          'https://www.tryrivu.com',
          'https://rivu-app.onrender.com'
        ]
      : [
          'http://localhost:3000',
          'http://localhost:5000',
          'https://localhost:5000',
          'http://localhost:5173',
          'https://localhost:5173'
        ];
    
    // Add Replit domains in development if environment variables are available
    if (process.env.NODE_ENV !== 'production' && process.env.REPL_SLUG && process.env.REPL_OWNER) {
      allowedDomains.push('https://' + process.env.REPL_SLUG + '.' + process.env.REPL_OWNER + '.repl.co');
    }
    
    // Add any additional domains from environment variables
    if (process.env.ALLOWED_ORIGINS) {
      allowedDomains.push(...process.env.ALLOWED_ORIGINS.split(','));
    }
        
    // First check exact matches
    if (allowedDomains.includes(origin)) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`CORS allowed for exact match: ${origin}`);
      }
      callback(null, true);
      return;
    }
    
    // Then check for pattern matches in production
    if (process.env.NODE_ENV === 'production') {
      // Allow all tryrivu.com domains (main domain or subdomains)
      if (origin === 'https://tryrivu.com' || origin.endsWith('.tryrivu.com')) {
        console.log(`CORS allowed for tryrivu domain: ${origin}`);
        callback(null, true);
        return;
      }
      
      // Allow render.com and replit.app domains for development/staging
      if (origin.endsWith('.render.com') || origin.endsWith('.replit.app')) {
        console.log(`CORS allowed for development domain: ${origin}`);
        callback(null, true);
        return;
      }
    }
    
    // If not allowed, log and reject
    console.log(`CORS blocked request from origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // Allow cookies for cross-domain authentication
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'CSRF-Token',
    'X-CSRF-Token',
    'X-Skip-Rate-Limit'
  ],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 600 // Cache preflight requests for 10 minutes
};
app.use(cors(corsOptions));

// Apply Helmet middleware for enhanced security headers
app.use(helmet({
  // Enable Cross-Origin-Embedder-Policy
  crossOriginEmbedderPolicy: true,
  // Enable Cross-Origin-Opener-Policy
  crossOriginOpenerPolicy: true,
  // Enable Origin-Agent-Cluster header
  originAgentCluster: true,
  // Content Security Policy is handled separately below for more granular control
  contentSecurityPolicy: false
}));

// Add request logging middleware for production monitoring
app.use(requestLogger);

// Serve static files from the public directory
app.use(express.static('public'));

// Parse JSON request body with size limit
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser()); // Parse cookies

// Add input sanitization for all API routes
import { sanitizeInputs } from './middleware/sanitize';
app.use('/api', sanitizeInputs);

// Apply CSRF protection
app.use(setCsrfToken); // Set CSRF token for all routes
app.use('/api', validateCsrfToken); // Validate CSRF token for API routes

// Track user activity for all authenticated API requests
// This updates the last_activity_date field for user inactivity tracking
app.use('/api', activityTracker);

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
      "script-src 'self' https://cdn.plaid.com https://posthog.com https://*.posthog.com https://*.tryrivu.com https://*.render.com https://render.com https://replit.app https://*.replit.app 'unsafe-inline'; " +
      "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self' https://rivu-app.onrender.com https://api.tryrivu.com https://*.render.com https://render.com https://replit.app https://*.replit.app https://cdn.plaid.com https://production.plaid.com https://posthog.com https://*.posthog.com; " +
      "frame-src 'self' https://cdn.plaid.com; " +
      "object-src 'none';" + 
      "form-action 'self';"
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

import { ensureDatabaseConnection, setupGracefulDatabaseShutdown } from './utils/db-connector';

(async () => {
  // Ensure database connection is established (with retries)
  // This is especially important for deployment environments
  if (process.env.NODE_ENV === 'production') {
    const connected = await ensureDatabaseConnection();
    if (!connected) {
      console.error('Failed to connect to database after maximum retries');
      // Continue startup, but API will likely not work properly
      // This allows the server to at least serve static files
    }
  }
  
  // Set up graceful database shutdown
  setupGracefulDatabaseShutdown();
  
  // Run database migrations
  await runMigrations();
  
  // Load API routes using PostgreSQL database
  const server = await registerRoutes(app);

  // Enhanced health check endpoint for monitoring with DB connectivity check
  app.get('/health', async (req, res) => {
    try {
      // Check database connectivity
      const dbConnected = await pool.query('SELECT 1');
      const dbStatus = dbConnected ? 'connected' : 'disconnected';
      
      // Calculate server uptime
      const uptime = process.uptime();
      const uptimeFormatted = `${Math.floor(uptime)}s`;
      
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.APP_VERSION || '1.0.0',
        uptime: uptimeFormatted,
        db: dbStatus
      });
    } catch (error) {
      // Log error but don't expose details
      console.error('Health check database error:', error);
      res.status(500).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        db: 'disconnected'
      });
    }
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

  // In production, serve static files for the frontend
  if (process.env.NODE_ENV === 'production') {
    configureStaticFileServing(app);
    console.log('✅ Production mode: Serving frontend from static build');
    console.log('✅ Visit the app at: https://tryrivu.com');
  } else {
    // In development, we still configure static serving for testing
    // but show a warning that the frontend should be started separately
    configureStaticFileServing(app);
    // Set up the development proxy to connect to Vite dev server
    configureDevelopmentProxy(app);
    console.log('⚠️ Development mode: Frontend must be served separately via "cd client && npm run dev"');
    console.log('   However, static files will be served if they exist in dist/public');
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
