import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { storage } from '../storage';
import { User } from '@shared/schema';

// JWT Secret Key
const JWT_SECRET = process.env.JWT_SECRET || 'rivu_jwt_secret_dev_key';

// JWT Expiration - 2 hours in seconds
const JWT_EXPIRY = 60 * 60 * 2; 

// Token cookie name
const TOKEN_COOKIE_NAME = 'rivu_token';

// Rate limiter settings based on environment
const isProduction = process.env.NODE_ENV === 'production';

// Login throttling rate limit
const loginLimiter = rateLimit({
  windowMs: isProduction ? 15 * 60 * 1000 : 5 * 60 * 1000, // 15 minutes in prod, 5 minutes in dev
  max: isProduction ? 5 : 20, // 5 failed attempts in prod, 20 in dev
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => {
    // In development mode, check for header to skip rate limiting for testing
    if (process.env.NODE_ENV !== 'production' && 
        req.headers['x-skip-rate-limit'] === 'development') {
      console.log("⚠️ Rate limiting skipped for development");
      return true;
    }
    return false;
  },
  message: {
    message: 'Too many login attempts, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

/**
 * Generate a JWT token for the user
 */
const generateToken = (userId: number): string => {
  return jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: JWT_EXPIRY
  });
};

/**
 * Set JWT as HTTP-Only Cookie
 */
const setTokenCookie = (res: any, token: string) => {
  // Set cookie options
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: JWT_EXPIRY * 1000 // Convert seconds to milliseconds
  };
  
  // Set the cookie
  res.cookie(TOKEN_COOKIE_NAME, token, cookieOptions);
};

/**
 * @desc    Generate a name's initials (e.g. John Doe -> JD)
 */
const generateInitials = (firstName: string, lastName: string): string => {
  // Get first character of first name
  const firstInitial = firstName.charAt(0).toUpperCase();
  
  // Get first character of last name 
  const lastInitial = lastName.charAt(0).toUpperCase();
  
  return `${firstInitial}${lastInitial}`;
};

/**
 * @desc    Protect routes - Authentication middleware
 */
