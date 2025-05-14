const mongoose = require('mongoose');

const goalSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    name: {
      type: String,
      required: [true, 'Please provide a goal name'],
    },
    targetAmount: {
      type: Number,
      required: [true, 'Please provide a target amount'],
      min: [0, 'Target amount cannot be negative'],
    },
    savedAmount: {
      type: Number,
      default: 0,
      min: [0, 'Saved amount cannot be negative'],
    },
    targetDate: {
      type: Date,
      default: null,
    },
    category: {
      type: String,
      default: 'Savings',
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    color: {
      type: String,
      default: '#2F80ED', // Default color
    },
    icon: {
      type: String,
      default: 'ri-wallet-3-line', // Default icon class
    },
  },
  {
    timestamps: true,
  }
);

goalSchema.index({ userId: 1 });

const Goal = mongoose.model('Goal', goalSchema);

module.exports = Goal;