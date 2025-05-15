import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogOut, CreditCard, Moon, Sun } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
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
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [darkMode, setDarkMode] = useState(localStorage.getItem('theme') === 'dark');
  const [isConnectBankOpen, setIsConnectBankOpen] = useState(false);
  const [passwordFormData, setPasswordFormData] = useState<PasswordFormData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
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

  // Connect bank account mutation (simulated)
  const connectBankMutation = useMutation({
    mutationFn: async () => {
      // This would be replaced with Plaid Link initialization
      // For now, we'll simulate a successful connection
      await new Promise(resolve => setTimeout(resolve, 1500));
      return { success: true };
    },
    onSuccess: () => {
      setIsConnectBankOpen(false);
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

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    
    // Apply theme change to document
    const root = window.document.documentElement;
    if (newMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    
    toast({
      title: newMode ? "Dark mode enabled" : "Light mode enabled",
      description: `The application theme has been updated.`,
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
                              onClick={() => connectBankMutation.mutate()}
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
                
                <div className="text-center py-8 text-muted-foreground">
                  <p>You don't have any connected accounts yet.</p>
                  <p className="mt-2">Connect a bank account to get started.</p>
                </div>
              </div>
            </Card>
          </TabsContent>
          
          {/* Preferences Tab */}
          <TabsContent value="preferences">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Theme Settings */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-6">Appearance</h2>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {darkMode ? (
                      <Moon className="h-5 w-5" />
                    ) : (
                      <Sun className="h-5 w-5" />
                    )}
                    <span>Dark Mode</span>
                  </div>
                  <Switch 
                    checked={darkMode} 
                    onCheckedChange={toggleDarkMode} 
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