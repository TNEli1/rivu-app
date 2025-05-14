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

// Rate limiter for login attempts (5 per minute per IP)
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per window
  message: {
    message: 'Too many login attempts from this IP, please try again after a minute'
  },
  standardHeaders: true,
  legacyHeaders: false,
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

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  updateDemographics,
  updateLoginMetrics,
  logoutUser,
  loginLimiter
};