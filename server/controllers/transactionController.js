const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');

// @desc    Get all transactions for a user
// @route   GET /api/transactions
// @access  Private
const getTransactions = async (req, res) => {
  try {
    // Verify user ID exists from authenticated session
    if (!req.user || !req.user._id) {
      console.error('Transaction fetch failed: No authenticated user ID available');
      return res.status(401).json({ 
        message: 'Authentication required. User ID not found in session.' 
      });
    }

    const userId = req.user._id;
    
    try {
      // Use explicit userId filter and log the query
      console.log(`Fetching transactions for user: ${userId}`);
      
      // Add sorting by date, newest first
      const transactions = await Transaction.find({ 
        userId: userId  // Explicitly use the userId from authenticated session
      }).sort({ date: -1 });
      
      // Log transaction count for debugging
      console.log(`Found ${transactions.length} transactions for user: ${userId}`);
      
      // Verify all transactions belong to the correct user
      const incorrectUserCount = transactions.filter(tx => 
        tx.userId.toString() !== userId.toString()
      ).length;
      
      if (incorrectUserCount > 0) {
        console.error(`Data integrity issue: ${incorrectUserCount} transactions with incorrect userId found`);
      }
      
      res.json(transactions);
    } catch (queryError) {
      console.error('MongoDB query error when fetching transactions:', queryError);
      res.status(500).json({ 
        message: 'Error retrieving transactions from database', 
        error: queryError.message 
      });
    }
  } catch (error) {
    console.error('Error in transaction fetch handler:', error);
    res.status(500).json({ 
      message: 'Server error processing transaction request', 
      error: error.message 
    });
  }
};

