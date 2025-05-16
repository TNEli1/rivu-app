const mongoose = require('mongoose');

const transactionSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
    amount: {
      type: String, // String to maintain decimal precision exactly as entered
      required: [true, 'Please provide an amount'],
      validate: {
        validator: function(v) {
          // Allow valid numeric strings with optional decimal places
          return /^\d+(\.\d{1,2})?$/.test(v) && parseFloat(v) > 0;
        },
        message: props => `${props.value} is not a valid amount. Must be a positive number.`
      }
    },
    merchant: {
      type: String,
      required: [true, 'Please provide a merchant or description'],
      trim: true
    },
    category: {
      type: String,
      required: [true, 'Please select a category'],
      trim: true
    },
    subcategory: {
      type: String,
      trim: true,
      default: ''
    },
    account: {
      type: String,
      required: [true, 'Please select or enter an account'],
      trim: true
    },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: [true, 'Transaction type is required'],
    },
    date: {
      type: String,
      required: [true, 'Please select a date'],
      validate: {
        validator: function(v) {
          // Validate ISO date format YYYY-MM-DD
          return /^\d{4}-\d{2}-\d{2}$/.test(v);
        },
        message: props => `${props.value} is not a valid date format. Use YYYY-MM-DD.`
      }
    },
    notes: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true,
  }
);

// Index for faster lookups and query performance
transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, category: 1 });
transactionSchema.index({ userId: 1, merchant: 1 });
transactionSchema.index({ userId: 1, type: 1 });
transactionSchema.index({ userId: 1, account: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;