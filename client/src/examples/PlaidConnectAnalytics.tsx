// Example code showing how to use PostHog analytics with Plaid
import React, { useCallback } from 'react';
import { useAnalytics } from '@/lib/AnalyticsContext';

export function PlaidConnectButton() {
  const { trackPlaidConnected } = useAnalytics();
  
  // Example function that would be called when Plaid link is successful
  const handlePlaidSuccess = useCallback((metadata: any) => {
    // Track the successful Plaid connection
    trackPlaidConnected(
      metadata.institution.name,
      metadata.accounts.length
    );
    
    // Continue with your normal Plaid success handling
    console.log('Plaid connected successfully');
    // ... other code
  }, [trackPlaidConnected]);
  
  return (
    <button 
      onClick={() => {
        // Your existing Plaid connection logic
        // ...
        
        // Mock successful connection for example
        handlePlaidSuccess({
          institution: { name: 'Chase' },
          accounts: [{ id: '1234', name: 'Checking' }]
        });
      }}
      className="bg-blue-500 text-white px-4 py-2 rounded"
    >
      Connect Your Bank
    </button>
  );
}