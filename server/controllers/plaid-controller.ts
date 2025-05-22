import { Request, Response } from 'express';
import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode, LinkTokenCreateRequest, InstitutionsGetByIdRequest } from 'plaid';
import { storage } from '../storage';

// Extend Express Request to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        [key: string]: any;
      };
    }
  }
}

// Initialize Plaid client with production credentials
console.log(`Using Plaid environment: ${process.env.PLAID_ENV}`);

// Always use production environment for Plaid
const plaidEnvironment = 'production';
const plaidBasePath = PlaidEnvironments[plaidEnvironment];

// Print environment variables for debugging (not sensitive values)
console.log('PLAID_ENV:', plaidEnvironment);
console.log('CLIENT_ID available:', !!process.env.PLAID_CLIENT_ID);
console.log('SECRET available:', !!process.env.PLAID_SECRET_PRODUCTION);
console.log('Plaid base path:', plaidBasePath);

// Use PLAID_SECRET_PRODUCTION directly 
const plaidSecret = process.env.PLAID_SECRET_PRODUCTION;

console.log('Using production Plaid secret');

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

// Create a link token to initialize Plaid Link
export const createLinkToken = async (req: Request, res: Response) => {
  try {
    console.log('Creating Plaid link token, request received');
    
    // Get user ID from authenticated request
    const userId = req.user?.id;

    if (!userId) {
      console.error('Authentication failure: No user ID in request');
      return res.status(401).json({ error: 'User not authenticated' });
    }

    console.log(`Authenticated user ID: ${userId}`);

    // Check if Plaid credentials are available
    if (!process.env.PLAID_CLIENT_ID || !process.env.PLAID_SECRET_PRODUCTION) {
      console.error('Missing Plaid credentials');
      return res.status(500).json({ error: 'Bank connection service not properly configured' });
    }

    // Define redirect URI for OAuth flow from environment variable
    // In production, this must be the registered URI in the Plaid dashboard
    // It must be HTTPS and match exactly what's registered in Plaid
    if (!process.env.PLAID_REDIRECT_URI && process.env.NODE_ENV === 'production') {
      console.error('PLAID_REDIRECT_URI is required in production environment');
      return res.status(500).json({ 
        error: 'Bank connection service not properly configured',
        details: 'Missing redirect URI configuration'
      });
    }
    
    // SECURITY: Use the configured redirect URI from .env ONLY - no client-provided values
    // In production environment, this MUST be set to prevent OAuth redirect attacks
    const redirectUri = process.env.PLAID_REDIRECT_URI || 
      (process.env.NODE_ENV === 'production' 
        ? 'https://tryrivu.com/callback' // Production default as specified in security audit
        : 'http://localhost:8080/callback'); // Development default
        
    // Log where redirect URI is sourced from for audit trail
    console.log(`[SECURITY] Plaid redirect URI sourced from: ${process.env.PLAID_REDIRECT_URI ? '.env file' : 'default value'}`);
    
    console.log(`Using OAuth redirect URI: ${redirectUri}`);

    // Configure the Plaid Link creation with proper account filters for production
    // Start with base config (with OAuth for production)
    const configs: LinkTokenCreateRequest = {
      user: {
        client_user_id: userId.toString(), // Unique user ID from our system
      },
      client_name: 'Rivu', // Must match exactly what's registered in Plaid dashboard
      products: ['transactions', 'balance', 'identity'] as Products[], // Request all required products
      language: 'en',
      country_codes: ['US'] as CountryCode[],
      redirect_uri: redirectUri, // Always include redirect_uri for production OAuth flow
    };
    
    // Log full configuration 
    console.log(`Using Plaid Link config with redirect: ${redirectUri}`);
    
    console.log('Creating link token with config:', JSON.stringify({
      client_user_id: userId.toString(),
      client_name: 'Rivu',
      products: ['transactions', 'balance', 'identity'],
      language: 'en',
      country_codes: ['US'],
      ...(process.env.PLAID_REDIRECT_REGISTERED === 'true' ? { redirect_uri: redirectUri } : {})
    }));

    // Create the link token with Plaid API
    console.log('Calling Plaid API to create link token...');
    const createTokenResponse = await plaidClient.linkTokenCreate(configs);
    const linkToken = createTokenResponse.data.link_token;

    // Log the creation for diagnostics
    console.log(`Link token created for user ${userId}: ${linkToken.slice(0, 10)}...`);

    // Return the token to the client
    return res.status(200).json({
      link_token: linkToken,
    });
  } catch (error: any) {
    console.error('Error creating link token:', error);
    return res.status(500).json({
      error: error.message || 'Failed to create link token',
      requestId: error.response?.data?.request_id,
    });
  }
};