// @desc    Create a new transaction
// @route   POST /api/transactions
// @access  Private
const createTransaction = async (req, res) => {
  try {
    // Verify user ID exists from authenticated session
    if (!req.user || !req.user._id) {
      console.error('Transaction creation failed: No authenticated user ID available');
      return res.status(401).json({ 
        message: 'Authentication required. User ID not found in session.' 
      });
    }

    const userId = req.user._id;
    const { amount, merchant, category, account, type = 'expense', date, notes } = req.body;

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

    // Transaction Payload Debug - TEMPORARY
    console.log("Transaction Payload:", req.body);
    
    // Date handling fix: preserve the exact submitted date string
    // DO NOT create a new Date() object from the string as it causes timezone issues
    const submittedDate = req.body.date;
    
    // Extensive debug logging for transaction date troubleshooting
    console.log(`Transaction date debugging:
    - Original submitted date: ${submittedDate} (${typeof submittedDate})
    - Current server date: ${new Date().toISOString()}`);
    
    // Validate the date format (YYYY-MM-DD)
    const isValidDateFormat = submittedDate && /^\d{4}-\d{2}-\d{2}$/.test(submittedDate);
    if (!isValidDateFormat && submittedDate) {
      console.log(`Invalid date format received: ${submittedDate}`);
      return res.status(400).json({ 
        message: 'Please provide a valid date in YYYY-MM-DD format' 
      });
    }
    
    // Additional check: Make sure a date was provided
    if (!submittedDate) {
      console.log('Missing date in transaction data');
      return res.status(400).json({ 
        message: 'Please select a date for the transaction' 
      });
    }
    
    try {
      
      // Extract subcategory from request body
      const { subcategory } = req.body;
    
      // Create transaction with validated data - store amount as string
      const transactionData = {
        userId: userId, // Explicitly set from authenticated user
        amount: amount, // Keep as string to maintain exact decimal precision
        merchant,
        type,
        // FIXED: Store exact date string provided by user without any conversion
        date: submittedDate,
        notes: notes || '',
        category: category || 'Uncategorized',
        subcategory: subcategory || '', // Add subcategory support
        account: account || 'Cash'
      };
      
      // Extra verification to ensure date is not modified accidentally
      console.log(`Final transaction date being saved: ${transactionData.date}`);

      // Create transaction in MongoDB
      let transaction;
      try {
        transaction = await Transaction.create(transactionData);
        
        // Verify write succeeded by immediately querying the database
        const verificationResult = await Transaction.findById(transaction._id);
        if (!verificationResult) {
          console.error('Transaction write verification failed: Transaction not found after creation');
          return res.status(500).json({ message: 'Transaction creation could not be verified' });
        }
        
        console.log('Verified transaction write:', {
          id: verificationResult._id,
          userId: verificationResult.userId,
          amount: verificationResult.amount,
          merchant: verificationResult.merchant
        });
      } catch (dbError) {
        console.error('MongoDB transaction write failed:', dbError);
        return res.status(500).json({ 
          message: 'Failed to save transaction to database', 
          error: dbError.message 
        });
      }

      // If this is an expense transaction, update the budget spent amount
      if (type === 'expense' && category) {
        try {
          // Find the budget for this category
          const budget = await Budget.findOne({ userId: userId, category });
          
          // If budget exists, update spent amount
          if (budget) {
            budget.currentSpent += parseFloat(amount);
            await budget.save();
            
            // Verify budget update
            const updatedBudget = await Budget.findById(budget._id);
            if (!updatedBudget || updatedBudget.currentSpent !== budget.currentSpent) {
              console.error('Budget update verification failed');
            }
          }
        } catch (budgetError) {
          console.error('Error updating budget for transaction:', budgetError);
          // Don't fail the transaction creation if budget update fails
        }
      }
      
      // Track the account for future use if it's not already saved
      try {
        const Account = require('../models/Account');
        // Check if the account exists for this user
        const existingAccount = await Account.findOne({ 
          userId: userId, 
          name: account 
        });
        
        // If account doesn't exist, create it
        if (!existingAccount && account) {
          await Account.create({
            userId: userId,
            name: account.trim()
          });
          console.log(`Created new account: ${account} for user: ${userId}`);
        }
      } catch (accountError) {
        console.error('Error saving account:', accountError);
        // Don't fail the transaction creation if account saving fails
      }

      res.status(201).json(transaction);
    } catch (queryError) {
      console.error('Error during transaction duplicate check:', queryError);
      return res.status(500).json({ 
        message: 'Error checking for duplicate transactions', 
        error: queryError.message 
      });
    }
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ 
      message: 'Server error processing transaction creation', 
      error: error.message 
    });
  }
};

