import { storage } from '../storage';
import { InsertTransaction } from '@shared/schema';

/**
 * @desc    Get all transactions for the current user
 */
export const getTransactions = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id, 10);
    
    // Get transactions from PostgreSQL storage
    const transactions = await storage.getTransactions(userId);
    
    // Format transactions for client consistency
    const formattedTransactions = transactions.map(transaction => ({
      id: transaction.id,
      amount: parseFloat(String(transaction.amount)),
      merchant: transaction.merchant,
      category: transaction.category,
      account: transaction.account,
      type: transaction.type,
      date: transaction.date,
      createdAt: transaction.createdAt
    }));
    
    res.json(formattedTransactions);
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ 
      message: error.message || 'Error fetching transactions',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Get a single transaction by ID
 */
export const getTransactionById = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id, 10);
    const transactionId = parseInt(req.params.id, 10);
    
    // Get transaction from PostgreSQL storage
    const transaction = await storage.getTransaction(transactionId);
    
    // Check if transaction exists and belongs to user
    if (!transaction || transaction.userId !== userId) {
      return res.status(404).json({ 
        message: 'Transaction not found',
        code: 'TRANSACTION_NOT_FOUND'
      });
    }
    
    // Format transaction for client
    const formattedTransaction = {
      id: transaction.id,
      amount: parseFloat(String(transaction.amount)),
      merchant: transaction.merchant,
      category: transaction.category,
      account: transaction.account,
      type: transaction.type,
      date: transaction.date,
      createdAt: transaction.createdAt
    };
    
    res.json(formattedTransaction);
  } catch (error: any) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({ 
      message: error.message || 'Error fetching transaction',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Create a new transaction
 */
export const createTransaction = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id, 10);
    const { amount, merchant, category, account, type = 'expense', date, notes } = req.body;
    
    // Validate required fields
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ 
        message: 'Amount must be a positive number greater than 0',
        code: 'VALIDATION_ERROR'
      });
    }
    
    if (!merchant) {
      return res.status(400).json({ 
        message: 'Please provide a merchant description',
        code: 'VALIDATION_ERROR'
      });
    }
    
    // Handle date with better timezone awareness
    let transactionDate;
    
    if (date) {
      // Format the provided date correctly, preserving user's timezone intention
      console.log(`Processing date from client: ${date}`);
      
      // Parse the date string exactly as provided
      transactionDate = new Date(date);
      
      // Set the time to 12 noon to avoid timezone issues causing date shift
      if (!isNaN(transactionDate.getTime())) {
        // For dates like "2025-05-17", make sure they're treated as local dates
        transactionDate.setHours(12, 0, 0, 0);
        console.log(`Parsed transaction date: ${transactionDate.toISOString()}`);
      } else {
        console.error(`Invalid date format: ${date}, using current date instead`);
        transactionDate = new Date();
        transactionDate.setHours(12, 0, 0, 0);
      }
    } else {
      // Use current date if none provided
      transactionDate = new Date();
      transactionDate.setHours(12, 0, 0, 0);
    }
    
    // Prepare transaction data
    const transactionData: InsertTransaction = {
      userId,
      amount: amount.toString(),
      merchant,
      category: category || 'Uncategorized',
      account: account || 'Cash',
      type,
      date: transactionDate
    };
    
    // IMPORTANT FIX: Ensure transactions are stored with correct user ID
    // Force the userId to match the authenticated user, not ID 1
    transactionData.userId = userId;
    console.log(`Creating transaction with enforced user ID: ${userId}`);
    
    // Create transaction in PostgreSQL
    const transaction = await storage.createTransaction(transactionData);
    console.log(`Transaction created successfully with ID ${transaction.id} for user ${transaction.userId}`);
    
    // Verify the created transaction has the correct user ID
    if (transaction.userId !== userId) {
      console.error(`Transaction user ID mismatch! Expected: ${userId}, Actual: ${transaction.userId}`);
      // Fix the transaction by updating its user ID if needed
      await db
        .update(transactions)
        .set({ userId })
        .where(eq(transactions.id, transaction.id));
    }
    
    // Update user's lastTransactionDate to track activity for nudge system
    await storage.updateUser(userId, {
      lastTransactionDate: new Date()
    });
    
    // Also update user's onboarding stage if they're still in onboarding
    const user = await storage.getUser(userId);
    if (user && (user.onboardingStage === 'new' || user.onboardingStage === 'budget_created')) {
      await storage.updateOnboardingStage(userId, 'transaction_added');
    }
    
    // Recalculate Rivu score to reflect the new transaction
    await storage.calculateRivuScore(userId);
    
    // Format transaction for client response
    const formattedTransaction = {
      id: transaction.id,
      amount: parseFloat(String(transaction.amount)),
      merchant: transaction.merchant,
      category: transaction.category,
      account: transaction.account,
      type: transaction.type,
      date: transaction.date,
      createdAt: transaction.createdAt
    };
    
    res.status(201).json(formattedTransaction);
  } catch (error: any) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ 
      message: error.message || 'Error creating transaction',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Update a transaction
 */