// Exchange a public token for an access token
export const exchangeToken = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { public_token, metadata } = req.body;

    if (!public_token) {
      return res.status(400).json({ error: 'Public token is required' });
    }

    // Exchange the public token for an access token
    const tokenResponse = await plaidClient.itemPublicTokenExchange({
      public_token,
    });

    const accessToken = tokenResponse.data.access_token;
    const itemId = tokenResponse.data.item_id;
    const requestId = tokenResponse.data.request_id;

    // Get institution details if available in metadata
    let institutionId = '';
    let institutionName = '';

    if (metadata && metadata.institution) {
      institutionId = metadata.institution.institution_id;
      institutionName = metadata.institution.name;

      // Check for duplicate institution connections
      const hasExistingInstitution = await storage.hasLinkedPlaidItemForInstitution(userId, institutionId);
      if (hasExistingInstitution) {
        return res.status(409).json({
          error: 'This institution is already connected to your account',
          institutionName,
        });
      }
    }

    // Store the access token and item information
    const plaidItem = await storage.createPlaidItem({
      userId,
      itemId,
      accessToken,
      institutionId,
      institutionName,
      status: 'active',
    });

    // Fetch accounts and store them (if needed)
    if (plaidItem) {
      console.log(`Plaid item created successfully: ${plaidItem.id}`);
    }

    // Log critical fields for diagnostics
    console.log(`Token exchanged - Item ID: ${itemId}, Request ID: ${requestId}`);

    return res.status(200).json({
      success: true,
      item_id: itemId,
      request_id: requestId,
      institution_id: institutionId,
      institution_name: institutionName,
    });
  } catch (error: any) {
    console.error('Error exchanging token:', error);
    return res.status(500).json({
      error: error.message || 'Failed to exchange token',
      requestId: error.response?.data?.request_id,
    });
  }
};

// Get accounts for a user's Plaid Item
export const getAccounts = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { access_token } = req.body;
    if (!access_token) {
      return res.status(400).json({ error: 'Access token is required' });
    }

    // Get the Plaid item by access token
    // For security, we would typically identify the item by ID rather than 
    // accepting an access token directly from the client
    // This is just for demonstration purposes
    const itemResponse = await plaidClient.itemGet({ access_token });
    const itemId = itemResponse.data.item.item_id;
    
    // Get the accounts
    const accountsResponse = await plaidClient.accountsGet({ access_token });
    const accounts = accountsResponse.data.accounts;
    const requestId = accountsResponse.data.request_id;

    // Get the existing Plaid item from our database
    const plaidItem = await storage.getPlaidItemByItemId(itemId);
    
    if (!plaidItem) {
      return res.status(404).json({ 
        error: 'Plaid item not found',
        request_id: requestId
      });
    }

    // Save accounts to database
    const savedAccounts = await Promise.all(
      accounts.map(async (account) => {
        // Check if account already exists
        const existingAccount = await storage.getPlaidAccountByAccountId(account.account_id);
        
        if (existingAccount) {
          // Update existing account
          return await storage.updatePlaidAccount(existingAccount.id, {
            name: account.name,
            officialName: account.official_name || null,
            type: account.type,
            subtype: account.subtype || null,
            availableBalance: account.balances.available !== null && account.balances.available !== undefined 
              ? String(account.balances.available) 
              : null,
            currentBalance: account.balances.current !== null && account.balances.current !== undefined 
              ? String(account.balances.current) 
              : null,
            mask: account.mask || null,
            isoCurrencyCode: account.balances.iso_currency_code || null,
            lastUpdated: new Date(), // Update lastUpdated timestamp
          });
        } else {
          // Create new account
          return await storage.createPlaidAccount({
            userId,
            plaidItemId: plaidItem.id,
            accountId: account.account_id,
            name: account.name,
            officialName: account.official_name || null,
            type: account.type,
            subtype: account.subtype || null,
            availableBalance: account.balances.available !== null && account.balances.available !== undefined 
              ? String(account.balances.available) 
              : null,
            currentBalance: account.balances.current !== null && account.balances.current !== undefined 
              ? String(account.balances.current) 
              : null,
            mask: account.mask || null,
            isoCurrencyCode: account.balances.iso_currency_code || null,
            status: 'active',
          });
        }
      })
    );

    // Also create corresponding transaction accounts (for UI display)
    await Promise.all(
      savedAccounts.map(async (account) => {
        if (!account) return; // Skip if account is undefined
        
        // First check if a transaction account already exists for this Plaid account
        const existingAccounts = await storage.getTransactionAccounts(userId);
        const existingAccount = existingAccounts.find(a => 
          a.name === account.name && 
          a.institutionName === plaidItem.institutionName
        );
        
        if (!existingAccount && account.name) {
          await storage.createTransactionAccount({
            userId,
            name: account.name,
            type: account.type === 'depository' ? 'bank' : account.type === 'credit' ? 'credit' : 'other',
            institutionName: plaidItem.institutionName || undefined,
            lastFour: account.mask || undefined,
          });
        }
      })
    );

    // Update the last_synced_at timestamp for the Plaid item
    await storage.updatePlaidItem(plaidItem.id, {
      lastUpdated: new Date()
    });

    console.log(`Retrieved ${accounts.length} accounts for item ${itemId}, request ID: ${requestId}`);

    return res.status(200).json({
      accounts: accounts.map(account => ({
        id: account.account_id,
        name: account.name,
        official_name: account.official_name,
        type: account.type,
        subtype: account.subtype,
        mask: account.mask,
        balances: account.balances
      })),
      request_id: requestId,
      institution_name: plaidItem.institutionName,
      last_synced_at: new Date(),
    });
  } catch (error: any) {
    console.error('Error getting accounts:', error);
    return res.status(500).json({
      error: error.message || 'Failed to get accounts',
      requestId: error.response?.data?.request_id,
    });
  }
};

