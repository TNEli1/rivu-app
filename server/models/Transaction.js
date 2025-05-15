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
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      default: '',
    },
    // Fields to support Plaid integration later
    plaidId: {
      type: String,
      default: null,
    },
    plaidCategoryId: {
      type: String,
      default: null,
    },
    source: {
      type: String,
      enum: ['manual', 'plaid'],
      default: 'manual',
    },
    possibleDuplicate: {
      type: Boolean,
      default: false,
    },
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