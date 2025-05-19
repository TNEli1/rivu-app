import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid';
import dotenv from 'dotenv';

dotenv.config();

// Configure Plaid client with environment variables
const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

// Create Plaid client instance
export const plaidClient = new PlaidApi(configuration);

/**
 * Create a link token for Plaid Link
 */
export async function createLinkToken(userId: string, webhookUrl: string) {
  try {
    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: userId,
      },
      client_name: 'Rivu Finance',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
      webhook: webhookUrl,
    });
    
    return response.data;
  } catch (error) {
    console.error('Error creating link token:', error);
    throw error;
  }
}

/**
 * Exchange a public token for an access token
 */
export async function exchangePublicToken(publicToken: string) {
  try {
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });
    
    return response.data;
  } catch (error) {
    console.error('Error exchanging public token:', error);
    throw error;
  }
}

/**
 * Get accounts for a user from Plaid
 */
export async function getAccounts(accessToken: string) {
  try {
    const response = await plaidClient.accountsGet({
      access_token: accessToken,
    });
    
    return response.data;
  } catch (error) {
    console.error('Error getting accounts:', error);
    throw error;
  }
}

/**
 * Fire a webhook for testing in the Plaid Sandbox
 */
export async function fireWebhook(accessToken: string, webhookType: 'ITEM' | 'TRANSACTIONS', webhookCode: string) {
  try {
    const response = await plaidClient.sandboxItemFireWebhook({
      access_token: accessToken,
      webhook_type: webhookType,
      webhook_code: webhookCode as any, // Casting to any to handle different webhook codes
    });
    
    return response.data;
  } catch (error) {
    console.error('Error firing webhook:', error);
    throw error;
  }
}