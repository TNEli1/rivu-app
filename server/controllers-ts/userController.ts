import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

// JWT Secret Key
const JWT_SECRET = process.env.JWT_SECRET || 'rivu_jwt_secret_dev_key';

// JWT Expiration - 2 hours in seconds
const JWT_EXPIRY = 60 * 60 * 2; 

// Token cookie name
const TOKEN_COOKIE_NAME = 'rivu_token';

// Rate limiter settings based on environment
const isProduction = process.env.NODE_ENV === 'production';

// Set stricter rate limiting for production
const MAX_LOGIN_ATTEMPTS = isProduction ? 5 : 1000;
const RATE_LIMIT_WINDOW_MS = isProduction ? 60 * 1000 : 15 * 60 * 1000; // 1 min in prod, 15 mins in dev

// Create rate limiter for login attempts
export const loginLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: MAX_LOGIN_ATTEMPTS,
  message: { 
    message: `Too many login attempts. Please try again after ${isProduction ? '1 minute' : '15 minutes'}`,
    code: 'RATE_LIMITED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Generate JWT Token
const generateToken = (id: string) => {
  return jwt.sign({ id }, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
  });
};

// Set JWT in HTTP-only cookie for security
const setTokenCookie = (res: any, token: string) => {
  res.cookie(TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Use secure in production
    maxAge: JWT_EXPIRY * 1000, // Convert to milliseconds
    sameSite: 'strict',
  });
};

// Clear token cookie on logout
const clearTokenCookie = (res: any) => {
  res.cookie(TOKEN_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(0),
  });
};

/**
 * @desc    Register a new user
 */
export const registerUser = async (req: any, res: any) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ 
        message: 'Please provide username, email and password',
        code: 'VALIDATION_ERROR'
      });
    }
    
    // Import User model dynamically
    const { default: User } = await import('../models/User.js');
    
    // Check if user already exists
    const userExists = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (userExists) {
      // Don't specify whether username or email exists for security
      return res.status(400).json({ 
        message: 'An account with this username or email already exists',
        code: 'USER_EXISTS'
      });
    }
    
    // Hash password with bcrypt (salt factor 12)
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create new user with hashed password
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      firstName: firstName || '',
      lastName: lastName || '',
      createdAt: new Date(),
      lastLogin: new Date(),
      loginCount: 1,
      demographics: {
        completed: false, // Survey not completed yet
      }
    });
    
    if (user) {
      // Generate JWT token
      const token = generateToken(user._id);
      
      // Set token as HTTP-only cookie
      setTokenCookie(res, token);
      
      // Return user info without password
      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        demographics: user.demographics,
        token // Include token in response for clients not using cookies
      });
    } else {
      res.status(400).json({ 
        message: 'Invalid user data', 
        code: 'INVALID_DATA'
      });
    }
    
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({ 
      message: error.message || 'Server error during registration',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Login user
 */
export const loginUser = async (req: any, res: any) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        message: 'Please provide username and password',
        code: 'VALIDATION_ERROR'
      });
    }
    
    // Import User model dynamically
    const { default: User } = await import('../models/User.js');

    // Find user by username or email
    const user = await User.findOne({ 
      $or: [{ username }, { email: username }] 
    });

    // Check if user exists and password matches
    if (user && await bcrypt.compare(password, user.password)) {
      // Update login metrics
      user.lastLogin = new Date();
      user.loginCount = (user.loginCount || 0) + 1;
      await user.save();
      
      // Generate JWT token
      const token = generateToken(user._id);
      
      // Set HTTP-only cookie with the token
      setTokenCookie(res, token);

      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLogin: user.lastLogin,
        loginCount: user.loginCount,
        demographics: user.demographics,
        token // Include token in response for clients not using cookies
      });
    } else {
      // Generic error message for security (don't specify if user doesn't exist or password is wrong)
      res.status(401).json({ 
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }
    
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: error.message || 'Server error during login',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Get user profile
 */
export const getUserProfile = async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    
    // Import User model dynamically
    const { default: User } = await import('../models/User.js');
    
    // Find user by ID, excluding password field
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Return user data
    res.json(user);
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      message: error.message || 'Server error retrieving profile',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Update user profile
 */
export const updateUserProfile = async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { username, email, firstName, lastName, password } = req.body;
    
    // Import User model dynamically
    const { default: User } = await import('../models/User.js');
    
    // Find user by ID
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // If changing username, check if it's already in use
    if (username && username !== user.username) {
      const usernameExists = await User.findOne({ username });
      if (usernameExists) {
        return res.status(400).json({ 
          message: 'Username already in use',
          code: 'USERNAME_EXISTS'
        });
      }
      user.username = username;
    }
    
    // If changing email, check if it's already in use
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email });
      if (emailExists) {
        return res.status(400).json({ 
          message: 'Email already in use',
          code: 'EMAIL_EXISTS'
        });
      }
      user.email = email;
    }
    
    // Update other fields if provided
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    
    // If password is provided, hash and update
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 12);
      user.password = hashedPassword;
    }
    
    // Save updates
    await user.save();
    
    // Return updated user without password
    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePicture: user.profilePicture,
      updatedAt: user.updatedAt
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      message: error.message || 'Server error updating profile',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Update user demographics
 */
export const updateDemographics = async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { demographics } = req.body;
    
    if (!demographics) {
      return res.status(400).json({ 
        message: 'Demographics data required',
        code: 'VALIDATION_ERROR'
      });
    }
    
    // Import User model dynamically
    const { default: User } = await import('../models/User.js');
    
    // Find user by ID
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Update demographics
    const updatedDemographics = {
      ...demographics,
      updatedAt: new Date()
    };
    
    // Ensure the completed flag is set if provided
    if (demographics.completed !== undefined) {
      updatedDemographics.completed = demographics.completed;
    }
    
    // Update user demographics
    user.demographics = updatedDemographics;
    
    // Save changes
    await user.save();
    
    res.json({
      demographics: user.demographics
    });
  } catch (error: any) {
    console.error('Update demographics error:', error);
    res.status(500).json({ 
      message: error.message || 'Server error updating demographics',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Update login metrics
 */
export const updateLoginMetrics = async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    
    // Import User model dynamically
    const { default: User } = await import('../models/User.js');
    
    // Find user by ID
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Update login metrics
    user.lastLogin = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    
    // Save changes
    await user.save();
    
    // Return updated metrics
    const loginMetrics = {
      lastLogin: user.lastLogin,
      loginCount: user.loginCount
    };
    
    res.json(loginMetrics);
  } catch (error: any) {
    console.error('Update login metrics error:', error);
    res.status(500).json({ 
      message: error.message || 'Server error updating login metrics',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Logout user / clear cookie
 */
export const logoutUser = (req: any, res: any) => {
  // Clear the token cookie
  clearTokenCookie(res);
  
  res.json({ message: 'Logged out successfully' });
};

// Authentication middleware
export const protect = (req: any, res: any, next: any) => {
  try {
    // Get token from cookie
    const token = req.cookies[TOKEN_COOKIE_NAME];
    
    if (!token) {
      return res.status(401).json({ 
        message: 'Not authorized, no token',
        code: 'AUTH_REQUIRED'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Set user ID in request
    req.user = { id: decoded.id };
    next();
  } catch (error: any) {
    // Check if token expired
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Token expired, please login again',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    // Other token errors
    return res.status(401).json({ 
      message: 'Not authorized, token failed',
      code: 'INVALID_TOKEN'
    });
  }
};

// Export a default object with all functions for compatibility with ESM
export default {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  updateDemographics,
  updateLoginMetrics,
  logoutUser,
  loginLimiter,
  protect
};