import { Request, Response } from 'express';
import crypto from 'crypto';
import { storage } from '../storage';
import { sendEmailVerificationEmail } from '../services/emailService';

/**
 * @desc    Generate verification token for email verification
 */
const generateVerificationToken = (): string => {
  // Generate a random token
  const token = crypto.randomBytes(32).toString('hex');
  
  // Create a hash of the token to store in the database
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  
  return tokenHash;
};

/**
 * @desc    Send email verification email to user
 */
export const sendVerificationEmail = async (userId: number, email: string, firstName: string = ''): Promise<boolean> => {
  try {
    // Generate verification token
    const verificationToken = generateVerificationToken();
    
    // Set token expiry (24 hours from now)
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    // Update user with verification token
    await storage.updateUserVerificationToken(userId, verificationToken, verificationTokenExpiry);
    
    // Send verification email
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://rivu-app.onrender.com' 
      : 'http://localhost:8080';
    
    // Make sure the verification URL is properly formatted
    const verificationUrl = `${baseUrl}/api/verify-email?token=${verificationToken}&email=${encodeURIComponent(email)}`;
    
    return await sendEmailVerificationEmail(email, firstName, verificationUrl);
  } catch (error) {
    console.error('Error sending verification email:', error);
    return false;
  }
};

/**
 * @desc    Manually trigger email verification (resend)
 * @route   POST /api/send-verification
 */
export const resendVerificationEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        message: 'Email is required',
        code: 'VALIDATION_ERROR'
      });
    }
    
    // Get user by email
    const user = await storage.getUserByEmail(email);
    
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.status(200).json({
        message: 'If your email is registered, a verification link has been sent.'
      });
    }
    
    // Check if already verified
    if (user.emailVerified) {
      return res.status(400).json({
        message: 'Your email is already verified',
        code: 'ALREADY_VERIFIED'
      });
    }
    
    // Send verification email
    const emailSent = await sendVerificationEmail(user.id, user.email, user.firstName);
    
    if (!emailSent) {
      return res.status(500).json({
        message: 'Failed to send verification email. Please try again later.',
        code: 'EMAIL_SEND_FAILED'
      });
    }
    
    return res.status(200).json({
      message: 'Verification email sent successfully. Please check your inbox.'
    });
  } catch (error) {
    console.error('Error resending verification email:', error);
    return res.status(500).json({
      message: 'An error occurred while sending verification email',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Verify email token
 * @route   GET /api/verify-email/:token
 */
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token, email } = req.query;
    
    if (!token || !email || typeof token !== 'string' || typeof email !== 'string') {
      return res.status(400).json({
        message: 'Invalid verification link',
        code: 'INVALID_TOKEN'
      });
    }
    
    // Verify token
    const user = await storage.verifyEmailToken(token, email);
    
    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired verification link. Please request a new one.',
        code: 'INVALID_TOKEN'
      });
    }
    
    // Mark email as verified
    const updated = await storage.markEmailAsVerified(user.id);
    
    if (!updated) {
      return res.status(500).json({
        message: 'Failed to verify email. Please try again later.',
        code: 'UPDATE_FAILED'
      });
    }
    
    // Redirect to frontend with success message
    return res.redirect('/login?verified=true');
  } catch (error) {
    console.error('Error verifying email:', error);
    return res.status(500).json({
      message: 'An error occurred while verifying email',
      code: 'SERVER_ERROR'
    });
  }
};