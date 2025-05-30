import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Loader2, User, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import ConnectedAccountsSection from "@/components/settings/ConnectedAccountsSection";

export default function AccountPage() {
  const { user, updateProfileMutation, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [username, setUsername] = useState(user?.username || "");
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  
  if (!user) {
    return <div>Loading...</div>;
  }
  
  const joinDate = user.createdAt 
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'N/A';
  
  // Check if username is unique
  const checkUsernameUnique = async (newUsername: string) => {
    // Only check if username is different from current username
    if (newUsername === user.username) {
      return true;
    }
    
    try {
      setIsCheckingUsername(true);
      setUsernameError("");
      
      // Call the API endpoint to check username availability
      const res = await fetch(`/api/check-username?username=${encodeURIComponent(newUsername)}`);
      const data = await res.json();
      
      if (!res.ok) {
        setUsernameError(data.message || "Error checking username");
        return false;
      }
      
      return data.available;
    } catch (error) {
      setUsernameError("Error checking username availability");
      return false;
    } finally {
      setIsCheckingUsername(false);
    }
  };
  
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    
    const newUsername = formData.get('username') as string;
    const currentPassword = formData.get('currentPassword') as string;
    
    // Only validate username if it changed
    if (newUsername !== user.username) {
      // Check username uniqueness
      const isUnique = await checkUsernameUnique(newUsername);
      
      if (!isUnique) {
        toast({
          title: "Username not available",
          description: "Please choose a different username",
          variant: "destructive"
        });
        return;
      }
    }
    
    const profileData = {
      firstName: formData.get('firstName') as string || undefined,
      lastName: formData.get('lastName') as string || undefined,
      email: formData.get('email') as string || undefined,
      username: newUsername !== user.username ? newUsername : undefined,
      currentPassword: currentPassword || undefined,
    };
    
    updateProfileMutation.mutate(profileData);
  };
  
  const handlePasswordUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== passwordConfirm) {
      toast({
        title: "Passwords don't match",
        description: "Please ensure both passwords match",
        variant: "destructive"
      });
      return;
    }
    
    updateProfileMutation.mutate({
      password: newPassword
    });
    
    // Reset the form fields
    setNewPassword("");
    setPasswordConfirm("");
  };
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  return (
    <div className="container max-w-4xl py-10">
      <Link to="/">
        <Button variant="ghost" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </Link>
      
      <div className="flex items-center gap-4 mb-8">
        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="h-10 w-10 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Account Settings</h1>
          <p className="text-muted-foreground">
            Manage your account preferences and profile
          </p>
        </div>
      </div>
      
      <div className="grid gap-6">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Update your personal details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input 
                    id="firstName" 
                    name="firstName" 
                    defaultValue={user.firstName || ""} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input 
                    id="lastName" 
                    name="lastName" 
                    defaultValue={user.lastName || ""} 
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  name="email" 
                  type="email" 
                  defaultValue={user.email || ""} 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <Input 
                    id="username"
                    name="username"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setUsernameError(""); // Clear error when typing
                    }}
                  />
                  {isCheckingUsername && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
                {usernameError ? (
                  <p className="text-sm text-destructive">{usernameError}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Username can be changed once per day
                  </p>
                )}
              </div>
              
              {/* Current Password for security verification (only for sensitive changes) */}
              {(user as any).authMethod !== 'google' && (
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input 
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    placeholder="Required for username/email changes"
                  />
                  <p className="text-sm text-muted-foreground">
                    Enter your current password to verify sensitive changes
                  </p>
                </div>
              )}
              
              <Button type="submit" disabled={updateProfileMutation.isPending}>
                {updateProfileMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle>
              {(user as any).authMethod === 'google' ? 'Add Fallback Password' : 'Change Password'}
            </CardTitle>
            <CardDescription>
              {(user as any).authMethod === 'google' 
                ? 'Add a password as backup authentication method. You can continue using Google sign-in.'
                : 'Update your password'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              {(user as any).authMethod === 'google' && (
                <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Note:</strong> Adding a password will enable hybrid authentication. 
                    You'll be able to sign in with either Google or your username/password.
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="newPassword">
                  {(user as any).authMethod === 'google' ? 'Create Password' : 'New Password'}
                </Label>
                <Input 
                  id="newPassword" 
                  name="newPassword" 
                  type="password" 
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input 
                  id="confirmPassword" 
                  name="confirmPassword" 
                  type="password" 
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  required
                />
              </div>
              
              <Button type="submit" disabled={updateProfileMutation.isPending}>
                {updateProfileMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        {/* Connected Bank Accounts - Added for 1033 Compliance */}
        <ConnectedAccountsSection />
        
        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              View information about your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-medium">Member Since</p>
              <p className="text-sm text-muted-foreground">{joinDate}</p>
            </div>
            
            <Separator />
            
            {/* Rivu Score section removed as per bug report */}
          </CardContent>
          <CardFooter>
            <Button 
              variant="destructive" 
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              {logoutMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging out...
                </>
              ) : (
                "Log Out"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}