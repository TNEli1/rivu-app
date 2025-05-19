import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertCircle, ExternalLink, Building, RefreshCw, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { usePlaidLink } from 'react-plaid-link';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface PlaidConnectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PlaidConnectionDialog({ isOpen, onClose }: PlaidConnectionDialogProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get a link token from our API when the dialog opens
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);
      setSuccess(false);
      
      const fetchLinkToken = async () => {
        try {
          const response = await apiRequest('POST', '/api/plaid/create_link_token', {});
          const data = await response.json();
          if (data && data.link_token) {
            setLinkToken(data.link_token);
          } else {
            setError('Failed to get link token');
            console.error('No link token in response:', data);
          }
        } catch (err) {
          console.error('Error getting link token:', err);
          setError('Failed to connect to bank services');
        } finally {
          setLoading(false);
        }
      };
      
      fetchLinkToken();
    } else {
      // Reset state when dialog is closed
      setLinkToken(null);
    }
  }, [isOpen]);

  // Handle the success callback from Plaid Link
  const onSuccess = useCallback(async (public_token: string, metadata: any) => {
    setLoading(true);
    try {
      // Exchange the public token for an access token
      const response = await apiRequest('POST', '/api/plaid/exchange_token', {
        public_token,
        metadata
      });
      
      const data = await response.json();
      
      if (data && data.success) {
        // Log session ID and institution info for diagnostic purposes
        console.log(`Plaid Link successful - Institution: ${metadata.institution.name}`);
        
        // Get accounts for the connected bank
        const accountsResponse = await apiRequest('POST', '/api/plaid/accounts', {});
        
        // Invalidate any cached account data
        queryClient.invalidateQueries({ queryKey: ['/api/accounts'] });
        
        // Show success state
        setSuccess(true);
        toast({
          title: "Success!",
          description: `Connected to ${metadata.institution.name}`
        });
        
        // Close the dialog after a short delay
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        throw new Error((data && data.error) || 'Failed to exchange token');
      }
    } catch (err: any) {
      console.error('Error exchanging token:', err);
      setError(err.message || 'Failed to connect bank account');
      toast({
        title: "Connection Failed",
        description: err.message || 'Failed to connect bank account',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [onClose, queryClient, toast]);

  // Handle any errors from Plaid Link
  const onExit = useCallback((err: any) => {
    if (err) {
      console.error('Plaid Link error:', err);
      setError(err.error_message || 'Error connecting to bank');
    }
  }, []);

  // Configure the Plaid Link hook
  const { open, ready } = usePlaidLink({
    token: linkToken || '',
    onSuccess,
    onExit,
    // Only render if we have a link token
    receivedRedirectUri: window.location.href,
  });

  // Trigger Plaid Link when button is clicked
  const handlePlaidLinkClick = useCallback(() => {
    if (ready && linkToken) {
      open();
    } else {
      setError('Bank connection service is not ready');
    }
  }, [ready, linkToken, open]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto overflow-x-hidden relative my-auto mx-auto">
        <DialogHeader>
          <DialogTitle>Connect Bank Account</DialogTitle>
          <DialogDescription className="break-words">
            Securely connect your bank accounts to automatically import transactions.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 overflow-y-auto">
          {error && (
            <Alert className="mb-6" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Connection Error</AlertTitle>
              <AlertDescription className="break-words">{error}</AlertDescription>
            </Alert>
          )}
          
          {success ? (
            <div className="flex flex-col items-center justify-center py-6">
              <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Connected Successfully!</h3>
              <p className="text-center text-muted-foreground break-words">
                Your accounts have been connected. Transactions will begin syncing shortly.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                <p className="text-sm">
                  Connect your bank accounts to Rivu to:
                </p>
                <ul className="list-disc pl-5 text-sm space-y-1">
                  <li>Automatically import transactions</li>
                  <li>Keep your transaction data up-to-date</li>
                  <li>Track spending across all your accounts</li>
                  <li>Get personalized insights</li>
                </ul>
              </div>
              
              <div className="bg-muted p-4 rounded-md mb-4">
                <h4 className="font-medium mb-2">Security & Privacy</h4>
                <p className="text-sm text-muted-foreground break-words">
                  Your credentials are never stored on our servers. We use Plaid's secure services
                  to connect to your financial institutions.
                </p>
              </div>
            </>
          )}
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-3 justify-between sm:justify-end">
          <Button onClick={onClose} variant="outline">
            {success ? 'Close' : 'Cancel'}
          </Button>
          
          {!success && (
            <Button 
              className="gap-2"
              disabled={!ready || loading || !linkToken}
              onClick={handlePlaidLinkClick}
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Building className="h-4 w-4" /> 
                  Connect Bank
                </>
              )}
            </Button>
          )}
          
          <Button 
            variant="link"
            className="text-xs sm:text-sm"
            onClick={() => {
              window.open('https://plaid.com/how-we-handle-data/', '_blank');
            }}
          >
            How is my data protected? <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}