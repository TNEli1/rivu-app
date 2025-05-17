import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, X, AlertCircle } from "lucide-react";
import { Link, useLocation, useParams } from "wouter";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";

export default function ResetPasswordPage() {
  const { toast } = useToast();
  const params = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  
  // Password validation state
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordFeedback, setPasswordFeedback] = useState<{
    message: string;
    isValid: boolean;
    checks: {
      hasMinLength: boolean;
      hasUppercase: boolean;
      hasLowercase: boolean;
      hasNumber: boolean;
      hasSpecialChar: boolean;
    };
  }>({
    message: "",
    isValid: false,
    checks: {
      hasMinLength: false,
      hasUppercase: false,
      hasLowercase: false,
      hasNumber: false,
      hasSpecialChar: false
    }
  });

  // Extract token from URL params
  const token = params?.token || "";

  // Validate token when component mounts
  useEffect(() => {
    const validateToken = async () => {
      // We'll verify the token silently - the backend will validate it when we reset the password
      setValidating(true);
      
      try {
        // For now, we'll assume the token is valid (real validation happens on submit)
        // In a real app, we might want to validate the token separately
        const isValid = !!token && token.length > 10;
        setTokenValid(isValid);
        
        if (!isValid) {
          toast({
            title: "Invalid link format",
            description: "This password reset link appears to be invalid.",
            variant: "destructive",
          });
        }
      } catch (error) {
        setTokenValid(false);
        toast({
          title: "Error",
          description: "Could not validate your reset link. Please try again.",
          variant: "destructive",
        });
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [token, toast]);

  // Calculate password strength when password changes
  useEffect(() => {
    if (!password) {
      setPasswordStrength(0);
      setPasswordFeedback({
        message: "",
        isValid: false,
        checks: {
          hasMinLength: false,
          hasUppercase: false,
          hasLowercase: false,
          hasNumber: false,
          hasSpecialChar: false
        }
      });
      return;
    }

    // Check for various password requirements
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

    // Calculate number of criteria met (out of 5)
    const criteriaCount = [hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSpecialChar].filter(Boolean).length;
    
    // Calculate strength as percentage (0-100)
    const strength = Math.max(0, Math.min(100, (criteriaCount / 5) * 100));
    
    // Set strength and feedback
    setPasswordStrength(strength);
    
    let message = "";
    let isValid = false;
    
    if (strength < 40) {
      message = "Weak password";
    } else if (strength < 80) {
      message = "Moderate password";
      isValid = hasMinLength; // At least valid if it has minimum length
    } else {
      message = "Strong password";
      isValid = true;
    }
    
    setPasswordFeedback({
      message,
      isValid,
      checks: {
        hasMinLength,
        hasUppercase,
        hasLowercase,
        hasNumber,
        hasSpecialChar
      }
    });
    
    // Check if passwords match
    if (confirmPassword) {
      setPasswordsMatch(password === confirmPassword);
    }
  }, [password, confirmPassword]);

  // Check if passwords match when confirm password changes
  useEffect(() => {
    if (confirmPassword) {
      setPasswordsMatch(password === confirmPassword);
    } else {
      setPasswordsMatch(true);
    }
  }, [confirmPassword, password]);

  // Helper to get strength color
  const getStrengthColor = () => {
    if (passwordStrength < 40) return "bg-red-500";
    if (passwordStrength < 80) return "bg-yellow-500";
    return "bg-green-500";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords
    if (!passwordFeedback.isValid) {
      toast({
        title: "Password too weak",
        description: "Please use a stronger password.",
        variant: "destructive",
      });
      return;
    }
    
    if (!passwordsMatch) {
      toast({
        title: "Passwords don't match",
        description: "The passwords you entered don't match.",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);

    try {
      // Send the new password to the API
      const response = await apiRequest(
        "POST", 
        `/api/reset-password/${token}`, 
        { password }
      );
      
      if (response.ok) {
        const data = await response.json();
        
        // Store the token if provided
        if (data.token) {
          localStorage.setItem("token", data.token);
        }
        
        // Show success view
        setSubmitted(true);
        
        toast({
          title: "Password reset successfully",
          description: "Your password has been updated. You can now log in with your new password.",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to reset password");
      }
    } catch (error) {
      console.error("Reset password error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "There was an error resetting your password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (validating) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 sm:p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Validating your link</CardTitle>
            <CardDescription>
              Please wait while we validate your password reset link...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid token
  if (!tokenValid) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 sm:p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Invalid or expired link</CardTitle>
            <CardDescription>
              This password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <X className="h-12 w-12 text-red-500 mb-4" />
            <p className="text-center text-muted-foreground">
              Please request a new password reset link to continue.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Link href="/forgot-password">
              <Button>
                Request new link
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 sm:p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Password reset successful!</CardTitle>
            <CardDescription>
              Your password has been updated successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-center text-muted-foreground">
              You can now log in to your account with your new password.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Link href="/login">
              <Button>
                Go to login
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Reset password form
  return (
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Reset your password</CardTitle>
          <CardDescription>
            Please enter a new password for your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input 
                id="password" 
                name="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                required
                className={password ? (passwordFeedback.isValid ? "border-green-500" : "border-red-500") : ""}
              />
              
              {/* Password strength meter */}
              {password && (
                <div className="space-y-2 mt-2">
                  <div className="flex justify-between items-center text-xs">
                    <span>Password strength</span>
                    <span className={
                      passwordStrength < 40 ? "text-red-500" : 
                      passwordStrength < 80 ? "text-yellow-500" : 
                      "text-green-500"
                    }>
                      {passwordFeedback.message}
                    </span>
                  </div>
                  <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-1.5 ${getStrengthColor()}`} 
                      style={{ width: `${passwordStrength}%` }} 
                    />
                  </div>
                  
                  {/* Password requirements */}
                  <div className="grid grid-cols-1 gap-1.5 mt-2">
                    <div className="flex items-center text-xs">
                      {passwordFeedback.checks.hasMinLength ? 
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mr-1.5" /> : 
                        <X className="h-3.5 w-3.5 text-red-500 mr-1.5" />
                      }
                      <span className={passwordFeedback.checks.hasMinLength ? "text-green-500" : "text-muted-foreground"}>
                        At least 8 characters
                      </span>
                    </div>
                    
                    <div className="flex items-center text-xs">
                      {passwordFeedback.checks.hasUppercase ? 
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mr-1.5" /> : 
                        <X className="h-3.5 w-3.5 text-red-500 mr-1.5" />
                      }
                      <span className={passwordFeedback.checks.hasUppercase ? "text-green-500" : "text-muted-foreground"}>
                        Contains uppercase letter
                      </span>
                    </div>
                    
                    <div className="flex items-center text-xs">
                      {passwordFeedback.checks.hasLowercase ? 
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mr-1.5" /> : 
                        <X className="h-3.5 w-3.5 text-red-500 mr-1.5" />
                      }
                      <span className={passwordFeedback.checks.hasLowercase ? "text-green-500" : "text-muted-foreground"}>
                        Contains lowercase letter
                      </span>
                    </div>
                    
                    <div className="flex items-center text-xs">
                      {passwordFeedback.checks.hasNumber ? 
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mr-1.5" /> : 
                        <X className="h-3.5 w-3.5 text-red-500 mr-1.5" />
                      }
                      <span className={passwordFeedback.checks.hasNumber ? "text-green-500" : "text-muted-foreground"}>
                        Contains number
                      </span>
                    </div>
                    
                    <div className="flex items-center text-xs">
                      {passwordFeedback.checks.hasSpecialChar ? 
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mr-1.5" /> : 
                        <X className="h-3.5 w-3.5 text-red-500 mr-1.5" />
                      }
                      <span className={passwordFeedback.checks.hasSpecialChar ? "text-green-500" : "text-muted-foreground"}>
                        Contains special character
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input 
                id="confirm-password" 
                name="confirmPassword" 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••" 
                required
                className={confirmPassword ? (passwordsMatch ? "border-green-500" : "border-red-500") : ""}
              />
              
              {confirmPassword && !passwordsMatch && (
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Passwords don't match
                  </AlertDescription>
                </Alert>
              )}
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !passwordFeedback.isValid || !passwordsMatch}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting password...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link href="/login">
            <Button variant="link">
              Back to login
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}