// Fetch user identity data from Plaid
export const fetchIdentity = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { itemId } = req.params;
    if (!itemId) {
      return res.status(400).json({ error: 'Item ID is required' });
    }

    // Get the Plaid item from database
    const plaidItem = await storage.getPlaidItemById(Number(itemId));
    if (!plaidItem) {
      return res.status(404).json({ error: 'Plaid item not found' });
    }

    // Security check: Make sure the plaid item belongs to this user
    if (plaidItem.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to access this Plaid item' });
    }

    try {
      // Fetch identity data from Plaid
      const identityResponse = await plaidClient.identityGet({ 
        access_token: plaidItem.accessToken 
      });
      
      const identityData = identityResponse.data.accounts;
      
      // Process and store the identity data
      const names: string[] = [];
      const emails: string[] = [];
      const phoneNumbers: string[] = [];
      const addresses: any[] = [];
      
      // Extract identity information from all accounts
      identityData.forEach(account => {
        if (account.owners && account.owners.length > 0) {
          account.owners.forEach(owner => {
            if (owner.names) names.push(...owner.names);
            if (owner.emails) emails.push(...owner.emails.map(e => e.data));
            if (owner.phone_numbers) phoneNumbers.push(...owner.phone_numbers.map(p => p.data));
            if (owner.addresses) addresses.push(...owner.addresses);
          });
        }
      });
      
      // Check if we already have identity data for this item
      const existingIdentities = await storage.getPlaidUserIdentities(userId);
      const existingIdentity = existingIdentities.find(id => id.plaidItemId === plaidItem.id);
      
      let savedIdentity;
      
      if (existingIdentity) {
        // Update existing identity
        savedIdentity = await storage.updatePlaidUserIdentity(existingIdentity.id, {
          names: JSON.stringify(names as string[]),
          emails: JSON.stringify(emails as string[]),
          phoneNumbers: JSON.stringify(phoneNumbers as string[]),
          addresses: JSON.stringify(addresses),
          rawData: JSON.stringify(identityResponse.data),
          lastUpdated: new Date()
        });
      } else {
        // Create new identity record
        savedIdentity = await storage.createPlaidUserIdentity({
          userId,
          plaidItemId: plaidItem.id,
          names: JSON.stringify(names as string[]),
          emails: JSON.stringify(emails as string[]),
          phoneNumbers: JSON.stringify(phoneNumbers as string[]),
          addresses: JSON.stringify(addresses),
          rawData: JSON.stringify(identityResponse.data)
        });
      }
      
      // Update the last_synced_at timestamp for the Plaid item
      await storage.updatePlaidItem(plaidItem.id, {
        lastUpdated: new Date()
      });
      
      return res.status(200).json({
        identity: {
          names,
          emails,
          phoneNumbers,
          addresses
        },
        last_synced_at: new Date()
      });
    } catch (error: any) {
      console.error('Error fetching identity from Plaid:', error);
      
      // Check if this is a PRODUCT_NOT_READY error
      if (error.response?.data?.error_code === 'PRODUCT_NOT_READY') {
        return res.status(202).json({
          error: 'Identity data is still being processed by Plaid',
          message: 'Please try again later, Plaid is still preparing the identity data',
          requestId: error.response?.data?.request_id
        });
      }
      
      // Return the most accurate error message
      return res.status(500).json({
        error: error.response?.data?.error_message || error.message || 'Failed to fetch identity data',
        requestId: error.response?.data?.request_id
      });
    }
  } catch (error: any) {
    console.error('Error in fetchIdentity:', error);
    return res.status(500).json({
      error: error.message || 'Failed to process identity request'
    });
  }
};

