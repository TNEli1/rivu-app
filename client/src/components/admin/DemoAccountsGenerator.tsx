import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, CheckCircle, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function DemoAccountsGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const { toast } = useToast();

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/admin/create-demo-accounts');
      return res.json();
    },
    onMutate: () => {
      setIsGenerating(true);
      setIsComplete(false);
    },
    onSuccess: (data) => {
      setIsGenerating(false);
      setIsComplete(true);
      toast({
        title: 'Demo accounts created',
        description: `Successfully created ${data.count} demo accounts`,
        variant: 'default',
      });
    },
    onError: (error) => {
      setIsGenerating(false);
      toast({
        title: 'Failed to create demo accounts',
        description: error.message || 'An unexpected error occurred',
        variant: 'destructive',
      });
    },
  });

  const handleGenerateAccounts = () => {
    generateMutation.mutate();
  };

  return (
    <Card className="w-full max-w-3xl border border-primary/10 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-xl text-primary">Demo Accounts Generator</CardTitle>
        <CardDescription>
          Create sample users with realistic financial behaviors for testing
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Alert variant="default" className="bg-primary/5 border-primary/20">
            <Info className="h-5 w-5 text-primary" />
            <AlertTitle>Demo Account Information</AlertTitle>
            <AlertDescription className="mt-2 text-sm">
              <p>This will create 5 demo accounts with realistic transaction history, budgets, goals, and calculated Rivu scores:</p>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li><strong>Ava Budgetmaster</strong> - Good financial habits (username: ava)</li>
                <li><strong>Liam Learner</strong> - Average financial habits (username: liam)</li>
                <li><strong>Nina Overspender</strong> - Poor spending habits (username: nina)</li>
                <li><strong>Jacob Steady</strong> - Disciplined with low income (username: jacob)</li>
                <li><strong>Maya Hustler</strong> - High income but unfocused (username: maya)</li>
              </ul>
              <p className="mt-2">All accounts use the same password: <code className="bg-black/10 px-1.5 py-0.5 rounded">Password123!</code></p>
            </AlertDescription>
          </Alert>

          {isComplete && (
            <div className="flex items-center p-4 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-md">
              <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
              <div>
                <p className="font-medium">Demo accounts created successfully</p>
                <p className="text-sm opacity-80">You can now log in with any of the accounts listed above</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-end border-t border-border/10 pt-4">
        <Button 
          onClick={handleGenerateAccounts} 
          disabled={isGenerating}
          className="bg-primary hover:bg-primary/90 text-white btn-luxury btn-luxury-primary glow-effect"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating accounts...
            </>
          ) : (
            <>
              <Users className="mr-2 h-4 w-4" />
              Generate Demo Accounts
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}