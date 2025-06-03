import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useEffect } from "react";
import { Redirect, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertCircle, CheckCircle2, XCircle, Sun, Moon } from "lucide-react";


export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("login");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [redirectPath, setRedirectPath] = useState("/dashboard");
  
  // Check for signup parameter in URL
  useEffect(() => {
    // Get URL parameters
    const params = new URLSearchParams(window.location.search);
    const signup = params.get('signup');
    const redirect = params.get('redirect');
    
    // Set active tab based on signup parameter
    if (signup === 'true') {
      setActiveTab('register');
    }
    
    // Set redirect path if provided
    if (redirect) {
      setRedirectPath(redirect);
    }
  }, []);
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
  }, [password]);

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
  
  // Toggle dark/light mode
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    
    // Apply theme change to document
    const root = window.document.documentElement;
    if (newMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Redirect to dashboard if user is already logged in
  if (user) {
    return <Redirect to={redirectPath} />;
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Theme toggle button - positioned absolutely in the corner */}
      <div className="absolute top-4 right-4 z-10">
        <div className="flex items-center space-x-2 bg-white dark:bg-gray-800 p-2 rounded-full shadow">
          <Button 
            variant="ghost" 
            size="icon"
            className="rounded-full h-8 w-8 flex items-center justify-center text-gray-700 dark:text-gray-300"
            onClick={toggleDarkMode}
          >
            {darkMode ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      
      {/* Left side - Auth form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 text-center">
            <img 
              src="/images/rivu-logo.png" 
              alt="Rivu Logo" 
              className="h-24 w-auto mx-auto mb-3"
            />
            <p className="text-gray-600 dark:text-gray-400">AI-Powered Personal Finance</p>
          </div>
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100 dark:bg-gray-800">
              <TabsTrigger value="login" className="text-gray-700 dark:text-gray-300 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">Login</TabsTrigger>
              <TabsTrigger value="register" className="text-gray-700 dark:text-gray-300 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700">Register</TabsTrigger>
            </TabsList>
            
            {/* Login Form */}
            <TabsContent value="login">
              <Card className="bg-white dark:bg-gray-800 rounded-lg shadow">
                <CardHeader>
                  <CardTitle className="text-2xl text-gray-800 dark:text-gray-100">Welcome back</CardTitle>
                  <CardDescription className="text-gray-600 dark:text-gray-400">
                    Sign in to your account to continue
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      loginMutation.mutate({
                        username: formData.get('username') as string,
                        password: formData.get('password') as string
                      });
                    }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="login-username">Username</Label>
                      <Input 
                        id="login-username" 
                        name="username" 
                        placeholder="Enter your username" 
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <Input 
                        id="login-password" 
                        name="password" 
                        type="password" 
                        placeholder="••••••••" 
                        required 
                      />
                      <div className="text-right">
                        <button 
                          type="button"
                          className="text-xs text-primary hover:underline"
                          onClick={() => window.location.href = '/forgot-password'}
                        >
                          Forgot password?
                        </button>
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                    
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          Or continue with
                        </span>
                      </div>
                    </div>
                    
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => window.location.href = '/auth/google'}
                    >
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      Continue with Google
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Register Form */}
            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Create an account</CardTitle>
                  <CardDescription>
                    Sign up to get started with Rivu
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      
                      // Validate passwords match
                      if (!passwordsMatch) {
                        toast({
                          title: "Passwords don't match",
                          description: "Please make sure both password fields match.",
                          variant: "destructive",
                        });
                        return;
                      }
                      
                      // Validate password strength
                      if (!passwordFeedback.isValid) {
                        toast({
                          title: "Password too weak",
                          description: "Please choose a stronger password that meets all requirements.",
                          variant: "destructive",
                        });
                        return;
                      }
                      
                      // Validate TOS agreement
                      if (!termsAgreed) {
                        toast({
                          title: "Terms Agreement Required",
                          description: "You must agree to the Terms of Service and Privacy Policy to create an account.",
                          variant: "destructive",
                        });
                        return;
                      }
                      
                      const formData = new FormData(e.currentTarget);
                      registerMutation.mutate({
                        username: formData.get('username') as string,
                        email: formData.get('email') as string,
                        password: formData.get('password') as string,
                        confirmPassword: formData.get('confirmPassword') as string,
                        firstName: formData.get('firstName') as string || undefined,
                        lastName: formData.get('lastName') as string || undefined
                      });
                    }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="first-name">First name</Label>
                        <Input 
                          id="first-name" 
                          name="firstName" 
                          placeholder="John" 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last-name">Last name</Label>
                        <Input 
                          id="last-name" 
                          name="lastName" 
                          placeholder="Doe" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input 
                        id="username" 
                        name="username" 
                        placeholder="johndoe" 
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        name="email" 
                        type="email" 
                        placeholder="john.doe@example.com" 
                        required 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input 
                        id="password" 
                        name="password" 
                        type="password" 
                        placeholder="••••••••" 
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
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
                                <XCircle className="h-3.5 w-3.5 text-red-500 mr-1.5" />
                              }
                              <span className={passwordFeedback.checks.hasMinLength ? "text-green-500" : "text-muted-foreground"}>
                                At least 8 characters
                              </span>
                            </div>
                            
                            <div className="flex items-center text-xs">
                              {passwordFeedback.checks.hasUppercase ? 
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mr-1.5" /> : 
                                <XCircle className="h-3.5 w-3.5 text-red-500 mr-1.5" />
                              }
                              <span className={passwordFeedback.checks.hasUppercase ? "text-green-500" : "text-muted-foreground"}>
                                Contains uppercase letter
                              </span>
                            </div>
                            
                            <div className="flex items-center text-xs">
                              {passwordFeedback.checks.hasLowercase ? 
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mr-1.5" /> : 
                                <XCircle className="h-3.5 w-3.5 text-red-500 mr-1.5" />
                              }
                              <span className={passwordFeedback.checks.hasLowercase ? "text-green-500" : "text-muted-foreground"}>
                                Contains lowercase letter
                              </span>
                            </div>
                            
                            <div className="flex items-center text-xs">
                              {passwordFeedback.checks.hasNumber ? 
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mr-1.5" /> : 
                                <XCircle className="h-3.5 w-3.5 text-red-500 mr-1.5" />
                              }
                              <span className={passwordFeedback.checks.hasNumber ? "text-green-500" : "text-muted-foreground"}>
                                Contains number
                              </span>
                            </div>
                            
                            <div className="flex items-center text-xs">
                              {passwordFeedback.checks.hasSpecialChar ? 
                                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mr-1.5" /> : 
                                <XCircle className="h-3.5 w-3.5 text-red-500 mr-1.5" />
                              }
                              <span className={passwordFeedback.checks.hasSpecialChar ? "text-green-500" : "text-muted-foreground"}>
                                Contains special character
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Confirm Password Field */}
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm Password</Label>
                      <Input 
                        id="confirm-password" 
                        name="confirmPassword" 
                        type="password" 
                        placeholder="••••••••" 
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={confirmPassword ? (passwordsMatch ? "border-green-500" : "border-red-500") : ""}
                      />
                      
                      {/* Password match indicator */}
                      {confirmPassword && (
                        <div className="flex items-center text-xs mt-1">
                          {passwordsMatch ? (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mr-1.5" />
                              <span className="text-green-500">Passwords match</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3.5 w-3.5 text-red-500 mr-1.5" />
                              <span className="text-red-500">Passwords don't match</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Enhanced Terms Agreement Checkbox with Behavioral Consent */}
                    <div className="flex items-start space-x-2 py-3">
                      <Checkbox 
                        id="terms" 
                        checked={termsAgreed}
                        onCheckedChange={(checked) => setTermsAgreed(checked === true)}
                        required
                        className="mt-1"
                      />
                      <Label
                        htmlFor="terms"
                        className="text-sm font-normal leading-5 peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        I agree to the{" "}
                        <Link href="/terms" className="text-primary hover:underline" target="_blank">
                          Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link href="/privacy" className="text-primary hover:underline" target="_blank">
                          Privacy Policy
                        </Link>. I understand this app uses behavioral data and AI for educational guidance only.
                      </Label>
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={registerMutation.isPending || (password.length > 0 && !passwordFeedback.isValid) || !passwordsMatch || !termsAgreed}
                    >
                      {registerMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                    
                    {/* Show message if password doesn't meet requirements */}
                    {password.length > 0 && !passwordFeedback.isValid && (
                      <Alert variant="destructive" className="mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Password doesn't meet security requirements
                        </AlertDescription>
                      </Alert>
                    )}
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Right side - Hero */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-blue-700 to-indigo-900 text-white p-8 items-center justify-center">
        <div className="max-w-xl">
          <h1 className="text-4xl font-bold mb-4">
            Welcome to Rivu
          </h1>
          <p className="text-xl mb-6">
            Your AI-powered personal finance coach that helps you manage budgets, track expenses, and achieve your financial goals.
          </p>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="bg-white/20 p-2 rounded-full mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Smart Budgeting</h3>
                <p className="text-white/80">Create and manage budgets that adapt to your spending habits</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-white/20 p-2 rounded-full mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold">Financial Insights</h3>
                <p className="text-white/80">Get a clear view of your spending patterns and habits</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="bg-white/20 p-2 rounded-full mr-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold">AI-Powered Coaching</h3>
                <p className="text-white/80">Receive personalized financial advice from our AI coach</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}