import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

type SimulatePlaidConnectionProps = {
  onSuccess: () => void;
};

export default function SimulatePlaidConnection({ onSuccess }: SimulatePlaidConnectionProps) {
  const { toast } = useToast();
  
  const simulateConnectionMutation = useMutation({
    mutationFn: async () => {
      // Create a simulated connection by directly calling the exchange endpoint with mock data
      const res = await apiRequest('POST', '/api/plaid/exchange-token', {
        public_token: 'simulated_public_token_' + Math.random().toString(36).substring(7),
        bank_name: 'Demo Bank (Simulated)'
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Demo account connected",
        description: "A simulated bank account has been connected for demonstration purposes.",
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to simulate connection",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  return (
    <Button 
      variant="outline" 
      onClick={() => simulateConnectionMutation.mutate()}
      disabled={simulateConnectionMutation.isPending}
      className="w-full mt-4"
    >
      {simulateConnectionMutation.isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Simulating...
        </>
      ) : (
        "Demo Mode: Simulate Connected Account"
      )}
    </Button>
  );
}