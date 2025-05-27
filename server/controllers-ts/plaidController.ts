import { Request, Response } from 'express';
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';
import crypto from 'crypto';
import { storage } from '../storage';

// In-memory store for OAuth state validation (use Redis in production)
const oauthStateStore = new Map<string, { userId: number; timestamp: number; linkToken: string }>();

// Clean up expired states (older than 10 minutes)
setInterval(() => {
  const now = Date.now();
  const expiredStates: string[] = [];
  
  oauthStateStore.forEach((data, stateId) => {
    if (now - data.timestamp > 10 * 60 * 1000) { // 10 minutes
      expiredStates.push(stateId);
    }
  });
  
  expiredStates.forEach(stateId => {
    oauthStateStore.delete(stateId);
  });
}, 60 * 1000); // Run every minute

// Consolidated secret management
const plaidSecret = process.env.PLAID_ENV === 'production'
  ? process.env.PLAID_SECRET_PRODUCTION
  : process.env.PLAID_SECRET_SANDBOX || process.env.PLAID_SECRET;

// Initialize Plaid client once with proper configuration
const configuration = new Configuration({
  basePath: process.env.PLAID_ENV === 'production' 
    ? PlaidEnvironments.production 
    : PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': plaidSecret,
    },
  },
});

export const plaidClient = new PlaidApi(configuration);

