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
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // CRITICAL: Use 'none' for cross-site OAuth in production
        maxAge: JWT_EXPIRY * 1000,
        domain: process.env.NODE_ENV === 'production' ? '.tryrivu.com' : undefined, // Share cookies across subdomains
        path: '/' // Ensure cookie is available site-wide
      });

      console.log('Google OAuth: JWT token generated and cookie set for user ID:', user.id);
      console.log('Google OAuth: Cookie settings:', {
        name: TOKEN_COOKIE_NAME,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        domain: process.env.NODE_ENV === 'production' ? '.tryrivu.com' : undefined,
        maxAge: JWT_EXPIRY * 1000
      });

      // Also set a backup authentication method via URL parameter for cross-domain issues
      const authParam = encodeURIComponent(token);
      
      console.log('Google OAuth: Session created, redirecting to dashboard with auth token');
      
      // Set secure cookie with JWT token for immediate authentication
      res.cookie(TOKEN_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
        maxAge: JWT_EXPIRY * 1000, // Convert to milliseconds
        domain: process.env.NODE_ENV === 'production' ? '.tryrivu.com' : undefined
      });

      // CRITICAL: Establish Passport session AND set JWT cookie
      req.login(user, (loginError) => {
        if (loginError) {
          console.error('GOOGLE_OAUTH_ERROR: Failed to establish session:', {
            error: loginError,
            userId: user.id,
            email: user.email,
            sessionID: req.sessionID
          });
          return res.redirect('/auth?error=session_error');
        }
        
        console.log('GOOGLE_OAUTH_SUCCESS: Session established successfully:', {
          userId: user.id,
          email: user.email,
          isAuthenticated: req.isAuthenticated(),
          sessionID: req.sessionID,
          jwtSet: true,
          environment: process.env.NODE_ENV
        });
        
        // Save session explicitly before redirect
        req.session.save((saveError) => {
          if (saveError) {
            console.error('Session save error:', saveError);
          }
          
          // Redirect to dashboard after successful authentication
          const redirectUrl = process.env.NODE_ENV === 'production' 
            ? 'https://www.tryrivu.com/dashboard'
            : 'http://localhost:5000/dashboard';
            
          console.log('GOOGLE_OAUTH_REDIRECT: Redirecting to:', redirectUrl);
          res.redirect(redirectUrl);
        });
      });
      
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect('/auth?error=server_error');
    }
  }
];