// @desc    Update a transaction
// @route   PUT /api/transactions/:id
// @access  Private
const updateTransaction = async (req, res) => {
  try {
    // Verify user ID exists from authenticated session
    if (!req.user || !req.user._id) {
      console.error('Transaction update failed: No authenticated user ID available');
      return res.status(401).json({ 
        message: 'Authentication required. User ID not found in session.' 
      });
    }

    const userId = req.user._id;
    const { amount, merchant, category, subcategory, account, type, date, notes } = req.body;

    try {
      // Find transaction by ID and ensure it belongs to the current user
      const transaction = await Transaction.findOne({
        _id: req.params.id,
        userId: userId
      });

      if (!transaction) {
        console.error(`Transaction not found or not owned by user. ID: ${req.params.id}, User: ${userId}`);
        return res.status(404).json({ message: 'Transaction not found' });
      }

      // If changing amount or category and transaction is expense, update budgets
      if (transaction.type === 'expense' && (amount !== undefined || category !== undefined)) {
        try {
          // If changing category, update both old and new budget categories
          if (category !== undefined && category !== transaction.category) {
            // Reduce amount from old category budget
            try {
              const oldBudget = await Budget.findOne({ 
                userId: userId, 
                category: transaction.category 
              });
              
              if (oldBudget) {
                oldBudget.currentSpent -= transaction.amount;
                await oldBudget.save();
                
                // Verify old budget update
                const verifiedOldBudget = await Budget.findById(oldBudget._id);
                if (!verifiedOldBudget || verifiedOldBudget.currentSpent !== oldBudget.currentSpent) {
                  console.error('Old budget update verification failed');
                }
              }
            } catch (oldBudgetError) {
              console.error('Error updating old budget category:', oldBudgetError);
              // Continue with transaction update even if budget update fails
            }
            
            // Add to new category budget
            try {
              const newBudget = await Budget.findOne({ 
                userId: userId, 
                category 
              });
              
              if (newBudget) {
                newBudget.currentSpent += amount ? parseFloat(amount) : transaction.amount;
                await newBudget.save();
                
                // Verify new budget update
                const verifiedNewBudget = await Budget.findById(newBudget._id);
                if (!verifiedNewBudget || verifiedNewBudget.currentSpent !== newBudget.currentSpent) {
                  console.error('New budget update verification failed');
                }
              }
            } catch (newBudgetError) {
              console.error('Error updating new budget category:', newBudgetError);
              // Continue with transaction update even if budget update fails
            }
          } 
          // If just changing amount but keeping category the same
          else if (amount !== undefined) {
            try {
              const budget = await Budget.findOne({ 
                userId: userId, 
                category: transaction.category 
              });
              
              if (budget) {
                // Adjust the difference in amount
                const amountDifference = parseFloat(amount) - transaction.amount;
                budget.currentSpent += amountDifference;
                await budget.save();
                
                // Verify budget update
                const verifiedBudget = await Budget.findById(budget._id);
                if (!verifiedBudget || verifiedBudget.currentSpent !== budget.currentSpent) {
                  console.error('Budget update verification failed');
                }
              }
            } catch (budgetError) {
              console.error('Error updating budget for amount change:', budgetError);
              // Continue with transaction update even if budget update fails
            }
          }
        } catch (budgetProcessError) {
          console.error('Error processing budget updates:', budgetProcessError);
          // Continue with transaction update even if budget update fails
        }
      }

      // Update transaction fields
      if (amount !== undefined) transaction.amount = parseFloat(amount);
      if (merchant !== undefined) transaction.merchant = merchant;
      if (category !== undefined) transaction.category = category;
      if (account !== undefined) transaction.account = account;
      if (type !== undefined) transaction.type = type;
      // Critical Fix: Do not create a new Date() object from the string
      // This preserves the exact date string as selected by the user without timezone conversion
      // Critical date fix: Preserve exact user-selected date without any conversion
      if (date !== undefined) {
        console.log(`Update transaction - preserving exact date: ${date}`);
        // Store the date string directly without any Date object conversion
        transaction.date = date;
        
        // Verify date wasn't changed
        if (transaction.date !== date) {
          console.error(`Date mismatch: expected ${date}, got ${transaction.date}`);
          transaction.date = date; // Force it again if needed
        }
      }
      if (notes !== undefined) transaction.notes = notes;
      // Source field removed - all transactions are now manual entry only

      try {
        // Save the updated transaction
        const updatedTransaction = await transaction.save();
        
        // Verify write succeeded by immediately querying the database
        const verificationResult = await Transaction.findById(updatedTransaction._id);
        if (!verificationResult) {
          console.error('Transaction update verification failed: Transaction not found after update');
          return res.status(500).json({ message: 'Transaction update could not be verified' });
        }
        
        // Check if updated fields match what we expect
        if (amount !== undefined && verificationResult.amount !== parseFloat(amount)) {
          console.error('Transaction amount verification failed after update');
        }
        
        console.log('Verified transaction update:', {
          id: verificationResult._id,
          userId: verificationResult.userId,
          amount: verificationResult.amount,
          merchant: verificationResult.merchant
        });
        
        res.json(updatedTransaction);
      } catch (saveError) {
        console.error('Failed to save transaction update:', saveError);
        res.status(500).json({ 
          message: 'Failed to save transaction update', 
          error: saveError.message 
        });
      }
    } catch (findError) {
      console.error('Error finding transaction:', findError);
      res.status(500).json({ 
        message: 'Error finding transaction', 
        error: findError.message 
      });
    }
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ 
      message: 'Server error processing transaction update', 
      error: error.message 
    });
  }
};

