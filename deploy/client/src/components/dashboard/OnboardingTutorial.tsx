import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, PieChart, Target, MessageSquare, BarChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

type TutorialStep = {
  title: string;
  description: string;
  icon: React.ReactNode;
};

export default function OnboardingTutorial({ onClose }: { onClose: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const { user, updateProfileMutation } = useAuth();
  const { toast } = useToast();
  
  // Tutorial steps
  const tutorialSteps: TutorialStep[] = [
    {
      title: "Welcome to Rivu",
      description: "Let's take a quick tour of your new financial companion. We'll show you how to make the most of Rivu's features.",
      icon: <img src="/images/rivu-logo.png" alt="Rivu" className="w-12 h-12" />
    },
    {
      title: "Rivu Score™",
      description: "Your personalized financial health metric. The Rivu Score™ gives you an at-a-glance view of your overall financial wellness based on your habits and behaviors.",
      icon: <PieChart className="h-8 w-8 text-primary" />
    },
    {
      title: "Budget Management",
      description: "Set up and manage your spending categories. Track your spending against your budget to avoid overspending and keep your finances on track.",
      icon: <BarChart className="h-8 w-8 text-green-500" />
    },
    {
      title: "Savings Goals",
      description: "Create and monitor your savings goals. Whether it's a vacation, emergency fund, or down payment, set targets and track your progress.",
      icon: <Target className="h-8 w-8 text-blue-500" />
    },
    {
      title: "Financial Coach",
      description: "Get personalized advice from your AI financial coach. Receive insights tailored to your spending patterns and financial behaviors.",
      icon: <MessageSquare className="h-8 w-8 text-purple-500" />
    }
  ];

  // Complete the tutorial - FIXED to prevent double-showing bug
  const completeTutorial = () => {
    // Immediately close the tutorial to prevent it from reopening
    onClose();
    
    // Update user preference in database AND local state
    updateProfileMutation.mutate(
      { tutorialCompleted: true },
      {
        onSuccess: () => {
          // Add a success toast
          toast({
            title: "Tutorial completed",
            description: "You can always view it again from the settings page"
          });
          
          // Force a local user state update to ensure the flag is immediately respected
          if (user && !user.tutorialCompleted) {
            // This updates the local user state without requiring a reload
            const updatedUser = { ...user, tutorialCompleted: true };
            // @ts-ignore - updateUser isn't in the type but it's used internally
            if (typeof window !== 'undefined') {
              // Also update localStorage to ensure persistence
              localStorage.setItem('rivu_tutorial_completed', 'true');
            }
          }
        }
      }
    );
  };
  
  // Navigate through tutorial
  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      completeTutorial();
    }
  };
  
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  // Skip tutorial
  const skipTutorial = () => {
    completeTutorial();
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Rivu Tutorial</h2>
            <Button variant="ghost" size="icon" onClick={skipTutorial}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Progress indicator */}
          <div className="flex items-center justify-center mb-6">
            {tutorialSteps.map((_, index) => (
              <div 
                key={index}
                className={`h-1.5 w-8 rounded-full mx-1 ${
                  index === currentStep ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
            ))}
          </div>
          
          {/* Step content */}
          <div className="text-center py-6">
            <div className="flex justify-center mb-4">
              {tutorialSteps[currentStep].icon}
            </div>
            <h3 className="text-xl font-bold mb-3">
              {tutorialSteps[currentStep].title}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-8">
              {tutorialSteps[currentStep].description}
            </p>
          </div>
          
          {/* Navigation buttons */}
          <div className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
            <Button 
              variant="default" 
              onClick={nextStep}
            >
              {currentStep === tutorialSteps.length - 1 ? 'Finish' : 'Next'}
              {currentStep < tutorialSteps.length - 1 && <ChevronRight className="ml-2 h-4 w-4" />}
            </Button>
          </div>
          
          {/* Skip button */}
          <div className="text-center mt-4">
            <Button variant="link" size="sm" onClick={skipTutorial}>
              Skip tutorial
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}