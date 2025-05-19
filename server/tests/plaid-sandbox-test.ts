/**
 * Test script for Plaid Sandbox Integration
 * 
 * This script tests the Plaid Sandbox integration endpoints we've set up:
 * 1. Calling the /accounts/get endpoint with a sandbox access token
 * 2. Testing the webhook by firing a test webhook
 * 
 * Usage:
 * Run with: npx tsx server/tests/plaid-sandbox-test.ts
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

// Define the test access token
// Note: In a real app, you would either get this from:
// 1. The database after storing it during the Plaid Link flow
// 2. From the Plaid Sandbox console directly for testing
// For this test, we'll use an environment variable
const SANDBOX_ACCESS_TOKEN = process.env.PLAID_SANDBOX_ACCESS_TOKEN;

// Define the base URL for our API
const BASE_URL = 'http://localhost:5000/api';

/**
 * Test the /accounts/get endpoint
 */
async function testGetAccounts() {
  console.log('\n--- Testing /plaid/accounts/get endpoint ---');
  
  try {
    if (!SANDBOX_ACCESS_TOKEN) {
      console.error('Error: PLAID_SANDBOX_ACCESS_TOKEN environment variable is not set.');
      console.error('Please set it with a valid sandbox access token to proceed with the test.');
      return;
    }

    console.log('Calling /plaid/accounts/get with sandbox access token...');
    
    const response = await fetch(`${BASE_URL}/plaid/accounts/get?access_token=${SANDBOX_ACCESS_TOKEN}`);
    const data = await response.json();
    
    if (response.ok) {
      console.log('Success! Accounts retrieved:');
      console.log(`Found ${data.accounts?.length || 0} accounts`);
      
      // Print account details in a sanitized way (only showing non-sensitive info)
      if (data.accounts && data.accounts.length > 0) {
        data.accounts.forEach((account: any, index: number) => {
          console.log(`\nAccount ${index + 1}:`);
          console.log(`- Name: ${account.name}`);
          console.log(`- Official Name: ${account.official_name || 'N/A'}`);
          console.log(`- Type: ${account.type}`);
          console.log(`- Subtype: ${account.subtype || 'N/A'}`);
          console.log(`- Mask: ${account.mask || 'N/A'}`);
        });
      }
      
      // Print item information
      if (data.item) {
        console.log('\nItem Information:');
        console.log(`- Institution ID: ${data.item.institution_id || 'N/A'}`);
        console.log(`- Item ID: ${data.item.item_id || 'N/A'}`);
      }
    } else {
      console.error('Error retrieving accounts:');
      console.error(data);
    }
  } catch (error) {
    console.error('Exception when calling /plaid/accounts/get:');
    console.error(error);
  }
}

/**
 * Test the webhook receiver by firing a test webhook
 */
async function testWebhook() {
  console.log('\n--- Testing webhook functionality ---');
  
  try {
    if (!SANDBOX_ACCESS_TOKEN) {
      console.error('Error: PLAID_SANDBOX_ACCESS_TOKEN environment variable is not set.');
      console.error('Please set it with a valid sandbox access token to proceed with the test.');
      return;
    }

    console.log('Firing test webhook...');
    
    const response = await fetch(`${BASE_URL}/plaid/webhook/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        access_token: SANDBOX_ACCESS_TOKEN,
        webhook_type: 'ITEM',
        webhook_code: 'NEW_ACCOUNTS_AVAILABLE'
      }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('Success! Webhook fired:');
      console.log(data);
      
      console.log('\nWebhook should have been received by the webhook endpoint.');
      console.log('Check the server logs for the webhook payload.');
    } else {
      console.error('Error firing webhook:');
      console.error(data);
    }
  } catch (error) {
    console.error('Exception when firing test webhook:');
    console.error(error);
  }
}

/**
 * Main function to run all tests
 */
async function runTests() {
  console.log('=== PLAID SANDBOX INTEGRATION TEST ===');
  console.log('Testing Plaid Sandbox integration for Rivu Finance...');
  
  // Test the /accounts/get endpoint
  await testGetAccounts();
  
  // Test the webhook functionality
  await testWebhook();
  
  console.log('\n=== TESTS COMPLETED ===');
}

// Run the tests
runTests().catch(console.error);