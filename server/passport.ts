import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { storage } from './storage';
import { User } from '@shared/schema';

// Configure Google OAuth Strategy  
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  callbackURL: process.env.NODE_ENV === 'production' 
    ? 'https://tryrivu.com/auth/google/callback'
    : 'http://localhost:5000/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value || '';
    
    // Check if user already exists with this email (most important check)
    const existingUser = await storage.getUserByEmail(email);
    
    if (existingUser) {
      // User exists - update with Google info if not already linked
      if (!existingUser.googleId) {
        const updatedUser = await storage.linkGoogleAccount(existingUser.id, profile.id, profile.photos?.[0]?.value);
        console.log('Linked Google account to existing user:', email);
        return done(null, updatedUser);
      }
      // User already has Google linked
      console.log('Existing Google user logging in:', email);
      return done(null, existingUser);
    }
    
    // Check if user exists with Google ID (secondary check)
    const userByGoogleId = await storage.getUserByGoogleId(profile.id);
    if (userByGoogleId) {
      console.log('Found user by Google ID:', email);
      return done(null, userByGoogleId);
    }
    
    // Create new user with Google authentication
    const newUser = await storage.createGoogleUser({
      googleId: profile.id,
      email: email,
      firstName: profile.name?.givenName || 'User',
      lastName: profile.name?.familyName || 'Account',
      profilePic: profile.photos?.[0]?.value,
      authMethod: 'google',
      emailVerified: true
    });
    
    console.log('Created new Google user:', email, 'with username:', newUser.username);
    return done(null, newUser);
  } catch (error) {
    console.error('Google OAuth error:', error);
    return done(error, undefined);
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