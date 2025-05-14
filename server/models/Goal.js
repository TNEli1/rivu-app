const mongoose = require('mongoose');

const GoalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Goal name is required'],
    trim: true
  },
  targetAmount: {
    type: Number,
    required: [true, 'Target amount is required'],
    min: [0, 'Target amount cannot be negative']
  },
  savedAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  targetDate: {
    type: Date,
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Virtual for progress percentage
GoalSchema.virtual('progress').get(function() {
  if (this.targetAmount === 0) return 0;
  return Math.min(100, Math.round((this.savedAmount / this.targetAmount) * 100));
});

// Include virtuals when converting to JSON
GoalSchema.set('toJSON', { virtuals: true });

const Goal = mongoose.model('Goal', GoalSchema);

module.exports = Goal;