const mongoose = require('mongoose');

const transactionSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    amount: {
      type: Number,
      required: [true, 'Please provide an amount'],
      min: [0, 'Amount cannot be negative'],
    },
    merchant: {
      type: String,
      required: [true, 'Please provide a merchant name'],
    },
    category: {
      type: String,
      default: 'Uncategorized',
    },
    subcategory: {
      type: String,
      default: '',
    },
    account: {
      type: String,
      default: 'Cash',
    },
    type: {
      type: String,
      enum: ['income', 'expense'],
      default: 'expense',
    },
    date: {
      type: String,
      default: () => new Date().toISOString().split('T')[0], // YYYY-MM-DD format
    },
    notes: {
      type: String,
      default: '',
    },
    // Manual entry only - no bank import fields needed
  },
  {
    timestamps: true,
  }
);

// Index for faster lookups
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, category: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;