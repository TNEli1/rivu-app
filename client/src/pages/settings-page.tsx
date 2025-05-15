import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import PlaidRefreshButton from "@/components/account/PlaidRefreshButton";
import PlaidDisconnectButton from "@/components/account/PlaidDisconnectButton";
import SimulatePlaidConnection from "@/components/account/SimulatePlaidConnection";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogOut, CreditCard, Moon, Sun, ClipboardCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
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
} from "@/components/ui/alert-dialog";

type PasswordFormData = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function SettingsPage() {
  const { user, logoutMutation, updateDemographicsMutation } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [skipSurvey, setSkipSurvey] = useState(user?.demographics?.skipPermanently || false);
  const [isConnectBankOpen, setIsConnectBankOpen] = useState(false);
  const [passwordFormData, setPasswordFormData] = useState<PasswordFormData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  
  // Define type for connected accounts
  type ConnectedAccount = {
    id: string;
    name: string;
    type: string;
    status: string;
    lastUpdated: string;
  };
  
  // Fetch connected bank accounts
  const { data: connectedAccounts = [], refetch: refetchAccounts } = useQuery<ConnectedAccount[]>({
    queryKey: ['/api/plaid/accounts'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Password change mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const res = await apiRequest('PUT', '/api/user/password', data);
      return res.json();
    },
    onSuccess: () => {
      setPasswordFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update password",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Connect bank account mutation with Plaid
  const connectBankMutation = useMutation({
    mutationFn: async (bank: string) => {
      // In a real implementation, this would call a backend endpoint to create a link token
      // and initialize Plaid Link
      try {
        const res = await apiRequest('POST', '/api/plaid/link-token', { bank });
        const linkToken = await res.json();
        
        if (!linkToken.link_token) {
          throw new Error("Bank connection failed. No token received.");
        }
        
        // In a real implementation, this would open Plaid Link
        // Simulate sandbox authentication
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // After Plaid Link success, exchange public token for access token
        const exchangeRes = await apiRequest('POST', '/api/plaid/exchange-token', { 
          public_token: "simulated_public_token",
          bank_name: bank
        });
        
        return exchangeRes.json();
      } catch (error: any) {
        console.error("Plaid connection error:", error);
        throw new Error("Bank connection failed. " + (error.message || "Unknown error"));
      }
    },
    onSuccess: () => {
      setIsConnectBankOpen(false);
      // Refresh the list of connected accounts
      refetchAccounts();
      toast({
        title: "Bank account connected",
        description: "Your bank account has been successfully linked.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to connect bank",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordFormData.newPassword !== passwordFormData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "The new password and confirmation do not match.",
        variant: "destructive",
      });
      return;
    }
    
    if (passwordFormData.newPassword.length < 8) {
      toast({
        title: "Password too short",
        description: "The new password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }
    
    changePasswordMutation.mutate({
      currentPassword: passwordFormData.currentPassword,
      newPassword: passwordFormData.newPassword,
    });
  };

  const handleThemeToggle = () => {
    toggleTheme();
    
    toast({
      title: theme === 'light' ? "Dark mode enabled" : "Light mode enabled",
      description: `The application theme has been updated.`,
    });
  };

  const toggleSkipSurvey = () => {
    const newValue = !skipSurvey;
    setSkipSurvey(newValue);
    
    // Update user demographics
    updateDemographicsMutation.mutate({
      demographics: {
        skipPermanently: newValue,
        completed: user?.demographics?.completed || false,
      }
    }, {
      onSuccess: () => {
        toast({
          title: newValue ? "Survey disabled" : "Survey enabled",
          description: newValue 
            ? "You won't be prompted with the onboarding survey anymore." 
            : "You may see the onboarding survey on next login if not yet completed.",
        });
      },
      onError: () => {
        // Revert UI state on error
        setSkipSurvey(!newValue);
        toast({
          title: "Error updating preferences",
          description: "There was a problem saving your survey preferences.",
          variant: "destructive"
        });
      }
    });
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Sidebar - Desktop only */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-grow md:ml-64 p-4 md:p-8 pb-20 md:pb-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your account and application preferences</p>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="accounts" className="mb-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="accounts">External Accounts</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>
          
          {/* External Accounts Tab */}
          <TabsContent value="accounts">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6">Connected Bank Accounts</h2>
              
              <div className="mb-6">
                <p className="text-muted-foreground mb-4">
                  Connect your bank accounts to automatically import transactions and keep your financial data up to date.
                </p>
                
                <Dialog open={isConnectBankOpen} onOpenChange={setIsConnectBankOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary hover:bg-primary/90 text-white">
                      <CreditCard className="mr-2 h-4 w-4" /> Connect Bank Account
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Connect Your Bank</DialogTitle>
                      <DialogDescription>
                        You'll be redirected to your bank's website to complete the connection process.
                        Your credentials are never stored by Rivu.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Select your bank</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {['Chase', 'Bank of America', 'Wells Fargo', 'Citibank', 'Capital One', 'Other'].map((bank) => (
                            <Button 
                              key={bank} 
                              variant="outline" 
                              className="justify-start h-16"
                              onClick={() => connectBankMutation.mutate(bank)}
                            >
                              {bank}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsConnectBankOpen(false)}>
                        Cancel
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              
              <div className="border-t pt-6">
                <h3 className="font-medium mb-4">Connected Accounts</h3>
                
                {connectedAccounts.length > 0 ? (
                  <div className="space-y-4">
                    {connectedAccounts.map((account) => (
                      <div key={account.id} className="border rounded-lg p-4 flex justify-between items-center">
                        <div>
                          <div className="font-medium">{account.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {account.type} · Connected {new Date(account.lastUpdated).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <PlaidRefreshButton 
                            accountId={account.id}
                            onSuccess={refetchAccounts}
                          />
                          <PlaidDisconnectButton
                            accountId={account.id}
                            bankName={account.name}
                            onSuccess={refetchAccounts}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>You don't have any connected accounts yet.</p>
                    <p className="mt-2">Connect a bank account to get started.</p>
                    
                    {/* Simulation button for easy testing */}
                    {import.meta.env.MODE !== 'production' && (
                      <div className="mt-4 px-8">
                        <SimulatePlaidConnection onSuccess={refetchAccounts} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>
          
          {/* Preferences Tab */}
          <TabsContent value="preferences">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Theme Settings */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-6">Appearance</h2>
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    {theme === 'dark' ? (
                      <Moon className="h-5 w-5" />
                    ) : (
                      <Sun className="h-5 w-5" />
                    )}
                    <span>Dark Mode</span>
                  </div>
                  <Switch 
                    checked={theme === 'dark'} 
                    onCheckedChange={handleThemeToggle} 
                  />
                </div>
                
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="flex items-center space-x-2">
                    <ClipboardCheck className="h-5 w-5" />
                    <span>Skip Onboarding Survey</span>
                  </div>
                  <Switch 
                    checked={skipSurvey} 
                    onCheckedChange={toggleSkipSurvey} 
                  />
                </div>
              </Card>
              
              {/* Security Settings */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-6">Security</h2>
                
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input 
                      id="current-password" 
                      type="password" 
                      value={passwordFormData.currentPassword}
                      onChange={(e) => setPasswordFormData({...passwordFormData, currentPassword: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input 
                      id="new-password" 
                      type="password" 
                      value={passwordFormData.newPassword}
                      onChange={(e) => setPasswordFormData({...passwordFormData, newPassword: e.target.value})}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                    <Input 
                      id="confirm-password" 
                      type="password" 
                      value={passwordFormData.confirmPassword}
                      onChange={(e) => setPasswordFormData({...passwordFormData, confirmPassword: e.target.value})}
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    disabled={changePasswordMutation.isPending}
                  >
                    {changePasswordMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : 'Change Password'}
                  </Button>
                </form>
              </Card>
            </div>
            
            {/* Account Actions */}
            <Card className="p-6 mt-6">
              <h2 className="text-xl font-semibold mb-6">Account Actions</h2>
              
              <div className="space-y-4">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full sm:w-auto">
                      <LogOut className="mr-2 h-4 w-4" />
                      Log Out
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
                      <AlertDialogDescription>
                        You will need to log in again to access your account.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleLogout}
                        disabled={logoutMutation.isPending}
                      >
                        {logoutMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : 'Log Out'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}