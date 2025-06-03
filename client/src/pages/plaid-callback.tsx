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
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Handle OAuth callback with new simplified flow
  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Get the OAuth state id from the URL
        const urlParams = new URLSearchParams(window.location.search);
        const oauthStateId = urlParams.get('oauth_state_id');
        
        console.log('Plaid OAuth callback - Processing state ID:', oauthStateId);
        setDebugInfo({ step: 'extracting_state_id', oauthStateId });

        if (!oauthStateId) {
          setError('OAuth state missing from callback. Please try connecting your bank again.');
          setIsProcessing(false);
          return;
        }

        // Wait for authentication to complete
        if (isLoading) {
          setDebugInfo({ step: 'waiting_for_auth', oauthStateId });
          return;
        }

        if (!user) {
          setError('Please log in to connect your bank account.');
          setIsProcessing(false);
          return;
        }

        setDebugInfo({ step: 'retrieving_oauth_data', oauthStateId });
        console.log('Retrieving OAuth callback data from session');
        
        // Retrieve OAuth callback data from server session
        const oauthResponse = await apiRequest('GET', `/api/plaid/oauth_state/${oauthStateId}`);
        
        if (!oauthResponse.ok) {
          const errorData = await oauthResponse.json().catch(() => ({}));
          console.error('Failed to retrieve OAuth state:', errorData);
          
          if (oauthResponse.status === 404) {
            setError('OAuth session not found. Please try connecting your bank again.');
          } else if (oauthResponse.status === 410) {
            setError('OAuth session expired. Please try connecting your bank again.');
          } else {
            setError('Failed to retrieve OAuth session. Please try again.');
          }
          setIsProcessing(false);
          return;
        }
        
        const oauthData = await oauthResponse.json();
        console.log('Retrieved OAuth data:', {
          has_link_token: !!oauthData.link_token,
          has_public_token: !!oauthData.public_token,
          oauth_state_id: oauthData.oauth_state_id
        });
        
        setDebugInfo({ 
          step: 'oauth_data_retrieved', 
          oauthStateId,
          hasLinkToken: !!oauthData.link_token,
          hasPublicToken: !!oauthData.public_token
        });

        // Check if we already have a public token from the OAuth callback
        if (oauthData.public_token) {
          console.log('Public token found in OAuth callback, completing exchange');
          setDebugInfo({ step: 'exchanging_public_token', oauthStateId });
          
          const exchangeResponse = await apiRequest('POST', '/api/plaid/complete_oauth', {
            oauth_state_id: oauthStateId,
            public_token: oauthData.public_token,
            metadata: oauthData.query_params?.metadata || {}
          });
          
          if (exchangeResponse.ok) {
            const data = await exchangeResponse.json();
            setSuccess(true);
            setInstitutionName(data.institution_name || 'Your Bank');
            
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
            const errorData = await exchangeResponse.json().catch(() => ({}));
            throw new Error(errorData.error || 'Failed to exchange public token');
          }
        } else if (oauthData.link_token) {
          // We need to complete OAuth flow using Plaid Link with the received redirect URI
          console.log('Link token found, completing OAuth flow with Plaid Link');
          setDebugInfo({ step: 'completing_oauth_with_link', oauthStateId });
          
          try {
            // Import Plaid Link dynamically
            const { usePlaidLink } = await import('react-plaid-link');
            
            // Configure Plaid Link for OAuth completion
            const linkConfig = {
              token: oauthData.link_token,
              receivedRedirectUri: window.location.href, // Current URL with oauth_state_id
              onSuccess: async (public_token: string, metadata: any) => {
                try {
                  console.log('Plaid Link OAuth completion success, exchanging token');
                  setDebugInfo({ step: 'link_success_exchanging', oauthStateId });
                  
                  const exchangeResponse = await apiRequest('POST', '/api/plaid/complete_oauth', {
                    oauth_state_id: oauthStateId,
                    public_token,
                    metadata
                  });
                  
                  if (exchangeResponse.ok) {
                    const data = await exchangeResponse.json();
                    setSuccess(true);
                    setInstitutionName(data.institution_name || metadata?.institution?.name || 'Your Bank');
                    
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
                    const errorData = await exchangeResponse.json().catch(() => ({}));
                    throw new Error(errorData.error || 'Failed to exchange public token');
                  }
                } catch (error: any) {
                  console.error('Error exchanging public token after OAuth:', error);
                  setError('Failed to complete bank connection. Please try again.');
                  setIsProcessing(false);
                }
              },
              onExit: (err: any) => {
                if (err) {
                  console.error('Plaid Link OAuth completion error:', err);
                  setError(err.error_message || 'OAuth flow was cancelled or failed');
                } else {
                  setError('OAuth flow was cancelled. Please try connecting your bank again.');
                }
                setIsProcessing(false);
              }
            };
            
            // Initialize Plaid Link
            const { open, ready } = usePlaidLink(linkConfig);
            
            // Auto-open Link when ready
            const checkReady = setInterval(() => {
              if (ready) {
                clearInterval(checkReady);
                console.log('Opening Plaid Link for OAuth completion');
                setDebugInfo({ step: 'opening_plaid_link', oauthStateId });
                open();
              }
            }, 100);
            
            // Timeout after 15 seconds
            setTimeout(() => {
              clearInterval(checkReady);
              if (!success && !error) {
                setError('Timeout waiting for bank connection. Please try again.');
                setIsProcessing(false);
              }
            }, 15000);
            
          } catch (error: any) {
            console.error('Error initializing Plaid Link for OAuth:', error);
            setError('Error initializing bank connection. Please try again.');
            setIsProcessing(false);
          }
        } else {
          // No usable tokens found
          console.error('No valid OAuth data found in session');
          setError('Invalid OAuth session. Please try connecting your bank again.');
          setIsProcessing(false);
        }
        
      } catch (error: any) {
        console.error('OAuth callback handling error:', error);
        setError('Error processing bank connection. Please try again.');
        setIsProcessing(false);
      }
    };

    handleOAuthCallback();
  }, [user, isLoading, queryClient, toast, setLocation]);

  // Redirect to login if not authenticated
  if (!isLoading && !user) {
    return <Redirect to="/login" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        {isProcessing && (
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Connecting Your Bank Account
            </h2>
            <p className="text-gray-600 mb-4">
              Please wait while we complete your bank connection...
            </p>
            {debugInfo && (
              <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded mt-4">
                <p>Step: {debugInfo.step}</p>
                {debugInfo.oauthStateId && <p>State: {debugInfo.oauthStateId.substring(0, 8)}...</p>}
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Connection Failed
            </h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => setLocation('/dashboard')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Return to Dashboard
            </button>
          </div>
        )}

        {success && (
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Bank Connected Successfully!
            </h2>
            <p className="text-gray-600 mb-4">
              {institutionName} has been connected to your account.
            </p>
            <p className="text-sm text-gray-500">
              Redirecting to dashboard...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}