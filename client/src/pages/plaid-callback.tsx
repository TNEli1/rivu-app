import React, { useEffect, useState } from 'react';
import { Redirect, useLocation } from 'wouter';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export default function PlaidCallback() {
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [institutionName, setInstitutionName] = useState<string | null>(null);
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Extract the OAuth state ID from the URL
  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Get the OAuth state id from the URL
        const urlParams = new URLSearchParams(window.location.search);
        const oauthStateId = urlParams.get('oauth_state_id');
        
        if (!oauthStateId) {
          setError('Missing OAuth state ID. This can happen if you reached this page directly instead of through a bank connection flow.');
          setIsProcessing(false);
          return;
        }

        // Log the oauth state for debugging
        console.log('OAuth callback received with state ID:', oauthStateId);

        // Wait for the auth check to complete
        if (isLoading) {
          return;
        }

        // Check if user is logged in
        if (!user) {
          setError('You must be logged in to connect a bank account');
          setIsProcessing(false);
          toast({
            title: "Authentication Required",
            description: "Please log in to continue connecting your bank account.",
            variant: "destructive"
          });
          // Redirect to login after a delay
          setTimeout(() => {
            setLocation('/auth');
          }, 3000);
          return;
        }

        // Check if we have stored Plaid Link success data from before OAuth redirect
        const storedSuccess = sessionStorage.getItem('plaid_link_success');
        const storedLinkToken = sessionStorage.getItem('plaidLinkToken');
        
        if (storedSuccess) {
          // We have the public token from before OAuth redirect - complete the exchange
          const { public_token, metadata } = JSON.parse(storedSuccess);
          
          console.log('Found stored success data, completing token exchange');
          const response = await apiRequest('POST', '/api/plaid/exchange_token', {
            public_token,
            metadata,
            oauth_state_id: oauthStateId
          });
          
          if (response.ok) {
            const data = await response.json();
            setSuccess(true);
            setInstitutionName(data.institution_name || 'Your Bank');
            
            // Clean up stored data
            sessionStorage.removeItem('plaid_link_success');
            sessionStorage.removeItem('plaidLinkToken');
            
            // Invalidate queries to refresh account data
            queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
            queryClient.invalidateQueries({ queryKey: ['/api/plaid/accounts'] });
            
            toast({
              title: "Bank Connected Successfully",
              description: `${data.institution_name || 'Your bank'} has been connected to your account.`,
            });
            
            // Redirect to dashboard after success
            setTimeout(() => {
              setLocation('/dashboard');
            }, 2000);
            
          } else {
            throw new Error('Failed to complete bank connection');
          }
          
        } else if (storedLinkToken) {
          // We have link token - recreate Plaid Link with OAuth state
          console.log('Found stored link token, recreating Plaid Link flow');
          
          // Import Plaid Link dynamically
          const { usePlaidLink } = await import('react-plaid-link');
          
          // This will handle the OAuth callback automatically
          setError('Completing bank connection...');
          setTimeout(() => {
            setLocation('/connect?oauth_callback=true');
          }, 1000);
          
        } else {
          // No stored data - treat as error
          throw new Error('No stored connection data found. Please try connecting your bank again.');
        }

        const data = await response.json();
        
        if (data.success) {
          setSuccess(true);
          setInstitutionName(data.institution_name || 'your bank');
          
          // Invalidate queries to refresh account data
          queryClient.invalidateQueries({ queryKey: ['/api/plaid/items'] });
          queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
          queryClient.invalidateQueries({ queryKey: ['/api/dashboard/summary'] });
          
          toast({
            title: "Success!",
            description: `Connected to ${data.institution_name || 'your bank'}`
          });
          
          // Redirect after a short delay to allow success state to be seen
          setTimeout(() => {
            setIsProcessing(false);
          }, 2000);
        } else {
          setError(data.error || 'Failed to complete bank connection');
          toast({
            title: "Connection Failed",
            description: data.error || 'Failed to complete bank connection',
            variant: "destructive"
          });
          setIsProcessing(false);
        }
      } catch (err: any) {
        console.error('Error handling OAuth callback:', err);
        setError(err.message || 'An error occurred while connecting your bank');
        toast({
          title: "Connection Error",
          description: err.message || 'An error occurred while connecting your bank',
          variant: "destructive"
        });
        setIsProcessing(false);
      }
    };

    handleOAuthCallback();
  }, [user, isLoading, toast, queryClient, setLocation]);

  // Redirect to dashboard when done processing (successful or not)
  if (!isProcessing) {
    return <Redirect to="/transactions" />;
  }

  // Show loading or success/error state while processing
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md w-full max-w-md text-center">
        {success ? (
          <>
            <CheckCircle className="h-16 w-16 text-green-500 mb-4 mx-auto" />
            <h1 className="text-2xl font-bold mb-2">Connection Successful!</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Your account with {institutionName} has been successfully connected. 
              Redirecting you to your transactions...
            </p>
          </>
        ) : error ? (
          <>
            <AlertCircle className="h-16 w-16 text-red-500 mb-4 mx-auto" />
            <h1 className="text-2xl font-bold mb-2">Connection Error</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              There was a problem connecting your bank account:
            </p>
            <div className="mt-2 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md">
              {error}
            </div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              You'll be redirected to your transactions shortly. You can try connecting again later.
            </p>
          </>
        ) : (
          <>
            <Loader2 className="h-16 w-16 text-primary animate-spin mb-4 mx-auto" />
            <h1 className="text-2xl font-bold mb-2">Completing Bank Connection</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Please wait while we securely connect your bank account...
            </p>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              This may take a few moments to verify your credentials and retrieve your account information.
            </p>
          </>
        )}
      </div>
    </div>
  );
}