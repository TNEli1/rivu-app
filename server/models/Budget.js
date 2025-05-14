const mongoose = require('mongoose');

const BudgetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true
  },
  amount: {
    type: Number,
    required: [true, 'Budget amount is required'],
    min: [0, 'Budget amount cannot be negative']
  },
  currentSpent: {
    type: Number,
    default: 0,
    min: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Virtual for percent used
BudgetSchema.virtual('percentUsed').get(function() {
  if (this.amount === 0) return 0;
  return Math.min(100, Math.round((this.currentSpent / this.amount) * 100));
});

// Include virtuals when converting to JSON
BudgetSchema.set('toJSON', { virtuals: true });

const Budget = mongoose.model('Budget', BudgetSchema);

module.exports = Budget;