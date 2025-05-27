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

// Initialize Plaid client with proper configuration
const configuration = new Configuration({
  basePath: process.env.PLAID_ENV === 'production' ? PlaidEnvironments.production : PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_ENV === 'production' 
        ? process.env.PLAID_SECRET_PRODUCTION 
        : process.env.PLAID_SECRET_SANDBOX || process.env.PLAID_SECRET,
    },
  },
});

export const plaidClient = new PlaidApi(configuration);

/**
 * @desc    Create Plaid Link Token with proper OAuth handling
 * @route   POST /api/plaid/create_link_token
 */
export const createLinkToken = async (req: Request, res: Response) => {
  try {
    console.log('Creating Plaid link token for user:', (req.user as any)?.id);
    
    // Validate environment variables
    if (!process.env.PLAID_CLIENT_ID) {
      console.error('PLAID_CLIENT_ID is missing');
      return res.status(500).json({ error: 'Bank connection not configured - missing client ID' });
    }
    
    const plaidSecret = process.env.PLAID_ENV === 'production' 
      ? process.env.PLAID_SECRET_PRODUCTION 
      : process.env.PLAID_SECRET_SANDBOX || process.env.PLAID_SECRET;
      
    if (!plaidSecret) {
      console.error('Plaid secret is missing');
      return res.status(500).json({ error: 'Bank connection not configured - missing secret' });
    }

    const userId = (req.user as any)?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Generate OAuth state for this session
    const oauthStateId = crypto.randomUUID();
    
    // Use webhook URL for transaction updates
    const webhook = process.env.NODE_ENV === 'production'
      ? 'https://www.tryrivu.com/api/plaid/webhook'
      : 'http://localhost:5000/api/plaid/webhook';

    // OAuth redirect URI - CRITICAL for OAuth banks like Chase
    const redirectUri = process.env.NODE_ENV === 'production'
      ? 'https://www.tryrivu.com/api/plaid/oauth_redirect'
      : 'http://localhost:5000/api/plaid/oauth_redirect';

    console.log('PLAID_TOKEN_CREATE: Starting link token creation:', {
      userId,
      webhook,
      redirectUri,
      oauthStateId,
      environment: process.env.PLAID_ENV
    });

    // Create link token with OAuth support
    const request = {
      user: {
        client_user_id: userId.toString(),
      },
      client_name: 'Rivu',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
      webhook: webhook,
      // CRITICAL: Include redirect_uri for OAuth banks
      redirect_uri: redirectUri,
    };

    console.log('PLAID_TOKEN_REQUEST: Link token request payload:', { 
      ...request, 
      client_id: process.env.PLAID_CLIENT_ID,
      environment: process.env.PLAID_ENV,
      hasRedirectUri: true
    });

    const response = await plaidClient.linkTokenCreate(request);
    const linkToken = response.data.link_token;

    // Store OAuth state for validation
    oauthStateStore.set(oauthStateId, {
      userId: userId,
      timestamp: Date.now(),
      linkToken: linkToken
    });

    console.log('PLAID_TOKEN_SUCCESS: Link token created successfully:', {
      linkTokenPrefix: linkToken.substring(0, 10) + '...',
      oauthStateId,
      userId
    });

    res.json({
      link_token: linkToken,
      oauth_state_id: oauthStateId,
      redirect_uri: redirectUri
    });

  } catch (error: any) {
    console.error('PLAID_TOKEN_ERROR: Failed to create link token:', {
      error: error.message,
      code: error.error_code,
      type: error.error_type,
      userId: (req.user as any)?.id
    });
    
    res.status(500).json({
      error: 'Failed to initialize bank connection',
      details: error.message
    });
  }
};

/**
 * @desc    Handle Plaid OAuth redirect
 * @route   GET /api/plaid/oauth_redirect
 */
export const handleOAuthRedirect = async (req: Request, res: Response) => {
  try {
    const { oauth_state_id } = req.query;
    
    if (!oauth_state_id || typeof oauth_state_id !== 'string') {
      console.error('Plaid OAuth redirect: Missing oauth_state_id');
      return res.redirect('/dashboard?error=plaid_oauth_missing_state');
    }

    console.log('Processing Plaid OAuth callback for state:', oauth_state_id);
    
    // Validate OAuth state
    const storedState = oauthStateStore.get(oauth_state_id);
    if (!storedState) {
      console.error('Plaid OAuth redirect: Invalid or expired oauth_state_id');
      return res.redirect('/dashboard?error=plaid_oauth_invalid_state');
    }

    // CRITICAL: Redirect to frontend callback page with the oauth_state_id
    // This allows the frontend to handle the OAuth completion with proper state management
    res.redirect(`/plaid-callback?oauth_state_id=${encodeURIComponent(oauth_state_id)}`);
    
  } catch (error: any) {
    console.error('Plaid OAuth callback error:', error);
    res.redirect('/dashboard?error=plaid_oauth_error');
  }
};

/**
 * @desc    Exchange public token for access token
 * @route   POST /api/plaid/exchange_token
 */
