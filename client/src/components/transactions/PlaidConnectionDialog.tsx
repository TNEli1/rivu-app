import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PlaidLinkButton } from './PlaidLinkButton';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { queryClient } from '@/lib/queryClient';
import { Building, Shield, ChevronRight, CheckCircle2 } from 'lucide-react';

interface PlaidConnectionDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function PlaidConnectionDialog({ 
  trigger, 
  onSuccess 
}: PlaidConnectionDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'intro' | 'connecting' | 'success'>('intro');
  const { toast } = useToast();

  const handlePlaidSuccess = async (publicToken: string, metadata: any) => {
    try {
      const response = await apiRequest(
        'POST',
        '/api/plaid/exchange-public-token',
        { public_token: publicToken }
      );

      const data = await response.json();
      console.log("Public token exchanged for access token:", data);
      
      // Invalidate any relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/accounts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      
      // Show success message
      setStep('success');
      
      // Notify user
      toast({
        title: "Bank Account Connected",
        description: "Your bank account has been successfully linked to Rivu.",
        variant: "default"
      });
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error exchanging public token:', error);
      toast({
        title: "Connection Error",
        description: "There was an issue securing your bank connection. Please try again.",
        variant: "destructive"
      });
      setStep('intro');
    }
  };

  const handlePlaidExit = (error?: any) => {
    if (error) {
      console.error("Plaid Link exit with error:", error);
      toast({
        title: "Connection Cancelled",
        description: "The bank connection process was cancelled or encountered an error.",
        variant: "destructive"
      });
      setStep('intro');
    } else {
      console.log("Plaid Link exit without error");
      // User just closed the Plaid Link
      setStep('intro');
    }
  };

  const handleClose = () => {
    // Reset the state when dialog is closed
    setOpen(false);
    setTimeout(() => {
      setStep('intro');
    }, 300);
  };

  const handleStartConnection = () => {
    setStep('connecting');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Building className="mr-2 h-4 w-4" />
            Connect Bank
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        {step === 'intro' && (
          <>
            <DialogHeader>
              <DialogTitle>Connect Your Bank Account</DialogTitle>
              <DialogDescription>
                Securely connect your bank account to enable automatic transaction imports and financial insights.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <div className="flex items-start">
                  <Shield className="h-5 w-5 mr-2 text-primary" />
                  <p className="text-sm">Your credentials are never stored on our servers</p>
                </div>
                <div className="flex items-start">
                  <Shield className="h-5 w-5 mr-2 text-primary" />
                  <p className="text-sm">Bank-level encryption protects your financial data</p>
                </div>
                <div className="flex items-start">
                  <Shield className="h-5 w-5 mr-2 text-primary" />
                  <p className="text-sm">Rivu can only view your transaction data, not move money</p>
                </div>
              </div>
              <Button 
                className="w-full" 
                onClick={handleStartConnection}
              >
                Continue to Secure Connection
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {step === 'connecting' && (
          <>
            <DialogHeader>
              <DialogTitle>Connect Your Bank</DialogTitle>
              <DialogDescription>
                Select your bank and enter your credentials through the secure Plaid interface.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-6">
              <PlaidLinkButton 
                buttonText="Launch Secure Connection"
                onSuccess={handlePlaidSuccess}
                onExit={handlePlaidExit}
                className="w-full"
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              By continuing, you agree to authorize Rivu to access your financial data using Plaid's secure services.
            </p>
          </>
        )}

        {step === 'success' && (
          <>
            <DialogHeader>
              <DialogTitle>Bank Connected Successfully</DialogTitle>
              <DialogDescription>
                Your bank account has been securely linked to Rivu.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <p className="text-center">
                Your transactions will begin syncing shortly. This may take a few minutes.
              </p>
              <Button 
                className="w-full" 
                onClick={handleClose}
              >
                Done
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default PlaidConnectionDialog;