export const updateTransaction = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id, 10);
    const transactionId = parseInt(req.params.id, 10);
    const { amount, merchant, category, account, type, date, notes } = req.body;
    
    // Get the transaction
    const transaction = await storage.getTransaction(transactionId);
    
    // Check if transaction exists and belongs to user
    if (!transaction || transaction.userId !== userId) {
      return res.status(404).json({ 
        message: 'Transaction not found',
        code: 'TRANSACTION_NOT_FOUND'
      });
    }
    
    // Prepare update data
    const updateData: Record<string, any> = {};
    
    if (amount !== undefined) {
      if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        return res.status(400).json({ 
          message: 'Amount must be a positive number greater than 0',
          code: 'VALIDATION_ERROR'
        });
      }
      updateData.amount = amount.toString();
    }
    
    if (merchant !== undefined) updateData.merchant = merchant;
    if (category !== undefined) updateData.category = category;
    if (account !== undefined) updateData.account = account;
    if (type !== undefined) updateData.type = type;
    if (date !== undefined) {
      // Ensure date is properly preserved in the format it was provided
      updateData.date = new Date(date);
      console.log(`Transaction date updated to: ${updateData.date} from input: ${date}`);
    }
    
    // Update the transaction
    const updatedTransaction = await storage.updateTransaction(transactionId, updateData);
    
    if (!updatedTransaction) {
      return res.status(500).json({
        message: 'Failed to update transaction',
        code: 'UPDATE_FAILED'
      });
    }
    
    // Update user's lastTransactionDate to track activity for nudge system
    await storage.updateUser(userId, {
      lastTransactionDate: new Date()
    });
    
    // Update Rivu score since transaction data affects financial health calculation
    await storage.calculateRivuScore(userId);
    
    // Format updated transaction for client
    const formattedTransaction = {
      id: updatedTransaction.id,
      amount: parseFloat(String(updatedTransaction.amount)),
      merchant: updatedTransaction.merchant,
      category: updatedTransaction.category,
      account: updatedTransaction.account,
      type: updatedTransaction.type,
      date: updatedTransaction.date,
      createdAt: updatedTransaction.createdAt
    };
    
    res.json(formattedTransaction);
  } catch (error: any) {
    console.error('Error updating transaction:', error);
    res.status(500).json({ 
      message: error.message || 'Error updating transaction',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Delete a transaction
 */
export const deleteTransaction = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id, 10);
    const transactionId = parseInt(req.params.id, 10);
    
    // Get the transaction
    const transaction = await storage.getTransaction(transactionId);
    
    // Check if transaction exists and belongs to user
    if (!transaction || transaction.userId !== userId) {
      return res.status(404).json({ 
        message: 'Transaction not found',
        code: 'TRANSACTION_NOT_FOUND'
      });
    }
    
    // Delete the transaction
    const result = await storage.deleteTransaction(transactionId);
    
    if (!result) {
      return res.status(500).json({
        message: 'Failed to delete transaction',
        code: 'DELETE_FAILED'
      });
    }
    
    // Update user's lastTransactionDate to track activity for nudge system
    await storage.updateUser(userId, {
      lastTransactionDate: new Date()
    });
    
    // Recalculate Rivu score as deleting a transaction affects financial health
    await storage.calculateRivuScore(userId);
    
    res.json({ message: 'Transaction deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ 
      message: error.message || 'Error deleting transaction',
      code: 'SERVER_ERROR'
    });
  }
};

// Export a default object with all functions
export default {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction
};