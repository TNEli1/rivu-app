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
          
          // This will handle the OAuth callback automatically
          setError('Completing bank connection...');
          setTimeout(() => {
            setLocation('/connect?oauth_callback=true');
          }, 1000);
          
        } else {
          // No stored data - treat as error
          throw new Error('No stored connection data found. Please try connecting your bank again.');
        }

      } catch (error: any) {
        console.error('OAuth callback handling error:', error);
        setError(error.message || 'Failed to complete bank connection');
        setIsProcessing(false);
        
        toast({
          title: "Connection Failed",
          description: error.message || "Unable to complete bank connection. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsProcessing(false);
      }
    };

    handleOAuthCallback();
  }, [user, isLoading, toast, queryClient, setLocation]);

  // Redirect to dashboard when done processing (successful or not)
  if (!isProcessing && !error && success) {
    return <Redirect to="/dashboard" />;
  }

  if (!isProcessing && error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="max-w-md w-full mx-4 p-6 bg-card rounded-lg border shadow-lg text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Connection Failed</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => setLocation('/connect')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="max-w-md w-full mx-4 p-6 bg-card rounded-lg border shadow-lg text-center">
        {success ? (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Bank Connected!</h2>
            <p className="text-muted-foreground mb-4">
              {institutionName} has been successfully connected to your account.
            </p>
            <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
          </>
        ) : (
          <>
            <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
            <h2 className="text-xl font-semibold mb-2">Completing Bank Connection</h2>
            <p className="text-muted-foreground">
              Please wait while we finalize your bank connection...
            </p>
          </>
        )}
      </div>
    </div>
  );
}