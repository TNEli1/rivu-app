import { Request, Response } from 'express';
import { storage } from '../storage';
import { insertTransactionAccountSchema } from '@shared/schema';
import { z } from 'zod';

// Custom Request type that includes user property
interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    [key: string]: any;
  };
}

// Get all transaction accounts for the authenticated user
export const getTransactionAccounts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const accounts = await storage.getTransactionAccounts(req.user.id);
    return res.status(200).json(accounts);
  } catch (error) {
    console.error('Error fetching transaction accounts:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch transaction accounts'
    });
  }
};

// Get a specific transaction account by ID
export const getTransactionAccountById = async (req: Request, res: Response) => {
  try {
    const accountId = parseInt(req.params.id);
    
    if (isNaN(accountId)) {
      return res.status(400).json({ message: 'Invalid account ID' });
    }
    
    const account = await storage.getTransactionAccount(accountId);
    
    if (!account) {
      return res.status(404).json({ message: 'Transaction account not found' });
    }
    
    // Check if this account belongs to the authenticated user
    if (account.userId !== req.user?.id) {
      return res.status(403).json({ message: 'Unauthorized access to account' });
    }
    
    return res.status(200).json(account);
  } catch (error) {
    console.error('Error fetching transaction account:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch transaction account'
    });
  }
};

// Create a new transaction account for the authenticated user
export const createTransactionAccount = async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }
    
    // Validate request body
    const validationResult = insertTransactionAccountSchema.safeParse({
      ...req.body,
      userId: req.user.id
    });
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid account data',
        errors: validationResult.error.format()
      });
    }
    
    // Create the account
    const account = await storage.createTransactionAccount(validationResult.data);
    
    return res.status(201).json({
      message: 'Transaction account created successfully',
      account
    });
  } catch (error) {
    console.error('Error creating transaction account:', error);
    return res.status(500).json({ 
      message: 'Failed to create transaction account'
    });
  }
};

// Update an existing transaction account
export const updateTransactionAccount = async (req: Request, res: Response) => {
  try {
    const accountId = parseInt(req.params.id);
    
    if (isNaN(accountId)) {
      return res.status(400).json({ message: 'Invalid account ID' });
    }
    
    // Fetch the existing account to verify ownership
    const existingAccount = await storage.getTransactionAccount(accountId);
    
    if (!existingAccount) {
      return res.status(404).json({ message: 'Transaction account not found' });
    }
    
    // Check if this account belongs to the authenticated user
    if (existingAccount.userId !== req.user?.id) {
      return res.status(403).json({ message: 'Unauthorized access to account' });
    }
    
    // Update the account
    const updatedAccount = await storage.updateTransactionAccount(accountId, req.body);
    
    if (!updatedAccount) {
      return res.status(404).json({ message: 'Transaction account not found' });
    }
    
    return res.status(200).json({
      message: 'Transaction account updated successfully',
      account: updatedAccount
    });
  } catch (error) {
    console.error('Error updating transaction account:', error);
    return res.status(500).json({ 
      message: 'Failed to update transaction account'
    });
  }
};

// Delete a transaction account
export const deleteTransactionAccount = async (req: Request, res: Response) => {
  try {
    const accountId = parseInt(req.params.id);
    
    if (isNaN(accountId)) {
      return res.status(400).json({ message: 'Invalid account ID' });
    }
    
    // Fetch the existing account to verify ownership
    const existingAccount = await storage.getTransactionAccount(accountId);
    
    if (!existingAccount) {
      return res.status(404).json({ message: 'Transaction account not found' });
    }
    
    // Check if this account belongs to the authenticated user
    if (existingAccount.userId !== req.user?.id) {
      return res.status(403).json({ message: 'Unauthorized access to account' });
    }
    
    // Delete the account
    const result = await storage.deleteTransactionAccount(accountId);
    
    if (!result) {
      return res.status(404).json({ message: 'Transaction account not found' });
    }
    
    return res.status(200).json({
      message: 'Transaction account deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting transaction account:', error);
    return res.status(500).json({ 
      message: 'Failed to delete transaction account'
    });
  }
};