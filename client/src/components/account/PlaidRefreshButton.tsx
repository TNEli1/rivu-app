import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

type PlaidRefreshButtonProps = {
  accountId: string;
  onSuccess: () => void;
};

export default function PlaidRefreshButton({ accountId, onSuccess }: PlaidRefreshButtonProps) {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const refreshMutation = useMutation({
    mutationFn: async () => {
      try {
        setIsRefreshing(true);
        const res = await apiRequest('POST', `/api/plaid/refresh/${accountId}`);
        return res.json();
      } catch (error: any) {
        throw new Error(error.message || "Failed to refresh account data");
      } finally {
        setIsRefreshing(false);
      }
    },
    onSuccess: () => {
      onSuccess();
      toast({
        title: "Account refreshed",
        description: "Your account data has been successfully updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to refresh account",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  return (
    <Button 
      variant="outline" 
      size="sm"
      onClick={() => refreshMutation.mutate()}
      disabled={isRefreshing}
    >
      {isRefreshing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Refreshing...
        </>
      ) : "Refresh"}
    </Button>
  );
}