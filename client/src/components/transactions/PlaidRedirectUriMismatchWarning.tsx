import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ExternalLink, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PlaidRedirectUriMismatchWarning() {
  const [showWarning, setShowWarning] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const currentDomain = window.location.origin;
  const expectedDomain = 'https://www.tryrivu.com';
  const isDomainMismatch = currentDomain !== expectedDomain;

  useEffect(() => {
    // Only show warning if there's a domain mismatch and we're in production mode
    const isProduction = window.location.hostname !== 'localhost';
    setShowWarning(isDomainMismatch && isProduction);
  }, [isDomainMismatch]);

  const handleCopyRedirectUri = async () => {
    const redirectUri = `${currentDomain}/plaid-callback`;
    try {
      await navigator.clipboard.writeText(redirectUri);
      setCopied(true);
      toast({
        title: "Redirect URI Copied",
        description: "The correct redirect URI has been copied to your clipboard",
      });
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      console.error('Failed to copy redirect URI:', error);
    }
  };

  if (!showWarning) return null;

  return (
    <Alert className="mb-4 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertDescription>
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">
              Plaid Redirect URI Mismatch Detected
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Your Plaid dashboard is configured for <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">
                {expectedDomain}/plaid-callback
              </code> but you're running on <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">
                {currentDomain}
              </code>
            </p>
          </div>
          
          <div className="text-sm text-amber-700 dark:text-amber-300">
            <p className="font-medium mb-2">This causes OAuth banks (like Chase) to show the phone verification screen.</p>
            <p className="mb-3">To fix this issue:</p>
            <ol className="list-decimal list-inside space-y-1 mb-3">
              <li>Go to your Plaid Dashboard</li>
              <li>Navigate to Team Settings → API</li>
              <li>Update the redirect URI to: <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">{currentDomain}/plaid-callback</code></li>
              <li>Save the changes</li>
            </ol>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyRedirectUri}
              className="text-amber-700 border-amber-300 hover:bg-amber-100 dark:text-amber-300 dark:border-amber-700 dark:hover:bg-amber-900"
            >
              {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
              {copied ? 'Copied!' : 'Copy Redirect URI'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://dashboard.plaid.com/team/api', '_blank')}
              className="text-amber-700 border-amber-300 hover:bg-amber-100 dark:text-amber-300 dark:border-amber-700 dark:hover:bg-amber-900"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Open Plaid Dashboard
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}