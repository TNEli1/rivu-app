import { storage } from '../storage';
import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { InsertTransaction } from '@shared/schema';

// Set up multer for temporary file storage
const upload = multer({
  dest: path.join(process.cwd(), 'tmp'),
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    // Accept only CSV files
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// Export the middleware for route setup
export const uploadCSV = upload.single('file');

/**
 * @desc    Import transactions from CSV file
 */
export const importCSV = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'No file uploaded',
        code: 'MISSING_FILE'
      });
    }

    const userId = (req as any).user.id;
    
    // Read the CSV file
    const csvData = fs.readFileSync(req.file.path, 'utf8');
    
    // Import transactions from the CSV
    const result = await storage.importTransactionsFromCSV(userId, csvData);
    
    // Delete the temporary file
    fs.unlinkSync(req.file.path);
    
    res.json({
      message: `Successfully imported ${result.imported} transactions (${result.duplicates} potential duplicates detected)`,
      importedCount: result.imported,
      duplicatesCount: result.duplicates
    });
  } catch (error: any) {
    console.error('Error importing CSV:', error);
    
    // Clean up temporary file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({
      message: error.message || 'Error importing transactions from CSV',
      code: 'IMPORT_ERROR'
    });
  }
};

/**
 * @desc    Handle errors from multer middleware
 */
export const handleMulterError = (err: any, req: Request, res: Response, next: Function) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'File is too large. Maximum size is 2MB',
        code: 'FILE_TOO_LARGE'
      });
    }
    
    return res.status(400).json({
      message: `Upload error: ${err.message}`,
      code: 'UPLOAD_ERROR'
    });
  } else if (err) {
    // An unknown error occurred
    return res.status(500).json({
      message: err.message || 'An unknown error occurred during upload',
      code: 'UNKNOWN_ERROR'
    });
  }
  
  // If no error, continue
  next();
};

/**
 * @desc    Import transactions from mapped CSV data
 * Expected request body format:
 * {
 *   transactions: [
 *     { date: '2023-01-01', amount: '100', merchant: 'Store', category: 'Shopping', ... },
 *     ...
 *   ]
 * }
 */
export const importMappedTransactions = async (req: Request, res: Response) => {
  try {
    // Get proper user ID from authenticated session (convert string to number)
    const userId = parseInt((req as any).user.id, 10);
    console.log('Importing mapped transactions for user:', userId);
    
    if (!req.body || !req.body.transactions || !Array.isArray(req.body.transactions)) {
      return res.status(400).json({
        message: 'Invalid request format. Expected an array of transactions.',
        code: 'INVALID_FORMAT'
      });
    }
    
    const transactions = req.body.transactions;
    
    if (transactions.length === 0) {
      return res.status(400).json({
        message: 'No transactions to import',
        code: 'EMPTY_DATA'
      });
    }
    
    let importedCount = 0;
    let duplicateCount = 0;
    
    // Process each transaction from the mapped data
    for (const transaction of transactions) {
      // Validate required fields
      if (!transaction.date || !transaction.amount || !transaction.merchant) {
        continue; // Skip invalid entries
      }
      
      try {
        // Prepare transaction data
        let type = transaction.type || 'expense';
        
        // If amount is negative, it's an expense, and we need a positive number
        let amount = transaction.amount.replace(/[^0-9.-]/g, ''); // Remove currency symbols
        if (amount.startsWith('-')) {
          type = 'expense';
          amount = amount.substring(1); // Remove negative sign
        } else if (type.toLowerCase().includes('income') || 
                  type.toLowerCase().includes('deposit') ||
                  type.toLowerCase().includes('credit')) {
          type = 'income';
        }
        
        // Parse date - try to handle various formats
        let transactionDate;
        try {
          // Try to parse the date (handle both YYYY-MM-DD and MM/DD/YYYY formats)
          if (transaction.date.includes('/')) {
            // MM/DD/YYYY format
            const [month, day, year] = transaction.date.split('/');
            transactionDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          } else {
            // Assume YYYY-MM-DD format
            transactionDate = new Date(transaction.date);
          }
          
          // Check if date is valid
          if (isNaN(transactionDate.getTime())) {
            throw new Error('Invalid date');
          }
        } catch (error) {
          // Default to today if date parsing fails
          transactionDate = new Date();
        }
        
        // Create transaction object with proper type - ensure userId is correct
        // Using the authenticated user's ID, NEVER a hardcoded value
        console.log(`Preparing CSV transaction for user ID: ${userId}`);
        
        const transactionData: InsertTransaction = {
          userId, // Use the authenticated user's ID
          amount,
          date: transactionDate,
          merchant: transaction.merchant,
          category: transaction.category || 'Uncategorized',
          subcategory: transaction.subcategory || '',
          account: transaction.account || 'Imported',
          type,
          notes: transaction.notes || '',
          source: 'csv',
          isDuplicate: false
        };
        
        // Verify critical fields before submission
        if (!transactionData.userId || isNaN(Number(transactionData.userId))) {
          console.error('Invalid user ID for CSV transaction:', transactionData.userId);
          throw new Error('Invalid user ID for transaction');
        }
        
        console.log('Creating transaction:', {
          userId: transactionData.userId,
          amount: transactionData.amount,
          merchant: transactionData.merchant
        });
        
        // Check for duplicates
        const isDuplicate = await storage.checkForDuplicateTransactions(transactionData);
        if (isDuplicate) {
          duplicateCount++;
          transactionData.isDuplicate = true;
        }
        
        // CRITICAL FIX: Force CSV transactions to use authenticated user ID
        try {
          // Explicitly set userId to ensure it matches the authenticated user
          transactionData.userId = userId;
          
          // Create the transaction with the verified user ID
          const newTransaction = await storage.createTransaction(transactionData);
          console.log(`Successfully created CSV transaction ID: ${newTransaction.id} for user ${newTransaction.userId}`);
          importedCount++;
        } catch (txError) {
          console.error('Failed to create transaction in CSV import:', txError);
          throw txError; // Re-throw to be caught by outer try-catch
        }
      } catch (err) {
        console.error('Error importing mapped transaction:', err);
        // Continue with next transaction
      }
    }
    
    // Update user's lastTransactionDate to trigger nudge system
    if (importedCount > 0) {
      await storage.updateUser(userId, {
        lastTransactionDate: new Date()
      });
      
      // Recalculate Rivu score to reflect the new transactions
      await storage.calculateRivuScore(userId);
    }
    
    // Get the newly imported transactions to verify
    const allTransactions = await storage.getTransactions(userId);
    console.log(`After CSV import: User ${userId} now has ${allTransactions.length} transactions total`);
    
    // Return the result with detailed information
    res.json({
      message: `Successfully imported ${importedCount} transactions (${duplicateCount} potential duplicates detected)`,
      imported: importedCount,
      duplicates: duplicateCount,
      totalTransactions: allTransactions.length
    });
  } catch (error: any) {
    console.error('Error importing mapped transactions:', error);
    
    res.status(500).json({
      message: error.message || 'Error importing transactions',
      code: 'IMPORT_ERROR'
    });
  }
};