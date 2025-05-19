import React, { useState, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Loader2 } from 'lucide-react';

interface PlaidLinkButtonProps {
  onSuccess?: (publicToken: string, metadata: any) => void;
  onExit?: (error?: any) => void;
  buttonText?: string;
  className?: string;
}

export function PlaidLinkButton({
  onSuccess,
  onExit,
  buttonText = "Connect Bank Account",
  className = ""
}: PlaidLinkButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const { toast } = useToast();

  // Configure Plaid Link
  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: (public_token, metadata) => {
      console.log("Plaid Link success:", metadata);
      
      // Call the onSuccess callback if provided
      if (onSuccess) {
        onSuccess(public_token, metadata);
      } else {
        // Default behavior if no callback provided - exchange the token
        handleExchangePublicToken(public_token);
      }
    },
    onExit: (err, metadata) => {
      console.log("Plaid Link exit:", metadata, err);
      if (err) {
        console.error("Plaid Link error:", err);
        toast({
          title: "Connection Error",
          description: "There was an issue connecting to your bank. Please try again.",
          variant: "destructive"
        });
      }
      
      if (onExit) {
        onExit(err);
      }
      
      setIsLoading(false);
    }
  });

  const handleExchangePublicToken = async (publicToken: string) => {
    try {
      const response = await apiRequest(
        "POST",
        '/api/plaid/exchange-public-token', 
        { public_token: publicToken }
      );

      const data = await response.json();
      console.log("Public token exchanged for access token:", data);
      
      toast({
        title: "Account Connected!",
        description: "Your bank account has been successfully connected.",
        variant: "default"
      });
    } catch (error) {
      console.error('Error exchanging public token:', error);
      toast({
        title: "Connection Error",
        description: "Failed to secure connection with your bank. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to create a link token
  const createLinkToken = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest(
        "POST",
        '/api/plaid/create-link-token',
        undefined
      );

      const data = await response.json();
      console.log("Link token created:", data);
      setLinkToken(data.link_token);
      
      // Open Plaid Link once the token is received
      setTimeout(() => {
        if (data.link_token) {
          open();
        }
      }, 100);
    } catch (error) {
      console.error('Error creating link token:', error);
      toast({
        title: "Setup Error",
        description: "We couldn't initialize the bank connection. Please try again later.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  }, [open, toast]);

  // Handle the button click
  const handleClick = useCallback(() => {
    if (!linkToken) {
      createLinkToken();
    } else {
      open();
    }
  }, [linkToken, createLinkToken, open]);

  return (
    <Button 
      onClick={handleClick}
      disabled={!ready || isLoading}
      className={className}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : (
        buttonText
      )}
    </Button>
  );
}

export default PlaidLinkButton;