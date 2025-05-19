import React, { useState } from 'react';
import { PlaidConnectionDialog } from '@/components/transactions/PlaidConnectionDialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export default function PlaidTestPage() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [testingStatus, setTestingStatus] = useState<string>('');
  const { toast } = useToast();

  const handleSuccess = () => {
    setTestingStatus('Connection successful! Access token obtained.');
    toast({
      title: 'Success',
      description: 'Bank account successfully connected through Plaid.',
      variant: 'default',
    });
  };

  const testGetAccounts = async () => {
    setTestingStatus('Fetching accounts from Plaid...');
    try {
      const response = await apiRequest(
        'GET', 
        '/api/plaid/accounts/get',
        undefined
      );
      
      const data = await response.json();
      console.log('Plaid accounts data:', data);
      
      setTestingStatus(`Found ${data.accounts?.length || 0} accounts from Plaid`);
      toast({
        title: 'Account Data Retrieved',
        description: `Successfully retrieved ${data.accounts?.length || 0} accounts from Plaid`,
        variant: 'default',
      });
    } catch (error) {
      console.error('Error fetching Plaid accounts:', error);
      setTestingStatus('Error fetching accounts. Check console for details.');
      toast({
        title: 'Error',
        description: 'Failed to retrieve accounts from Plaid',
        variant: 'destructive',
      });
    }
  };

  const testFireWebhook = async () => {
    setTestingStatus('Firing test webhook event...');
    try {
      const response = await apiRequest(
        'POST',
        '/api/plaid/webhook/test',
        {
          webhook_type: 'TRANSACTIONS',
          webhook_code: 'INITIAL_UPDATE'
        }
      );
      
      const data = await response.json();
      console.log('Webhook test response:', data);
      
      setTestingStatus('Webhook test fired successfully');
      toast({
        title: 'Webhook Sent',
        description: 'Test webhook event sent to Plaid',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error firing webhook test:', error);
      setTestingStatus('Error firing webhook. Check console for details.');
      toast({
        title: 'Error',
        description: 'Failed to fire test webhook',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Plaid Sandbox Test</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Connect Bank Account</h2>
        <p className="mb-4 text-muted-foreground">
          Use Plaid Link to connect a test bank account. For testing in the sandbox environment, 
          use the following credentials:
        </p>
        
        <div className="bg-muted p-4 rounded-md mb-4">
          <p className="font-mono text-sm mb-1"><strong>Institution:</strong> Platypus Bank (ins_109508)</p>
          <p className="font-mono text-sm mb-1"><strong>Username:</strong> user_good</p>
          <p className="font-mono text-sm"><strong>Password:</strong> pass_good</p>
        </div>
        
        <PlaidConnectionDialog 
          trigger={<Button>Link Test Bank Account</Button>}
          onSuccess={handleSuccess}
        />
      </div>
      
      {testingStatus && (
        <div className="bg-muted p-4 rounded-md my-4">
          <h3 className="font-semibold mb-2">Status:</h3>
          <p>{testingStatus}</p>
        </div>
      )}
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Test Plaid API Endpoints</h2>
        <div className="flex flex-col gap-4">
          <Button variant="outline" onClick={testGetAccounts}>
            Test Get Accounts
          </Button>
          
          <Button variant="outline" onClick={testFireWebhook}>
            Test Fire Webhook
          </Button>
        </div>
      </div>

      <div className="text-sm text-muted-foreground mt-8">
        <p><strong>Note:</strong> This page is for testing the Plaid integration in the Sandbox environment. 
        In production, you would not display the access token or provide test credentials to users.</p>
      </div>
    </div>
  );
}