# Plaid Sandbox Integration for Rivu Finance

This document explains how to test the Plaid Sandbox integration features implemented for Rivu Finance.

## Prerequisites

- You need a Plaid Sandbox access token for testing.
- The `PLAID_CLIENT_ID` and `PLAID_SECRET` environment variables must be set correctly.
- The `PLAID_ENV` should be set to "sandbox".

## Getting a Sandbox Access Token

To test with the Plaid Sandbox, you need a Sandbox access token. You can get one by:

1. Creating a Plaid developer account at https://dashboard.plaid.com/
2. Creating a Sandbox test item through the dashboard
3. Following the "Link" flow to obtain an access token
4. Setting the access token in your environment variables or using it directly in commands

## Setting Up Environment Variables

Set the following environment variables for your tests:

```
PLAID_CLIENT_ID=your_client_id
PLAID_SECRET=your_sandbox_secret
PLAID_ENV=sandbox
PLAID_SANDBOX_ACCESS_TOKEN=access-sandbox-your-token
```

## Testing the Integration

### Using the CLI Tool

We've created a CLI tool to easily test the Plaid integration without needing a UI:

```bash
# Get accounts using a Plaid access token
npx tsx server/plaid-cli.ts accounts --token=your_access_token

# Fire a test webhook
npx tsx server/plaid-cli.ts fire-webhook --token=your_access_token --type=ITEM --code=NEW_ACCOUNTS_AVAILABLE
```

If you've set the `PLAID_SANDBOX_ACCESS_TOKEN` environment variable, you can omit the `--token` parameter.

### API Endpoints

The following API endpoints have been implemented:

1. **Get Accounts**  
   `GET /api/plaid/accounts/get?access_token=your_access_token`  
   Retrieves accounts data for the provided access token.

2. **Webhook Receiver**  
   `POST /api/plaid/webhook`  
   Receives and processes webhook events from Plaid.

3. **Test Webhook**  
   `POST /api/plaid/webhook/test`  
   Fires a test webhook event to test the webhook receiver.

   Request body:
   ```json
   {
     "access_token": "your_access_token",
     "webhook_type": "ITEM",
     "webhook_code": "NEW_ACCOUNTS_AVAILABLE"
   }
   ```

## Verification

When running the API endpoints or CLI tools, the responses and webhook payloads will be logged to the server console. This allows you to verify that:

1. The `/accounts/get` endpoint successfully retrieves account data from Plaid
2. The webhook is properly received by our webhook endpoint
3. The webhook payload is logged and handled correctly
4. All endpoints return the expected responses

## Security Considerations

- The implementation does not expose sensitive information like full account numbers
- All API credentials are stored in environment variables
- The webhook endpoint is public (as required by Plaid) but does not expose sensitive data

## Troubleshooting

If you encounter issues:

1. Ensure your Plaid credentials are correctly set up in environment variables
2. Verify your access token is valid and from the Sandbox environment
3. Check the server logs for detailed error messages
4. Make sure the server is running and accessible