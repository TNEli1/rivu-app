const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long']
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  avatarInitials: {
    type: String,
    default: function() {
      return (this.firstName.charAt(0) + this.lastName.charAt(0)).toUpperCase();
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  // Fields for future Plaid integration
  plaidAccessToken: {
    type: String,
    default: null
  },
  plaidItemId: {
    type: String,
    default: null
  }
});

// Pre-save hook to hash password
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to return user info without sensitive data
UserSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.plaidAccessToken;
  delete user.plaidItemId;
  return user;
};

const User = mongoose.model('User', UserSchema);

module.exports = User;