// @desc    Delete a transaction
// @route   DELETE /api/transactions/:id
// @access  Private
const deleteTransaction = async (req, res) => {
  try {
    // Verify user ID exists from authenticated session
    if (!req.user || !req.user._id) {
      console.error('Transaction deletion failed: No authenticated user ID available');
      return res.status(401).json({ 
        message: 'Authentication required. User ID not found in session.' 
      });
    }

    const userId = req.user._id;

    try {
      // Find transaction by ID and ensure it belongs to the current user
      const transaction = await Transaction.findOne({
        _id: req.params.id,
        userId: userId
      });

      if (!transaction) {
        console.error(`Transaction not found or not owned by user. ID: ${req.params.id}, User: ${userId}`);
        return res.status(404).json({ message: 'Transaction not found' });
      }

      // If expense transaction, update budget
      if (transaction.type === 'expense') {
        try {
          const budget = await Budget.findOne({ 
            userId: userId, 
            category: transaction.category 
          });
          
          if (budget) {
            budget.currentSpent -= transaction.amount;
            await budget.save();
            
            // Verify budget update
            const verifiedBudget = await Budget.findById(budget._id);
            if (!verifiedBudget || verifiedBudget.currentSpent !== budget.currentSpent) {
              console.error('Budget update verification failed during transaction deletion');
            }
          }
        } catch (budgetError) {
          console.error('Error updating budget during transaction deletion:', budgetError);
          // Continue with transaction deletion even if budget update fails
        }
      }

      try {
        // Store transaction ID for verification
        const transactionId = transaction._id;
        
        // Mongoose 6+ uses deleteOne instead of remove
        await Transaction.deleteOne({ _id: transactionId });
        
        // Verify deletion by checking the transaction no longer exists
        const verificationCheck = await Transaction.findById(transactionId);
        if (verificationCheck) {
          console.error('Transaction deletion verification failed: Transaction still exists after deletion');
          return res.status(500).json({ message: 'Transaction deletion could not be verified' });
        }
        
        console.log('Verified transaction deletion:', {
          id: transactionId,
          userId: userId,
          amount: transaction.amount,
          merchant: transaction.merchant
        });
        
        res.json({ message: 'Transaction removed' });
      } catch (deleteError) {
        console.error('Error during transaction deletion:', deleteError);
        res.status(500).json({ 
          message: 'Failed to delete transaction', 
          error: deleteError.message 
        });
      }
    } catch (findError) {
      console.error('Error finding transaction for deletion:', findError);
      res.status(500).json({ 
        message: 'Error finding transaction', 
        error: findError.message 
      });
    }
  } catch (error) {
    console.error('Error processing transaction deletion:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Mark a transaction as not a duplicate
// @route   PUT /api/transactions/:id/not-duplicate
// @access  Private
const markAsNotDuplicate = async (req, res) => {
  try {
    // Verify user ID exists from authenticated session
    if (!req.user || !req.user._id) {
      console.error('Transaction update failed: No authenticated user ID available');
      return res.status(401).json({ 
        message: 'Authentication required. User ID not found in session.' 
      });
    }

    const userId = req.user._id;

    try {
      // Find transaction by ID and ensure it belongs to the current user
      const transaction = await Transaction.findOne({
        _id: req.params.id,
        userId: userId
      });

      if (!transaction) {
        console.error(`Transaction not found or not owned by user. ID: ${req.params.id}, User: ${userId}`);
        return res.status(404).json({ message: 'Transaction not found' });
      }

      try {
        // Update transaction
        transaction.possibleDuplicate = false;
        const updatedTransaction = await transaction.save();
        
        // Verify write succeeded by immediately querying the database
        const verificationResult = await Transaction.findById(updatedTransaction._id);
        if (!verificationResult) {
          console.error('Transaction update verification failed: Transaction not found after update');
          return res.status(500).json({ message: 'Transaction update could not be verified' });
        }
        
        // Check if field was properly updated
        if (verificationResult.possibleDuplicate !== false) {
          console.error('Transaction duplicate flag verification failed after update');
          return res.status(500).json({ message: 'Transaction update failed to set duplicate flag' });
        }
        
        console.log('Verified transaction update (not duplicate):', {
          id: verificationResult._id,
          userId: verificationResult.userId,
          merchant: verificationResult.merchant,
          possibleDuplicate: verificationResult.possibleDuplicate
        });
        
        res.json(updatedTransaction);
      } catch (saveError) {
        console.error('Failed to save transaction update (not duplicate):', saveError);
        res.status(500).json({ 
          message: 'Failed to mark transaction as not a duplicate', 
          error: saveError.message 
        });
      }
    } catch (findError) {
      console.error('Error finding transaction for duplicate flag update:', findError);
      res.status(500).json({ 
        message: 'Error finding transaction', 
        error: findError.message 
      });
    }
  } catch (error) {
    console.error('Error marking transaction as not duplicate:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Get transactions summary (monthly metrics)
// @route   GET /api/transactions/summary
// @access  Private
const getTransactionSummary = async (req, res) => {
  try {
    // Verify user ID exists from authenticated session
    if (!req.user || !req.user._id) {
      console.error('Transaction summary failed: No authenticated user ID available');
      return res.status(401).json({ 
        message: 'Authentication required. User ID not found in session.' 
      });
    }

    const userId = req.user._id;
    
    try {
      console.log(`Fetching transaction summary for user: ${userId}`);
      
      // Get transactions from MongoDB for this user only
      const transactions = await Transaction.find({ 
        userId: userId  // Explicitly use the userId from authenticated session
      });
      
      // Log transaction count for debugging
      console.log(`Found ${transactions.length} transactions for summary calculation for user: ${userId}`);
      
      // Get current month and previous month
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      // Filter transactions for current month
      const currentMonthTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
      });
      
      // Filter transactions for previous month
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const prevMonthTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === prevMonth && tDate.getFullYear() === prevYear;
      });
      
      // Calculate current month totals
      const currentMonthSpending = currentMonthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
        
      const currentMonthIncome = currentMonthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
        
      const currentMonthSavings = currentMonthIncome - currentMonthSpending;
      
      // Calculate previous month totals
      const prevMonthSpending = prevMonthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
        
      const prevMonthIncome = prevMonthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
        
      const prevMonthSavings = prevMonthIncome - prevMonthSpending;
      
      // Calculate percent changes
      const calculateChange = (current, previous) => {
        if (previous === 0) return 0;
        return Number(((current - previous) / previous * 100).toFixed(1));
      };
      
      const spendingChange = calculateChange(currentMonthSpending, prevMonthSpending);
      const incomeChange = calculateChange(currentMonthIncome, prevMonthIncome);
      const savingsChange = calculateChange(currentMonthSavings, prevMonthSavings);
      
      // Create the summary object
      const summary = {
        monthlySpending: currentMonthSpending,
        monthlyIncome: currentMonthIncome,
        monthlySavings: currentMonthSavings > 0 ? currentMonthSavings : 0,
        spendingChange: spendingChange,
        incomeChange: incomeChange,
        savingsChange: savingsChange
      };
      
      console.log(`Generated transaction summary for user ${userId}:`, {
        spending: summary.monthlySpending,
        income: summary.monthlyIncome,
        savings: summary.monthlySavings,
      });
      
      res.json(summary);
    } catch (queryError) {
      console.error('MongoDB query error when generating transaction summary:', queryError);
      res.status(500).json({ 
        message: 'Error retrieving transaction data for summary', 
        error: queryError.message 
      });
    }
  } catch (error) {
    console.error('Error processing transaction summary:', error);
    res.status(500).json({ 
      message: 'Server error generating transaction summary', 
      error: error.message 
    });
  }
};

module.exports = {
  getTransactions,
  getTransactionSummary,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  markAsNotDuplicate,
};