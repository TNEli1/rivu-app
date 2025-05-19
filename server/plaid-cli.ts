/**
 * Plaid Command Line Interface
 * 
 * A simple CLI tool to test Plaid integration without needing a UI
 * 
 * Usage: 
 * npx tsx server/plaid-cli.ts [command] [options]
 * 
 * Commands:
 *   accounts          - Get accounts from a Plaid access token
 *   fire-webhook      - Fire a test webhook
 * 
 * Options:
 *   --token=value     - Plaid access token to use
 *   --type=value      - Webhook type (for fire-webhook command)
 *   --code=value      - Webhook code (for fire-webhook command)
 */

import { plaidClient, getAccounts, fireWebhook } from './services/plaidService';
import dotenv from 'dotenv';

dotenv.config();

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0] || 'help';

// Helper to parse arguments like --key=value
function getArgValue(name: string): string | undefined {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : undefined;
}

// Get access token from command line or environment variable
const accessToken = getArgValue('token') || process.env.PLAID_SANDBOX_ACCESS_TOKEN;

// Print banner
console.log('=== Plaid Sandbox CLI ===');

// Ensure we have an access token
if (!accessToken && command !== 'help') {
  console.error('Error: No access token provided.');
  console.error('Please provide an access token with --token=value or set PLAID_SANDBOX_ACCESS_TOKEN environment variable.');
  process.exit(1);
}

// Execute the specified command
async function executeCommand() {
  try {
    switch (command) {
      case 'accounts':
        await getPlaidAccounts();
        break;
      case 'fire-webhook':
        await fireTestWebhook();
        break;
      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('Error executing command:', error);
    process.exit(1);
  }
}

// Get accounts from Plaid
async function getPlaidAccounts() {
  console.log('\nRetrieving accounts from Plaid...');
  
  try {
    const accountsResponse = await getAccounts(accessToken!);
    
    console.log(`\nSuccessfully retrieved ${accountsResponse.accounts.length} accounts`);
    
    // Display accounts in a formatted way
    accountsResponse.accounts.forEach((account, index) => {
      console.log(`\nAccount ${index + 1}:`);
      console.log(`- Name: ${account.name}`);
      console.log(`- Type: ${account.type}`);
      console.log(`- Subtype: ${account.subtype || 'N/A'}`);
      console.log(`- Mask: ${account.mask || 'N/A'}`);
      
      // Show balances
      if (account.balances) {
        console.log(`- Available: ${account.balances.available || 'N/A'}`);
        console.log(`- Current: ${account.balances.current || 'N/A'}`);
        console.log(`- Currency: ${account.balances.iso_currency_code || 'N/A'}`);
      }
    });
    
    // Display item information
    console.log('\nItem Information:');
    console.log(`- Institution ID: ${accountsResponse.item.institution_id || 'N/A'}`);
    console.log(`- Item ID: ${accountsResponse.item.item_id}`);
    
    // Store the successful response in a file for verification
    const fs = require('fs');
    const sanitizedResponse = {
      accounts: accountsResponse.accounts.map(account => ({
        id: account.account_id,
        name: account.name,
        type: account.type,
        subtype: account.subtype,
        mask: account.mask
      })),
      item: {
        institution_id: accountsResponse.item.institution_id,
        item_id: accountsResponse.item.item_id
      }
    };
    
    fs.writeFileSync('./plaid-accounts-response.json', JSON.stringify(sanitizedResponse, null, 2));
    console.log('\nSanitized response saved to plaid-accounts-response.json');
    
  } catch (error) {
    console.error('Error getting accounts:', error);
  }
}

// Fire a test webhook for testing
async function fireTestWebhook() {
  const webhookType = getArgValue('type') || 'ITEM';
  const webhookCode = getArgValue('code') || 'NEW_ACCOUNTS_AVAILABLE';
  
  console.log(`\nFiring test webhook: ${webhookType} - ${webhookCode}`);
  
  try {
    const response = await fireWebhook(accessToken!, webhookType, webhookCode);
    
    console.log('\nWebhook fired successfully:');
    console.log(response);
    
    // Store the webhook request for verification
    const fs = require('fs');
    const webhookRequest = {
      access_token: '**REDACTED**', // Don't store the actual token
      webhook_type: webhookType,
      webhook_code: webhookCode,
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync('./plaid-webhook-request.json', JSON.stringify(webhookRequest, null, 2));
    console.log('\nWebhook request saved to plaid-webhook-request.json');
    
  } catch (error) {
    console.error('Error firing webhook:', error);
  }
}

// Show help text
function showHelp() {
  console.log(`
Usage: npx tsx server/plaid-cli.ts [command] [options]

Commands:
  accounts          - Get accounts from a Plaid access token
  fire-webhook      - Fire a test webhook
  help              - Show this help message

Options:
  --token=value     - Plaid access token to use
  --type=value      - Webhook type (ITEM or TRANSACTIONS)
  --code=value      - Webhook code (e.g., NEW_ACCOUNTS_AVAILABLE)

Examples:
  npx tsx server/plaid-cli.ts accounts --token=access-sandbox-123
  npx tsx server/plaid-cli.ts fire-webhook --token=access-sandbox-123 --type=ITEM --code=NEW_ACCOUNTS_AVAILABLE
  `);
}

// Run the selected command
executeCommand();