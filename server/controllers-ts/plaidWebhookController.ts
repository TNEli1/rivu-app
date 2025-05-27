import { Request, Response } from 'express';
import { PlaidApi } from 'plaid';
import { storage } from '../storage';
import { plaidClient } from './plaidController';

export const handlePlaidWebhook = async (req: Request, res: Response) => {
  try {
    const body = req.body;
    console.log('Plaid webhook received:', JSON.stringify(body, null, 2));

    // Store the webhook event for tracking
    try {
      await storage.createPlaidWebhookEvent({
        webhookType: body.webhook_type,
        webhookCode: body.webhook_code,
        itemId: body.item_id,
        accountId: body.account_id || null,
        error: body.error ? JSON.stringify(body.error) : null,
        newTransactionsCount: body.new_transactions?.toString() || null,
        removedTransactionsCount: body.removed_transactions?.toString() || null,
        requestId: body.request_id || null,
        rawData: JSON.stringify(body),
      });
    } catch (storageError) {
      console.error('Error storing webhook event:', storageError);
      // Continue processing even if storage fails
    }

    // Handle different webhook types
    switch (body.webhook_type) {
      case 'TRANSACTIONS':
        await handleTransactionWebhook(body);
        break;
      
      case 'ITEM':
        await handleItemWebhook(body);
        break;
      
      case 'HOLDINGS':
        await handleHoldingsWebhook(body);
        break;
      
      case 'LIABILITIES':
        await handleLiabilitiesWebhook(body);
        break;
      
      case 'ASSETS':
        await handleAssetsWebhook(body);
        break;
      
      default:
        console.log(`Unhandled webhook type: ${body.webhook_type}`);
    }

    // Always respond with 200 to acknowledge receipt
    res.sendStatus(200);

  } catch (error) {
    console.error('Error processing Plaid webhook:', error);
    // Still respond with 200 to prevent Plaid from retrying
    res.sendStatus(200);
  }
};

async function handleTransactionWebhook(body: any) {
  const { webhook_code, item_id, new_transactions, removed_transactions } = body;
  
  console.log(`Processing TRANSACTIONS webhook: ${webhook_code} for item ${item_id}`);
  
  switch (webhook_code) {
    case 'DEFAULT_UPDATE':
      console.log(`New transactions available: ${new_transactions}, Removed: ${removed_transactions}`);
      // Trigger transaction sync for this item
      await syncTransactionsForItem(item_id);
      break;
      
    case 'HISTORICAL_UPDATE':
      console.log(`Historical transaction update for item: ${item_id}`);
      await syncTransactionsForItem(item_id);
      break;
      
    case 'INITIAL_UPDATE':
      console.log(`Initial transaction update for item: ${item_id}`);
      await syncTransactionsForItem(item_id);
      break;
      
    case 'TRANSACTIONS_REMOVED':
      console.log(`Transactions removed for item: ${item_id}`);
      // Handle removed transactions if needed
      break;
      
    default:
      console.log(`Unhandled transaction webhook code: ${webhook_code}`);
  }
}

async function handleItemWebhook(body: any) {
  const { webhook_code, item_id, error } = body;
  
  console.log(`Processing ITEM webhook: ${webhook_code} for item ${item_id}`);
  
  switch (webhook_code) {
    case 'ERROR':
      console.error(`Item error for ${item_id}:`, error);
      // Update item status to reflect the error
      await storage.updatePlaidItemByItemId(item_id, {
        status: 'error',
        error: JSON.stringify(error)
      });
      break;
      
    case 'PENDING_EXPIRATION':
      console.log(`Item ${item_id} pending expiration`);
      await storage.updatePlaidItemByItemId(item_id, {
        status: 'pending_expiration'
      });
      break;
      
    case 'USER_PERMISSION_REVOKED':
      console.log(`User revoked permissions for item ${item_id}`);
      await storage.updatePlaidItemByItemId(item_id, {
        status: 'disconnected'
      });
      break;
      
    case 'WEBHOOK_UPDATE_ACKNOWLEDGED':
      console.log(`Webhook update acknowledged for item ${item_id}`);
      break;
      
    default:
      console.log(`Unhandled item webhook code: ${webhook_code}`);
  }
}

async function handleHoldingsWebhook(body: any) {
  const { webhook_code, item_id } = body;
  console.log(`Processing HOLDINGS webhook: ${webhook_code} for item ${item_id}`);
  // Handle investment holdings updates if needed
}

async function handleLiabilitiesWebhook(body: any) {
  const { webhook_code, item_id } = body;
  console.log(`Processing LIABILITIES webhook: ${webhook_code} for item ${item_id}`);
  // Handle liabilities updates if needed
}

async function handleAssetsWebhook(body: any) {
  const { webhook_code, item_id } = body;
  console.log(`Processing ASSETS webhook: ${webhook_code} for item ${item_id}`);
  // Handle assets updates if needed
}

async function syncTransactionsForItem(itemId: string) {
  try {
    console.log(`Starting transaction sync for item: ${itemId}`);
    
    // Get the Plaid item from our database
    const plaidItem = await storage.getPlaidItemByItemId(itemId);
    if (!plaidItem) {
      console.error(`Plaid item not found: ${itemId}`);
      return;
    }
    
    // Get accounts for this item
    const accounts = await storage.getPlaidAccountsByItemId(plaidItem.id);
    if (accounts.length === 0) {
      console.error(`No accounts found for item: ${itemId}`);
      return;
    }
    
    // Fetch latest transactions from Plaid
    const accountIds = accounts.map(account => account.accountId);
    
    // Calculate date range (last 30 days)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    try {
      const response = await plaidClient.transactionsGet({
        access_token: plaidItem.accessToken,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      });
      
      console.log(`Fetched ${response.data.transactions.length} transactions for item ${itemId}`);
      
      // Here you would typically save the transactions to your database
      // This depends on your transaction storage implementation
      
    } catch (plaidError: any) {
      console.error(`Error fetching transactions for item ${itemId}:`, plaidError);
      
      // Update item status if there's an error
      if (plaidError.error_code) {
        await storage.updatePlaidItemByItemId(itemId, {
          status: 'error',
          error: JSON.stringify(plaidError)
        });
      }
    }
    
  } catch (error) {
    console.error(`Error in syncTransactionsForItem for ${itemId}:`, error);
  }
}