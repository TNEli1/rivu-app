import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import dotenv from "dotenv";
import connectDB from "./config/database";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import cors from "cors";

// Load environment variables
dotenv.config();

const app = express();

// Basic security - hide Express fingerprint
app.disable('x-powered-by');

// Global rate limiter to prevent abuse
const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500, // Limit each IP to 500 requests per windowMs
  message: {
    message: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply global rate limiting
app.use(globalRateLimit);

// Configure CORS
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL || 'https://rivu.app']  // Use actual domain in production
    : true, // Allow all origins in development
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Parse JSON request body with size limit
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser()); // Parse cookies

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
  // Connect to MongoDB
  await connectDB();
  
  // Load API routes
  // Connect MongoDB models or fallback to memory storage if connection fails
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

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
