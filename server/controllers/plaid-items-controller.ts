import { Request, Response } from 'express';
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { storage } from '../storage';
import securityLogger, { SecurityEventType } from '../services/securityLogger';

// Initialize Plaid client with production credentials
// Always use production environment for Plaid
const plaidEnvironment = 'production';
const plaidBasePath = PlaidEnvironments[plaidEnvironment];

// Use PLAID_SECRET_PRODUCTION directly
const plaidSecret = process.env.PLAID_SECRET_PRODUCTION;

const plaidConfig = new Configuration({
  basePath: plaidBasePath,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': plaidSecret,
    },
  },
});

const plaidClient = new PlaidApi(plaidConfig);

// Get all Plaid items for a user with their associated accounts
export const getPlaidItems = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ 
        error: 'User not authenticated',
        code: 'UNAUTHORIZED'
      });
    }
    
    // Get all Plaid items for this user
    const plaidItems = await storage.getPlaidItems(userId);
    
    // For each item, get its accounts
    const itemsWithAccounts = await Promise.all(
      plaidItems.map(async (item) => {
        const accounts = await storage.getPlaidAccountsByItemId(item.id);
        return {
          ...item,
          accounts
        };
      })
    );
    
    return res.status(200).json(itemsWithAccounts);
  } catch (error: any) {
    console.error('Error getting Plaid items:', error);
    return res.status(500).json({
      error: error.message || 'Failed to get Plaid items',
      code: 'SERVER_ERROR'
    });
  }
};

// Get a specific Plaid item by ID
export const getPlaidItemById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ 
        error: 'User not authenticated',
        code: 'UNAUTHORIZED'
      });
    }
    
    const itemId = parseInt(req.params.id, 10);
    if (isNaN(itemId)) {
      return res.status(400).json({ 
        error: 'Invalid item ID',
        code: 'INVALID_PARAM'
      });
    }
    
    // Get the Plaid item
    const plaidItem = await storage.getPlaidItemById(itemId);
    
    if (!plaidItem) {
      return res.status(404).json({ 
        error: 'Plaid item not found',
        code: 'NOT_FOUND'
      });
    }
    
    // Check that this item belongs to the authenticated user
    if (plaidItem.userId !== userId) {
      return res.status(403).json({ 
        error: 'You do not have permission to access this item',
        code: 'FORBIDDEN'
      });
    }
    
    // Get accounts for this item
    const accounts = await storage.getPlaidAccountsByItemId(itemId);
    
    return res.status(200).json({
      ...plaidItem,
      accounts
    });
  } catch (error: any) {
    console.error('Error getting Plaid item:', error);
    return res.status(500).json({
      error: error.message || 'Failed to get Plaid item',
      code: 'SERVER_ERROR'
    });
  }
};

// Refresh data for a Plaid item
export const refreshPlaidItem = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ 
        error: 'User not authenticated',
        code: 'UNAUTHORIZED'
      });
    }
    
    const itemId = parseInt(req.params.id, 10);
    if (isNaN(itemId)) {
      return res.status(400).json({ 
        error: 'Invalid item ID',
        code: 'INVALID_PARAM'
      });
    }
    
    // Get the Plaid item
    const plaidItem = await storage.getPlaidItemById(itemId);
    
    if (!plaidItem) {
      return res.status(404).json({ 
        error: 'Plaid item not found',
        code: 'NOT_FOUND'
      });
    }
    
    // Check that this item belongs to the authenticated user
    if (plaidItem.userId !== userId) {
      return res.status(403).json({ 
        error: 'You do not have permission to refresh this item',
        code: 'FORBIDDEN'
      });
    }
    
    // Fetch updated account information from Plaid
    const accountsResponse = await plaidClient.accountsGet({
      access_token: plaidItem.accessToken
    });
    
    const accounts = accountsResponse.data.accounts;
    
    // Update accounts in our database
    await Promise.all(
      accounts.map(async (account) => {
        const existingAccount = await storage.getPlaidAccountByAccountId(account.account_id);
        
        if (existingAccount) {
          await storage.updatePlaidAccount(existingAccount.id, {
            name: account.name,
            officialName: account.official_name || null,
            availableBalance: account.balances.available !== null ? String(account.balances.available) : null,
            currentBalance: account.balances.current !== null ? String(account.balances.current) : null,
            lastUpdated: new Date()
          });
        }
      })
    );
    
    // Update the lastUpdated timestamp for the item
    await storage.updatePlaidItem(itemId, {
      lastUpdated: new Date()
    });
    
    // Get updated accounts to return
    const updatedAccounts = await storage.getPlaidAccountsByItemId(itemId);
    
    return res.status(200).json({
      success: true,
      message: 'Accounts refreshed successfully',
      accounts: updatedAccounts
    });
  } catch (error: any) {
    console.error('Error refreshing Plaid item:', error);
    return res.status(500).json({
      error: error.message || 'Failed to refresh Plaid item',
      code: 'SERVER_ERROR'
    });
  }
};

// Disconnect a Plaid item - critical for 1033 compliance
export const disconnectPlaidItem = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ 
        error: 'User not authenticated',
        code: 'UNAUTHORIZED'
      });
    }
    
    const itemId = parseInt(req.params.id, 10);
    if (isNaN(itemId)) {
      return res.status(400).json({ 
        error: 'Invalid item ID',
        code: 'INVALID_PARAM'
      });
    }
    
    // Get the Plaid item
    const plaidItem = await storage.getPlaidItemById(itemId);
    
    if (!plaidItem) {
      return res.status(404).json({ 
        error: 'Plaid item not found',
        code: 'NOT_FOUND'
      });
    }
    
    // Check that this item belongs to the authenticated user
    if (plaidItem.userId !== userId) {
      return res.status(403).json({ 
        error: 'You do not have permission to disconnect this item',
        code: 'FORBIDDEN'
      });
    }
    
    // 1. Remove item from Plaid (per 1033 compliance requirements)
    try {
      await plaidClient.itemRemove({
        access_token: plaidItem.accessToken
      });
      console.log(`Successfully removed item ${plaidItem.itemId} from Plaid`);
    } catch (plaidError: any) {
      // Log but continue - we still want to mark it as disconnected in our database
      console.error('Error removing item from Plaid:', plaidError);
    }
    
    // 2. Mark the item as disconnected in our database
    const disconnected = await storage.disconnectPlaidItem(itemId);
    
    if (!disconnected) {
      return res.status(500).json({
        error: 'Failed to disconnect Plaid item in database',
        code: 'DB_ERROR'
      });
    }
    
    // 3. Log the disconnection for compliance auditing and security monitoring
    console.log(`User ${userId} disconnected Plaid item ${itemId} (${plaidItem.institutionName}) at ${new Date().toISOString()}`);
    
    // Add enhanced security logging for bank account disconnection
    securityLogger.logSecurityEvent({
      type: SecurityEventType.BANK_DISCONNECT,
      userId: userId,
      details: {
        username: req.user?.username,
        institutionName: plaidItem.institutionName,
        itemId: plaidItem.itemId,
        timestamp: new Date().toISOString(),
        ip: req.ip
      }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Bank account successfully unlinked',
      itemId,
      institutionName: plaidItem.institutionName
    });
  } catch (error: any) {
    console.error('Error disconnecting Plaid item:', error);
    return res.status(500).json({
      error: error.message || 'Failed to disconnect Plaid item',
      code: 'SERVER_ERROR'
    });
  }
};