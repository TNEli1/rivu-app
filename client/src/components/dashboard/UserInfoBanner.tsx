import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Eye, EyeOff, Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UserInfoBannerProps {
  user?: any;
}

export default function UserInfoBanner({ user }: UserInfoBannerProps) {
  const [showCredentials, setShowCredentials] = useState(false);
  const [googleUserInfo, setGoogleUserInfo] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check for stored Google OAuth user info
    const storedUserInfo = localStorage.getItem('rivu_user_info');
    if (storedUserInfo) {
      try {
        const userInfo = JSON.parse(storedUserInfo);
        setGoogleUserInfo(userInfo);
      } catch (error) {
        console.error('Error parsing stored user info:', error);
      }
    }
  }, []);

  // Only show banner for Google OAuth users who may not know their credentials
  if (!user || (user.authMethod !== 'google' && !googleUserInfo)) {
    return null;
  }

  const displayUserInfo = googleUserInfo || user;
  const isGoogleUser = displayUserInfo.authMethod === 'google' || googleUserInfo;

  const handleCopyCredentials = async () => {
    const credentials = `Username: ${displayUserInfo.username}\nEmail: ${displayUserInfo.email}\nAuth Method: ${displayUserInfo.authMethod || 'Google OAuth'}`;
    
    try {
      await navigator.clipboard.writeText(credentials);
      setCopied(true);
      toast({
        title: "Credentials Copied",
        description: "Your login credentials have been copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy credentials:', error);
      toast({
        title: "Copy Failed",
        description: "Unable to copy credentials to clipboard",
        variant: "destructive"
      });
    }
  };

  if (!isGoogleUser) return null;

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
              <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                Welcome to Rivu!
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                You're logged in with Google OAuth. Here are your account details:
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCredentials(!showCredentials)}
            className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900"
          >
            {showCredentials ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showCredentials ? 'Hide' : 'Show'} Details
          </Button>
        </div>

        {showCredentials && (
          <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-700">
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Username:</span>
                <span className="ml-2 font-mono text-blue-800 dark:text-blue-200">
                  {displayUserInfo.username}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Email:</span>
                <span className="ml-2 text-blue-800 dark:text-blue-200">
                  {displayUserInfo.email}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">Auth Method:</span>
                <span className="ml-2 text-green-600 dark:text-green-400">
                  Google OAuth (No password required)
                </span>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
              <div className="flex items-center justify-between">
                <p className="text-xs text-blue-600 dark:text-blue-400">
                  Always sign in using "Continue with Google" button
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyCredentials}
                  className="ml-2"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}