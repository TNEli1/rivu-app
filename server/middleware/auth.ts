import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';
import securityLogger, { SecurityEventType, SecurityEvent } from '../services/securityLogger';

// JWT secret and config from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'devonlyjwtsecret123456789';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30m'; // Default to 30 minutes if not specified
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d'; // Default to 7 days for refresh tokens

// In production, JWT_SECRET must be set
if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.error('CRITICAL SECURITY ERROR: JWT_SECRET environment variable is not set in production!');
  // In production, we don't want to continue without a proper secret
  process.exit(1);
} else if (!process.env.JWT_SECRET) {
  // In development, warn but continue with a default (not secure for production)
  console.warn('WARNING: Using insecure default JWT_SECRET - DO NOT USE IN PRODUCTION');
}

// Extend Express Request interface to include user and token properties
declare global {
  namespace Express {
    interface Request {
      user?: Record<string, any>;
      token?: Record<string, any>;
    }
  }
}

// Middleware to protect routes
export const protect = async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;

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

      if (!token) {
        return res.status(401).json({ 
          message: 'Not authorized, no token provided',
          code: 'NO_TOKEN'
        });
      }

      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;

      // Check token expiration (redundant but makes error handling clearer)
      if (decoded.exp && decoded.exp < Date.now() / 1000) {
        return res.status(401).json({ 
          message: 'Not authorized, token has expired',
          code: 'TOKEN_EXPIRED'
        });
      }

      // Get user from token (using Drizzle query)
      const userResult = await db.select().from(users).where(eq(users.id, decoded.id as number));
      
      if (!userResult || userResult.length === 0) {
        const securityEvent: SecurityEvent = {
          type: SecurityEventType.LOGIN_FAILURE,
          userId: decoded.id as string | number,
          details: {
            reason: 'User not found',
            ip: req.ip
          }
        };
        securityLogger.logSecurityEvent(securityEvent);
        
        return res.status(401).json({ 
          message: 'Not authorized, user not found',
          code: 'USER_NOT_FOUND'
        });
      }

      // Set the user on the request (without password)
      const user = { ...userResult[0] };
      if ('password' in user) {
        // Use optional chaining to avoid errors if password doesn't exist
        const { password, ...userWithoutPassword } = user;
        req.user = userWithoutPassword;
      } else {
        req.user = user;
      }

      // Add decoded token data to the request (only id and role)
      req.token = {
        id: decoded.id,
        role: decoded.role || 'user'
      };

      // Continue to the protected route
      next();
    } catch (error: any) {
      logger.error('Authentication error:', error);

      // Log security events
      const securityEvent: SecurityEvent = {
        type: SecurityEventType.LOGIN_FAILURE,
        details: {
          reason: error.name || 'Token verification failed',
          message: error.message,
          ip: req.ip
        }
      };
      securityLogger.logSecurityEvent(securityEvent);

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

// Role-based access control middleware
export const authorize = (roles: string[] = ['user']) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        message: 'Not authorized, authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // Check if user's role is in the allowed roles
    if (!roles.includes(req.user.role)) {
      const securityEvent: SecurityEvent = {
        type: SecurityEventType.PERMISSION_DENIED,
        userId: req.user.id as number,
        details: {
          reason: 'Insufficient permissions',
          requiredRoles: roles,
          userRole: req.user.role,
          path: req.path,
          ip: req.ip
        }
      };
      securityLogger.logSecurityEvent(securityEvent);
      
      return res.status(403).json({
        message: 'Forbidden: You do not have permission to access this resource',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

// Generate JWT for a user (access token - short lived)
export const generateToken = (id: number, role: string = 'user'): string => {
  return jwt.sign({ id, role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
};

// Generate refresh token (long lived)
export const generateRefreshToken = (id: number): string => {
  return jwt.sign({ id, tokenType: 'refresh' }, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN
  });
};

// Set JWT as a secure HTTP-only cookie
export const setTokenCookie = (res: Response, token: string): void => {
  // Calculate cookie expiration based on JWT_EXPIRES_IN
  let maxAge = 30 * 60 * 1000; // Default to 30 minutes
  
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
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for cross-site usage in production
    maxAge: maxAge,
    domain: process.env.NODE_ENV === 'production' ? '.tryrivu.com' : undefined // Apply to domain and subdomains in production
  });
};

// Set refresh token as HTTP-only cookie
export const setRefreshTokenCookie = (res: Response, token: string): void => {
  let maxAge = 7 * 24 * 60 * 60 * 1000; // Default to 7 days
  
  // Parse JWT_REFRESH_EXPIRES_IN if it's set
  if (JWT_REFRESH_EXPIRES_IN) {
    if (JWT_REFRESH_EXPIRES_IN.endsWith('d')) {
      maxAge = parseInt(JWT_REFRESH_EXPIRES_IN) * 24 * 60 * 60 * 1000;
    } else if (JWT_REFRESH_EXPIRES_IN.endsWith('h')) {
      maxAge = parseInt(JWT_REFRESH_EXPIRES_IN) * 60 * 60 * 1000;
    } else if (JWT_REFRESH_EXPIRES_IN.endsWith('m')) {
      maxAge = parseInt(JWT_REFRESH_EXPIRES_IN) * 60 * 1000;
    }
  }
  
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: maxAge,
    domain: process.env.NODE_ENV === 'production' ? '.tryrivu.com' : undefined
  });
};

// Clear the token cookies (for logout)
export const clearTokenCookies = (res: Response): void => {
  res.cookie('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    expires: new Date(0),
    domain: process.env.NODE_ENV === 'production' ? '.tryrivu.com' : undefined
  });
  
  res.cookie('refreshToken', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    expires: new Date(0),
    domain: process.env.NODE_ENV === 'production' ? '.tryrivu.com' : undefined
  });
};