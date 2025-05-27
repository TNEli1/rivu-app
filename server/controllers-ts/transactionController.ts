import { storage } from '../storage';
import { InsertTransaction } from '@shared/schema';

/**
 * @desc    Get all transactions for the current user
 */
export const getTransactions = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id, 10);
    
    console.log(`Fetching transactions for user ID: ${userId}`);
    
    // Get transactions from PostgreSQL storage
    const transactions = await storage.getTransactions(userId);
    
    console.log(`Found ${transactions.length} transactions in database for user ${userId}`);
    
    // Format transactions for client consistency - include more fields to support CSV imports
    const formattedTransactions = transactions.map(transaction => ({
      id: transaction.id,
      amount: parseFloat(String(transaction.amount)),
      merchant: transaction.merchant || transaction.notes || "",
      description: transaction.notes || transaction.merchant || "",
      category: transaction.category || "Uncategorized",
      subcategory: transaction.subcategory || "",
      account: transaction.account || "Personal Account",
      type: transaction.type || "expense",
      date: transaction.date,
      createdAt: transaction.createdAt,
      source: transaction.source || "manual",
      isDuplicate: transaction.isDuplicate || false
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
    
    console.log(`User ${userId} requesting transaction ID: ${transactionId}`);
    
    // CRITICAL SECURITY FIX: Pass userId to storage layer to enforce data isolation at the query level
    // This prevents any possibility of accessing another user's data
    const transaction = await storage.getTransaction(transactionId, userId);
    
    // Enhanced security check with detailed logging
    if (!transaction) {
      console.log(`Transaction ID ${transactionId} not found for user ${userId} - access denied`);
      return res.status(404).json({ 
        message: 'Transaction not found',
        code: 'TRANSACTION_NOT_FOUND'
      });
    }
    
    // Double-check user ownership for extra security
    if (transaction.userId !== userId) {
      console.error(`SECURITY ALERT: Transaction ${transactionId} belongs to user ${transaction.userId} but accessed by ${userId}`);
      return res.status(403).json({ 
        message: 'Not authorized to access this transaction',
        code: 'UNAUTHORIZED_ACCESS'
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
    
    // CRITICAL FIX: Handle date exactly as provided to prevent timezone issues
    let transactionDate;
    
    if (date) {
      console.log(`Processing date from client: ${date}`);
      
      // For ISO format dates like "2025-05-17", parse using manual components to avoid timezone shifts
      if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Split the date string into components
        const [year, month, day] = date.split('-').map(Number);
        
        // Create the date object with explicit year, month, day (month is 0-indexed in JS)
        transactionDate = new Date(year, month - 1, day, 12, 0, 0, 0);
        console.log(`Created transaction date from ISO string: ${transactionDate.toISOString()}`);
      } else {
        // Handle other date formats or already converted dates
        const tempDate = new Date(date);
        if (!isNaN(tempDate.getTime())) {
          // Create a new date with just the year, month, day components
          transactionDate = new Date(
            tempDate.getFullYear(),
            tempDate.getMonth(),
            tempDate.getDate(),
            12, 0, 0, 0
          );
          console.log(`Standardized date: ${transactionDate.toISOString()}`);
        } else {
          console.error(`Invalid date format: ${date}, using current date instead`);
          const now = new Date();
          transactionDate = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            12, 0, 0, 0
          );
        }
      }
    } else {
      // Use current date if none provided
      const now = new Date();
      transactionDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        12, 0, 0, 0
      );
    }
    
    console.log(`Final transaction date to be stored: ${transactionDate.toISOString()}`);
    console.log(`Year: ${transactionDate.getFullYear()}, Month: ${transactionDate.getMonth() + 1}, Day: ${transactionDate.getDate()}`);
    
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

/**
 * @desc    Create multiple transactions in batch (for CSV imports)
 */
export const createTransactionsBatch = async (req: any, res: any) => {
  try {
    // CRITICAL FIX: Add detailed authentication logging
    console.log('CSV Batch Upload: Authentication check starting');
    console.log('CSV Batch Upload: req.user:', req.user);
    console.log('CSV Batch Upload: req.user.id:', req.user?.id);
    
    if (!req.user || !req.user.id) {
      console.error('CSV Batch Upload: No authenticated user found');
      return res.status(401).json({
        message: 'User not authenticated',
        code: 'AUTH_ERROR'
      });
    }
    
    const userId = parseInt(req.user.id, 10);
    
    if (isNaN(userId)) {
      console.error(`CSV Batch Upload: Invalid user ID: ${req.user.id}`);
      return res.status(401).json({
        message: 'Invalid user authentication',
        code: 'AUTH_ERROR'
      });
    }
    
    console.log(`CSV Batch Upload: CONFIRMED - Processing batch for authenticated user ID: ${userId}`);
    
    if (!req.body || !req.body.transactions || !Array.isArray(req.body.transactions)) {
      console.error('CSV Batch Upload: Invalid request format - missing transactions array');
      return res.status(400).json({
        message: 'Invalid request format. Expected an array of transactions.',
        code: 'VALIDATION_ERROR'
      });
    }
    
    const { transactions } = req.body;
    
    if (transactions.length === 0) {
      console.error('CSV Batch Upload: Empty transactions array');
      return res.status(400).json({
        message: 'No transactions to import',
        code: 'EMPTY_DATA'
      });
    }
    
    console.log(`CSV Batch Upload: Processing ${transactions.length} transactions for user ${userId}`);
    
    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;
    const errors: Array<{ index: number, message: string }> = [];
    const createdTransactions = [];
    
    console.log(`CSV Batch Upload: Starting transaction processing for user ${userId}`);
    
    // Process each transaction
    for (let i = 0; i < transactions.length; i++) {
      const txData = transactions[i];
      
      try {
        // Validate required fields
        if (!txData.amount || !txData.merchant || !txData.date) {
          console.error(`CSV Batch Upload: Transaction ${i} missing required fields`);
          errors.push({
            index: i,
            message: 'Missing required fields (amount, merchant, date)'
          });
          errorCount++;
          continue;
        }
        
        // Parse amount
        let amount: string;
        let transactionType = txData.type || 'expense';
        try {
          // Handle amount as string or number
          let parsedAmount = typeof txData.amount === 'string' 
            ? parseFloat(txData.amount.replace(/[^0-9.-]/g, ''))
            : parseFloat(txData.amount);
            
          if (isNaN(parsedAmount)) {
            console.error(`CSV Batch Upload: Invalid amount for transaction ${i}: ${txData.amount}`);
            errors.push({
              index: i,
              message: 'Invalid amount: not a valid number'
            });
            errorCount++;
            continue;
          }
          
          // Handle negative amounts - convert to positive and set type to expense
          if (parsedAmount < 0) {
            transactionType = 'expense';
            parsedAmount = Math.abs(parsedAmount);
          } else if (parsedAmount > 0 && txData.type === 'income') {
            transactionType = 'income';
          }
          
          // Ensure we have a positive amount value
          if (parsedAmount === 0) {
            console.error(`CSV Batch Upload: Zero amount for transaction ${i}: ${txData.amount}`);
            errors.push({
              index: i,
              message: 'Amount cannot be zero'
            });
            errorCount++;
            continue;
          }
          
          amount = parsedAmount.toString();
        } catch (amountError) {
          console.error(`CSV Batch Upload: Amount parsing error for transaction ${i}:`, amountError);
          errors.push({
            index: i,
            message: 'Failed to parse transaction amount'
          });
          errorCount++;
          continue;
        }
        
        // Parse date
        let transactionDate: Date;
        try {
          if (typeof txData.date === 'string') {
            // If it's a simple date string like "2023-05-17"
            if (txData.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
              const [year, month, day] = txData.date.split('-').map(Number);
              transactionDate = new Date(year, month - 1, day, 12, 0, 0, 0);
            } else {
              transactionDate = new Date(txData.date);
            }
            
            if (isNaN(transactionDate.getTime())) {
              transactionDate = new Date(); // Fallback to current date
              console.log(`CSV Batch Upload: Invalid date format at index ${i}, using current date`);
            }
          } else if (txData.date instanceof Date) {
            transactionDate = txData.date;
          } else {
            transactionDate = new Date(); // Default to today
          }
        } catch (dateError) {
          console.error(`CSV Batch Upload: Date parsing error for transaction ${i}:`, dateError);
          transactionDate = new Date(); // Default to today if parsing fails
        }
        
        console.log(`CSV Batch Upload: Processing transaction ${i} - Amount: ${amount}, Merchant: ${txData.merchant}, Date: ${transactionDate.toISOString()}`);
        
        // Create transaction data with explicit user ID and default category
        const transactionData: InsertTransaction = {
          userId: userId, // CRITICAL: Explicitly set to authenticated user
          amount,
          date: transactionDate,
          merchant: txData.merchant || 'Unknown',
          category: txData.category || 'Uncategorized', // Always provide default category
          account: txData.account || 'Imported',
          type: txData.type || 'expense',
          notes: txData.notes || '',
          source: 'csv', // Mark as CSV import
        };
        
        // CRITICAL FIX: Double-check user ID assignment
        if (transactionData.userId !== userId) {
          throw new Error(`User ID mismatch: expected ${userId}, got ${transactionData.userId}`);
        }
        
        console.log(`CSV Batch Upload: Creating transaction ${i+1}/${transactions.length} for authenticated user ${userId}:`, {
          authenticatedUserId: userId,
          transactionUserId: transactionData.userId,
          amount: transactionData.amount,
          merchant: transactionData.merchant,
          date: transactionData.date,
          source: transactionData.source
        });
        
        // Create the transaction using storage interface
        const newTransaction = await storage.createTransaction(transactionData);
        
        // CRITICAL FIX: Verify the created transaction has the correct user ID
        if (newTransaction.userId !== userId) {
          console.error(`CRITICAL ERROR: Transaction created with wrong user ID! Expected: ${userId}, Got: ${newTransaction.userId}`);
          throw new Error(`Transaction saved with incorrect user ID: expected ${userId}, got ${newTransaction.userId}`);
        }
        
        if (!newTransaction || !newTransaction.id) {
          throw new Error('Transaction creation failed - no ID returned');
        }
        
        console.log(`CSV Batch Upload: Successfully created transaction ID ${newTransaction.id} for user ${userId}`);
        
        createdTransactions.push({
          id: newTransaction.id,
          amount: parseFloat(String(newTransaction.amount)),
          merchant: newTransaction.merchant,
          category: newTransaction.category,
          date: newTransaction.date,
          account: newTransaction.account,
          type: newTransaction.type
        });
        
        successCount++;
        
      } catch (txError) {
        console.error(`CSV Batch Upload: Error processing transaction ${i}:`, txError);
        errors.push({
          index: i,
          message: txError instanceof Error ? txError.message : 'Unknown error'
        });
        errorCount++;
      }
    }
    
    // Update user's lastTransactionDate if any transactions were created
    if (successCount > 0) {
      try {
        await storage.updateUser(userId, {
          lastTransactionDate: new Date()
        });
        
        // Recalculate Rivu score to reflect the new transactions
        await storage.calculateRivuScore(userId);
        
        console.log(`CSV Batch Upload: Updated user ${userId} lastTransactionDate and Rivu score`);
      } catch (updateError) {
        console.error('CSV Batch Upload: Error updating user data:', updateError);
        // Don't fail the entire operation for this
      }
    }
    
    // Log final results to troubleshooting
    const timestamp = new Date().toISOString();
    console.log(`CSV Batch Upload SUCCESS: User ${userId} - ${successCount}/${transactions.length} transactions imported at ${timestamp}`);
    
    if (errorCount > 0) {
      console.log(`TROUBLESHOOTING LOG ${timestamp}: CSV Upload had ${errorCount} errors out of ${transactions.length} transactions`);
    }
    
    return res.status(200).json({
      message: `Successfully imported ${successCount} of ${transactions.length} transactions`,
      success: successCount,
      errors: errorCount,
      duplicates: duplicateCount,
      errorDetails: errors.length > 0 ? errors : undefined,
      transactions: createdTransactions
    });
    
  } catch (error: any) {
    console.error('CSV Batch Upload ERROR:', error);
    console.error('CSV Batch Upload ERROR Stack:', error.stack);
    
    // Log to troubleshooting
    const timestamp = new Date().toISOString();
    console.log(`TROUBLESHOOTING LOG ${timestamp}: CSV batch upload failed - ${error.message}`);
    
    return res.status(500).json({
      message: error.message || 'Failed to process batch transactions',
      code: 'SERVER_ERROR'
    });
  }
}

// Export a default object with all functions
export default {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  createTransactionsBatch
};