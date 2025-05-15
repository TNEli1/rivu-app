import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2, Unlink } from "lucide-react";
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

type PlaidDisconnectButtonProps = {
  accountId: string;
  bankName: string;
  onSuccess: () => void;
};

export default function PlaidDisconnectButton({ 
  accountId, 
  bankName, 
  onSuccess 
}: PlaidDisconnectButtonProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('DELETE', `/api/plaid/disconnect/${accountId}`);
      return await res.json();
    },
    onSuccess: () => {
      setOpen(false);
      onSuccess();
      toast({
        title: "Account disconnected",
        description: "Your bank account has been successfully disconnected.",
      });
    },
    onError: (error: Error) => {
      setOpen(false);
      toast({
        title: "Failed to disconnect account",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
          <Unlink className="h-4 w-4 mr-2" />
          Disconnect
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Disconnect Bank Account</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to disconnect your {bankName} account? 
            Your transaction history will remain, but no new transactions will be imported.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              disconnectMutation.mutate();
            }}
            disabled={disconnectMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {disconnectMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Disconnecting...
              </>
            ) : "Disconnect"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}