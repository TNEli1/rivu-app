import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TosAcceptanceModalProps {
  open: boolean;
  onAccept: () => void;
}

export default function TosAcceptanceModal({ open, onAccept }: TosAcceptanceModalProps) {
  const [hasRead, setHasRead] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const acceptTosMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/user/accept-tos");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      onAccept();
      toast({
        title: "Terms Accepted",
        description: "Welcome to Rivu! You can now access all features.",
      });
    },
    onError: (error) => {
      console.error("TOS acceptance error:", error);
      toast({
        title: "Error",
        description: "Failed to accept terms. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleAccept = () => {
    if (!hasRead) {
      toast({
        title: "Required",
        description: "Please confirm you have read the Terms of Service and Privacy Policy.",
        variant: "destructive",
      });
      return;
    }
    
    setIsAccepting(true);
    acceptTosMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-semibold">
            Welcome to Rivu
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              Before you can access your dashboard, please review and accept our legal terms.
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 text-sm font-medium mb-2">
              Important Financial Disclaimer
            </p>
            <p className="text-yellow-700 text-sm">
              This is not financial advice. For personalized guidance, consult a licensed advisor.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <Checkbox 
                id="tos-acceptance" 
                checked={hasRead}
                onCheckedChange={(checked) => setHasRead(checked === true)}
                className="mt-1"
              />
              <label htmlFor="tos-acceptance" className="text-sm text-gray-700 leading-5">
                I have read and agree to the{" "}
                <Link href="/terms" className="text-blue-600 hover:text-blue-700 underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-blue-600 hover:text-blue-700 underline">
                  Privacy Policy
                </Link>
                . I understand this is not financial advice.
              </label>
            </div>
          </div>

          <div className="flex flex-col space-y-3">
            <Button 
              onClick={handleAccept}
              disabled={!hasRead || isAccepting || acceptTosMutation.isPending}
              className="w-full"
            >
              {isAccepting || acceptTosMutation.isPending ? "Accepting..." : "Accept & Continue"}
            </Button>
            
            <div className="text-center">
              <p className="text-xs text-gray-500">
                Access is blocked until terms are accepted
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}