import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

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
        themePreference: user.themePreference,
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
 * @desc    Update user theme preference
 */
export const updateThemePreference = async (req: any, res: any) => {
  try {
    const userId = req.user.id;
    const { themePreference } = req.body;
    
    if (!themePreference || (themePreference !== 'light' && themePreference !== 'dark')) {
      return res.status(400).json({ 
        message: 'Valid theme preference required (light or dark)',
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
    
    // Update theme preference
    user.themePreference = themePreference;
    
    // Save updates
    await user.save();
    
    // Return updated theme preference
    res.json({
      themePreference: user.themePreference
    });
  } catch (error: any) {
    console.error('Update theme preference error:', error);
    res.status(500).json({ 
      message: error.message || 'Server error updating theme preference',
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
    
    // Handle "Do not show again" option
    if (demographics.skipPermanently !== undefined) {
      updatedDemographics.skipPermanently = demographics.skipPermanently;
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

/**
 * @desc    Generate a password reset token
 */
export const forgotPassword = async (req: any, res: any) => {
  try {
    const { email } = req.body;
    
    // Validate email
    if (!email) {
      return res.status(400).json({
        message: 'Please provide an email address',
        code: 'INVALID_INPUT'
      });
    }
    
    // Import User model dynamically
    const { default: User } = await import('../models/User.js');
    
    // For security reasons, don't reveal if user exists or not
    const user = await User.findOne({ email });
    if (!user) {
      // Still return 200 even if user not found to prevent email enumeration
      return res.status(200).json({
        message: 'If an account with that email exists, a password reset link has been sent.',
        code: 'RESET_EMAIL_SENT'
      });
    }
    
    // Generate a reset token
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash the token for storage
    const resetTokenHashed = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    // Save the hashed token with expiration
    user.resetPasswordToken = resetTokenHashed;
    user.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
    
    await user.save();
    
    // In a real app, send email with reset link, for development return token
    // You would use Nodemailer or similar to send an actual email
    if (process.env.NODE_ENV === 'development') {
      return res.status(200).json({
        message: 'Password reset token generated (Development mode)',
        resetToken,
        resetUrl: `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`,
        code: 'RESET_TOKEN_GENERATED'
      });
    }
    
    // Production response (would actually send email in production)
    res.status(200).json({
      message: 'If an account with that email exists, a password reset link has been sent.',
      code: 'RESET_EMAIL_SENT'
    });
  } catch (error) {
    console.error('Error in forgot password:', error);
    res.status(500).json({
      message: 'Password reset failed',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Get a user's saved accounts for transactions
 */
export const getUserAccounts = async (req: any, res: any) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        message: 'Not authorized',
        code: 'NOT_AUTHORIZED'
      });
    }

    // Import User model dynamically
    const { default: User } = await import('../models/User.js');
    
    // Find user and return accounts
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    return res.status(200).json({
      accounts: user.accounts || []
    });
    
  } catch (error) {
    console.error('Error getting user accounts:', error);
    return res.status(500).json({
      message: 'Server error retrieving user accounts',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Update a user's saved accounts for transactions
 */
export const updateUserAccounts = async (req: any, res: any) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        message: 'Not authorized',
        code: 'NOT_AUTHORIZED'
      });
    }

    // Validate that accounts is an array
    const { account } = req.body;
    if (!account || typeof account !== 'string') {
      return res.status(400).json({
        message: 'Invalid account data provided',
        code: 'INVALID_INPUT'
      });
    }

    // Import User model dynamically
    const { default: User } = await import('../models/User.js');
    
    // Find user and update accounts
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Only add the account if it doesn't already exist
    if (!user.accounts.includes(account)) {
      user.accounts.push(account);
      await user.save();
    }
    
    return res.status(200).json({
      accounts: user.accounts,
      message: 'Account added successfully'
    });
    
  } catch (error) {
    console.error('Error updating user accounts:', error);
    return res.status(500).json({
      message: 'Server error updating accounts',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Reset password with token
 */
export const resetPassword = async (req: any, res: any) => {
  try {
    const resetToken = req.params.token;
    const { password } = req.body;
    
    if (!resetToken || !password) {
      return res.status(400).json({
        message: 'Missing token or new password',
        code: 'INVALID_INPUT'
      });
    }
    
    // Import User model and crypto dynamically
    const { default: User } = await import('../models/User.js');
    const crypto = require('crypto');
    
    // Hash the token for comparison
    const resetTokenHashed = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    // Find user with matching token and valid expiration
    const user = await User.findOne({
      resetPasswordToken: resetTokenHashed,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired reset token',
        code: 'INVALID_RESET_TOKEN'
      });
    }
    
    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters',
        code: 'WEAK_PASSWORD'
      });
    }
    
    // Set new password and clear reset token fields
    user.password = await bcrypt.hash(password, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();
    
    // Generate a new JWT token and log the user in
    const authToken = generateToken(user._id);
    setTokenCookie(res, authToken);
    
    res.status(200).json({
      message: 'Password reset successful',
      _id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      token: authToken,
      code: 'PASSWORD_RESET_SUCCESS'
    });
    
  } catch (error) {
    console.error('Error in reset password:', error);
    res.status(500).json({
      message: 'Password reset failed',
      code: 'SERVER_ERROR'
    });
  }
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
  forgotPassword,
  resetPassword,
  protect
};