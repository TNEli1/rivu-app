import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { storage } from '../storage';
import { User } from '@shared/schema';
import { logSecurityEvent, SecurityEventType } from '../services/securityLogger';

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

// SECURITY FIX: Email verification helper function
const sendUserVerificationEmail = async (userId: number, email: string) => {
  // Generate verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
  const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Save token to database
  await storage.createEmailVerificationToken(userId, tokenHash, expiry);

  // Send verification email via Postmark
  const verificationUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/verify-email/${verificationToken}`;
  
  console.log(`Email Verification: Sending verification email to ${email}`);
  
  try {
    // Use the emailService for consistent email sending with support@tryrivu.com
    const { sendEmail } = await import('../services/emailService');
    
    const emailSent = await sendEmail({
      to: email,
      subject: 'Verify Your Email - Rivu',
      text: `Please verify your email address by clicking the link: ${verificationUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Verify Your Email Address</h2>
          <p>Welcome to Rivu! Please verify your email address by clicking the button below:</p>
          <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email</a>
          <p>Best regards,<br>The Rivu Team<br>support@tryrivu.com</p>
        </div>
      `
    });
    
    if (!emailSent) {
      throw new Error('Email service returned false');
    }
    
    console.log(`Email Verification: Successfully sent to ${email}`);
    
  } catch (emailError) {
    console.error('Email Verification ERROR:', emailError);
    throw emailError;
  }
};

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
const generateToken = (id: string, email: string) => {
  return jwt.sign({ 
    id, 
    email,
    authMethod: 'password'
  }, JWT_SECRET, {
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
    const { username, email, password, confirmPassword, firstName, lastName } = req.body;
    
    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({ 
        message: 'Please provide username, email, password and confirm password',
        code: 'VALIDATION_ERROR'
      });
    }

    // Server-side password confirmation validation
    if (password !== confirmPassword) {
      return res.status(400).json({
        message: 'Passwords do not match',
        code: 'PASSWORD_MISMATCH'
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
    
    // Note: We need to add email check in storage interface
    // For now, assume username uniqueness is sufficient
    
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
      onboardingCompleted: false,
      accountCreationDate: new Date(),
      loginCount: 1,
      lastLogin: new Date(), // matches schema field name
      // tosAcceptedAt will be set when user explicitly accepts TOS
      authMethod: 'password',
      emailVerified: false
    });
    
    if (user) {
      // SECURITY FIX: Do NOT auto-login after registration
      // User must verify email before being able to log in
      
      // Send verification email
      try {
        await sendUserVerificationEmail(user.id, user.email);
        console.log(`Verification email sent to ${user.email} for user ${user.id}`);
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        // Log to troubleshooting but don't fail registration
        const timestamp = new Date().toISOString();
        console.log(`TROUBLESHOOTING LOG ${timestamp}: Email verification failed for user ${user.id} - ${emailError}`);
      }
      
      // Return success without auto-login or token
      res.status(201).json({
        message: 'Account created successfully. Please check your email to verify your account before logging in.',
        requiresVerification: true,
        email: user.email
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
    if (user && user.password && await bcrypt.compare(password, user.password)) {
      // Block login until email is verified (unless using Google OAuth)
      if (user.authMethod === 'password' && !user.emailVerified) {
        return res.status(403).json({
          message: 'Please verify your email address before logging in',
          code: 'EMAIL_NOT_VERIFIED'
          // SECURITY: No user data exposed for unverified accounts
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
      await logSecurityEvent(
        SecurityEventType.LOGIN_SUCCESS,
        user.id,
        user.username,
        req,
        { loginCount, timestamp: new Date().toISOString() }
      );
      
      // Check for and create any new nudges based on user activity
      try {
        await storage.checkAndCreateNudges(user.id);
      } catch (nudgeError) {
        console.warn('Error checking for nudges on login:', nudgeError);
        // Don't fail login if nudge creation fails
      }
      
      // Generate JWT token
      const token = generateToken(user.id.toString(), user.email);
      
      // Set HTTP-only cookie with the token
      setTokenCookie(res, token);

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePic: user.profilePic,
        avatarInitials: user.avatarInitials,
        authMethod: user.authMethod,
        emailVerified: user.emailVerified,
        tosAcceptedAt: user.tosAcceptedAt,
        googleId: user.googleId,
        createdAt: user.createdAt,
        lastLogin,
        loginCount,
        onboardingStage: user.onboardingStage,
        onboardingCompleted: user.onboardingCompleted,
        demographics: {
          ageRange: user.ageRange,
          incomeBracket: user.incomeBracket,
          goals: user.goals ? user.goals.split(',') : [],
          riskTolerance: user.riskTolerance,
          experienceLevel: user.experienceLevel,
          completed: user.demographicsCompleted,
          skipPermanently: user.skipDemographics
        }
        // Token is already set in HTTP-only cookie for security
      });
    } else {
      // Log failed login attempt for security monitoring
      await logSecurityEvent(
        SecurityEventType.LOGIN_FAILURE,
        undefined,
        username,
        req,
        { reason: 'Invalid credentials', timestamp: new Date().toISOString() }
      );
      
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
 * @desc    Update user profile with enhanced security for Google/hybrid users
 */
export const updateUserProfile = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id, 10);
    const { username, email, firstName, lastName, password, currentPassword } = req.body;
    
    // Get user from PostgreSQL storage
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // For sensitive changes, require re-authentication
    const isSensitiveChange = username || password || email;
    if (isSensitiveChange) {
      // If user has a password (local or hybrid auth), require current password
      if (user.password && user.authMethod !== 'google') {
        if (!currentPassword) {
          return res.status(400).json({
            message: 'Current password required for security verification',
            code: 'CURRENT_PASSWORD_REQUIRED'
          });
        }
        
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
          return res.status(401).json({
            message: 'Current password is incorrect',
            code: 'INVALID_CURRENT_PASSWORD'
          });
        }
      }
      // For Google-only users, we'll rely on session authentication
    }
    
    // Data to update
    const updateData: Partial<User> = {};
    
    // If changing username, check if it's already in use and enforce rate limiting
    if (username && username !== user.username) {
      // Rate limiting: Check if user has changed username recently (1 per day)
      const lastUsernameChange = user.lastUsernameChange;
      if (lastUsernameChange) {
        const daysSinceLastChange = (Date.now() - new Date(lastUsernameChange).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceLastChange < 1) {
          return res.status(429).json({
            message: 'Username can only be changed once per day',
            code: 'USERNAME_RATE_LIMITED',
            nextAllowedChange: new Date(new Date(lastUsernameChange).getTime() + 24 * 60 * 60 * 1000)
          });
        }
      }
      
      const usernameExists = await storage.getUserByUsername(username);
      if (usernameExists) {
        return res.status(400).json({ 
          message: 'Username already in use',
          code: 'USERNAME_EXISTS'
        });
      }
      updateData.username = username;
      updateData.lastUsernameChange = new Date();
    }
    
    // Update other fields if provided
    if (email !== undefined && email !== user.email) updateData.email = email;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    
    // Handle password updates with hybrid auth support
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 12);
      updateData.password = hashedPassword;
      
      // If this is a Google user adding a password, change to hybrid authentication
      if (user.authMethod === 'google') {
        updateData.authMethod = 'hybrid';
        console.log(`User ${userId} (Google OAuth) added password - switched to hybrid authentication`);
      }
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
    
    // Log security event for auth method changes
    if (updateData.authMethod) {
      await logSecurityEvent(
        SecurityEventType.LOGIN,
        userId,
        user.username,
        req,
        { 
          from: user.authMethod, 
          to: updateData.authMethod,
          hasPassword: !!updateData.password
        }
      );
    }
    
    // Return updated user without password
    const { password: updatedPass, ...updatedData } = updatedUser;
    res.json({
      _id: updatedData.id,
      ...updatedData,
      message: updateData.authMethod === 'hybrid' ? 
        'Profile updated. You can now use either Google or password to sign in.' : 
        'Profile updated successfully.'
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
    const updateData: Partial<User> = {};
    
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
      await logSecurityEvent(
        SecurityEventType.LOGOUT,
        req.user.id,
        req.user.username,
        req,
        { timestamp: new Date().toISOString() }
      );
    }
    
    // CRITICAL FIX: Clear all authentication methods to prevent cross-account mixups
    
    // 1. Clear JWT cookie
    clearTokenCookie(res);
    
    // 2. Destroy Passport session
    req.session.destroy((err: any) => {
      if (err) {
        console.error('Session destruction error:', err);
      }
    });
    
    // 3. Clear user from request
    req.user = null;
    
    // 4. Clear any OAuth state
    if (req.session && req.session.plaidOAuth) {
      delete req.session.plaidOAuth;
    }
    
    console.log('User logged out - all sessions cleared');
    
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
    
    // Use storage interface instead of old User model
    const user = await storage.getUserByEmail(email);
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
    
    // Find user with matching token and valid expiration using storage interface
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
    
    // Set new password and clear reset token fields
    user.password = await bcrypt.hash(password, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();
    
    // Generate a new JWT token and log the user in
    const authToken = generateToken(user._id, user.email);
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

// SECURITY ENHANCED: Authentication middleware with strict user isolation
export const protect = async (req: any, res: any, next: any) => {
  try {
    // Get token from cookie
    const token = req.cookies[TOKEN_COOKIE_NAME];
    
    if (!token) {
      console.warn(`SECURITY: Unauthorized access attempt to ${req.path} - no token`);
      return res.status(401).json({ 
        message: 'Not authorized, no token',
        code: 'AUTH_REQUIRED'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    
    // Get user ID and convert to number for PostgreSQL
    const userId = parseInt(decoded.id.toString(), 10);
    
    // CRITICAL SECURITY FIX: Verify user exists and is still valid
    const user = await storage.getUser(userId);
    if (!user) {
      console.error(`SECURITY: Invalid session detected - user ${userId} not found in database`);
      return res.status(401).json({
        message: 'User not found or session invalid',
        code: 'INVALID_SESSION'
      });
    }
    
    // SECURITY FIX: Ensure email is verified for password-based auth
    if (user.authMethod === 'password' && !user.emailVerified) {
      console.warn(`SECURITY: Unverified user ${userId} attempted access to ${req.path}`);
      return res.status(401).json({
        message: 'Email verification required',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }
    
    // CRITICAL: Set user data with strict isolation
    req.user = { 
      id: userId,
      email: user.email,
      verified: user.emailVerified,
      authMethod: user.authMethod
    };
    
    // Security log for sensitive operations
    if (req.method !== 'GET') {
      console.log(`SECURITY LOG: User ${userId} (${user.email}) accessing ${req.method} ${req.path} at ${new Date().toISOString()}`);
    }
    
    next();
  } catch (error: any) {
    console.error(`SECURITY: Authentication error for ${req.path}:`, error.message);
    
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