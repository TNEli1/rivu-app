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
    
    console.log(`Email Verification: Sending verification email to ${email}`);
    console.log(`Email Verification: Using verification URL: ${verificationUrl}`);
    
    try {
      // Use the emailService for consistent email sending
      const { sendEmail } = await import('../services/emailService');
      
      const emailSent = await sendEmail({
        to: email,
        subject: 'Verify Your Email - Rivu',
        text: `Hi ${user.firstName || 'there'},\n\nPlease verify your email address by clicking the link below:\n\n${verificationUrl}\n\nIf you didn't create an account with Rivu, please ignore this email.\n\nBest regards,\nThe Rivu Team\nsupport@tryrivu.com`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .btn { background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; }
              .footer { margin-top: 30px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>Verify Your Email Address</h2>
              <p>Hi ${user.firstName || 'there'},</p>
              <p>Welcome to Rivu! Please verify your email address by clicking the button below:</p>
              <a href="${verificationUrl}" class="btn">Verify Email Address</a>
              <p>Or copy and paste this link into your browser:</p>
              <p><a href="${verificationUrl}">${verificationUrl}</a></p>
              <p>If you didn't create an account with Rivu, please ignore this email.</p>
              <div class="footer">
                <p>Best regards,<br>The Rivu Team<br>support@tryrivu.com</p>
              </div>
            </div>
          </body>
          </html>
        `
      });
      
      if (!emailSent) {
        throw new Error('Email service returned false');
      }
      
      console.log(`Email Verification: Successfully sent verification email to ${email}`);
      
      // Log success to troubleshooting
      const timestamp = new Date().toISOString();
      console.log(`TROUBLESHOOTING LOG ${timestamp}: Email verification sent successfully to ${email}`);
      
    } catch (emailError) {
      console.error('Email Verification ERROR:', emailError);
      console.error('Email Verification ERROR Stack:', emailError instanceof Error ? emailError.stack : 'No stack trace');
      
      // Log to troubleshooting
      const timestamp = new Date().toISOString();
      console.log(`TROUBLESHOOTING LOG ${timestamp}: Email verification failed for ${email} - ${emailError instanceof Error ? emailError.message : 'Unknown error'}`);
      
      throw emailError; // Re-throw to be caught by outer try-catch
    }

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

    // Send welcome email using the emailService
    try {
      const { sendEmail } = await import('../services/emailService');
      
      const dashboardUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/dashboard`;
      
      await sendEmail({
        to: user.email,
        subject: 'Welcome to Rivu - Your Financial Journey Starts Now!',
        text: `Hi ${user.firstName || 'there'},\n\nWelcome to Rivu! Your email has been verified successfully.\n\nYou can now access your dashboard at: ${dashboardUrl}\n\nWe're excited to help you on your financial journey!\n\nBest regards,\nThe Rivu Team\nsupport@tryrivu.com`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .btn { background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; margin: 20px 0; }
              .footer { margin-top: 30px; font-size: 12px; color: #666; }
              .header { text-align: center; margin-bottom: 30px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Welcome to Rivu!</h1>
              </div>
              <p>Hi ${user.firstName || 'there'},</p>
              <p>Congratulations! Your email has been verified successfully and your Rivu account is now active.</p>
              <p>You're all set to start your financial journey with Rivu's AI-powered insights and tools.</p>
              <a href="${dashboardUrl}" class="btn">Go to Dashboard</a>
              <p>What's next?</p>
              <ul>
                <li>Complete your onboarding to personalize your experience</li>
                <li>Connect your bank accounts or upload transaction data</li>
                <li>Set up your savings goals and budget</li>
                <li>Explore your Rivu Score and get AI insights</li>
              </ul>
              <p>If you have any questions, our support team is here to help at support@tryrivu.com</p>
              <div class="footer">
                <p>Best regards,<br>The Rivu Team<br>support@tryrivu.com</p>
              </div>
            </div>
          </body>
          </html>
        `
      });
      
      console.log(`Email Verification: Welcome email sent to ${user.email}`);
    } catch (emailError) {
      console.error('Welcome email error (non-critical):', emailError);
      // Don't fail the verification process if welcome email fails
    }

    // Redirect to success page
    res.redirect('/auth?verified=true');

  } catch (error) {
    console.error('Email verification error:', error);
    res.redirect('/auth?error=verification_failed');
  }
};