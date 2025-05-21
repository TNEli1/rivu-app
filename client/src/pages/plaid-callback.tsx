import React, { useEffect, useState } from 'react';
import { Redirect } from 'wouter';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function PlaidCallback() {
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  // Extract the OAuth state ID from the URL
  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Get the OAuth state id from the URL
        const urlParams = new URLSearchParams(window.location.search);
        const oauthStateId = urlParams.get('oauth_state_id');
        
        if (!oauthStateId) {
          setError('Missing OAuth state ID');
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
          return;
        }

        // Handle the OAuth callback by sending the oauth_state_id to our backend
        // The backend will complete the OAuth flow with Plaid
        const response = await apiRequest('POST', '/api/plaid/oauth_callback', {
          oauth_state_id: oauthStateId
        });

        const data = await response.json();
        
        if (data.success) {
          toast({
            title: "Success!",
            description: `Connected to ${data.institution_name || 'your bank'}`
          });
        } else {
          setError(data.error || 'Failed to complete bank connection');
          toast({
            title: "Connection Failed",
            description: data.error || 'Failed to complete bank connection',
            variant: "destructive"
          });
        }
      } catch (err: any) {
        console.error('Error handling OAuth callback:', err);
        setError(err.message || 'An error occurred while connecting your bank');
        toast({
          title: "Connection Error",
          description: err.message || 'An error occurred while connecting your bank',
          variant: "destructive"
        });
      } finally {
        setIsProcessing(false);
      }
    };

    handleOAuthCallback();
  }, [user, isLoading, toast]);

  // Redirect to dashboard when done processing (successful or not)
  if (!isProcessing) {
    return <Redirect to="/transactions" />;
  }

  // Show loading state while processing
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
      <h1 className="text-2xl font-bold mb-2">Completing Bank Connection</h1>
      <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
        Please wait while we securely connect your bank account...
      </p>
      {error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md max-w-md">
          {error}
        </div>
      )}
    </div>
  );
}