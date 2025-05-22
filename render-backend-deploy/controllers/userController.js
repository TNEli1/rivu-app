const User = require('../models/User');
const { 
  generateToken, 
  setTokenCookie, 
  clearTokenCookie 
} = require('../middleware/auth');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');

// Email validation regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Rate limiter for login attempts
// In production: 5 attempts per minute
// In development: 1000 attempts per 15 minutes for easier testing
const loginLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'production' ? 60 * 1000 : 15 * 60 * 1000, // 1 minute in prod, 15 minutes in dev
  max: process.env.NODE_ENV === 'production' ? 5 : 1000, // 5 in prod, 1000 in dev
  message: {
    message: 'Too many login attempts from this IP. Try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => process.env.NODE_ENV !== 'production' && req.get('X-Skip-Rate-Limit') === 'development', // Special header to bypass in dev
});

// Password validation function
const validatePassword = (password) => {
  // At least 8 characters
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  
  return { valid: true };
};

// @desc    Register a new user
// @route   POST /api/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;

    // Check if required fields are provided
    if (!username || !email || !password) {
      return res.status(400).json({ 
        message: 'Please provide username, email, and password',
        code: 'MISSING_FIELDS'
      });
    }

    // Validate email format
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ 
        message: 'Please provide a valid email address',
        code: 'INVALID_EMAIL'
      });
    }

    // Validate password strength
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return res.status(400).json({ 
        message: passwordCheck.message,
        code: 'WEAK_PASSWORD'
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (userExists) {
      // Don't specify whether username or email exists for security
      return res.status(400).json({ 
        message: 'An account with this username or email already exists',
        code: 'USER_EXISTS'
      });
    }

    // Hash password with bcrypt (salt factor 12)
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create new user with hashed password
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      firstName: firstName || '',
      lastName: lastName || '',
      createdAt: new Date(),
      lastLogin: new Date(),
      loginCount: 1
    });

    if (user) {
      // Generate JWT token
      const token = generateToken(user._id);
      
      // Set token as HTTP-only cookie
      setTokenCookie(res, token);

      // Return user info and token
      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        token, // Include token in response for clients not using cookies
      });
    } else {
      res.status(400).json({ 
        message: 'Invalid user data', 
        code: 'INVALID_DATA'
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Server error during registration',
      code: 'SERVER_ERROR'
    });
  }
};

// @desc    Login user & get token
// @route   POST /api/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if username and password are provided
    if (!username || !password) {
      return res.status(400).json({ 
        message: 'Please provide username and password',
        code: 'MISSING_FIELDS'
      });
    }

    // Find user by username or email
    const user = await User.findOne({ 
      $or: [{ username }, { email: username }] 
    });

    // Check if user exists and password matches
    // Use the bcrypt compare function
    if (user && await bcrypt.compare(password, user.password)) {
      // Update login metrics
      user.lastLogin = new Date();
      user.loginCount = (user.loginCount || 0) + 1;
      await user.save();
      
      // Generate JWT token
      const token = generateToken(user._id);
      
      // Set token as HTTP-only cookie
      setTokenCookie(res, token);

      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        token, // Include token in response for clients not using cookies
      });
    } else {
      // Generic error message for security (don't specify if user doesn't exist or password is wrong)
      res.status(401).json({ 
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Server error during login',
      code: 'SERVER_ERROR'
    });
  }
};

// @desc    Get user profile
// @route   GET /api/user
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    // User is already attached to req by the auth middleware
    const user = await User.findById(req.user._id).select('-password');

    if (user) {
      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        loginCount: user.loginCount,
        demographics: user.demographics
      });
    } else {
      res.status(404).json({ 
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ 
      message: 'Server error while fetching profile',
      code: 'SERVER_ERROR'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/user
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ 
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Validate email if it's being updated
    if (req.body.email && !EMAIL_REGEX.test(req.body.email)) {
      return res.status(400).json({ 
        message: 'Please provide a valid email address',
        code: 'INVALID_EMAIL'
      });
    }

    // Check if updated email already exists (if email is changing)
    if (req.body.email && req.body.email !== user.email) {
      const emailExists = await User.findOne({ email: req.body.email });
      if (emailExists) {
        return res.status(400).json({ 
          message: 'Email already in use',
          code: 'EMAIL_EXISTS'
        });
      }
    }

    // Update fields that are sent
    user.username = req.body.username || user.username;
    user.email = req.body.email || user.email;
    user.firstName = req.body.firstName || user.firstName;
    user.lastName = req.body.lastName || user.lastName;
    
    // Only update password if provided
    if (req.body.password) {
      // Validate new password
      const passwordCheck = validatePassword(req.body.password);
      if (!passwordCheck.valid) {
        return res.status(400).json({ 
          message: passwordCheck.message,
          code: 'WEAK_PASSWORD'
        });
      }

      // Hash the new password
      user.password = await bcrypt.hash(req.body.password, 12);
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      createdAt: updatedUser.createdAt,
      lastLogin: updatedUser.lastLogin
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ 
      message: 'Server error while updating profile',
      code: 'SERVER_ERROR'
    });
  }
};

