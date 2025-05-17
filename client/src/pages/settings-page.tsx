import React, { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Moon, Sun, ClipboardCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
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

export default function SettingsPage() {
  const { user, logoutMutation, updateDemographicsMutation } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [skipSurvey, setSkipSurvey] = useState(user?.demographics?.skipPermanently || false);
  
  // Handle theme toggle
  const handleThemeToggle = () => {
    toggleTheme();
    toast({
      title: theme === 'dark' ? "Light Mode Enabled" : "Dark Mode Enabled",
      description: `You've switched to ${theme === 'dark' ? 'light' : 'dark'} mode.`,
    });
  };
  
  // Handle survey toggle
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

        {/* Settings Section */}
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
            
            {/* Skip onboarding survey toggle removed as per bug report */}
          </Card>
          
          {/* Account Actions */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-6">Account</h2>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full mb-4 text-destructive border-destructive hover:bg-destructive/10"
                >
                  <LogOut className="mr-2 h-4 w-4" /> Sign Out
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure you want to sign out?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You will need to sign in again to access your account.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLogout}>
                    Sign Out
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            <div className="mt-4">
              <p className="text-sm text-muted-foreground">
                Last login: {user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Unknown'}
              </p>
            </div>
          </Card>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}