import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient } from "@tanstack/react-query";
import { Redirect, useLocation } from "wouter";

export default function OnboardingPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(false);
  
  // If user is not logged in, redirect to auth page
  if (!user) {
    return <Redirect to="/auth" />;
  }
  
  // Redirect if user has already completed onboarding
  if (user.demographics?.completed) {
    return <Redirect to="/" />;
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.target as HTMLFormElement);
    
    // Extract selected financial goals
    const selectedGoals: string[] = [];
    if (formData.get('goal-savings')) selectedGoals.push('savings');
    if (formData.get('goal-debt')) selectedGoals.push('debt');
    if (formData.get('goal-investing')) selectedGoals.push('investing');
    if (formData.get('goal-retirement')) selectedGoals.push('retirement');
    if (formData.get('goal-homebuying')) selectedGoals.push('homebuying');
    
    // Check if the "Do not show again" checkbox is checked
    const skipPermanently = (document.getElementById('skip-permanently') as HTMLInputElement)?.checked;
    
    const demographicsData = {
      demographics: {
        ageRange: formData.get('ageRange') as string,
        incomeBracket: formData.get('incomeBracket') as string,
        goals: selectedGoals,
        riskTolerance: formData.get('riskTolerance') as string,
        experienceLevel: formData.get('experienceLevel') as string,
        completed: true,
        skipPermanently: skipPermanently
      }
    };
    
    try {
      // Send data to the API
      await apiRequest('PUT', '/api/user/demographics', demographicsData);
      
      // Invalidate user data cache to reflect new demographics
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
      toast({
        title: "Onboarding complete!",
        description: "Thanks for sharing your information. We'll use it to personalize your experience.",
      });
      
      // Redirect to dashboard
      setLocation("/");
    } catch (error) {
      toast({
        title: "Error saving preferences",
        description: "There was a problem saving your preferences. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleSkip = (skipPermanently = false) => {
    setLoading(true);
    
    apiRequest('PUT', '/api/user/demographics', {
      demographics: { 
        completed: true,
        skipPermanently: skipPermanently
      }
    }).then(() => {
      // Invalidate user data cache
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: "Preferences skipped",
        description: "You can update your preferences later in your account settings.",
      });
      setLocation("/");
    }).catch(() => {
      toast({
        title: "Error",
        description: "There was a problem. Please try again.",
        variant: "destructive"
      });
    }).finally(() => {
      setLoading(false);
    });
  };
  
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-8">
      <div className="w-full max-w-3xl mx-auto my-auto">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl sm:text-3xl">Welcome to Rivu!</CardTitle>
            <CardDescription className="text-base sm:text-lg">
              Help us personalize your experience by telling us a bit about yourself
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form id="onboarding-form" onSubmit={handleSubmit} className="space-y-6">
              {/* Age Range */}
              <div className="space-y-2">
                <Label htmlFor="ageRange">Age Range</Label>
                <Select name="ageRange">
                  <SelectTrigger id="ageRange">
                    <SelectValue placeholder="Select your age range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="18-24">18-24</SelectItem>
                    <SelectItem value="25-34">25-34</SelectItem>
                    <SelectItem value="35-44">35-44</SelectItem>
                    <SelectItem value="45-54">45-54</SelectItem>
                    <SelectItem value="55-64">55-64</SelectItem>
                    <SelectItem value="65+">65+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Income Bracket */}
              <div className="space-y-2">
                <Label htmlFor="incomeBracket">Income Range</Label>
                <Select name="incomeBracket">
                  <SelectTrigger id="incomeBracket">
                    <SelectValue placeholder="Select your income range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0-25000">$0 - $25,000</SelectItem>
                    <SelectItem value="25001-50000">$25,001 - $50,000</SelectItem>
                    <SelectItem value="50001-75000">$50,001 - $75,000</SelectItem>
                    <SelectItem value="75001-100000">$75,001 - $100,000</SelectItem>
                    <SelectItem value="100001-150000">$100,001 - $150,000</SelectItem>
                    <SelectItem value="150001+">$150,001+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Financial Goals */}
              <div className="space-y-3">
                <Label>Financial Goals (Select all that apply)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="goal-savings" name="goal-savings" />
                    <label htmlFor="goal-savings" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Building Savings
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="goal-debt" name="goal-debt" />
                    <label htmlFor="goal-debt" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Paying Off Debt
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="goal-investing" name="goal-investing" />
                    <label htmlFor="goal-investing" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Investing
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="goal-retirement" name="goal-retirement" />
                    <label htmlFor="goal-retirement" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Retirement Planning
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="goal-homebuying" name="goal-homebuying" />
                    <label htmlFor="goal-homebuying" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Home Buying
                    </label>
                  </div>
                </div>
              </div>
              
              {/* Risk Tolerance */}
              <div className="space-y-3">
                <Label>Risk Tolerance</Label>
                <RadioGroup name="riskTolerance" defaultValue="medium">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="low" id="risk-low" />
                    <Label htmlFor="risk-low">Conservative (Low Risk)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="medium" id="risk-medium" />
                    <Label htmlFor="risk-medium">Moderate (Medium Risk)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="high" id="risk-high" />
                    <Label htmlFor="risk-high">Aggressive (High Risk)</Label>
                  </div>
                </RadioGroup>
              </div>
              
              {/* Experience Level */}
              <div className="space-y-3">
                <Label>Experience with Budgeting</Label>
                <RadioGroup name="experienceLevel" defaultValue="intermediate">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="novice" id="exp-novice" />
                    <Label htmlFor="exp-novice">Novice (Just starting out)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="intermediate" id="exp-intermediate" />
                    <Label htmlFor="exp-intermediate">Intermediate (Some experience)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="expert" id="exp-expert" />
                    <Label htmlFor="exp-expert">Expert (Very experienced)</Label>
                  </div>
                </RadioGroup>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-3">
            {/* Do not show again checkbox */}
            <div className="flex items-center space-x-2 w-full mb-2">
              <Checkbox id="skip-permanently" />
              <Label htmlFor="skip-permanently" className="text-sm cursor-pointer">
                Do not show this survey again
              </Label>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-between w-full space-y-3 sm:space-y-0">
              <Button 
                variant="outline" 
                onClick={() => {
                  const skipPermanently = (document.getElementById('skip-permanently') as HTMLInputElement)?.checked;
                  handleSkip(skipPermanently);
                }}
                disabled={loading}
              >
                Skip for now
              </Button>
              <Button 
                type="submit" 
                form="onboarding-form" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save & Continue"
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}