// @desc    Update user demographics
// @route   PUT /api/user/demographics
// @access  Private
const updateDemographics = async (req, res) => {
  try {
    const { demographics } = req.body;
    
    if (!demographics) {
      return res.status(400).json({ 
        message: 'No demographics data provided',
        code: 'MISSING_DATA'
      });
    }

    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Update demographics
    user.demographics = {
      ...user.demographics,
      ...demographics,
      updatedAt: new Date()
    };

    await user.save();

    res.json({ 
      message: 'Demographics updated successfully', 
      demographics: user.demographics
    });
  } catch (error) {
    console.error('Error updating demographics:', error);
    res.status(500).json({ 
      message: 'Server error while updating demographics',
      code: 'SERVER_ERROR'
    });
  }
};

// @desc    Update login metrics
// @route   POST /api/user/login-metric
// @access  Private
const updateLoginMetrics = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Update login metrics if not already updated in this session
    const lastLoginTime = new Date(user.lastLogin).getTime();
    const currentTime = new Date().getTime();
    
    // Only update if last login was more than 1 hour ago (prevents multiple updates in same session)
    if (!lastLoginTime || (currentTime - lastLoginTime) > 3600000) {
      user.lastLogin = new Date();
      user.loginCount = (user.loginCount || 0) + 1;
      await user.save();
    }

    res.json({ 
      message: 'Login metrics updated', 
      lastLogin: user.lastLogin, 
      loginCount: user.loginCount 
    });
  } catch (error) {
    console.error('Error updating login metrics:', error);
    res.status(500).json({ 
      message: 'Server error while updating login metrics',
      code: 'SERVER_ERROR'
    });
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/logout
// @access  Private
const logoutUser = (req, res) => {
  // Clear the token cookie
  clearTokenCookie(res);
  
  res.json({ message: 'Logged out successfully' });
};

// @desc    Generate a password reset token
// @route   POST /api/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validate email
    if (!email) {
      return res.status(400).json({
        message: 'Please provide an email address',
        code: 'INVALID_INPUT'
      });
    }
    
    // For security reasons, don't reveal if user exists or not
    const user = await User.findOne({ email });
    if (!user) {
      // Still return 200 even if user not found to prevent email enumeration
      return res.status(200).json({
        message: 'If an account with that email exists, a password reset link has been sent.',
        code: 'RESET_EMAIL_SENT'
      });
    }
    
    // Generate a reset token
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash the token for storage
    const resetTokenHashed = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    // Save the hashed token with expiration
    user.resetPasswordToken = resetTokenHashed;
    user.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
    
    await user.save();
    
    // In a real app, send email with reset link, for development return token
    // You would use Nodemailer or similar to send an actual email
    if (process.env.NODE_ENV === 'development') {
      return res.status(200).json({
        message: 'Password reset token generated (Development mode)',
        resetToken,
        resetUrl: `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`,
        code: 'RESET_TOKEN_GENERATED'
      });
    }
    
    // Production response (would actually send email in production)
    res.status(200).json({
      message: 'If an account with that email exists, a password reset link has been sent.',
      code: 'RESET_EMAIL_SENT'
    });
  } catch (error) {
    console.error('Error in forgot password:', error);
    res.status(500).json({
      message: 'Password reset failed',
      code: 'SERVER_ERROR'
    });
  }
};

// @desc    Reset password with token
// @route   POST /api/reset-password/:token
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const resetToken = req.params.token;
    const { password } = req.body;
    
    if (!resetToken || !password) {
      return res.status(400).json({
        message: 'Missing token or new password',
        code: 'INVALID_INPUT'
      });
    }
    
    // Hash the token for comparison
    const crypto = require('crypto');
    const resetTokenHashed = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    // Find user with matching token and valid expiration
    const user = await User.findOne({
      resetPasswordToken: resetTokenHashed,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired reset token',
        code: 'INVALID_RESET_TOKEN'
      });
    }
    
    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters',
        code: 'WEAK_PASSWORD'
      });
    }
    
    // Set new password and clear reset token fields
    user.password = await bcrypt.hash(password, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();
    
    // Generate a new JWT token and log the user in
    const authToken = generateToken(user._id);
    setTokenCookie(res, authToken);
    
    res.status(200).json({
      message: 'Password reset successful',
      _id: user._id,
      username: user.username,
      email: user.email,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      token: authToken,
      code: 'PASSWORD_RESET_SUCCESS'
    });
    
  } catch (error) {
    console.error('Error in reset password:', error);
    res.status(500).json({
      message: 'Password reset failed',
      code: 'SERVER_ERROR'
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  updateDemographics,
  updateLoginMetrics,
  logoutUser,
  forgotPassword,
  resetPassword,
  loginLimiter
};