// Fetch transactions from Plaid
export const fetchTransactions = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { itemId } = req.params;
    if (!itemId) {
      return res.status(400).json({ error: 'Item ID is required' });
    }

    // Get the Plaid item from database
    const plaidItem = await storage.getPlaidItemById(Number(itemId));
    if (!plaidItem) {
      return res.status(404).json({ error: 'Plaid item not found' });
    }

    // Security check: Make sure the plaid item belongs to this user
    if (plaidItem.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to access this Plaid item' });
    }

    try {
      // Calculate date ranges (last 90 days)
      const endDate = new Date().toISOString().split('T')[0]; // today in YYYY-MM-DD
      const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 90 days ago

      // Fetch transactions from Plaid
      const transactionsResponse = await plaidClient.transactionsGet({
        access_token: plaidItem.accessToken,
        start_date: startDate,
        end_date: endDate,
      });
      
      const transactions = transactionsResponse.data.transactions;
      const accounts = transactionsResponse.data.accounts;
      
      // Process and store the transactions in our database
      const savedTransactions = await Promise.all(
        transactions.map(async (transaction) => {
          // Find the corresponding account
          const account = accounts.find(a => a.account_id === transaction.account_id);
          
          // Check if this transaction already exists
          const amount = Math.abs(transaction.amount); // Store as positive
          const type = transaction.amount < 0 ? 'expense' : 'income'; // Negative amounts are expenses
          
          const transactionData = {
            userId,
            amount: amount.toString(),
            merchant: transaction.merchant_name || transaction.name,
            category: transaction.category ? transaction.category[0] : 'Uncategorized',
            subcategory: transaction.category && transaction.category.length > 1 ? transaction.category[1] : null,
            account: account?.name || 'Unknown Account',
            date: new Date(transaction.date),
            type,
            notes: transaction.pending ? 'Pending transaction' : '',
            source: 'plaid',
          };
          
          // Check for duplicate transactions
          const isDuplicate = await storage.checkForDuplicateTransactions(transactionData);
          
          if (isDuplicate) {
            console.log(`Skipping duplicate transaction: ${transaction.name} - ${transaction.amount}`);
            return null;
          }
          
          // Create the transaction
          return await storage.createTransaction({
            ...transactionData,
            isDuplicate: false,
          });
        })
      );
      
      // Filter out nulls (duplicates)
      const newTransactions = savedTransactions.filter(t => t !== null);
      
      // Update the last_synced_at timestamp for the Plaid item
      await storage.updatePlaidItem(plaidItem.id, {
        lastUpdated: new Date()
      });
      
      return res.status(200).json({
        message: `Successfully processed ${transactions.length} transactions`,
        new_transactions: newTransactions.length,
        duplicates: transactions.length - newTransactions.length,
        last_synced_at: new Date()
      });
    } catch (error: any) {
      console.error('Error fetching transactions from Plaid:', error);
      
      // Check if this is a PRODUCT_NOT_READY error
      if (error.response?.data?.error_code === 'PRODUCT_NOT_READY') {
        return res.status(202).json({
          error: 'Transactions are still being processed by Plaid',
          message: 'Please try again later, Plaid is still preparing the transaction data',
          requestId: error.response?.data?.request_id
        });
      }
      
      // Return the most accurate error message
      return res.status(500).json({
        error: error.response?.data?.error_message || error.message || 'Failed to fetch transactions',
        requestId: error.response?.data?.request_id
      });
    }
  } catch (error: any) {
    console.error('Error in fetchTransactions:', error);
    return res.status(500).json({
      error: error.message || 'Failed to process transactions request'
    });
  }
};

