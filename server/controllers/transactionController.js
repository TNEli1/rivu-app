const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');

// @desc    Get all transactions for a user
// @route   GET /api/transactions
// @access  Private
const getTransactions = async (req, res) => {
  try {
    // Add sorting by date, newest first
    const transactions = await Transaction.find({ userId: req.user._id })
      .sort({ date: -1 });
    
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create a new transaction
// @route   POST /api/transactions
// @access  Private
const createTransaction = async (req, res) => {
  try {
    const { amount, merchant, category, account, type = 'expense', date, notes, source = 'manual' } = req.body;

    // Validate required fields with specific error messages
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ 
        message: 'Amount must be a positive number greater than 0' 
      });
    }

    if (!merchant) {
      return res.status(400).json({ 
        message: 'Please provide a description for the transaction' 
      });
    }

    // Check for potential duplicates before creating transaction
    const transactionDate = date ? new Date(date) : new Date();
    
    // Set date range to check for duplicates (1 day before and after)
    const oneDayMs = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const startDate = new Date(transactionDate.getTime() - oneDayMs);
    const endDate = new Date(transactionDate.getTime() + oneDayMs);
    
    // Look for transactions with same amount and similar merchant within date range
    const similarTransactions = await Transaction.find({
      userId: req.user._id,
      amount: parseFloat(amount),
      date: { $gte: startDate, $lte: endDate },
      merchant: { $regex: new RegExp(merchant.substring(0, 5), 'i') } // Match on first 5 chars of merchant
    });
    
    // Flag as possible duplicate if similar transactions found
    const possibleDuplicate = similarTransactions.length > 0;
    
    // Create transaction with validated data
    const transactionData = {
      userId: req.user._id,
      amount: parseFloat(amount),
      merchant,
      type,
      date: transactionDate,
      notes,
      source,
      possibleDuplicate
    };

    // Add optional fields if provided
    if (category) transactionData.category = category;
    if (account) transactionData.account = account;

    const transaction = await Transaction.create(transactionData);

    // If this is an expense transaction, update the budget spent amount
    if (type === 'expense') {
      // Find the budget for this category
      const budget = await Budget.findOne({ userId: req.user._id, category });
      
      // If budget exists, update spent amount
      if (budget) {
        budget.currentSpent += amount;
        await budget.save();
      }
    }

    res.status(201).json(transaction);
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update a transaction
// @route   PUT /api/transactions/:id
// @access  Private
const updateTransaction = async (req, res) => {
  try {
    const { amount, merchant, category, account, type } = req.body;

    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Check if transaction belongs to user
    if (transaction.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // If changing amount or category and transaction is expense, update budgets
    if (transaction.type === 'expense' && (amount !== undefined || category !== undefined)) {
      // If changing category, update both old and new budget categories
      if (category !== undefined && category !== transaction.category) {
        // Reduce amount from old category budget
        const oldBudget = await Budget.findOne({ 
          userId: req.user._id, 
          category: transaction.category 
        });
        
        if (oldBudget) {
          oldBudget.currentSpent -= transaction.amount;
          await oldBudget.save();
        }
        
        // Add to new category budget
        const newBudget = await Budget.findOne({ 
          userId: req.user._id, 
          category 
        });
        
        if (newBudget) {
          newBudget.currentSpent += amount || transaction.amount;
          await newBudget.save();
        }
      } 
      // If just changing amount but keeping category the same
      else if (amount !== undefined) {
        const budget = await Budget.findOne({ 
          userId: req.user._id, 
          category: transaction.category 
        });
        
        if (budget) {
          // Adjust the difference in amount
          const amountDifference = amount - transaction.amount;
          budget.currentSpent += amountDifference;
          await budget.save();
        }
      }
    }

    // Update transaction fields
    if (amount !== undefined) transaction.amount = amount;
    if (merchant !== undefined) transaction.merchant = merchant;
    if (category !== undefined) transaction.category = category;
    if (account !== undefined) transaction.account = account;
    if (type !== undefined) transaction.type = type;

    const updatedTransaction = await transaction.save();
    res.json(updatedTransaction);
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete a transaction
// @route   DELETE /api/transactions/:id
// @access  Private
const deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Check if transaction belongs to user
    if (transaction.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // If expense transaction, update budget
    if (transaction.type === 'expense') {
      const budget = await Budget.findOne({ 
        userId: req.user._id, 
        category: transaction.category 
      });
      
      if (budget) {
        budget.currentSpent -= transaction.amount;
        await budget.save();
      }
    }

    await transaction.remove();
    res.json({ message: 'Transaction removed' });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Mark a transaction as not a duplicate
// @route   PUT /api/transactions/:id/not-duplicate
// @access  Private
const markAsNotDuplicate = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Check if transaction belongs to user
    if (transaction.userId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Update the duplicate flag
    transaction.possibleDuplicate = false;
    const updatedTransaction = await transaction.save();
    
    res.json(updatedTransaction);
  } catch (error) {
    console.error('Error marking transaction as not duplicate:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  markAsNotDuplicate,
};