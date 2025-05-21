import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'wouter';
import { Building, Loader2, RefreshCw, Unlink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Type definitions
type PlaidItem = {
  id: number;
  institutionId: string;
  institutionName: string;
  status: 'active' | 'disconnected' | 'error';
  lastUpdated: string;
  accounts: PlaidAccount[];
};

type PlaidAccount = {
  id: number;
  name: string;
  officialName?: string;
  type: string;
  subtype?: string;
  mask?: string;
  currentBalance?: string;
};

export default function ConnectedAccountsSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [unlinkItemId, setUnlinkItemId] = useState<number | null>(null);
  
  // Fetch connected bank accounts
  const { data: plaidItems, isLoading } = useQuery<PlaidItem[]>({
    queryKey: ['/api/plaid/items'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/plaid/items');
        return await res.json();
      } catch (error) {
        console.error('Error fetching connected accounts:', error);
        return [];
      }
    }
  });
  
  // Mutation to refresh account data
  const refreshMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const res = await apiRequest('POST', `/api/plaid/refresh/${itemId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/summary'] });
      toast({
        title: "Account Refreshed",
        description: "Your account data has been updated successfully."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Refresh Failed",
        description: error.message || "Failed to refresh account data. Please try again.",
        variant: "destructive"
      });
    }
  });
  
  // Mutation to disconnect a bank account
  const disconnectMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const res = await apiRequest('DELETE', `/api/plaid/disconnect/${itemId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/plaid/items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/summary'] });
      toast({
        title: "Account Unlinked",
        description: "Your bank account has been unlinked successfully."
      });
      setUnlinkItemId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Unlink Failed",
        description: error.message || "Failed to unlink bank account. Please try again.",
        variant: "destructive"
      });
      setUnlinkItemId(null);
    }
  });
  
  const handleRefresh = (itemId: number) => {
    refreshMutation.mutate(itemId);
  };
  
  const handleUnlink = (itemId: number) => {
    disconnectMutation.mutate(itemId);
  };
  
  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>
            Manage your connected bank accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Connected Accounts</CardTitle>
        <CardDescription>
          Manage your connected bank accounts and data
        </CardDescription>
      </CardHeader>
      <CardContent>
        {plaidItems && plaidItems.length > 0 ? (
          <div className="space-y-4">
            {plaidItems.map((item) => (
              <div 
                key={item.id} 
                className="border rounded-lg p-4 bg-card"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-primary" />
                      <h3 className="font-medium">{item.institutionName}</h3>
                      {item.status === 'active' ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                          Active
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100">
                          {item.status === 'disconnected' ? 'Disconnected' : 'Error'}
                        </span>
                      )}
                    </div>
                    
                    <div className="mt-1 text-sm text-muted-foreground">
                      {item.accounts.length} {item.accounts.length === 1 ? 'account' : 'accounts'} ·
                      Last updated {formatDistanceToNow(new Date(item.lastUpdated), { addSuffix: true })}
                    </div>
                    
                    <div className="mt-2">
                      <ul className="text-sm">
                        {item.accounts.map((account) => (
                          <li key={account.id} className="flex justify-between py-1">
                            <span>
                              {account.name}
                              {account.mask && <span className="text-muted-foreground ml-1">••{account.mask}</span>}
                            </span>
                            {account.currentBalance && (
                              <span className="font-medium">
                                ${parseFloat(account.currentBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRefresh(item.id)}
                      disabled={refreshMutation.isPending}
                      className="flex-1 md:flex-initial"
                    >
                      {refreshMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Refreshing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Refresh
                        </>
                      )}
                    </Button>
                    
                    <AlertDialog open={unlinkItemId === item.id} onOpenChange={(open) => !open && setUnlinkItemId(null)}>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 md:flex-initial text-destructive border-destructive hover:bg-destructive/10"
                          onClick={() => setUnlinkItemId(item.id)}
                          disabled={disconnectMutation.isPending}
                        >
                          {disconnectMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Unlinking...
                            </>
                          ) : (
                            <>
                              <Unlink className="mr-2 h-4 w-4" />
                              Unlink Bank
                            </>
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Unlink Bank Account</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will disconnect {item.institutionName} from your Rivu account. Your transaction history
                            will be preserved, but new transactions will no longer be imported automatically.
                            <br /><br />
                            In accordance with banking regulations, all your connection data with this institution
                            will be removed from our servers.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleUnlink(item.id)}>
                            {disconnectMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Unlinking...
                              </>
                            ) : (
                              "Unlink Bank"
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 space-y-4">
            <Building className="h-16 w-16 mx-auto text-muted-foreground" />
            <div>
              <h3 className="text-lg font-medium">No bank accounts connected</h3>
              <p className="text-muted-foreground">
                Connect your bank accounts to automatically import transactions and get personalized insights.
              </p>
            </div>
            <Link to="/transactions">
              <Button className="mt-2">
                <Building className="mr-2 h-4 w-4" />
                Connect Bank
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-start border-t pt-4">
        <div className="text-xs text-muted-foreground">
          <p className="mb-1">
            Your privacy and security is our top priority. We never store your bank credentials.
          </p>
          <p>
            To completely delete your account and all associated data, please email{' '}
            <a href="mailto:support@tryrivu.com" className="underline hover:text-primary">
              support@tryrivu.com
            </a>
          </p>
        </div>
      </CardFooter>
    </Card>
  );
}