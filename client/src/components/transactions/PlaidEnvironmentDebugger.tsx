import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Settings, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface PlaidEnvironmentInfo {
  environment: string;
  isProduction: boolean;
  redirectUri: string;
  webhook: string;
  clientIdPresent: boolean;
  secretPresent: boolean;
  baseUrl: string;
}

export default function PlaidEnvironmentDebugger() {
  const [envInfo, setEnvInfo] = useState<PlaidEnvironmentInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchEnvironmentInfo = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest('GET', '/api/plaid/environment');
      if (response.ok) {
        const data = await response.json();
        setEnvInfo(data);
      } else {
        throw new Error('Failed to fetch environment info');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch Plaid environment information');
      console.error('Plaid environment fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEnvironmentInfo();
  }, []);

  const handleRefresh = () => {
    fetchEnvironmentInfo();
    toast({
      title: "Environment Info Refreshed",
      description: "Plaid configuration has been reloaded",
    });
  };

  const getEnvironmentStatus = () => {
    if (!envInfo) return null;
    
    const issues = [];
    if (!envInfo.clientIdPresent) issues.push("Missing Client ID");
    if (!envInfo.secretPresent) issues.push("Missing Secret");
    if (envInfo.isProduction && !envInfo.redirectUri.includes('https://')) {
      issues.push("Production requires HTTPS redirect URI");
    }
    
    return {
      isHealthy: issues.length === 0,
      issues
    };
  };

  const status = getEnvironmentStatus();

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center">
          <Settings className="h-4 w-4 mr-2" />
          Plaid Environment Configuration
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {envInfo && (
          <div className="space-y-4">
            {/* Environment Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {status?.isHealthy ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className="font-medium">
                  {status?.isHealthy ? 'Configuration Healthy' : 'Configuration Issues'}
                </span>
              </div>
              <Badge variant={envInfo.isProduction ? 'default' : 'secondary'}>
                {envInfo.environment.toUpperCase()}
              </Badge>
            </div>

            {/* Configuration Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <label className="font-medium text-gray-700 dark:text-gray-300">
                  Environment:
                </label>
                <p className="text-gray-600 dark:text-gray-400">{envInfo.environment}</p>
              </div>
              
              <div>
                <label className="font-medium text-gray-700 dark:text-gray-300">
                  Base URL:
                </label>
                <p className="text-gray-600 dark:text-gray-400">{envInfo.baseUrl}</p>
              </div>
              
              <div>
                <label className="font-medium text-gray-700 dark:text-gray-300">
                  Redirect URI:
                </label>
                <p className="text-gray-600 dark:text-gray-400 break-all">
                  {envInfo.redirectUri}
                </p>
              </div>
              
              <div>
                <label className="font-medium text-gray-700 dark:text-gray-300">
                  Webhook URL:
                </label>
                <p className="text-gray-600 dark:text-gray-400 break-all">
                  {envInfo.webhook}
                </p>
              </div>
              
              <div>
                <label className="font-medium text-gray-700 dark:text-gray-300">
                  Client ID:
                </label>
                <p className={`${envInfo.clientIdPresent ? 'text-green-600' : 'text-red-600'}`}>
                  {envInfo.clientIdPresent ? 'Present' : 'Missing'}
                </p>
              </div>
              
              <div>
                <label className="font-medium text-gray-700 dark:text-gray-300">
                  Secret Key:
                </label>
                <p className={`${envInfo.secretPresent ? 'text-green-600' : 'text-red-600'}`}>
                  {envInfo.secretPresent ? 'Present' : 'Missing'}
                </p>
              </div>
            </div>

            {/* Issues List */}
            {status && !status.isHealthy && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-2">Configuration Issues:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {status.issues.map((issue, index) => (
                      <li key={index} className="text-sm">{issue}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Production Warning */}
            {envInfo.isProduction && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium">Production Environment Active</div>
                  <p className="text-sm mt-1">
                    Ensure your redirect URI ({envInfo.redirectUri}) is exactly configured in your Plaid Dashboard.
                    OAuth banks like Chase require exact URI matching.
                  </p>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Loading environment info...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}