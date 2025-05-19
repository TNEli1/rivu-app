import { Request, Response } from 'express';
import { storage } from '../storage';
import { plaidClient, getAccounts, fireWebhook, createLinkToken as createPlaidLinkToken, exchangePublicToken as exchangePlaidPublicToken } from '../services/plaidService';
import dotenv from 'dotenv';

dotenv.config();

// Create a type for the authenticated request
interface AuthenticatedRequest extends Request {
  user?: { id: number };
}

/**
 * @desc    Create a link token for Plaid Link
 * @route   POST /api/plaid/create-link-token
 */
export const createLinkToken = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check for authentication
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        message: 'Not authenticated',
        code: 'UNAUTHORIZED'
      });
    }
    
    // Generate a client_user_id based on the authenticated user
    const clientUserId = `user-${req.user.id}`;
    
    // Get webhook URL from environment or use a default for testing
    const webhookUrl = process.env.PLAID_WEBHOOK_URL || `${req.protocol}://${req.get('host')}/api/plaid/webhook`;
    
    console.log(`Creating link token for client user ID: ${clientUserId}`);
    console.log(`Webhook URL: ${webhookUrl}`);
    
    // Create the link token
    const linkTokenResponse = await createPlaidLinkToken(clientUserId, webhookUrl);
    
    // Return the link token to the client
    return res.status(200).json({
      message: 'Link token created successfully',
      link_token: linkTokenResponse.link_token,
      expiration: linkTokenResponse.expiration
    });
  } catch (error: any) {
    console.error('Error creating link token:', error);
    
    return res.status(500).json({
      message: error.message || 'Error creating link token',
      code: 'LINK_TOKEN_ERROR'
    });
  }
};

/**
 * @desc    Exchange a public token for an access token
 * @route   POST /api/plaid/exchange-public-token
 */
export const exchangePublicToken = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check for authentication
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        message: 'Not authenticated',
        code: 'UNAUTHORIZED'
      });
    }
    
    const { public_token } = req.body;
    
    if (!public_token) {
      return res.status(400).json({
        message: 'Public token is required',
        code: 'MISSING_PUBLIC_TOKEN'
      });
    }
    
    console.log(`Exchanging public token for access token. User ID: ${req.user.id}`);
    
    // Exchange the public token for an access token
    const exchangeResponse = await exchangePlaidPublicToken(public_token);
    
    const accessToken = exchangeResponse.access_token;
    const itemId = exchangeResponse.item_id;
    
    console.log(`Successfully exchanged public token for access token`);
    console.log(`Access Token: ${accessToken}`); // Log the access token for verification
    console.log(`Item ID: ${itemId}`);
    
    // Return the access token and item ID to the client
    return res.status(200).json({
      message: 'Public token exchanged successfully',
      access_token: accessToken,
      item_id: itemId
    });
  } catch (error: any) {
    console.error('Error exchanging public token:', error);
    
    return res.status(500).json({
      message: error.message || 'Error exchanging public token',
      code: 'EXCHANGE_ERROR'
    });
  }
};

/**
 * @desc    Get accounts from Plaid
 * @route   GET /api/plaid/accounts/get
 */
export const getPlaidAccounts = async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Check for authentication
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        message: 'Not authenticated',
        code: 'UNAUTHORIZED'
      });
    }
    
    // Get access token from query parameters or request body
    const accessToken = req.query.access_token as string || req.body.access_token;
    
    if (!accessToken) {
      return res.status(400).json({
        message: 'Access token is required',
        code: 'MISSING_ACCESS_TOKEN'
      });
    }
    
    // Get accounts from Plaid
    const accountsResponse = await getAccounts(accessToken);
    
    // Log the response for verification (sanitized for security)
    console.log(`Successfully retrieved ${accountsResponse.accounts.length} accounts`);
    
    // Return the accounts data (we're not storing sensitive information)
    return res.status(200).json({
      message: 'Accounts retrieved successfully',
      accounts: accountsResponse.accounts,
      item: {
        institution_id: accountsResponse.item.institution_id,
        item_id: accountsResponse.item.item_id,
      }
    });
  } catch (error: any) {
    console.error('Error getting Plaid accounts:', error);
    
    // Return appropriate error response
    return res.status(500).json({
      message: error.message || 'Error getting accounts from Plaid',
      code: 'PLAID_ERROR'
    });
  }
};

/**
 * @desc    Webhook receiver for Plaid events
 * @route   POST /api/plaid/webhook
 */
export const plaidWebhook = async (req: Request, res: Response) => {
  try {
    const webhookData = req.body;
    
    // Log the webhook event
    console.log('Received Plaid webhook:', {
      type: webhookData.webhook_type,
      code: webhookData.webhook_code,
      itemId: webhookData.item_id,
      timestamp: new Date().toISOString()
    });
    
    // Store the webhook event (you might want to store this in a database)
    // For now, we're just logging it
    console.log('Webhook payload:', JSON.stringify(webhookData));
    
    // Handle different webhook types
    switch (webhookData.webhook_type) {
      case 'ITEM':
        handleItemWebhook(webhookData);
        break;
      case 'TRANSACTIONS':
        handleTransactionsWebhook(webhookData);
        break;
      default:
        console.log(`Unhandled webhook type: ${webhookData.webhook_type}`);
    }
    
    // Always respond with 200 OK to acknowledge receipt
    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    
    // Still return 200 OK to prevent Plaid from retrying
    return res.status(200).json({ 
      message: 'Webhook received but failed to process',
      error: error.message
    });
  }
};

/**
 * @desc    Test fire a webhook in Sandbox
 * @route   POST /api/plaid/webhook/test
 */
export const testFireWebhook = async (req: Request, res: Response) => {
  try {
    const { access_token, webhook_type, webhook_code } = req.body;
    
    if (!access_token || !webhook_type || !webhook_code) {
      return res.status(400).json({
        message: 'Missing required parameters: access_token, webhook_type, webhook_code',
        code: 'MISSING_PARAMETERS'
      });
    }
    
    console.log(`Firing test webhook: ${webhook_type} - ${webhook_code}`);
    
    // Fire the webhook
    const response = await fireWebhook(access_token, webhook_type, webhook_code);
    
    return res.status(200).json({
      message: 'Test webhook fired successfully',
      webhook_fired: true,
      response: response
    });
  } catch (error: any) {
    console.error('Error firing test webhook:', error);
    
    return res.status(500).json({
      message: error.message || 'Error firing test webhook',
      code: 'WEBHOOK_TEST_ERROR'
    });
  }
};

// Helper functions to handle different webhook types
function handleItemWebhook(webhookData: any) {
  const webhookCode = webhookData.webhook_code;
  
  switch (webhookCode) {
    case 'NEW_ACCOUNTS_AVAILABLE':
      console.log('New accounts available for item:', webhookData.item_id);
      // In a real implementation, you would fetch the new accounts and update your database
      break;
    case 'ERROR':
      console.log('Error with item:', webhookData.item_id);
      // Handle item errors
      break;
    default:
      console.log(`Unhandled item webhook code: ${webhookCode}`);
  }
}

function handleTransactionsWebhook(webhookData: any) {
  const webhookCode = webhookData.webhook_code;
  
  switch (webhookCode) {
    case 'SYNC_UPDATES_AVAILABLE':
      console.log('Transaction updates available for item:', webhookData.item_id);
      // In a real implementation, you would fetch the updated transactions
      break;
    default:
      console.log(`Unhandled transactions webhook code: ${webhookCode}`);
  }
}