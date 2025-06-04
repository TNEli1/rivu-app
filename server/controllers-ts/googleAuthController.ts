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

      // CRITICAL FIX: Set secure cookie with Railway-compatible domain settings
      const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT === 'production';
      const cookieOptions = {
        httpOnly: true,
        secure: isProduction, // Use secure cookies in production
        sameSite: 'lax' as const, // CRITICAL: Use 'lax' for OAuth redirects
        maxAge: JWT_EXPIRY * 1000,
        path: '/' // Ensure cookie is available site-wide
      };

      // Only set domain for production on tryrivu.com, let Railway handle domain automatically otherwise
      if (isProduction && req.get('host')?.includes('tryrivu.com')) {
        (cookieOptions as any).domain = '.tryrivu.com';
      }

      res.cookie(TOKEN_COOKIE_NAME, token, cookieOptions);

      console.log('Google OAuth: JWT token generated and cookie set for user ID:', user.id);
      console.log('Google OAuth: Cookie settings:', {
        name: TOKEN_COOKIE_NAME,
        ...cookieOptions,
        host: req.get('host'),
        isProduction
      });

      // CRITICAL: Provide token via URL for immediate frontend authentication
      const authParam = encodeURIComponent(token);
      
      console.log('Google OAuth: Session created, redirecting to dashboard with auth token');
      
      // CRITICAL: Call req.login() to establish Passport session
      req.login(user, (loginError) => {
        if (loginError) {
          console.error('Google OAuth: Failed to establish session:', loginError);
          return res.redirect('/auth?error=session_error');
        }
        
        console.log('Google OAuth: Session established for user ID:', user.id);
        console.log('Google OAuth: User details:', {
          id: user.id,
          email: user.email,
          username: user.username,
          authMethod: user.authMethod
        });
        
        // Store user info in session for frontend access
        (req.session as any).user = {
          id: user.id,
          email: user.email,
          username: user.username,
          authMethod: user.authMethod
        };
        
        // Save session before redirect
        req.session.save((saveError) => {
          if (saveError) {
            console.error('Google OAuth: Session save error:', saveError);
          }
          
          // Redirect to dashboard with auth token and user info for immediate login
          const userParam = encodeURIComponent(JSON.stringify({
            id: user.id,
            username: user.username,
            email: user.email,
            authMethod: user.authMethod,
            firstName: user.firstName,
            lastName: user.lastName
          }));
          
          res.redirect(`/dashboard?auth=${authParam}&user=${userParam}`);
        });
      });
      
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect('/auth?error=server_error');
    }
  }
];