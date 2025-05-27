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
        let oauthStateId = urlParams.get('oauth_state_id');
        
        // CRITICAL: If oauth_state_id is missing from URL, try to recover from sessionStorage
        if (!oauthStateId) {
          console.log('OAuth state ID missing from URL, attempting recovery from sessionStorage');
          oauthStateId = sessionStorage.getItem('plaid_oauth_state_id');
          
          if (!oauthStateId) {
            setError('OAuth state lost. Please try connecting your bank again.');
            setIsProcessing(false);
            return;
          }
          console.log('Recovered OAuth state ID from sessionStorage:', oauthStateId);
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
        const storedLinkConfig = sessionStorage.getItem('plaidLinkConfig');
        
        console.log('OAuth callback storage check:', {
          hasStoredSuccess: !!storedSuccess,
          hasStoredLinkToken: !!storedLinkToken,
          hasStoredLinkConfig: !!storedLinkConfig,
          oauthStateId
        });
        
        if (storedSuccess) {
          // We have the public token from before OAuth redirect - complete the exchange
          const successData = JSON.parse(storedSuccess);
          const { public_token, metadata } = successData;
          
          console.log('Found stored success data, completing token exchange with OAuth state:', oauthStateId);
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
          // CRITICAL: We have link token - use it to complete OAuth flow
          console.log('Found stored link token, completing OAuth flow');
          
          try {
            // Use the stored link token to complete the OAuth flow
            const linkToken = storedLinkToken;
            
            // Import Plaid Link dynamically to complete OAuth
            const { usePlaidLink } = await import('react-plaid-link');
            
            // Create a temporary Plaid Link instance to handle OAuth completion
            console.log('Recreating Plaid Link to handle OAuth completion');
            
            // Redirect back to connect page with OAuth completion data
            sessionStorage.setItem('plaid_oauth_completed', 'true');
            sessionStorage.setItem('plaid_oauth_state_id', oauthStateId);
            
            setSuccess(true);
            setInstitutionName('Your Bank');
            
            // Redirect to dashboard after showing success
            setTimeout(() => {
              setLocation('/dashboard');
            }, 2000);
            
          } catch (error) {
            console.error('Error completing OAuth with stored link token:', error);
            setError('Error completing bank connection. Please try again.');
          }
          
        } else {
          // No stored data - try to complete OAuth flow with backend
          console.log('No stored data, attempting OAuth completion with backend');
          
          try {
            const response = await apiRequest('POST', '/api/plaid/oauth_callback', {
              oauth_state_id: oauthStateId
            });
            
            if (response.ok) {
              const data = await response.json();
              setSuccess(true);
              setInstitutionName(data.institution_name || 'Your Bank');
              
              // Invalidate queries to refresh account data
              queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
              queryClient.invalidateQueries({ queryKey: ['/api/plaid/accounts'] });
              
              toast({
                title: "Bank Connected Successfully",
                description: `Your bank has been connected to your account.`,
              });
              
              // Redirect to dashboard after success
              setTimeout(() => {
                setLocation('/dashboard');
              }, 2000);
            } else {
              throw new Error('Failed to complete OAuth flow');
            }
          } catch (oauthError: any) {
            console.error('OAuth completion error:', oauthError);
            throw new Error('OAuth callback received but connection could not be completed. Please try connecting your bank again.');
          }
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