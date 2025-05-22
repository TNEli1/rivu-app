import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, FileDown, HardDrive, Shield, Trash } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function PrivacySettingsSection() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [password, setPassword] = useState("");
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  // Handle data export (JSON format)
  const handleExportData = async () => {
    try {
      setIsExporting(true);
      // Use direct window.location to trigger file download
      window.location.href = "/api/privacy/export-data";
      
      toast({
        title: "Data export started",
        description: "Your data export has been initiated. The download should begin automatically.",
      });
      
      // Reset export state after a delay to account for download starting
      setTimeout(() => setIsExporting(false), 3000);
    } catch (error) {
      console.error('Error exporting data:', error);
      setIsExporting(false);
      toast({
        title: "Export failed",
        description: "There was an error exporting your data. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Handle data export (CSV format for transactions)
  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      // Use direct window.location to trigger file download
      window.location.href = "/api/privacy/export-data/csv";
      
      toast({
        title: "CSV export started",
        description: "Your transactions CSV export has been initiated. The download should begin automatically.",
      });
      
      // Reset export state after a delay to account for download starting
      setTimeout(() => setIsExporting(false), 3000);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      setIsExporting(false);
      toast({
        title: "CSV export failed",
        description: "There was an error exporting your transactions. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Handle account deletion
  const handleDeleteAccount = async () => {
    if (confirmPhrase !== "DELETE_MY_ACCOUNT_PERMANENTLY") {
      toast({
        title: "Invalid confirmation",
        description: "Please enter the exact confirmation phrase to proceed with account deletion.",
        variant: "destructive",
      });
      return;
    }
    
    if (!password) {
      toast({
        title: "Password required",
        description: "Please enter your current password to confirm account deletion.",
        variant: "destructive",
      });
      return;
    }
    
    if (!confirmChecked) {
      toast({
        title: "Confirmation required",
        description: "Please check the confirmation box to proceed with account deletion.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsDeleting(true);
      
      const response = await apiRequest('DELETE', '/api/privacy/delete-account', {
        password,
        confirmation: confirmPhrase
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete account");
      }
      
      // Account deleted successfully, logout the user
      toast({
        title: "Account deleted",
        description: "Your account and all associated data have been permanently deleted.",
      });
      
      // Logout the user after account deletion
      logoutMutation.mutate();
      
    } catch (error: any) {
      console.error('Error deleting account:', error);
      setIsDeleting(false);
      toast({
        title: "Deletion failed",
        description: error.message || "There was an error deleting your account. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Shield className="h-5 w-5 mr-2 text-blue-500" />
          Privacy & Data Controls
        </CardTitle>
        <CardDescription>
          Manage your data and privacy preferences
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* International Users Notice */}
        {user?.countryCode && user.countryCode !== 'US' && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>International User Notice</AlertTitle>
            <AlertDescription>
              Rivu currently supports U.S. bank accounts only. International support coming soon.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Data Export Section */}
        <div>
          <h3 className="text-lg font-medium mb-2">Export Your Data</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Download a copy of all your personal data stored in Rivu.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={handleExportData}
              disabled={isExporting}
            >
              <FileDown className="h-4 w-4" />
              Export All Data (JSON)
            </Button>
            
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={handleExportCSV}
              disabled={isExporting}
            >
              <HardDrive className="h-4 w-4" />
              Export Transactions (CSV)
            </Button>
          </div>
        </div>
        
        {/* Account Deletion Section */}
        <div>
          <h3 className="text-lg font-medium mb-2 text-destructive">Delete Account</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>
          
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" className="flex items-center gap-2">
                <Trash className="h-4 w-4" />
                Delete My Account
              </Button>
            </DialogTrigger>
            
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-destructive">Delete Your Account</DialogTitle>
                <DialogDescription>
                  This will permanently delete your account and all your data. This action cannot be reversed.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Warning</AlertTitle>
                  <AlertDescription>
                    All your transactions, goals, budget settings, and personal information will be permanently deleted.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Your Password</Label>
                  <Input 
                    id="password" 
                    type="password"
                    placeholder="Enter your current password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-phrase">Type "DELETE_MY_ACCOUNT_PERMANENTLY" to confirm</Label>
                  <Input 
                    id="confirm-phrase"
                    placeholder="DELETE_MY_ACCOUNT_PERMANENTLY"
                    value={confirmPhrase}
                    onChange={(e) => setConfirmPhrase(e.target.value)}
                  />
                </div>
                
                <div className="flex items-start space-x-2 pt-2">
                  <Checkbox 
                    id="confirm-delete" 
                    checked={confirmChecked} 
                    onCheckedChange={(checked) => setConfirmChecked(checked === true)}
                  />
                  <Label
                    htmlFor="confirm-delete"
                    className="text-sm font-normal leading-tight"
                  >
                    I understand this action is permanent and all my data will be deleted
                  </Label>
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setDeleteDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  disabled={
                    isDeleting || 
                    confirmPhrase !== "DELETE_MY_ACCOUNT_PERMANENTLY" || 
                    !password || 
                    !confirmChecked
                  }
                >
                  {isDeleting ? "Deleting..." : "Delete Account Permanently"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Data Management Section */}
        <div>
          <h3 className="text-lg font-medium mb-2">Privacy Contact</h3>
          <p className="text-sm text-muted-foreground mb-1">
            For privacy-related inquiries or requests, please contact:
          </p>
          <a 
            href="mailto:privacy@tryrivu.com" 
            className="text-sm text-primary hover:underline"
          >
            privacy@tryrivu.com
          </a>
        </div>
      </CardContent>
      
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          Your privacy is important to us. Please review our{" "}
          <a href="/privacy" className="text-primary hover:underline" target="_blank">
            Privacy Policy
          </a>{" "}
          for more information.
        </div>
      </CardFooter>
    </Card>
  );
}