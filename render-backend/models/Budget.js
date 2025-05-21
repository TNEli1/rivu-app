const mongoose = require('mongoose');

const budgetSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    category: {
      type: String,
      required: [true, 'Please provide a category name'],
    },
    amount: {
      type: Number,
      required: [true, 'Please provide a budget amount'],
      min: [0, 'Budget amount cannot be negative'],
    },
    currentSpent: {
      type: Number,
      default: 0,
      min: [0, 'Spent amount cannot be negative'],
    },
    color: {
      type: String,
      default: '#00C2A8', // Default color for budget categories
    },
    icon: {
      type: String,
      default: 'ri-money-dollar-circle-line', // Default icon class
    },
    month: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Create an index on userId and category for faster lookups
budgetSchema.index({ userId: 1, category: 1 }, { unique: true });

const Budget = mongoose.model('Budget', budgetSchema);

module.exports = Budget;