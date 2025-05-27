import { Request, Response } from 'express';
import passport from '../passport';
import jwt from 'jsonwebtoken';
import { User } from '@shared/schema';

// JWT Secret - same as userController
const JWT_SECRET = process.env.JWT_SECRET || 
  (process.env.NODE_ENV !== 'production' ? 'rivu_jwt_secret_dev_key' : '');

const JWT_EXPIRY = 60 * 60 * 2; // 2 hours
const TOKEN_COOKIE_NAME = 'rivu_token';

/**
 * @desc    Initiate Google OAuth
 * @route   GET /auth/google
 */
export const googleAuth = passport.authenticate('google', {
  scope: ['profile', 'email']
});

/**
 * @desc    Google OAuth callback
 * @route   GET /auth/google/callback
 */
export const googleCallback = [
  passport.authenticate('google', { 
    failureRedirect: '/auth?error=google_auth_failed' 
  }),
  async (req: Request, res: Response) => {
    try {
      const user = req.user as User;
      
      if (!user) {
        console.error('Google OAuth: No user found after authentication');
        return res.redirect('/auth?error=authentication_failed');
      }

      console.log('Google OAuth callback success for user:', user.email, 'ID:', user.id);

      // Update login metrics
      const { storage } = await import('../storage');
      await storage.updateUser(user.id, {
        loginCount: (user.loginCount || 0) + 1,
        lastLogin: new Date()
      });

      // Generate JWT token - ensure all required fields are present
      const token = jwt.sign(
        { 
          id: user.id.toString(), // Convert to string to match middleware expectations
          email: user.email,
          verified: true, // Mark as verified since they used Google OAuth
          authMethod: user.authMethod || 'google'
        },
        JWT_SECRET,
        { expiresIn: `${JWT_EXPIRY}s` }
      );

      // Set secure cookie with correct name that middleware expects
      res.cookie(TOKEN_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax', // Keep as lax for production OAuth
        maxAge: JWT_EXPIRY * 1000,
        // Don't set domain in production to work with exact domain (www.tryrivu.com)
        domain: process.env.NODE_ENV === 'production' ? undefined : undefined,
        path: '/' // Ensure cookie is available site-wide
      });

      console.log('Google OAuth: JWT token generated and cookie set for user ID:', user.id);
      console.log('Google OAuth: Cookie settings:', {
        name: TOKEN_COOKIE_NAME,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: JWT_EXPIRY * 1000
      });

      // Also set a backup authentication method via URL parameter for cross-domain issues
      const authParam = encodeURIComponent(token);
      
      console.log('Google OAuth: Session created, redirecting to dashboard with auth token');
      
      // CRITICAL: Call req.login() to establish Passport session
      req.login(user, (loginError) => {
        if (loginError) {
          console.error('Google OAuth: Failed to establish session:', loginError);
          return res.redirect('/auth?error=session_error');
        }
        
        console.log('Google OAuth: Session established for user ID:', user.id);
        
        // Redirect to dashboard with auth token as backup
        res.redirect(`/dashboard?auth=${authParam}`);
      });
      
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect('/auth?error=server_error');
    }
  }
];