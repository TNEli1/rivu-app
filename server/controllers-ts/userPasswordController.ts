import { Request, Response } from 'express';
import { storage } from '../storage';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { sendPasswordResetEmail } from '../services/emailService';

/**
 * @desc    Request a password reset
 * @route   POST /api/forgot-password
 */
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        message: 'Please provide an email address',
        code: 'MISSING_EMAIL'
      });
    }
    
    // Check if user exists with this email
    const user = await storage.getUserByEmail(email);
    
    // For security reasons, always return success even if user doesn't exist
    if (!user) {
      return res.status(200).json({
        message: 'If an account with that email exists, a password reset link has been sent.',
        code: 'RESET_EMAIL_SENT'
      });
    }
    
    // Generate a secure, random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash token before storing it
    const resetTokenHashed = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    // Set expiration (30 minutes)
    const tokenExpiry = new Date(Date.now() + 30 * 60 * 1000);
    
    // Store token in database
    const tokenCreated = await storage.createPasswordResetToken(email, resetTokenHashed, tokenExpiry);
    
    if (!tokenCreated) {
      return res.status(500).json({
        message: 'Could not create password reset token',
        code: 'TOKEN_CREATION_FAILED'
      });
    }
    
    // Create reset URL - In development, ensure the port matches Vite's frontend port (5173)
    let resetUrl = '';
    if (process.env.NODE_ENV === 'development') {
      // Use port 5173 in development which is where Vite serves the frontend
      resetUrl = `http://localhost:5173/reset-password/${resetToken}`;
    } else {
      resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;
    }
    
    // In development mode, return token for testing
    if (process.env.NODE_ENV === 'development') {
      // Send email (in development this just logs to console)
      await sendPasswordResetEmail(email, resetToken, resetUrl);
      
      return res.status(200).json({
        message: 'Password reset email sent (check server logs in development)',
        resetToken,
        resetUrl,
        code: 'RESET_TOKEN_GENERATED'
      });
    }
    
    // Send password reset email
    const emailSent = await sendPasswordResetEmail(email, resetToken, resetUrl);
    
    if (!emailSent) {
      return res.status(500).json({
        message: 'Failed to send password reset email',
        code: 'EMAIL_FAILED'
      });
    }
    
    // Return success
    return res.status(200).json({
      message: 'If an account with that email exists, a password reset link has been sent.',
      code: 'RESET_EMAIL_SENT'
    });
    
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      message: 'Server error while processing password reset request',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Verify password reset token
 * @route   GET /api/verify-reset-token/:token
 */
export const verifyResetToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    
    // Hash received token to compare with stored hash
    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    // Check if token exists and is valid
    const user = await storage.verifyPasswordResetToken(tokenHash);
    
    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }
    
    return res.status(200).json({
      message: 'Token is valid',
      user: {
        id: user.id,
        email: user.email
      },
      code: 'VALID_TOKEN'
    });
    
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(500).json({
      message: 'Server error while verifying token',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Reset password
 * @route   POST /api/reset-password/:token
 */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({
        message: 'Missing token or password',
        code: 'MISSING_PARAMS'
      });
    }
    
    // Validate password
    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters',
        code: 'WEAK_PASSWORD'
      });
    }
    
    // Hash received token to compare with stored hash
    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    // Reset password using storage method
    const success = await storage.resetPassword(tokenHash, password);
    
    if (!success) {
      return res.status(400).json({
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }
    
    return res.status(200).json({
      message: 'Password has been reset successfully',
      code: 'PASSWORD_RESET_SUCCESS'
    });
    
  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({
      message: 'Server error while resetting password',
      code: 'SERVER_ERROR'
    });
  }
};