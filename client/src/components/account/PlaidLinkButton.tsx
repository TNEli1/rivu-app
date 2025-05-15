import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useAuth, User } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Link2 } from "lucide-react";
import SimulatePlaidConnection from "./SimulatePlaidConnection";

type PlaidLinkButtonProps = {
  className?: string;
  variant?: "default" | "outline" | "destructive" | "secondary" | "ghost" | "link";
  // Callback called after successful connection
  onSuccess?: () => void;
};

export default function PlaidLinkButton({ 
  className = "", 
  variant = "default", 
  onSuccess 
}: PlaidLinkButtonProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Check if user's plaidData indicates they're already connected
  const isConnected = user?.plaidData?.status === 'connected';
  
  // Create link token mutation
  const linkTokenMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/plaid/link-token');
      return res.json();
    },
    onSuccess: (data) => {
      // In a real implementation, this would use Plaid Link SDK to launch the Plaid connection flow
      // For the MVP, we'll use the simulate connection button
      toast({
        title: "Plaid Link Token Created",
        description: "Ready to connect to your bank. Using simulated data for this demo.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to initialize bank connection",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const handleSuccess = () => {
    // Invalidate any queries that depend on user data or transactions
    queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
    queryClient.invalidateQueries({ queryKey: ['/api/plaid/accounts'] });
    
    if (onSuccess) {
      onSuccess();
    }
  };

  // If already connected, should show status rather than connect button
  if (isConnected) {
    return (
      <div className="text-sm text-muted-foreground">
        <span className="flex items-center">
          <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
          Connected to {user?.plaidData?.bankName || 'Your Bank'}
        </span>
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      <Button 
        variant={variant} 
        className={className}
        onClick={() => linkTokenMutation.mutate()}
        disabled={linkTokenMutation.isPending}
      >
        {linkTokenMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Connecting...
          </>
        ) : (
          <>
            <Link2 className="mr-2 h-4 w-4" /> Link bank account
          </>
        )}
      </Button>
      
      {linkTokenMutation.isSuccess && (
        <SimulatePlaidConnection onSuccess={handleSuccess} />
      )}
    </div>
  );
}