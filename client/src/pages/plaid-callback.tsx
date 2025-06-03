import React, { useEffect, useState } from 'react';
import { Redirect, useLocation } from 'wouter';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { usePlaidOAuth, isPlaidOAuthRedirect } from '@/hooks/use-plaid-oauth';

export default function PlaidCallback() {
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [institutionName, setInstitutionName] = useState<string | null>(null);
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Handle OAuth callback success
  const handlePlaidSuccess = async (publicToken: string, metadata: any) => {
    try {
      console.log('Plaid OAuth success, exchanging token');
      
      const response = await apiRequest('POST', '/api/plaid/exchange_token', {
        public_token: publicToken,
        metadata
      });
      
      const data = await response.json();
      
      if (data && data.success) {
        setSuccess(true);
        setInstitutionName(metadata?.institution?.name || 'Your Bank');
        
        // Invalidate queries to refresh account data
        queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
        queryClient.invalidateQueries({ queryKey: ['/api/plaid/accounts'] });
        
        toast({
          title: "Bank Connected Successfully",
          description: `${metadata?.institution?.name || 'Your bank'} has been connected to your account.`,
        });
        
        // Redirect to dashboard after success
        setTimeout(() => {
          setLocation('/dashboard');
        }, 2000);
      } else {
        throw new Error(data?.error || 'Failed to exchange public token');
      }
    } catch (error: any) {
      console.error('Error exchanging public token:', error);
      setError('Failed to complete bank connection. Please try again.');
      setIsProcessing(false);
    }
  };

  // Handle OAuth callback exit/error
  const handlePlaidExit = (error?: any) => {
    if (error) {
      console.error('Plaid OAuth error:', error);
      setError(error.error_message || 'Bank connection was cancelled or failed');
    } else {
      setError('Bank connection was cancelled. Please try connecting your bank again.');
    }
    setIsProcessing(false);
  };

  // Use the OAuth hook
  const { handleOAuthRedirect } = usePlaidOAuth({
    onSuccess: handlePlaidSuccess,
    onExit: handlePlaidExit
  });

  // Handle OAuth callback
  useEffect(() => {
    // Wait for authentication to complete
    if (isLoading) {
      return;
    }

    if (!user) {
      setError('Please log in to connect your bank account.');
      setIsProcessing(false);
      return;
    }

    // Check if this is an OAuth redirect
    if (!isPlaidOAuthRedirect()) {
      console.error('Not a valid Plaid OAuth redirect - redirecting to dashboard');
      setLocation('/dashboard');
      return;
    }
    
    console.log('Starting Plaid OAuth redirect handling');
    
    // CRITICAL FIX: Add delay to ensure Plaid SDK is fully loaded
    const initializeOAuth = async () => {
      // Wait for Plaid SDK to be ready
      let attempts = 0;
      const maxAttempts = 20;
      
      while (attempts < maxAttempts) {
        if (typeof window !== 'undefined' && (window as any).Plaid) {
          console.log('Plaid SDK is ready, proceeding with OAuth');
          break;
        }
        
        console.log(`Waiting for Plaid SDK... attempt ${attempts + 1}/${maxAttempts}`);
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }
      
      if (attempts >= maxAttempts) {
        console.error('Plaid SDK failed to load within timeout period');
        setError('Bank connection service failed to load. Please try again.');
        setIsProcessing(false);
        return;
      }
      
      // Now handle the OAuth redirect
      const handler = handleOAuthRedirect();
      if (!handler) {
        console.error('Failed to create OAuth handler');
        setError('Failed to resume bank connection. Please try connecting again.');
        setIsProcessing(false);
      }
    };
    
    initializeOAuth();

    // OAuth handling is done in initializeOAuth function above
  }, [user, isLoading, handleOAuthRedirect, setLocation]);

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