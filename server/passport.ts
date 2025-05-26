import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { storage } from './storage';
import { User } from '@shared/schema';

// Configure Google OAuth Strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: `${process.env.BASE_URL || 'http://localhost:5000'}/auth/google/callback`
}, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists with this Google ID
    const existingUser = await storage.getUserByGoogleId(profile.id);
    
    if (existingUser) {
      return done(null, existingUser);
    }
    
    // Check if user exists with the same email
    const userByEmail = await storage.getUserByEmail(profile.emails?.[0]?.value || '');
    
    if (userByEmail) {
      // Link Google account to existing user
      const updatedUser = await storage.linkGoogleAccount(userByEmail.id, profile.id, profile.photos?.[0]?.value);
      return done(null, updatedUser);
    }
    
    // Create new user with Google authentication
    const newUser = await storage.createGoogleUser({
      googleId: profile.id,
      email: profile.emails?.[0]?.value || '',
      firstName: profile.name?.givenName || '',
      lastName: profile.name?.familyName || '',
      profilePic: profile.photos?.[0]?.value,
      authMethod: 'google',
      emailVerified: true
    });
    
    return done(null, newUser);
  } catch (error) {
    console.error('Google OAuth error:', error);
    return done(error, null);
  }
}));

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await storage.getUserById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;