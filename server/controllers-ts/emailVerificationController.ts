import { Request, Response } from 'express';
import { storage } from '../storage';
import crypto from 'crypto';
import { Client } from 'postmark';

// Initialize Postmark client
const postmark = new Client(process.env.POSTMARK_API_KEY || '');

/**
 * @desc    Send email verification
 * @route   POST /api/send-verification-email
 */
export const sendVerificationEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: 'Email is required',
        code: 'EMAIL_REQUIRED'
      });
    }

    // Check if user exists
    const user = await storage.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if already verified
    if (user.emailVerified) {
      return res.status(400).json({
        message: 'Email already verified',
        code: 'ALREADY_VERIFIED'
      });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(verificationToken).digest('hex');
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Save token to database
    await storage.createEmailVerificationToken(user.id, tokenHash, expiry);

    // Send verification email via Postmark
    const verificationUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/verify-email/${verificationToken}`;
    
    await postmark.sendEmailWithTemplate({
      From: 'noreply@tryrivu.com',
      To: email,
      TemplateAlias: 'email-verification',
      TemplateModel: {
        name: user.firstName,
        verification_url: verificationUrl,
        support_email: 'support@tryrivu.com'
      }
    });

    res.status(200).json({
      message: 'Verification email sent successfully',
      code: 'EMAIL_SENT'
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      message: 'Failed to send verification email',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Verify email address
 * @route   GET /verify-email/:token
 */
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.redirect('/auth?error=invalid_token');
    }

    // Hash the token to compare with stored hash
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Verify the token and get user
    const user = await storage.verifyEmailToken(tokenHash);

    if (!user) {
      return res.redirect('/auth?error=invalid_or_expired_token');
    }

    // Mark email as verified
    await storage.markEmailAsVerified(user.id);

    // Send welcome email
    await postmark.sendEmailWithTemplate({
      From: 'welcome@tryrivu.com',
      To: user.email,
      TemplateAlias: 'welcome',
      TemplateModel: {
        name: user.firstName,
        dashboard_url: `${process.env.BASE_URL || 'http://localhost:5000'}/dashboard`,
        support_email: 'support@tryrivu.com'
      }
    });

    // Redirect to success page
    res.redirect('/auth?verified=true');

  } catch (error) {
    console.error('Email verification error:', error);
    res.redirect('/auth?error=verification_failed');
  }
};