import { storage } from '../storage';
import { z } from 'zod';
import { insertTransactionAccountSchema } from '@shared/schema';

/**
 * @desc    Get all transaction accounts for the current user
 */
export const getTransactionAccounts = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id, 10);
    
    const accounts = await storage.getTransactionAccounts(userId);
    
    res.json(accounts);
  } catch (error: any) {
    console.error('Error fetching transaction accounts:', error);
    res.status(500).json({ 
      message: error.message || 'Error fetching transaction accounts',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Get a single transaction account by ID
 */
export const getTransactionAccountById = async (req: any, res: any) => {
  try {
    const accountId = parseInt(req.params.id, 10);
    
    const account = await storage.getTransactionAccount(accountId);
    
    if (!account) {
      return res.status(404).json({ 
        message: 'Transaction account not found',
        code: 'ACCOUNT_NOT_FOUND'
      });
    }
    
    // Security check - ensure the account belongs to the current user
    if (account.userId !== parseInt(req.user.id, 10)) {
      return res.status(403).json({ 
        message: 'Not authorized to access this account',
        code: 'FORBIDDEN'
      });
    }
    
    res.json(account);
  } catch (error: any) {
    console.error('Error fetching transaction account:', error);
    res.status(500).json({ 
      message: error.message || 'Error fetching transaction account',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Create a new transaction account
 */
export const createTransactionAccount = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id, 10);
    
    // Validate input
    const schema = insertTransactionAccountSchema.extend({
      name: z.string().min(1, 'Account name is required'),
      type: z.string().min(1, 'Account type is required')
    });
    
    const validatedData = schema.parse({
      ...req.body,
      userId
    });
    
    const newAccount = await storage.createTransactionAccount(validatedData);
    
    res.status(201).json(newAccount);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.errors,
        code: 'VALIDATION_ERROR'
      });
    }
    
    console.error('Error creating transaction account:', error);
    res.status(500).json({ 
      message: error.message || 'Error creating transaction account',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Update a transaction account
 */
export const updateTransactionAccount = async (req: any, res: any) => {
  try {
    const accountId = parseInt(req.params.id, 10);
    const userId = parseInt(req.user.id, 10);
    
    // First, check if the account exists and belongs to the user
    const account = await storage.getTransactionAccount(accountId);
    
    if (!account) {
      return res.status(404).json({ 
        message: 'Transaction account not found',
        code: 'ACCOUNT_NOT_FOUND'
      });
    }
    
    if (account.userId !== userId) {
      return res.status(403).json({ 
        message: 'Not authorized to update this account',
        code: 'FORBIDDEN'
      });
    }
    
    // Validate input
    const validatedData = z.object({
      name: z.string().optional(),
      type: z.string().optional(),
      institutionName: z.string().optional(),
      lastFour: z.string().optional()
    }).parse(req.body);
    
    const updatedAccount = await storage.updateTransactionAccount(accountId, validatedData);
    
    res.json(updatedAccount);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.errors,
        code: 'VALIDATION_ERROR'
      });
    }
    
    console.error('Error updating transaction account:', error);
    res.status(500).json({ 
      message: error.message || 'Error updating transaction account',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Delete a transaction account
 */
export const deleteTransactionAccount = async (req: any, res: any) => {
  try {
    const accountId = parseInt(req.params.id, 10);
    const userId = parseInt(req.user.id, 10);
    
    // First, check if the account exists and belongs to the user
    const account = await storage.getTransactionAccount(accountId);
    
    if (!account) {
      return res.status(404).json({ 
        message: 'Transaction account not found',
        code: 'ACCOUNT_NOT_FOUND'
      });
    }
    
    if (account.userId !== userId) {
      return res.status(403).json({ 
        message: 'Not authorized to delete this account',
        code: 'FORBIDDEN'
      });
    }
    
    await storage.deleteTransactionAccount(accountId);
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting transaction account:', error);
    res.status(500).json({ 
      message: error.message || 'Error deleting transaction account',
      code: 'SERVER_ERROR'
    });
  }
};