// Get balances for all accounts of a user
export const getBalance = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { itemId } = req.params;
    if (!itemId) {
      return res.status(400).json({ error: 'Item ID is required' });
    }

    // Get the Plaid item from database
    const plaidItem = await storage.getPlaidItemById(Number(itemId));
    if (!plaidItem) {
      return res.status(404).json({ error: 'Plaid item not found' });
    }

    // Security check: Make sure the plaid item belongs to this user
    if (plaidItem.userId !== userId) {
      return res.status(403).json({ error: 'Not authorized to access this Plaid item' });
    }

    try {
      // Fetch balances from Plaid
      const balanceResponse = await plaidClient.accountsBalanceGet({ 
        access_token: plaidItem.accessToken 
      });
      
      const accounts = balanceResponse.data.accounts;
      
      // Update account balances in our database
      const updatedAccounts = await Promise.all(
        accounts.map(async (account) => {
          // Find the account in our database
          const existingAccount = await storage.getPlaidAccountByAccountId(account.account_id);
          
          if (existingAccount) {
            // Update the account with new balance information
            return await storage.updatePlaidAccount(existingAccount.id, {
              availableBalance: account.balances.available !== null && account.balances.available !== undefined 
                ? String(account.balances.available) 
                : null,
              currentBalance: account.balances.current !== null && account.balances.current !== undefined 
                ? String(account.balances.current) 
                : null,
              lastUpdated: new Date()
            });
          } else {
            // This is a new account that wasn't in our database
            return await storage.createPlaidAccount({
              userId,
              plaidItemId: plaidItem.id,
              accountId: account.account_id,
              name: account.name,
              officialName: account.official_name || null,
              type: account.type,
              subtype: account.subtype || null,
              availableBalance: account.balances.available !== null && account.balances.available !== undefined 
                ? String(account.balances.available) 
                : null,
              currentBalance: account.balances.current !== null && account.balances.current !== undefined 
                ? String(account.balances.current) 
                : null,
              mask: account.mask || null,
              isoCurrencyCode: account.balances.iso_currency_code || null,
              status: 'active',
            });
          }
        })
      );
      
      // Update the last_synced_at timestamp for the Plaid item
      await storage.updatePlaidItem(plaidItem.id, {
        lastUpdated: new Date()
      });
      
      return res.status(200).json({
        accounts: accounts.map(account => ({
          id: account.account_id,
          name: account.name,
          type: account.type,
          subtype: account.subtype,
          balances: account.balances
        })),
        last_synced_at: new Date()
      });
    } catch (error: any) {
      console.error('Error fetching balances from Plaid:', error);
      return res.status(500).json({
        error: error.response?.data?.error_message || error.message || 'Failed to fetch balance data',
        requestId: error.response?.data?.request_id
      });
    }
  } catch (error: any) {
    console.error('Error in getBalance:', error);
    return res.status(500).json({
      error: error.message || 'Failed to process balance request'
    });
  }
};

// Handle Plaid webhooks
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const { webhook_type, webhook_code, item_id, account_id, error, new_transactions, removed_transactions } = req.body;
    
    // Return 200 immediately as Plaid expects
    // Process webhook asynchronously to ensure timely response
    res.status(200).json({ received: true });
    
    // Log webhook for debugging
    console.log(`Plaid webhook received: ${webhook_type} / ${webhook_code} for item ${item_id}`);
    
    // Store webhook event for future reference
    const webhookEvent = await storage.createPlaidWebhookEvent({
      webhookType: webhook_type,
      webhookCode: webhook_code,
      itemId: item_id,
      accountId: account_id || null,
      error: error ? JSON.stringify(error) : null,
      newTransactionsCount: new_transactions ? String(new_transactions) : null,
      removedTransactionsCount: removed_transactions ? String(removed_transactions) : null,
      requestId: req.header('plaid-request-id') || null,
      rawData: JSON.stringify(req.body),
    });
    
    // Handle specific webhook types
    switch (webhook_type) {
      case 'TRANSACTIONS':
        await handleTransactionsWebhook(webhook_code, item_id, webhookEvent.id);
        break;
        
      case 'ITEM':
        await handleItemWebhook(webhook_code, item_id, error, webhookEvent.id);
        break;
        
      // Handle other webhook types as needed
      default:
        console.log(`Unhandled webhook type: ${webhook_type}`);
    }
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    // We already sent response, so just log the error
  }
};

