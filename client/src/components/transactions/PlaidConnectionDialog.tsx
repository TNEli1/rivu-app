import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertCircle, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface PlaidConnectionDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PlaidConnectionDialog({ isOpen, onClose }: PlaidConnectionDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bank Connection</DialogTitle>
          <DialogDescription>
            Connect your bank accounts to automatically import transactions.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-6">
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Coming Soon</AlertTitle>
            <AlertDescription>
              Plaid connection is coming soon. Manual entry and CSV upload are available in the meantime.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              When available, bank connection will allow you to:
            </p>
            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
              <li>Automatically import transactions from your bank accounts</li>
              <li>Keep your transaction data up-to-date</li>
              <li>Avoid manual data entry</li>
            </ul>
          </div>
        </div>
        
        <DialogFooter className="flex justify-between sm:justify-end">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
          <Button 
            variant="secondary"
            className="gap-2"
            onClick={() => {
              window.open('https://plaid.com/what-is-plaid/', '_blank');
            }}
          >
            Learn More <ExternalLink className="h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}