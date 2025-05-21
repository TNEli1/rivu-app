const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT secret and config from environment variables
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'; // Default to 7 days if not specified

// In production, JWT_SECRET must be set
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('CRITICAL SECURITY ERROR: JWT_SECRET environment variable is not set in production!');
  // In production, we don't want to continue without a proper secret
  process.exit(1);
} else if (!JWT_SECRET) {
  // In development, warn but continue with a default (not secure for production)
  console.warn('WARNING: Using insecure default JWT_SECRET - DO NOT USE IN PRODUCTION');
}

// Middleware to protect routes
const protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header or cookies
  if (
    (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) ||
    req.cookies.token
  ) {
    try {
      // Get token from Authorization header or cookie
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
      } else if (req.cookies.token) {
        token = req.cookies.token;
      }

      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);

      // Check token expiration (redundant but makes error handling clearer)
      if (decoded.exp < Date.now() / 1000) {
        return res.status(401).json({ 
          message: 'Not authorized, token has expired',
          code: 'TOKEN_EXPIRED'
        });
      }

      // Get user from token (exclude password)
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ 
          message: 'Not authorized, user not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // Add decoded token data to the request
      req.token = decoded;

      // Continue to the protected route
      next();
    } catch (error) {
      console.error('Authentication error:', error);

      // Specific error for expired tokens
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          message: 'Not authorized, token has expired',
          code: 'TOKEN_EXPIRED'
        });
      }

      // Other token verification errors
      res.status(401).json({ 
        message: 'Not authorized, token invalid',
        code: 'TOKEN_INVALID'
      });
    }
  } else {
    res.status(401).json({ 
      message: 'Not authorized, no token provided',
      code: 'NO_TOKEN'
    });
  }
};

// Generate JWT for a user
const generateToken = (id) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
};

// Set JWT as a secure HTTP-only cookie
const setTokenCookie = (res, token) => {
  // Calculate cookie expiration based on JWT_EXPIRES_IN
  let maxAge = 7 * 24 * 60 * 60 * 1000; // Default to 7 days
  
  // Parse JWT_EXPIRES_IN if it's set
  if (JWT_EXPIRES_IN) {
    if (JWT_EXPIRES_IN.endsWith('d')) {
      // Days
      maxAge = parseInt(JWT_EXPIRES_IN) * 24 * 60 * 60 * 1000;
    } else if (JWT_EXPIRES_IN.endsWith('h')) {
      // Hours
      maxAge = parseInt(JWT_EXPIRES_IN) * 60 * 60 * 1000;
    } else if (JWT_EXPIRES_IN.endsWith('m')) {
      // Minutes
      maxAge = parseInt(JWT_EXPIRES_IN) * 60 * 1000;
    }
  }
  
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development', // True in production
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax', // 'None' for cross-site usage in production
    maxAge: maxAge,
    domain: process.env.NODE_ENV === 'production' ? '.tryrivu.com' : undefined // Apply to domain and subdomains in production
  });
};

// Clear the token cookie (for logout)
const clearTokenCookie = (res) => {
  res.cookie('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development', // True in production
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
    expires: new Date(0),
    domain: process.env.NODE_ENV === 'production' ? '.tryrivu.com' : undefined // Match domain used for setting
  });
};

module.exports = { 
  protect, 
  generateToken, 
  setTokenCookie, 
  clearTokenCookie 
};