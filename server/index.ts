import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import cors from "cors";
import { setCsrfToken, validateCsrfToken } from "./middleware/csrfProtection";

// Load environment variables
dotenv.config();

const app = express();

// Basic security - hide Express fingerprint
app.disable('x-powered-by');

// Trust proxy - needed for rate limiting to work properly behind reverse proxies
app.set('trust proxy', 1);

// Skip domain redirects in production - Railway handles this
if (process.env.NODE_ENV !== 'production') {
  // Only redirect in development if needed
  app.use((req, res, next) => {
    const host = req.headers.host;
    if (host === 'tryrivu.com') {
      return res.redirect(301, 'https://www.tryrivu.com' + req.originalUrl);
    }
    next();
  });
}

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

// Configure CORS with proper security settings for Railway
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        // Allow Railway domains and configured origins
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
        if (origin.includes('.railway.app') || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error('Not allowed by CORS'));
      }
    : true, // Development: allow all origins
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

// Serve static files from the public directory
app.use(express.static('public'));

// Parse JSON request body with size limit
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser()); // Parse cookies

// Apply CSRF protection
app.use(setCsrfToken); // Set CSRF token for all routes
app.use('/api', validateCsrfToken); // Validate CSRF token for API routes

// Set security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Only set HSTS in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Strict-Transport-Security', 
      'max-age=31536000; includeSubDomains'
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
  // Add health endpoint for Railway healthcheck
  app.get("/health", (req, res) => res.status(200).send("OK"));

  // Load API routes using PostgreSQL database
  const server = await registerRoutes(app);

  // 404 handler for API routes (must come after API routes are registered)
  app.all('/api/*', (req, res) => {
    res.status(404).json({
      message: 'API endpoint not found',
      code: 'NOT_FOUND',
    });
  });
  
  // Global error handler with improved error responses
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    // Log error details for debugging
    console.error('Unhandled error:', err);
    
    // Get status code from error or default to 500
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    
    // Create standardized error response
    const errorResponse = {
      message: message,
      code: err.code || 'SERVER_ERROR',
      // Only include error details in development
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        details: err.details || err.errors
      })
    };

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

  // Use PORT environment variable for Railway deployment
  const PORT = process.env.PORT || 5000;
  
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    if (process.env.NODE_ENV === 'production') {
      console.log('🚀 Production server ready for Railway deployment');
    }
  });
})();
