import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, getProgressColor } from "@/lib/utils";
import { Goal } from "@/types/goal";
import { useLocation } from "wouter";
import { PiggyBank, ArrowRight, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function GoalsSection() {
  const [, setLocation] = useLocation();
  
  // Get top goals (limit 3)
  const { data: goals = [], isLoading } = useQuery<Goal[]>({
    queryKey: ['/api/goals'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/goals');
      return res.json();
    }
  });
  
  // Display only the top 2-3 goals
  const topGoals = goals.slice(0, 3);
  
  // Navigate to goals page
  const handleViewAll = () => {
    setLocation('/goals');
  };
  
  // Navigate to add goal page
  const handleAddGoal = () => {
    setLocation('/goals?action=add');
  };

  return (
    <Card className="bg-card rounded-xl">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-foreground">Savings Goals</h2>
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              className="text-primary hover:underline text-sm font-medium"
              onClick={handleAddGoal}
            >
              Add
            </Button>
            <Button 
              variant="ghost" 
              className="text-primary hover:underline text-sm font-medium"
              onClick={handleViewAll}
            >
              View All
            </Button>
          </div>
        </div>

        {isLoading ? (
          // Loading skeleton
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse flex flex-col space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
                <Skeleton className="h-2 w-full" />
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            ))}
          </div>
        ) : topGoals.length > 0 ? (
          <div className="space-y-5">
            {topGoals.map((goal) => (
              <div key={goal._id} className="space-y-2">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium text-base truncate max-w-[70%]">{goal.name}</h3>
                  <span className="text-sm text-muted-foreground">
                    {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                  </span>
                </div>
                <Progress 
                  value={goal.progressPercentage > 100 ? 100 : goal.progressPercentage} 
                  className="h-2" 
                />
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-medium ${getProgressColor(goal.progressPercentage)}`}>
                    {Math.round(goal.progressPercentage)}%
                  </span>
                  {goal.targetDate && (
                    <span className="text-xs text-muted-foreground">
                      Target: {new Date(goal.targetDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
            
            {topGoals.length < goals.length && (
              <Button 
                variant="outline" 
                className="w-full mt-3 text-sm"
                onClick={handleViewAll}
              >
                View all {goals.length} goals
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        ) : (
          <div className="text-center py-6 space-y-3">
            <div className="mx-auto rounded-full w-12 h-12 bg-muted flex items-center justify-center">
              <Target className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-base font-medium">No savings goals yet</h3>
            <p className="text-sm text-muted-foreground">
              Start setting goals to track your financial progress
            </p>
            <Button 
              variant="outline" 
              className="mt-2 text-sm"
              onClick={handleAddGoal}
            >
              <PiggyBank className="h-4 w-4 mr-2" />
              Create your first goal
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}