// Handle transactions-related webhooks
async function handleTransactionsWebhook(webhookCode: string, itemId: string, webhookEventId: number) {
  try {
    const plaidItem = await storage.getPlaidItemByItemId(itemId);
    if (!plaidItem) {
      console.error(`Webhook for unknown item: ${itemId}`);
      return;
    }
    
    switch (webhookCode) {
      case 'INITIAL_UPDATE':
      case 'DEFAULT_UPDATE':
      case 'HISTORICAL_UPDATE':
        // We would fetch and process transactions here
        // For brevity, we're just logging the event
        console.log(`Transaction update received for item ${itemId}: ${webhookCode}`);
        break;
        
      case 'TRANSACTIONS_REMOVED':
        // Handle removed transactions
        console.log(`Transactions removed for item ${itemId}`);
        break;
    }
    
    // Mark webhook as processed
    await storage.markPlaidWebhookEventAsProcessed(webhookEventId);
    
  } catch (error) {
    console.error('Error handling transactions webhook:', error);
  }
}

// Handle item-related webhooks
async function handleItemWebhook(webhookCode: string, itemId: string, error: any, webhookEventId: number) {
  try {
    const plaidItem = await storage.getPlaidItemByItemId(itemId);
    if (!plaidItem) {
      console.error(`Webhook for unknown item: ${itemId}`);
      return;
    }
    
    switch (webhookCode) {
      case 'ERROR':
        // Update item status and error information
        await storage.updatePlaidItemByItemId(itemId, {
          status: 'error',
          error: JSON.stringify(error),
          lastUpdated: new Date()
        });
        break;
        
      case 'PENDING_EXPIRATION':
        // Notify user to reauthorize
        console.log(`Item ${itemId} pending expiration`);
        break;
        
      case 'USER_PERMISSION_REVOKED':
        // User revoked permission, update status
        await storage.updatePlaidItemByItemId(itemId, {
          status: 'disconnected',
          lastUpdated: new Date()
        });
        break;
        
      case 'NEW_ACCOUNTS_AVAILABLE':
        // New accounts available
        console.log(`New accounts available for item ${itemId}`);
        break;
        
      case 'WEBHOOK_UPDATE_ACKNOWLEDGED':
        // Webhook updated
        console.log(`Webhook update acknowledged for item ${itemId}`);
        break;
    }
    
    // Mark webhook as processed
    await storage.markPlaidWebhookEventAsProcessed(webhookEventId);
    
  } catch (error) {
    console.error('Error handling item webhook:', error);
  }
}

