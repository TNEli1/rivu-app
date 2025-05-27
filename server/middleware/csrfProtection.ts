import { Request, Response, NextFunction } from 'express';
import Tokens from 'csrf';

// Initialize CSRF token generator
const tokens = new Tokens();

// Generate a secret for the session
const generateSecret = () => {
  return tokens.secretSync();
};

// Generate a CSRF token based on the secret
const generateToken = (secret: string) => {
  return tokens.create(secret);
};

// Middleware to set CSRF token
export const setCsrfToken = (req: Request, res: Response, next: NextFunction) => {
  // Skip for non-HTML requests
  if (!req.accepts('html')) {
    return next();
  }

  // Create or use existing secret
  const secret = req.cookies['csrf_secret'] || generateSecret();
  
  // Store secret in a cookie
  res.cookie('csrf_secret', secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  
  // Generate token from secret
  const token = generateToken(secret);
  
  // Expose token for client-side JavaScript
  res.cookie('csrf_token', token, {
    httpOnly: false, // Accessible to JavaScript
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
  
  // Make token available to templates
  res.locals.csrfToken = token;
  
  next();
};

// Middleware to validate CSRF token
export const validateCsrfToken = (req: Request, res: Response, next: NextFunction) => {
  // Skip for GET, HEAD, OPTIONS requests (they should be idempotent)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Skip CSRF for critical auth endpoints to prevent user lockout
  const authEndpoints = [
    '/api/register',
    '/api/login', 
    '/api/send-verification-email',
    '/api/ios-waitlist'
  ];
  
  if (authEndpoints.some(endpoint => req.path === endpoint)) {
    return next();
  }
  
  // Skip for API requests with X-Requested-With header (provides some CSRF protection already)
  // This supports our current frontend implementation
  if (req.get('X-Requested-With') === 'XMLHttpRequest') {
    return next();
  }
  
  const secret = req.cookies['csrf_secret'];
  const token = (
    req.body._csrf || 
    req.query._csrf || 
    req.headers['csrf-token'] || 
    req.headers['x-csrf-token'] ||
    req.cookies['csrf_token']
  );
  
  // If we have both secret and token, validate
  if (secret && token) {
    if (tokens.verify(secret, token)) {
      return next();
    }
  }
  
  // If validation fails, return 403 Forbidden
  return res.status(403).json({ 
    message: 'Invalid or missing CSRF token', 
    code: 'INVALID_CSRF_TOKEN' 
  });
};