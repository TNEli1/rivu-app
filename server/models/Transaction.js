const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  merchant: {
    type: String,
    required: [true, 'Merchant is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true
  },
  account: {
    type: String,
    required: [true, 'Account is required'],
    trim: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  type: {
    type: String,
    enum: ['income', 'expense'],
    default: 'expense'
  },
  // Fields for future Plaid integration
  plaidTransactionId: {
    type: String,
    default: null
  },
  plaidCategoryId: {
    type: String,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Method to update budget spent amount
TransactionSchema.post('save', async function(doc) {
  // Only update budget for expense transactions
  if (doc.type !== 'expense') return;
  
  try {
    // Import Budget model here to avoid circular dependency
    const Budget = mongoose.model('Budget');
    
    // Find the budget for this category and user
    const budget = await Budget.findOne({ 
      userId: doc.userId, 
      category: doc.category 
    });
    
    if (budget) {
      // Update the spent amount
      budget.currentSpent += doc.amount;
      await budget.save();
    }
  } catch (error) {
    console.error('Error updating budget amount:', error);
  }
});

const Transaction = mongoose.model('Transaction', TransactionSchema);

module.exports = Transaction;