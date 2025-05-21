import { storage } from '../storage';
import { db } from '../db';
import { z } from 'zod';
import { insertTransactionAccountSchema, transactionAccounts } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * @desc    Get all accounts for a user
 */
export const getAccounts = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id, 10);
    
    console.log(`Fetching accounts for user: ${userId}`);
    
    // Get accounts directly from the database for reliability
    const accounts = await db
      .select()
      .from(transactionAccounts)
      .where(eq(transactionAccounts.userId, userId));
    
    console.log(`Found ${accounts.length} accounts for user ${userId}`);
    
    res.json(accounts);
  } catch (error: any) {
    console.error('Error fetching accounts:', error);
    res.status(500).json({ 
      message: error.message || 'Error fetching accounts',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Get a specific account by ID
 */
export const getAccountById = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id, 10);
    const accountId = parseInt(req.params.id, 10);
    
    // Get the account
    const [account] = await db
      .select()
      .from(transactionAccounts)
      .where(eq(transactionAccounts.id, accountId));
    
    if (!account) {
      return res.status(404).json({ 
        message: 'Account not found',
        code: 'ACCOUNT_NOT_FOUND'
      });
    }
    
    // Security check - make sure the account belongs to the user
    if (account.userId !== userId) {
      return res.status(403).json({ 
        message: 'Not authorized to access this account',
        code: 'FORBIDDEN'
      });
    }
    
    res.json(account);
  } catch (error: any) {
    console.error('Error fetching account:', error);
    res.status(500).json({ 
      message: error.message || 'Error fetching account',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Create a new account
 */
export const createAccount = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id, 10);
    
    // Verify the user ID is valid
    console.log(`Creating account for user: ${userId}`);
    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        message: 'Invalid user ID',
        code: 'VALIDATION_ERROR'
      });
    }
    
    // Validate request body
    const accountSchema = insertTransactionAccountSchema.extend({
      name: z.string().min(1, 'Account name is required'),
      type: z.string().min(1, 'Account type is required')
    });
    
    const validatedData = accountSchema.parse({
      ...req.body,
      userId
    });
    
    // Check if account with same name already exists for this user
    const existingAccounts = await db
      .select()
      .from(transactionAccounts)
      .where(eq(transactionAccounts.userId, userId));
    
    const accountExists = existingAccounts.some(
      account => account.name.toLowerCase() === validatedData.name.toLowerCase()
    );
    
    if (accountExists) {
      console.log(`Account "${validatedData.name}" already exists for user ${userId}`);
      
      // Return the existing account instead of creating a duplicate
      const existingAccount = existingAccounts.find(
        account => account.name.toLowerCase() === validatedData.name.toLowerCase()
      );
      
      return res.status(200).json({
        ...existingAccount,
        message: 'Account already exists'
      });
    }
    
    // Insert the new account
    const [newAccount] = await db
      .insert(transactionAccounts)
      .values(validatedData)
      .returning();
    
    console.log(`Created new account "${newAccount.name}" for user ${userId}`);
    
    res.status(201).json(newAccount);
  } catch (error: any) {
    console.error('Error creating account:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.errors,
        code: 'VALIDATION_ERROR'
      });
    }
    
    res.status(500).json({ 
      message: error.message || 'Error creating account',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Update an existing account
 */
export const updateAccount = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id, 10);
    const accountId = parseInt(req.params.id, 10);
    
    // Get the account to ensure it exists and belongs to the user
    const [account] = await db
      .select()
      .from(transactionAccounts)
      .where(eq(transactionAccounts.id, accountId));
    
    if (!account) {
      return res.status(404).json({ 
        message: 'Account not found',
        code: 'ACCOUNT_NOT_FOUND'
      });
    }
    
    if (account.userId !== userId) {
      return res.status(403).json({ 
        message: 'Not authorized to update this account',
        code: 'FORBIDDEN'
      });
    }
    
    // Validate update data
    const updateSchema = z.object({
      name: z.string().optional(),
      type: z.string().optional(),
      institutionName: z.string().optional(),
      lastFour: z.string().optional()
    });
    
    const validatedData = updateSchema.parse(req.body);
    
    // Update the account
    const [updatedAccount] = await db
      .update(transactionAccounts)
      .set(validatedData)
      .where(eq(transactionAccounts.id, accountId))
      .returning();
    
    res.json(updatedAccount);
  } catch (error: any) {
    console.error('Error updating account:', error);
    
    if (error.name === 'ZodError') {
      return res.status(400).json({
        message: 'Validation error',
        errors: error.errors,
        code: 'VALIDATION_ERROR'
      });
    }
    
    res.status(500).json({ 
      message: error.message || 'Error updating account',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * @desc    Delete an account
 */
export const deleteAccount = async (req: any, res: any) => {
  try {
    const userId = parseInt(req.user.id, 10);
    const accountId = parseInt(req.params.id, 10);
    
    // Get the account to ensure it exists and belongs to the user
    const [account] = await db
      .select()
      .from(transactionAccounts)
      .where(eq(transactionAccounts.id, accountId));
    
    if (!account) {
      return res.status(404).json({ 
        message: 'Account not found',
        code: 'ACCOUNT_NOT_FOUND'
      });
    }
    
    if (account.userId !== userId) {
      return res.status(403).json({ 
        message: 'Not authorized to delete this account',
        code: 'FORBIDDEN'
      });
    }
    
    // Delete the account
    await db
      .delete(transactionAccounts)
      .where(eq(transactionAccounts.id, accountId));
    
    res.status(200).json({ 
      message: 'Account deleted successfully',
      success: true
    });
  } catch (error: any) {
    console.error('Error deleting account:', error);
    res.status(500).json({ 
      message: error.message || 'Error deleting account',
      code: 'SERVER_ERROR'
    });
  }
};

export default {
  getAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount
};