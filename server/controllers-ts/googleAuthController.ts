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
  (req: Request, res: Response) => {
    try {
      const user = req.user as User;
      
      if (!user) {
        return res.redirect('/auth?error=authentication_failed');
      }

      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id, 
          email: user.email,
          authMethod: user.authMethod 
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY }
      );

      // Set secure cookie
      res.cookie(TOKEN_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: JWT_EXPIRY * 1000
      });

      // Redirect to dashboard on successful login
      res.redirect('/dashboard');
      
    } catch (error) {
      console.error('Google OAuth callback error:', error);
      res.redirect('/auth?error=server_error');
    }
  }
];