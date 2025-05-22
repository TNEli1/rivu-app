import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { storage } from '../storage';
import { users, type User } from '@shared/schema';
import securityLogger, { SecurityEventType } from '../services/securityLogger';

// JWT Secret Key - ensure we have a proper secret in production
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('⛔ CRITICAL SECURITY ERROR: JWT_SECRET is not set in production!');
  throw new Error('JWT_SECRET must be set in production environment');
}

// Only use fallback in development, never in production
const JWT_SECRET = process.env.JWT_SECRET || 
  (process.env.NODE_ENV !== 'production' ? 'rivu_jwt_secret_dev_key' : '');

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
 * @desc    Register a new user with enhanced security and email verification
 */
export const registerUser = async (req: any, res: any) => {
  try {
    const { username, email, password, passwordConfirmation, firstName, lastName } = req.body;
    
    // Validate required fields
    if (!username || !email || !password) {
      return res.status(400).json({ 
        message: 'Please provide username, email and password',
        code: 'VALIDATION_ERROR'
      });
    }
    
    // Check password confirmation
    if (password !== passwordConfirmation) {
      return res.status(400).json({
        message: 'Passwords do not match',
        code: 'PASSWORD_MISMATCH'
      });
    }
    
    // Enforce strong password policy
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character',
        code: 'WEAK_PASSWORD'
      });
    }
    
    // Check if user already exists with username
    const existingUsername = await storage.getUserByUsername(username);
    if (existingUsername) {
      return res.status(400).json({ 
        message: 'An account with this username already exists',
        code: 'USER_EXISTS'
      });
    }
    
    // Check if user already exists with email
    const existingEmail = await storage.getUserByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ 
        message: 'An account with this email already exists',
        code: 'EMAIL_EXISTS'
      });
    }
    
    // Hash password with bcrypt (salt factor 12)
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create user initials for avatar
    const avatarInitials = (firstName?.[0] || '') + (lastName?.[0] || '');
    
    // Create new user with hashed password and initialize onboarding
    // Ensuring users start with a clean slate (no preloaded data)
    const user = await storage.createUser({
      username,
      email,
      password: hashedPassword,
      firstName: firstName || '',
      lastName: lastName || '',
      avatarInitials: avatarInitials || username.substring(0, 2).toUpperCase(),
      themePreference: 'dark', // Default to dark mode per bug report
      onboardingStage: 'new',
      emailVerified: false, // Start with unverified email
      onboardingCompleted: false,
      accountCreationDate: new Date(),
      loginCount: 1,
      lastLogin: new Date() // matches schema field name
    });
    
    if (user) {
      // Generate JWT token
      const token = generateToken(user.id.toString());
      
      // Set token as HTTP-only cookie
      setTokenCookie(res, token);
      
      // Send verification email
      try {
        // Import email verification service
        const { sendVerificationEmail } = await import('./userVerificationController');
        
        // Send verification email
        const emailSent = await sendVerificationEmail(
          user.id,
          user.email,
          user.firstName
        );
        
        if (!emailSent) {
          console.warn(`Failed to send verification email to ${user.email}`);
        } else {
          console.log(`Verification email sent to ${user.email}`);
        }
      } catch (emailError) {
        console.error('Error sending verification email:', emailError);
        // Don't fail registration if email sending fails
      }
      
      // Check for initial nudges to create for the new user
      try {
        await storage.checkAndCreateNudges(user.id);
      } catch (nudgeError) {
        console.warn('Error creating initial nudges for new user:', nudgeError);
        // Don't fail registration if nudge creation fails
      }
      
      // Return user info without password and token
      // Token is already set in HTTP-only cookie for security
      res.status(201).json({
        _id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        onboardingStage: user.onboardingStage,
        emailVerified: false,
        message: 'Registration successful. Please check your email to verify your account.'
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
    
    // Find user by username
    const user = await storage.getUserByUsername(username);

    // Check if user exists and password matches
    if (user && await bcrypt.compare(password, user.password)) {
      // Check if email is verified
      if (!user.emailVerified) {
        // Log verification failure event
        securityLogger.logSecurityEvent({
          type: SecurityEventType.LOGIN_FAILURE,
          userId: user.id,
          details: {
            username: user.username,
            reason: 'Email not verified',
            timestamp: new Date().toISOString(),
            ip: req.ip
          }
        });
        
        // Return error requiring email verification
        return res.status(403).json({
          message: 'Please verify your email before logging in. Check your inbox for a verification link.',
          code: 'EMAIL_NOT_VERIFIED',
          email: user.email // Include email to allow resending verification
        });
      }
      
      // Update login metrics
      const loginCount = (user.loginCount || 0) + 1;
      const lastLogin = new Date();
      
      // Update user login statistics
      await storage.updateUser(user.id, {
        loginCount,
        lastLogin
      });
      
      // Log successful login for security auditing
      securityLogger.logSecurityEvent({
        type: SecurityEventType.LOGIN_SUCCESS,
        userId: user.id,
        details: {
          username: user.username,
          loginCount,
          timestamp: new Date().toISOString(),
          ip: req.ip
        }
      });
      
      // Check for and create any new nudges based on user activity
      try {
        await storage.checkAndCreateNudges(user.id);
      } catch (nudgeError) {
        console.warn('Error checking for nudges on login:', nudgeError);
        // Don't fail login if nudge creation fails
      }
      
      // Generate JWT token
      const token = generateToken(user.id.toString());
      
      // Set HTTP-only cookie with the token
      setTokenCookie(res, token);

      res.json({
        _id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
        lastLogin,
        loginCount,
        onboardingStage: user.onboardingStage,
        onboardingCompleted: user.onboardingCompleted,
        emailVerified: user.emailVerified
        // Token is already set in HTTP-only cookie for security
      });
    } else {
      // Log failed login attempt for security monitoring
      securityLogger.logSecurityEvent({
        type: SecurityEventType.LOGIN_FAILURE,
        details: {
          username,
          reason: 'Invalid credentials', 
          timestamp: new Date().toISOString(),
          ip: req.ip
        }
      });
      
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
    const userId = parseInt(req.user.id, 10);
    
    // Get user from PostgreSQL storage
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Format demographics for client-side consistency
    const demographics = {
      ageRange: user.ageRange,
      incomeBracket: user.incomeBracket,
      goals: user.goals ? user.goals.split(',') : [],
      riskTolerance: user.riskTolerance,
      experienceLevel: user.experienceLevel,
      completed: user.demographicsCompleted,
      skipPermanently: user.skipDemographics
    };
    
    // Get active nudges for the user
    let activeNudges: any[] = [];
    try {
      activeNudges = await storage.getNudges(userId, 'active');
    } catch (nudgeError) {
      console.warn('Error fetching nudges for user profile:', nudgeError);
      // Continue with profile response even if nudges fail
    }
    
    // Return user data (exclude password)
    const { password, ...userData } = user;
    res.json({
      _id: userData.id,
      ...userData,
      demographics,
      activeNudges
    });
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
 */
export const updateUserProfile = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id, 10);
    const { username, email, firstName, lastName, password } = req.body;
    
    // Get user from PostgreSQL storage
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Data to update
    const updateData: any = {};
    
    // If changing username, check if it's already in use
    if (username && username !== user.username) {
      const usernameExists = await storage.getUserByUsername(username);
      if (usernameExists) {
        return res.status(400).json({ 
          message: 'Username already in use',
          code: 'USERNAME_EXISTS'
        });
      }
      updateData.username = username;
    }
    
    // Update other fields if provided
    if (email !== undefined && email !== user.email) updateData.email = email;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    
    // If password is provided, hash and update
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 12);
      updateData.password = hashedPassword;
    }
    
    // Only update if there are changes
    if (Object.keys(updateData).length === 0) {
      // Return current user data if no updates
      const { password: userPass, ...userData } = user;
      return res.json({
        _id: userData.id,
        ...userData
      });
    }
    
    // Update the user in PostgreSQL
    const updatedUser = await storage.updateUser(userId, updateData);
    
    if (!updatedUser) {
      return res.status(500).json({
        message: 'Failed to update user profile',
        code: 'UPDATE_FAILED'
      });
    }
    
    // Return updated user without password
    const { password: updatedPass, ...updatedData } = updatedUser;
    res.json({
      _id: updatedData.id,
      ...updatedData
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
    const userId = parseInt(req.user.id, 10);
    const { demographics } = req.body;
    
    if (!demographics) {
      return res.status(400).json({ 
        message: 'Demographics data required',
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
    
    // Prepare the update data
    const updateData: any = {};
    
    // Update individual demographic fields
    if (demographics.ageRange !== undefined) {
      updateData.ageRange = demographics.ageRange;
    }
    
    if (demographics.incomeBracket !== undefined) {
      updateData.incomeBracket = demographics.incomeBracket;
    }
    
    if (demographics.goals !== undefined) {
      // Convert array to string for storage
      updateData.goals = Array.isArray(demographics.goals) 
        ? demographics.goals.join(',') 
        : demographics.goals;
    }
    
    if (demographics.riskTolerance !== undefined) {
      updateData.riskTolerance = demographics.riskTolerance;
    }
    
    if (demographics.experienceLevel !== undefined) {
      updateData.experienceLevel = demographics.experienceLevel;
    }
    
    // Ensure the completed flag is set if provided
    if (demographics.completed !== undefined) {
      updateData.demographicsCompleted = demographics.completed;
    }
    
    // Handle "Do not show again" option
    if (demographics.skipPermanently !== undefined) {
      updateData.skipDemographics = demographics.skipPermanently;
    }
    
    // Update user in database
    const updatedUser = await storage.updateUser(userId, updateData);
    
    if (!updatedUser) {
      return res.status(500).json({
        message: 'Failed to update demographics',
        code: 'UPDATE_FAILED'
      });
    }
    
    // Format response to match expected client format
    const formattedDemographics = {
      ageRange: updatedUser.ageRange,
      incomeBracket: updatedUser.incomeBracket,
      goals: updatedUser.goals ? updatedUser.goals.split(',') : [],
      riskTolerance: updatedUser.riskTolerance,
      experienceLevel: updatedUser.experienceLevel,
      completed: updatedUser.demographicsCompleted,
      skipPermanently: updatedUser.skipDemographics,
      updatedAt: new Date().toISOString(),
    };
    
    res.json({
      demographics: formattedDemographics
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
    const userId = parseInt(req.user.id, 10);
    
    // Find user using PostgreSQL storage
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Calculate new login metrics
    const currentTime = new Date();
    const newLoginCount = (user.loginCount || 0) + 1;
    
    // Update user with new login metrics
    const updatedUser = await storage.updateUser(userId, {
      lastLogin: currentTime,
      loginCount: newLoginCount
    });
    
    if (!updatedUser) {
      return res.status(500).json({
        message: 'Failed to update login metrics',
        code: 'UPDATE_FAILED'
      });
    }
    
    // Return updated metrics
    const loginMetrics = {
      lastLogin: updatedUser.lastLogin,
      loginCount: updatedUser.loginCount
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
export const logoutUser = async (req: any, res: any) => {
  try {
    // Log the logout event if we have user information
    if (req.user && req.user.id) {
      securityLogger.logSecurityEvent({
        type: SecurityEventType.LOGOUT,
        userId: req.user.id,
        details: {
          username: req.user.username,
          timestamp: new Date().toISOString(),
          ip: req.ip
        }
      });
    }
    
    // Clear the token cookie
    clearTokenCookie(res);
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error during logout:', error);
    // Still proceed with logout even if logging fails
    clearTokenCookie(res);
    res.json({ message: 'Logged out successfully' });
  }
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
    
    // Use our storage system to generate reset token
    // For security reasons, don't reveal if user exists or not
    const user = await storage.getUserByEmail(email);
    if (!user) {
      // Still return 200 even if user not found to prevent email enumeration
      return res.status(200).json({
        message: 'If an account with that email exists, a password reset link has been sent.',
        code: 'RESET_EMAIL_SENT'
      });
    }
    
    // Generate a reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash the token for storage
    const resetTokenHashed = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    // Set token expiry (30 minutes)
    const resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000);
    
    // Save the token using our storage system
    await storage.createPasswordResetToken(email, resetTokenHashed, resetTokenExpiry);
    
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
    
    // Hash the token for comparison
    const resetTokenHashed = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    // Use our storage system to verify the reset token
    const user = await storage.verifyPasswordResetToken(resetTokenHashed);
    
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
    
    // Reset the password using our storage system
    const success = await storage.resetPassword(resetTokenHashed, password);
    
    if (!success) {
      return res.status(500).json({
        message: 'Failed to reset password',
        code: 'RESET_FAILED'
      });
    }
    
    // Generate a new JWT token and log the user in
    const authToken = generateToken(user.id.toString());
    setTokenCookie(res, authToken);
    
    res.status(200).json({
      message: 'Password reset successful',
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
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
export const protect = async (req: any, res: any, next: any) => {
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
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    
    // Get user ID and convert to number for PostgreSQL
    const userId = parseInt(decoded.id.toString(), 10);
    
    // Verify user exists in database
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({
        message: 'User not found or session invalid',
        code: 'INVALID_SESSION'
      });
    }
    
    // Set user ID in request
    req.user = { id: userId };
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