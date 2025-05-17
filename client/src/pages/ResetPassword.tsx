import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface TokenResponse {
  message: string;
  code: string;
  user?: {
    id: number;
    email: string;
  };
}

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [token, setToken] = useState("");
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Extract token from URL
  useEffect(() => {
    const path = window.location.pathname;
    const tokenFromPath = path.split('/reset-password/')[1];
    if (tokenFromPath) {
      setToken(tokenFromPath);
    }
  }, []);

  // Verify token validity
  const { data: tokenStatus, isLoading: isVerifying, isError: tokenInvalid } = useQuery<TokenResponse>({
    queryKey: [`/api/verify-reset-token/${token}`],
    enabled: !!token,
  });

  // Check if token is valid based on the response
  const isTokenValid = tokenStatus ? tokenStatus.code === 'VALID_TOKEN' : false;

  const resetMutation = useMutation({
    mutationFn: async (formData: { password: string }) => {
      const response = await apiRequest("POST", `/api/reset-password/${token}`, formData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Password reset successful",
        description: "Your password has been updated. You can now log in with your new password.",
      });
      
      // Redirect to login immediately (reduced timeout for better UX)
      setTimeout(() => {
        navigate("/login"); // Use wouter's navigate instead of direct window.location
      }, 1500);
    },
    onError: (error: any) => {
      console.error("Password reset error:", error);
      toast({
        title: "Error",
        description: "There was an error resetting your password. Please try again or request a new reset link.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }
    
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }
    
    resetMutation.mutate({ password });
  };

  // Handle invalid or expired token
  if (tokenInvalid || (tokenStatus && !isTokenValid)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Invalid or Expired Link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                This password reset link is invalid or has expired. Please request a new password reset link.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => window.location.href = "/auth"}
              className="w-full"
            >
              Return to Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/login")}
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-2xl">Reset Password</CardTitle>
          </div>
          <CardDescription>
            Enter your new password below
          </CardDescription>
        </CardHeader>
        
        {isVerifying ? (
          <CardContent className="flex justify-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </CardContent>
        ) : resetMutation.isSuccess ? (
          <CardContent className="space-y-4 py-6">
            <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertTitle className="text-green-600 dark:text-green-400">Success!</AlertTitle>
              <AlertDescription className="text-green-600 dark:text-green-400">
                Your password has been reset successfully. You will be redirected to the login page.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={() => navigate("/login")}
              className="w-full mt-4"
            >
              Return to Login
            </Button>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={resetMutation.isPending}
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={resetMutation.isPending}
                  minLength={6}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                type="submit" 
                className="w-full"
                disabled={resetMutation.isPending}
              >
                {resetMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  "Reset Password"
                )}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}