// Handle OAuth callback
export const handleOAuthCallback = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const { oauth_state_id } = req.body;
    if (!oauth_state_id) {
      return res.status(400).json({ error: 'OAuth state ID is required' });
    }
    
    console.log(`Processing OAuth callback for state ID: ${oauth_state_id}`);
    
    // Exchange the OAuth state ID for a public token
    try {
      const exchangeResponse = await plaidClient.itemPublicTokenExchange({
        public_token: oauth_state_id
      });
      
      const accessToken = exchangeResponse.data.access_token;
      const itemId = exchangeResponse.data.item_id;
      
      // Get item details
      const itemResponse = await plaidClient.itemGet({ access_token: accessToken });
      const institutionId = itemResponse.data.item.institution_id || '';
      
      // Get institution details if available
      let institutionName = 'Connected Bank';
      if (institutionId) {
        try {
          const institutionRequest: InstitutionsGetByIdRequest = {
            institution_id: institutionId,
            country_codes: ['US'] as CountryCode[],
          };
          const institutionResponse = await plaidClient.institutionsGetById(institutionRequest);
          institutionName = institutionResponse.data.institution.name;
        } catch (instErr) {
          console.error('Error getting institution details:', instErr);
        }
      }
      
      // Check if institution is Chase or Schwab - these are not yet available in OAuth
      if (institutionId === 'ins_5' || institutionName.toLowerCase().includes('chase') ||
          institutionId === 'ins_129447' || institutionName.toLowerCase().includes('schwab')) {
        
        return res.status(400).json({
          success: false,
          error: `${institutionName} is not yet available through OAuth. Please try another institution or check back soon.`
        });
      }
      
      // Check for duplicate institution connections
      const hasExistingInstitution = await storage.hasLinkedPlaidItemForInstitution(userId, institutionId);
      if (hasExistingInstitution) {
        return res.status(409).json({
          success: false,
          error: 'This institution is already connected to your account',
          institutionName,
        });
      }
      
      // Store the access token and item information
      const plaidItem = await storage.createPlaidItem({
        userId,
        itemId,
        accessToken,
        institutionId,
        institutionName,
        status: 'active',
      });

      // Fetch accounts from Plaid
      const accountsResponse = await plaidClient.accountsGet({ access_token: accessToken });
      const accounts = accountsResponse.data.accounts;
      
      // Save accounts to database
      const savedAccounts = await Promise.all(
        accounts.map(async (account) => {
          // Create new account
          return await storage.createPlaidAccount({
            userId,
            plaidItemId: plaidItem.id,
            accountId: account.account_id,
            name: account.name,
            officialName: account.official_name || null,
            type: account.type,
            subtype: account.subtype || null,
            availableBalance: account.balances.available !== null && account.balances.available !== undefined 
              ? String(account.balances.available) 
              : null,
            currentBalance: account.balances.current !== null && account.balances.current !== undefined 
              ? String(account.balances.current) 
              : null,
            mask: account.mask || null,
            isoCurrencyCode: account.balances.iso_currency_code || null,
            status: 'active',
          });
        })
      );
      
      // Also create corresponding transaction accounts (for UI display)
      await Promise.all(
        savedAccounts.map(async (account) => {
          if (!account) return; // Skip if account is undefined
          
          // First check if a transaction account already exists for this Plaid account
          const existingAccounts = await storage.getTransactionAccounts(userId);
          const existingAccount = existingAccounts.find(a => 
            a.name === account.name && 
            a.institutionName === plaidItem.institutionName
          );
          
          if (!existingAccount && account.name) {
            await storage.createTransactionAccount({
              userId,
              name: account.name,
              type: account.type === 'depository' ? 'bank' : account.type === 'credit' ? 'credit' : 'other',
              institutionName: plaidItem.institutionName || undefined,
              lastFour: account.mask || undefined,
            });
          }
        })
      );
      
      console.log(`OAuth connection successful - Item ID: ${itemId}, Institution: ${institutionName}`);
      
      return res.status(200).json({
        success: true,
        institution_name: institutionName,
      });
    } catch (exchangeError: any) {
      // Special handling for OAuth errors
      console.error('Error exchanging OAuth token:', exchangeError);
      
      // Check for specific error codes like INVALID_INPUT
      const errorCode = exchangeError.response?.data?.error_code || 'UNKNOWN_ERROR';
      const errorMessage = exchangeError.response?.data?.error_message || 'Failed to complete OAuth flow';
      
      return res.status(400).json({
        success: false,
        error: `Connection failed: ${errorMessage}`,
        error_code: errorCode
      });
    }
  } catch (error: any) {
    console.error('Error handling OAuth callback:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to process OAuth callback',
      requestId: error.response?.data?.request_id,
    });
  }
};

// Remove a Plaid item for a user
export const removeItem = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const { item_id } = req.body;
    if (!item_id) {
      return res.status(400).json({ error: 'Item ID is required' });
    }
    
    // Get the item from our database
    const plaidItem = await storage.getPlaidItemByItemId(item_id);
    if (!plaidItem) {
      return res.status(404).json({ error: 'Plaid item not found' });
    }
    
    // Ensure the user owns this item
    if (plaidItem.userId !== userId) {
      return res.status(403).json({ error: 'You do not have permission to remove this item' });
    }
    
    // Remove the item from Plaid
    await plaidClient.itemRemove({
      access_token: plaidItem.accessToken
    });
    
    // Disconnect the item in our database
    await storage.disconnectPlaidItem(plaidItem.id);
    
    return res.status(200).json({
      success: true,
      message: 'Item successfully removed'
    });
  } catch (error: any) {
    console.error('Error removing item:', error);
    return res.status(500).json({
      error: error.message || 'Failed to remove item',
      requestId: error.response?.data?.request_id,
    });
  }
};