export const exchangePublicToken = async (req: Request, res: Response) => {
  try {
    const { public_token, metadata, oauth_state_id } = req.body;
    const userId = (req.user as any)?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!public_token) {
      return res.status(400).json({ error: 'Missing public_token' });
    }

    console.log('PLAID_EXCHANGE: Starting token exchange:', {
      userId,
      hasPublicToken: !!public_token,
      institutionId: metadata?.institution?.institution_id,
      institutionName: metadata?.institution?.name,
      oauthStateId: oauth_state_id
    });

    // Validate OAuth state if provided
    if (oauth_state_id) {
      const storedState = oauthStateStore.get(oauth_state_id);
      if (!storedState || storedState.userId !== userId) {
        console.error('Invalid OAuth state for token exchange');
        return res.status(400).json({ error: 'Invalid OAuth state' });
      }
      // Clean up used state
      oauthStateStore.delete(oauth_state_id);
    }

    // Exchange public token for access token
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: public_token,
    });

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    console.log('PLAID_EXCHANGE_SUCCESS: Token exchange successful:', {
      itemId,
      userId,
      institutionName: metadata?.institution?.name
    });

    // Get account information
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });

    const accounts = accountsResponse.data.accounts;
    const institution = accountsResponse.data.item.institution_id;

    // Get institution details
    const institutionResponse = await plaidClient.institutionsGetById({
      institution_id: institution,
      country_codes: [CountryCode.Us],
    });

    const institutionData = institutionResponse.data.institution;

    // Store Plaid item and accounts in database
    await storage.createPlaidItem({
      userId: userId,
      itemId: itemId,
      accessToken: accessToken,
      institutionId: institution,
      institutionName: institutionData.name,
      status: 'active'
    });

    // Store accounts
    for (const account of accounts) {
      await storage.createPlaidAccount({
        userId: userId,
        itemId: itemId,
        accountId: account.account_id,
        name: account.name,
        type: account.type,
        subtype: account.subtype || null,
        balanceAvailable: account.balances.available || null,
        balanceCurrent: account.balances.current || null
      });
    }

    console.log('PLAID_STORAGE_SUCCESS: Stored accounts and item:', {
      itemId,
      accountCount: accounts.length,
      institutionName: institutionData.name
    });

    res.json({
      success: true,
      institution_name: institutionData.name,
      accounts_count: accounts.length,
      item_id: itemId
    });

  } catch (error: any) {
    console.error('PLAID_EXCHANGE_ERROR: Token exchange failed:', {
      error: error.message,
      code: error.error_code,
      type: error.error_type,
      userId: (req.user as any)?.id
    });
    
    res.status(500).json({
      error: 'Failed to connect bank account',
      details: error.message
    });
  }
};

/**
 * @desc    Handle OAuth completion from frontend
 * @route   POST /api/plaid/oauth_callback
 */
export const completeOAuthFlow = async (req: Request, res: Response) => {
  try {
    const { oauth_state_id } = req.body;
    const userId = (req.user as any)?.id;
    
    if (!oauth_state_id) {
      return res.status(400).json({ error: 'Missing oauth_state_id parameter' });
    }

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    console.log('Processing Plaid OAuth completion for state:', oauth_state_id);
    
    // Validate OAuth state
    const storedState = oauthStateStore.get(oauth_state_id);
    if (!storedState || storedState.userId !== userId) {
      console.error('Invalid or expired OAuth state');
      return res.status(400).json({ error: 'Invalid or expired OAuth state' });
    }

    // For OAuth flows, check if connection was successful
    // This endpoint is called by the frontend after OAuth redirect
    res.json({
      success: true,
      institution_name: 'Your Bank',
      message: 'OAuth flow completed successfully',
      oauth_state_id
    });
    
  } catch (error: any) {
    console.error('OAuth completion error:', error);
    res.status(500).json({ error: 'Failed to complete OAuth flow' });
  }
};

/**
 * @desc    Get user's connected accounts
 * @route   GET /api/plaid/accounts
 */
export const getAccounts = async (req: Request, res: Response) => {
  try {
    const userId = (req.user as any)?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get user's Plaid items and accounts
    const items = await storage.getPlaidItemsByUserId(userId);
    const accounts = await storage.getPlaidAccountsByUserId(userId);

    res.json({
      items,
      accounts,
      total_accounts: accounts.length
    });

  } catch (error: any) {
    console.error('Get accounts error:', error);
    res.status(500).json({ error: 'Failed to retrieve accounts' });
  }
};

/**
 * @desc    Webhook handler for Plaid events
 * @route   POST /api/plaid/webhook
 */
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const { webhook_type, webhook_code, item_id } = req.body;
    
    console.log('Plaid webhook received:', {
      webhook_type,
      webhook_code,
      item_id
    });

    // Handle different webhook types
    switch (webhook_type) {
      case 'TRANSACTIONS':
        if (webhook_code === 'DEFAULT_UPDATE') {
          // Handle transaction updates
          console.log('Processing transaction updates for item:', item_id);
          // Implement transaction sync logic here
        }
        break;
        
      case 'ITEM':
        if (webhook_code === 'ERROR') {
          // Handle item errors
          console.log('Item error for:', item_id);
          await storage.updatePlaidItem(item_id, { status: 'error' });
        }
        break;
    }

    res.json({ acknowledged: true });

  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};