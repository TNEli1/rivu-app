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
    
    // Always use the provided date if available, otherwise use current date
    // Ensure the date is properly parsed and preserved exactly as provided
    const transactionDate = date ? new Date(date) : new Date();
    
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
    
    // Create transaction in PostgreSQL
    const transaction = await storage.createTransaction(transactionData);
    
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