export const protect = async (req: any, res: any, next: any) => {
  try {
    let token;
    
    // Get token from cookie
    token = req.cookies[TOKEN_COOKIE_NAME];
    
    // Check if token exists
    if (!token) {
      return res.status(401).json({ 
        message: 'Not authorized, please log in',
        code: 'AUTH_REQUIRED'
      });
    }
    
    // Verify token and extract user ID
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
    
    // Get user from storage
    const user = await storage.getUser(decoded.id);
    
    // If user not found
    if (!user) {
      return res.status(401).json({ 
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Set req.user for route handlers
    req.user = {
      _id: user.id,
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarInitials: user.avatarInitials,
      themePreference: user.themePreference
    };
    
    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        message: 'Not authorized, please log in again',
        code: 'TOKEN_INVALID'
      });
    }
    
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      message: 'Server error during authentication',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Login user
 * @route   POST /api/login
 * @access  Public
 */
export const loginUser = async (req: any, res: any) => {
  try {
    const { username, password } = req.body;
    
    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({ 
        message: 'Username and password are required',
        code: 'VALIDATION_ERROR'
      });
    }
    
    // Get user by username from storage
    const user = await storage.getUserByUsername(username);
    
    // If user not found
    if (!user) {
      return res.status(401).json({ 
        message: 'Invalid username or password',
        code: 'AUTH_FAILED'
      });
    }
    
    // Compare passwords
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    // If passwords don't match
    if (!passwordMatch) {
      return res.status(401).json({ 
        message: 'Invalid username or password',
        code: 'AUTH_FAILED'
      });
    }
    
    // Generate token
    const token = generateToken(user.id);
    
    // Set token cookie
    setTokenCookie(res, token);
    
    // Send user data (excluding password)
    res.json({
      _id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarInitials: user.avatarInitials,
      themePreference: user.themePreference
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: error.message || 'Server error during login',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Register a new user
 * @route   POST /api/register
 * @access  Public
 */
export const registerUser = async (req: any, res: any) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;
    
    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({ 
        message: 'Username, email, and password are required',
        code: 'VALIDATION_ERROR'
      });
    }
    
    // Check if username is already taken
    const existingUser = await storage.getUserByUsername(username);
    if (existingUser) {
      return res.status(409).json({ 
        message: 'Username is already taken',
        code: 'USERNAME_TAKEN'
      });
    }
    
    // Generate avatar initials from name
    const firstNameValue = firstName || username.charAt(0).toUpperCase();
    const lastNameValue = lastName || username.charAt(1).toUpperCase();
    const avatarInitials = generateInitials(firstNameValue, lastNameValue);
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const newUser = await storage.createUser({
      email,
      password: hashedPassword,
      username,
      firstName: firstName || username,
      lastName: lastName || '',
      avatarInitials,
      themePreference: 'dark', // Default to dark theme for new users
      onboardingStage: 'new',
      onboardingCompleted: false,
      accountCreationDate: new Date()
    });
    
    // Generate token
    const token = generateToken(newUser.id);
    
    // Set token cookie
    setTokenCookie(res, token);
    
    // Send user data (excluding password)
    res.status(201).json({
      _id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      avatarInitials: newUser.avatarInitials,
      themePreference: newUser.themePreference
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: error.message || 'Server error during registration',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/logout
 * @access  Private
 */
export const logoutUser = (req: any, res: any) => {
  try {
    // Clear the JWT cookie
    res.clearCookie(TOKEN_COOKIE_NAME);
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      message: 'Server error during logout',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Get user profile
 * @route   GET /api/user
 * @access  Private
 */
export const getUserProfile = async (req: any, res: any) => {
  try {
    // req.user is set in the protect middleware
    const user = req.user;
    
    // Send user profile data
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
 * @route   PUT /api/user/theme-preference
 * @access  Private
 */
export const updateThemePreference = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id, 10);
    const { themePreference } = req.body;
    
    if (!themePreference || (themePreference !== 'light' && themePreference !== 'dark')) {
      return res.status(400).json({ 
        message: 'Valid theme preference required (light or dark)',
        code: 'VALIDATION_ERROR'
      });
    }
    
    // Get user from PostgreSQL storage
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Update theme preference
    const updatedUser = await storage.updateUser(userId, {
      themePreference: themePreference
    });
    
    if (!updatedUser) {
      return res.status(500).json({
        message: 'Failed to update theme preference',
        code: 'UPDATE_FAILED'
      });
    }
    
    // Return updated theme preference
    res.json({
      themePreference: updatedUser.themePreference
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
 * @route   PUT /api/user
 * @access  Private
 */
export const updateUserProfile = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id, 10);
    const { email, firstName, lastName } = req.body;
    
    // Get user from PostgreSQL storage
    let user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Update user fields
    const updateData: Partial<User> = {};
    
    if (email) updateData.email = email;
    if (firstName) {
      updateData.firstName = firstName;
      // Update avatar initials if first name changed
      updateData.avatarInitials = generateInitials(
        firstName, 
        lastName || user.lastName
      );
    }
    if (lastName) {
      updateData.lastName = lastName;
      // Update avatar initials if last name changed
      updateData.avatarInitials = generateInitials(
        firstName || user.firstName,
        lastName
      );
    }
    
    // Send update to PostgreSQL storage
    const updatedUser = await storage.updateUser(userId, updateData);
    
    if (!updatedUser) {
      return res.status(500).json({
        message: 'Failed to update user profile',
        code: 'UPDATE_FAILED'
      });
    }
    
    // Send updated user data
    res.json({
      _id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      avatarInitials: updatedUser.avatarInitials,
      themePreference: updatedUser.themePreference
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
 * @route   PUT /api/user/demographics
 * @access  Private
 */
export const updateDemographics = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id, 10);
    const { ageRange, incomeBracket, goals, riskTolerance, experienceLevel, skip } = req.body;
    
    // Get user from PostgreSQL storage
    let user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Update user fields
    const updateData: Partial<User> = {};
    
    // If skipping demographics, just mark as completed
    if (skip) {
      updateData.skipDemographics = true;
      updateData.demographicsCompleted = true;
    } else {
      // Otherwise update all fields
      updateData.ageRange = ageRange;
      updateData.incomeBracket = incomeBracket;
      updateData.goals = goals;
      updateData.riskTolerance = riskTolerance;
      updateData.experienceLevel = experienceLevel;
      updateData.demographicsCompleted = true;
    }
    
    // Send update to PostgreSQL storage
    const updatedUser = await storage.updateUser(userId, updateData);
    
    if (!updatedUser) {
      return res.status(500).json({
        message: 'Failed to update demographics',
        code: 'UPDATE_FAILED'
      });
    }
    
    // Send confirmation
    res.json({
      message: 'Demographics updated successfully',
      demographicsCompleted: true,
      skipped: !!skip
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
 * @desc    Update login metrics (count and last login date)
 * @route   POST /api/user/login-metric
 * @access  Private
 */
export const updateLoginMetrics = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id, 10);
    
    // Get user from PostgreSQL storage
    let user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Update login metrics
    const loginCount = (user.loginCount || 0) + 1;
    const lastLogin = new Date();
    
    // Send update to PostgreSQL storage
    const updatedUser = await storage.updateUser(userId, {
      loginCount,
      lastLogin
    });
    
    if (!updatedUser) {
      return res.status(500).json({
        message: 'Failed to update login metrics',
        code: 'UPDATE_FAILED'
      });
    }
    
    // Send confirmation
    res.json({
      lastLogin: updatedUser.lastLogin,
      loginCount: updatedUser.loginCount
    });
  } catch (error: any) {
    console.error('Update login metrics error:', error);
    res.status(500).json({ 
      message: error.message || 'Server error updating login metrics',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Request password reset email
 * @route   POST /api/forgot-password
 * @access  Public
 */
export const forgotPassword = async (req: any, res: any) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        message: 'Email is required',
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
    
    // Create reset URL (in production, this would point to the frontend)
    const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;
    
    // In a real application, send an email with the reset link here.
    // For now, we'll just log it to the console
    console.log(`Password reset token: ${resetToken}`);
    console.log(`Password reset URL: ${resetUrl}`);
    
    // Respond with success message
    res.status(200).json({
      message: 'If an account with that email exists, a password reset link has been sent.',
      code: 'RESET_EMAIL_SENT',
      // In development only, return the token and URL
      ...(process.env.NODE_ENV !== 'production' && {
        resetToken,
        resetUrl
      })
    });
  } catch (error: any) {
    console.error('Forgot password error:', error);
    res.status(500).json({ 
      message: error.message || 'Server error sending reset email',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Reset password
 * @route   POST /api/reset-password/:token
 * @access  Public
 */
export const resetPassword = async (req: any, res: any) => {
  try {
    const { password } = req.body;
    const { token } = req.params;
    
    if (!password) {
      return res.status(400).json({
        message: 'New password is required',
        code: 'INVALID_INPUT'
      });
    }
    
    if (!token) {
      return res.status(400).json({
        message: 'Reset token is required',
        code: 'INVALID_TOKEN'
      });
    }
    
    // Import User model dynamically
    const { default: User } = await import('../models/User.js');
    
    // Hash the provided token to compare with stored hash
    const crypto = require('crypto');
    const resetTokenHashed = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    // Find user with matching token and valid expiration
    const user = await User.findOne({
      resetPasswordToken: resetTokenHashed,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired reset token',
        code: 'INVALID_TOKEN'
      });
    }
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update user password and clear reset token fields
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();
    
    // Respond with success message
    res.status(200).json({
      message: 'Password reset successful',
      code: 'PASSWORD_RESET_SUCCESS'
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    res.status(500).json({ 
      message: error.message || 'Server error resetting password',
      code: 'SERVER_ERROR'
    });
  }
};