// Create Link Token for Plaid Link initialization
export const createLinkToken = async (req: Request, res: Response) => {
  try {
    console.log('Creating Plaid link token for user:', req.user?.id);
    
    // Validate environment variables
    if (!process.env.PLAID_CLIENT_ID) {
      console.error('PLAID_CLIENT_ID is missing');
      return res.status(500).json({ error: 'Bank connection not configured - missing client ID' });
    }
    
    const plaidSecret = process.env.PLAID_SECRET_PRODUCTION;
      
    if (!plaidSecret) {
      console.error('Plaid production secret is missing');
      return res.status(500).json({ error: 'Bank connection not configured - missing secret' });
    }

    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Use webhook URL for transaction updates
    const webhook = process.env.NODE_ENV === 'production'
      ? 'https://www.tryrivu.com/api/plaid/webhook'
      : 'http://localhost:5000/api/plaid/webhook';

    console.log('PLAID_TOKEN_CREATE: Starting link token creation:', {
      userId,
      webhook,
      environment: process.env.PLAID_ENV
    });

    // OAuth redirect URI - only include when needed
    const redirectUri = process.env.NODE_ENV === 'production'
      ? 'https://www.tryrivu.com/api/plaid/oauth_redirect'
      : 'http://localhost:5000/api/plaid/oauth_redirect';

    // Check if OAuth is needed (you can add institution-specific logic here)
    const needsOAuth = req.body.institution_id && ['ins_3'] || false; // Chase example

    const request = {
      user: {
        client_user_id: userId.toString(),
      },
      client_name: 'Rivu',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
      webhook: webhook,
      // Only include redirect_uri when needed to avoid forcing OAuth mode
      ...(needsOAuth ? { redirect_uri: redirectUri } : {})
    };

    console.log('PLAID_TOKEN_REQUEST: Link token request payload:', { 
      ...request, 
      client_id: process.env.PLAID_CLIENT_ID,
      environment: process.env.PLAID_ENV,
      hasRedirectUri: false,
      hasInstitutionId: false
    });

    const response = await plaidClient.linkTokenCreate(request);
    
    // Generate secure OAuth state ID for this session
    const oauthStateId = crypto.randomBytes(32).toString('hex');
    
    // Store the OAuth state with user and link token for validation
    oauthStateStore.set(oauthStateId, {
      userId: userId,
      timestamp: Date.now(),
      linkToken: response.data.link_token
    });
    
    console.log('PLAID_TOKEN_SUCCESS: Link token created successfully:', {
      linkToken: response.data.link_token.substring(0, 20) + '...',
      oauthStateId,
      userId,
      expiration: response.data.expiration,
      requestId: response.data.request_id
    });
    
    return res.json({ 
      link_token: response.data.link_token,
      expiration: response.data.expiration,
      request_id: response.data.request_id,
      oauth_state_id: oauthStateId // Send state ID to frontend
    });

  } catch (error: any) {
    console.error('Plaid link token creation error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      environment: process.env.PLAID_ENV,
      client_id: process.env.PLAID_CLIENT_ID ? 'present' : 'missing',
      secret: (process.env.PLAID_SECRET || process.env.PLAID_SECRET_SANDBOX || process.env.PLAID_SECRET_PRODUCTION) ? 'present' : 'missing'
    });

    const errorMessage = error.response?.data?.error_message || 'Unable to initialize bank connection';
    return res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Exchange Public Token for Access Token
export const exchangePublicToken = async (req: Request, res: Response) => {
  try {
    const { public_token, metadata, oauth_state_id } = req.body;
    const userId = (req.user as any)?.id;

    if (!public_token) {
      return res.status(400).json({ error: 'Public token is required' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    console.log('Exchanging public token for user:', userId, 'institution:', metadata?.institution?.name);
    
    // CRITICAL: Validate OAuth state if provided
    if (oauth_state_id) {
      console.log('Validating OAuth state ID:', oauth_state_id);
      
      const storedState = oauthStateStore.get(oauth_state_id);
      if (!storedState) {
        console.error('Invalid or expired OAuth state ID:', oauth_state_id);
        return res.status(400).json({ error: 'Invalid or expired OAuth state' });
      }
      
      if (storedState.userId !== userId) {
        console.error('OAuth state user mismatch. Expected:', storedState.userId, 'Got:', userId);
        return res.status(400).json({ error: 'OAuth state user mismatch' });
      }
      
      console.log('OAuth state validated successfully for user:', userId);
      
      // Clean up the used state
      oauthStateStore.delete(oauth_state_id);
    }

    const response = await plaidClient.itemPublicTokenExchange({
      public_token,
    });

    const { access_token, item_id } = response.data;

    // Get institution info
    const institutionId = metadata?.institution?.institution_id;
    const institutionName = metadata?.institution?.name;

    // Store the Plaid item in database
    const { storage } = await import('../storage.ts');
    
    // Save Plaid item
    await storage.createPlaidItem({
      userId,
      itemId: item_id,
      accessToken: access_token,
      institutionId,
      institutionName,
      status: 'active'
    });

    // Get and store accounts
    const accountsResponse = await plaidClient.accountsGet({
      access_token,
    });

    const accounts = accountsResponse.data.accounts;
    console.log(`Retrieved ${accounts.length} accounts from Plaid`);

    // Store accounts in database
    for (const account of accounts) {
      await storage.createPlaidAccount({
        userId,
        plaidItemId: 0, // Will be updated with actual ID after item creation
        accountId: account.account_id,
        name: account.name,
        officialName: account.official_name || null,
        type: account.type,
        subtype: account.subtype || null,
        mask: account.mask || null,
        availableBalance: account.balances.available?.toString() || null,
        currentBalance: account.balances.current?.toString() || null,
        isoCurrencyCode: account.balances.iso_currency_code || null,
        status: 'active'
      });
    }

    console.log('Successfully connected bank account:', institutionName);

    return res.json({ 
      success: true, 
      item_id,
      accounts_count: accounts.length,
      institution_name: institutionName
    });

  } catch (error: any) {
    console.error('Public token exchange error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });

    const errorMessage = error.response?.data?.error_message || 'Failed to connect bank account';
    return res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get Connected Accounts
export const getConnectedAccounts = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { storage } = await import('../storage.ts');
    
    // Get user's Plaid items and accounts
    const plaidItems = await storage.getPlaidItemsByUserId(userId);
    const plaidAccounts = await storage.getPlaidAccountsByUserId(userId);

    return res.json({
      items: plaidItems,
      accounts: plaidAccounts
    });

  } catch (error: any) {
    console.error('Get connected accounts error:', error.message);
    return res.status(500).json({ error: 'Failed to retrieve connected accounts' });
  }
};

// Refresh Account Data
export const refreshAccountData = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { storage } = await import('../storage.ts');
    
    // Get the Plaid item
    const plaidItem = await storage.getPlaidItemById(parseInt(id));
    
    if (!plaidItem || plaidItem.userId !== userId) {
      return res.status(404).json({ error: 'Bank connection not found' });
    }

    // Refresh accounts data from Plaid
    const accountsResponse = await plaidClient.accountsGet({
      access_token: plaidItem.accessToken,
    });

    const accounts = accountsResponse.data.accounts;

    // Update accounts in database
    for (const account of accounts) {
      await storage.updatePlaidAccount(account.account_id, {
        availableBalance: account.balances.available?.toString() || null,
        currentBalance: account.balances.current?.toString() || null,
        lastUpdated: new Date()
      });
    }

    return res.json({ 
      success: true, 
      accounts_updated: accounts.length,
      message: 'Account data refreshed successfully'
    });

  } catch (error: any) {
    console.error('Refresh account data error:', error.message);
    return res.status(500).json({ error: 'Failed to refresh account data' });
  }
};

// Disconnect Account
export const disconnectAccount = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { storage } = await import('../storage.ts');
    
    // Get the Plaid item
    const plaidItem = await storage.getPlaidItemById(parseInt(id));
    
    if (!plaidItem || plaidItem.userId !== userId) {
      return res.status(404).json({ error: 'Bank connection not found' });
    }

    // Remove the item from Plaid
    await plaidClient.itemRemove({
      access_token: plaidItem.accessToken,
    });

    // Update status in database
    await storage.updatePlaidItemStatus(parseInt(id), 'disconnected');

    return res.json({ 
      success: true, 
      message: 'Bank account disconnected successfully'
    });

  } catch (error: any) {
    console.error('Disconnect account error:', error.message);
    return res.status(500).json({ error: 'Failed to disconnect bank account' });
  }
};

// ===== PRODUCTION-READY WEBHOOK SECURITY & TRANSACTION HANDLING =====

// Verify Plaid webhook signature for security
const verifyPlaidSignature = (req: Request): boolean => {
  try {
    const plaidSignature = req.headers['plaid-verification'] as string;
    const webhookSecret = process.env.PLAID_WEBHOOK_SECRET;
    
    if (!webhookSecret || !plaidSignature) {
      console.error('Missing webhook signature or secret');
      return false;
    }

    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(req.body)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(plaidSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error: any) {
    console.error('Signature verification error:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
};

// Sync transactions for a specific item with deduplication
const syncTransactionsForItem = async (itemId: string, accessToken: string) => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Last 30 days
    const endDate = new Date();

    const response = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      count: 500
    });

    const transactions = response.data.transactions;
    console.log(`Syncing ${transactions.length} transactions for item ${itemId}`);

    // Get existing transaction IDs to avoid duplicates
    const existingTransactions = await storage.getTransactionsByItemId?.(itemId) || [];
    const existingIds = new Set(existingTransactions.map((t: any) => t.plaidTransactionId));

    let savedCount = 0;
    for (const transaction of transactions) {
      // Skip if transaction already exists
      if (existingIds.has(transaction.transaction_id)) {
        continue;
      }

      // Save new transaction using storage.saveTransactions()
      await storage.saveTransactions([{
        plaidTransactionId: transaction.transaction_id,
        itemId: itemId,
        accountId: transaction.account_id,
        amount: Math.abs(transaction.amount).toString(),
        type: transaction.amount < 0 ? 'expense' : 'income',
        description: transaction.name,
        merchant: transaction.merchant_name || transaction.name,
        category: transaction.category?.[0] || 'Other',
        date: new Date(transaction.date),
        pending: transaction.pending
      }]);
      savedCount++;
    }

    console.log(`Saved ${savedCount} new transactions for item ${itemId}`);
    return savedCount;

  } catch (error: any) {
    console.error('Transaction sync error:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
};

// Enhanced webhook handler with security and proper transaction handling
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    // Verify webhook signature for security
    if (!verifyPlaidSignature(req)) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const body = JSON.parse(req.body.toString());
    const { webhook_type, webhook_code, item_id, error } = body;
    
    console.log('Plaid webhook received:', {
      webhook_type,
      webhook_code,
      item_id,
      timestamp: new Date().toISOString()
    });

    // Log webhook event for internal analytics
    await storage.logPlaidMetric?.('webhook_received', {
      type: webhook_type,
      code: webhook_code,
      item_id: item_id
    });

    // Handle different webhook types
    switch (webhook_type) {
      case 'TRANSACTIONS':
        await handleTransactionWebhook(body);
        break;
        
      case 'ITEM':
        await handleItemWebhook(body);
        break;
        
      default:
        console.log('Unhandled webhook type:', webhook_type);
    }

    res.json({ acknowledged: true });

  } catch (error: any) {
    console.error('Webhook error:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

// Handle transaction-specific webhooks
const handleTransactionWebhook = async (body: any) => {
  const { webhook_code, item_id, new_transactions, removed_transactions } = body;
  
  try {
    // Get the Plaid item and access token
    const plaidItem = await storage.getPlaidItemByItemId?.(item_id);
    if (!plaidItem) {
      console.error('Plaid item not found:', item_id);
      return;
    }

    switch (webhook_code) {
      case 'DEFAULT_UPDATE':
        console.log('Processing transaction updates for item:', item_id);
        await syncTransactionsForItem(item_id, plaidItem.accessToken);
        break;
        
      case 'INITIAL_UPDATE':
        console.log('Processing initial transaction sync for item:', item_id);
        await syncTransactionsForItem(item_id, plaidItem.accessToken);
        break;
        
      case 'HISTORICAL_UPDATE':
        console.log('Processing historical transaction update for item:', item_id);
        await syncTransactionsForItem(item_id, plaidItem.accessToken);
        break;
        
      case 'TRANSACTIONS_REMOVED':
        if (removed_transactions && removed_transactions.length > 0) {
          console.log(`Removing ${removed_transactions.length} transactions`);
          await storage.deleteTransactionsByPlaidIds?.(removed_transactions);
        }
        break;
        
      default:
        console.log('Unhandled transaction webhook code:', webhook_code);
    }
  } catch (error: any) {
    console.error('Transaction webhook error:', error.message);
    console.error('Stack:', error.stack);
  }
};

// Handle item-specific webhooks
const handleItemWebhook = async (body: any) => {
  const { webhook_code, item_id, error } = body;
  
  try {
    switch (webhook_code) {
      case 'ERROR':
        console.log('Item error for:', item_id, error);
        await storage.updatePlaidItem?.(item_id, { status: 'error' });
        break;
        
      case 'PENDING_EXPIRATION':
        console.log('Item pending expiration:', item_id);
        await storage.updatePlaidItem?.(item_id, { status: 'pending_expiration' });
        break;
        
      case 'USER_PERMISSION_REVOKED':
        console.log('User permission revoked for item:', item_id);
        await storage.updatePlaidItem?.(item_id, { status: 'revoked' });
        break;
        
      default:
        console.log('Unhandled item webhook code:', webhook_code);
    }
  } catch (error: any) {
    console.error('Item webhook error:', error.message);
    console.error('Stack:', error.stack);
  }
};