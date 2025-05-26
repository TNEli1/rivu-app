import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

// Define more detailed types for the Rivu Score factors
type ScoreFactor = {
  name: string;
  value: number;
  rating: string;
  weight: number;
  color?: string;
};

// Define expected response type
type RivuScoreResponse = {
  score: number;
  factors: ScoreFactor[];
  rawFactors: {
    budgetAdherenceRate: number;
    savingsProgressRate: number;
    weeklyEngagementRate: number;
    goalsCompletedRate: number;
    incomeToSpendingRatio: number;
  };
  lastUpdated: string;
};

export default function RivuScoreCard() {
  const [offset, setOffset] = useState(339.292); // Full circle circumference (2 * PI * 54)
  const [refreshCooldown, setRefreshCooldown] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Fetch Rivu score data with proper type and reduced stale time to refresh more often
  const { data, isLoading, refetch } = useQuery<RivuScoreResponse>({
    queryKey: ["/api/rivu-score"],
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 5000, // Reduce stale time to 5 seconds to ensure frequent updates
  });
  
  // Mutation for manually recalculating the Rivu score with forceRefresh parameter
  const recalculateMutation = useMutation({
    mutationFn: async () => {
      // Pass forceRefresh: true to force a full recalculation on the server
      const response = await apiRequest("POST", "/api/rivu-score/recalculate", { forceRefresh: true });
      return await response.json();
    },
    onSuccess: (data) => {
      // Update the cache with new data
      queryClient.setQueryData(["/api/rivu-score"], data);
      
      // Also invalidate related data that might have changed
      queryClient.invalidateQueries({ queryKey: ["/api/transactions/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/goals/summary"] });
      
      toast({
        title: "Rivu Score™ Updated",
        description: `Your Rivu Score™ has been recalculated: ${data.score}`,
      });
      
      // Set cooldown for 30 seconds to prevent abuse
      setRefreshCooldown(true);
      setTimeout(() => {
        setRefreshCooldown(false);
      }, 30000);
    },
    onError: (error) => {
      console.error("Failed to recalculate Rivu Score:", error);
      toast({
        title: "Update Failed",
        description: "Could not recalculate your Rivu Score. Please try again later.",
        variant: "destructive",
      });
    }
  });
  
  // Handle manual refresh button click
  const handleManualRefresh = () => {
    if (!refreshCooldown && !recalculateMutation.isPending) {
      recalculateMutation.mutate();
    }
  };

  // Only use actual data, don't default to anything
  const score = data?.score;
  const scoreFactors = data?.factors;
  
  // Check if we have real data
  const hasNoRealData = !data || score === 0 || !scoreFactors || scoreFactors.length === 0;

  useEffect(() => {
    // Only animate if we have real data
    if (!hasNoRealData && score !== undefined) {
      const timer = setTimeout(() => {
        const newOffset = 339.292 - (score / 100) * 339.292;
        setOffset(newOffset);
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [score, hasNoRealData]);

  // Determine score color
  const getScoreColor = () => {
    if (!score) return "#3A3A3A"; // gray/neutral for no data
    if (score >= 80) return "#00C2A8"; // green
    if (score >= 60) return "#D0F500"; // yellow
    return "#FF4D4F"; // red
  };

  return (
    <Card className="bg-card rounded-xl">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-foreground">Your Rivu Score™</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleManualRefresh}
                  disabled={refreshCooldown || recalculateMutation.isPending}
                  className={`${refreshCooldown ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <RefreshCw 
                    className={`h-4 w-4 ${recalculateMutation.isPending ? 'animate-spin' : ''}`} 
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{refreshCooldown ? 'Wait before refreshing again' : 'Recalculate your Rivu Score™ based on latest progress'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        <div className="flex flex-col items-center">
          {/* SVG Score Circle */}
          <div className="relative w-48 h-48 mb-6">
            <svg width="100%" height="100%" viewBox="0 0 120 120">
              {/* Background Circle */}
              <circle cx="60" cy="60" r="54" fill="none" stroke="#3A3A3A" strokeWidth="12" />
              
              {/* Progress Circle */}
              <circle 
                className="progress-ring-circle" 
                cx="60" 
                cy="60" 
                r="54" 
                fill="none" 
                stroke={getScoreColor()} 
                strokeWidth="12" 
                strokeLinecap="round" 
                strokeDasharray="339.292" 
                strokeDashoffset={offset} 
              />
            </svg>
            
            {/* Score Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {isLoading ? (
                <div className="animate-pulse">
                  <div className="h-10 w-16 bg-muted rounded mb-1"></div>
                  <div className="h-4 w-20 bg-muted rounded"></div>
                </div>
              ) : hasNoRealData ? (
                <>
                  <span className="text-lg font-medium text-muted-foreground">No Data</span>
                  <span className="text-xs text-muted-foreground mt-1 text-center px-4">Add transactions to see your score</span>
                </>
              ) : (
                <>
                  <span className="text-4xl font-bold">{score}</span>
                  <span className="text-muted-foreground text-sm">out of 100</span>
                </>
              )}
            </div>
          </div>
          
          {/* Score Breakdown */}
          <div className="w-full space-y-3">
            {isLoading ? (
              Array(3).fill(0).map((_, index) => (
                <div className="flex items-center justify-between animate-pulse" key={index}>
                  <div className="flex items-center">
                    <div className="w-2 h-2 rounded-full bg-muted mr-2"></div>
                    <div className="h-4 w-32 bg-muted rounded"></div>
                  </div>
                  <div className="h-4 w-20 bg-muted rounded"></div>
                </div>
              ))
            ) : hasNoRealData ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Your Rivu Score is calculated based on your spending habits, budget adherence, and financial activity.
                </p>
                <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                  AI-generated insight. Not financial advice.
                </div>
                <Link href="/transactions?action=add">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Transaction
                  </Button>
                </Link>
              </div>
            ) : (
              scoreFactors && scoreFactors.map((factor, index) => {
                // Get color based on rating
                const getColorForRating = (rating: string) => {
                  switch (rating) {
                    case 'Excellent': return 'bg-emerald-500';
                    case 'Good': return 'bg-green-500';
                    case 'Fair': return 'bg-yellow-500';
                    case 'Needs Improvement': return 'bg-orange-500';
                    case 'Poor': return 'bg-red-500';
                    default: return 'bg-gray-500';
                  }
                };
                
                return (
                  <div className="flex items-center justify-between" key={index}>
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full ${getColorForRating(factor.rating)} mr-2`}></div>
                      <span className="text-sm">{factor.name}</span>
                    </div>
                    <span className="text-sm font-medium">{factor.rating} ({factor.value}%)</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
