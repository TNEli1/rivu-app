const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT secret and config - in production, this should be stored in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'rivu-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h'; // 2 hours by default

// Middleware to protect routes
const protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header or cookies
  // CRITICAL FIX: Use rivu_token cookie name to match Google OAuth callback
  if (
    (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) ||
    req.cookies.rivu_token
  ) {
    try {
      // Get token from Authorization header or cookie
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
      } else if (req.cookies.rivu_token) {
        token = req.cookies.rivu_token;
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
const generateToken = (id, email) => {
  return jwt.sign({ 
    id, 
    email,
    authMethod: 'password'
  }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
};

// Set JWT as a secure HTTP-only cookie
const setTokenCookie = (res, token) => {
  res.cookie('rivu_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // True in production
    sameSite: 'lax', // Changed to 'lax' for OAuth compatibility
    maxAge: 2 * 60 * 60 * 1000, // 2 hours (matches JWT_EXPIRES_IN)
    domain: process.env.NODE_ENV === 'production' ? '.tryrivu.com' : undefined // Share across subdomains in production
  });
};

// Clear the token cookie (for logout)
const clearTokenCookie = (res) => {
  res.cookie('rivu_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    domain: process.env.NODE_ENV === 'production' ? '.tryrivu.com' : undefined,
    expires: new Date(0)
  });
};

module.exports = { 
  protect, 
  generateToken, 
  setTokenCookie, 
  clearTokenCookie 
};