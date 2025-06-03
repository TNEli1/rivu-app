import React, { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Settings, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PlaidEnvironmentSwitcher() {
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();

  const currentDomain = window.location.origin;
  const expectedProductionDomain = 'https://www.tryrivu.com';
  const isDomainMismatch = currentDomain !== expectedProductionDomain && window.location.hostname !== 'localhost';

  const handleSwitchToSandbox = async () => {
    setIsChecking(true);
    toast({
      title: "Environment Switch Required",
      description: "Contact your admin to switch PLAID_ENV from 'production' to 'sandbox' for testing on this domain",
      duration: 8000,
    });
    setIsChecking(false);
  };

  if (!isDomainMismatch) return null;

  return (
    <Alert className="mb-4 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
      <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
      <AlertDescription>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-red-800 dark:text-red-200">
              Plaid Environment Configuration Issue
            </h4>
            <Badge variant="destructive">Production Mode</Badge>
          </div>
          
          <div className="text-sm text-red-700 dark:text-red-300 space-y-2">
            <p>
              <strong>Issue:</strong> You're running Plaid in production mode on a development domain.
            </p>
            <p>
              <strong>Current domain:</strong> <code className="bg-red-100 dark:bg-red-900 px-1 rounded text-xs">{currentDomain}</code>
            </p>
            <p>
              <strong>Expected domain:</strong> <code className="bg-red-100 dark:bg-red-900 px-1 rounded text-xs">{expectedProductionDomain}</code>
            </p>
          </div>

          <div className="text-sm text-red-700 dark:text-red-300">
            <p className="font-medium mb-2">Solutions:</p>
            <div className="space-y-2">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded border-l-4 border-red-400">
                <p className="font-medium">Option 1: Switch to Sandbox (Recommended for testing)</p>
                <p className="text-xs mt-1">Set PLAID_ENV environment variable to 'sandbox'</p>
              </div>
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded border-l-4 border-red-400">
                <p className="font-medium">Option 2: Update Plaid Dashboard</p>
                <p className="text-xs mt-1">Add {currentDomain}/plaid-callback to your Plaid redirect URIs</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSwitchToSandbox}
              disabled={isChecking}
              className="text-red-700 border-red-300 hover:bg-red-100 dark:text-red-300 dark:border-red-700 dark:hover:bg-red-900"
            >
              <Settings className="h-3 w-3 mr-1" />
              Request Sandbox Mode
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://dashboard.plaid.com/team/api', '_blank')}
              className="text-red-700 border-red-300 hover:bg-red-100 dark:text-red-300 dark:border-red-700 dark:hover:bg-red-900"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Plaid Dashboard
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}