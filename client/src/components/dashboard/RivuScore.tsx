import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, TrendingDown, Info, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { useAnalytics } from '@/lib/AnalyticsContext';
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  recentChanges?: {
    netChange: number;
    changes: {
      factor: string;
      change: number;
      reason: string;
    }[];
  };
  // Score history data for trend visualization
  history?: {
    date: string;
    score: number;
    // Optional breakdown by factor
    factorScores?: {
      [key: string]: number; // e.g., "budgetAdherence": 72
    };
  }[];
  // Monthly average score trends
  monthlyAverages?: {
    month: string; // Format: "YYYY-MM"
    average: number;
    change: number; // Change from previous month
  }[];
  // Improvement areas based on score analysis
  improvementAreas?: {
    factor: string;
    currentValue: number;
    targetValue: number;
    improvementStrategy: string;
    potentialScoreGain: number;
  }[];
};

type ScoreFactor = {
  name: string;
  percentage: number;
  rating: string;
  color: string;
};

export default function RivuScore() {
  // Access theme context
  const { theme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { trackDashboardEngagement } = useAnalytics();
  const [timeRange, setTimeRange] = useState('3months'); // '1month', '3months', '6months', 'year'
  const [showHistory, setShowHistory] = useState(false);
  
  // Fetch Rivu score data
  const { data, isLoading } = useQuery<RivuScoreResponse>({
    queryKey: ['/api/rivu-score', timeRange],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', `/api/rivu-score?timeRange=${timeRange}`);
        return await res.json();
      } catch (error) {
        console.error('Error fetching Rivu score:', error);
        return {
          score: 0,
          factors: [],
          rawFactors: {
            budgetAdherenceRate: 0,
            savingsProgressRate: 0,
            weeklyEngagementRate: 0,
            goalsCompletedRate: 0,
            incomeToSpendingRatio: 0
          },
          lastUpdated: new Date().toISOString()
        };
      }
    }
  });
  
  // Mutation to recalculate Rivu score
  const recalculateScoreMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/rivu-score/recalculate');
      return res.json();
    },
    onMutate: () => {
      setIsRefreshing(true);
      // Track when a user initiates score refresh
      trackDashboardEngagement('rivu_score', 'refresh_initiated');
    },
    onSuccess: (data) => {
      // Invalidate and refetch all relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/rivu-score'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/summary'] });
      
      // Track successful score refresh with current score value
      trackDashboardEngagement('rivu_score', 'refresh_completed');
      
      toast({
        title: "Rivu Score Refreshed",
        description: "Your financial health score has been recalculated.",
      });
    },
    onError: (error) => {
      console.error('Failed to recalculate Rivu score:', error);
      toast({
        title: "Refresh Failed",
        description: "Unable to recalculate your score. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsRefreshing(false);
    }
  });

  // Get rating text based on score
  const getRatingText = (score: number): string => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Great';
    if (score >= 70) return 'Good';
    if (score >= 60) return 'Fair';
    if (score >= 50) return 'Needs Improvement';
    if (score >= 30) return 'Poor';
    return 'Critical';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-center mb-4">
          <Skeleton className={`h-24 w-24 rounded-full ${theme === 'dark' ? 'bg-gray-700' : ''}`} />
        </div>
        <Skeleton className={`h-4 w-full ${theme === 'dark' ? 'bg-gray-700' : ''}`} />
        <Skeleton className={`h-4 w-5/6 ${theme === 'dark' ? 'bg-gray-700' : ''}`} />
        <Skeleton className={`h-4 w-4/6 ${theme === 'dark' ? 'bg-gray-700' : ''}`} />
      </div>
    );
  }

  const score = data?.score || 0;
  const rating = getRatingText(score);
  const lastUpdated = data?.lastUpdated 
    ? new Date(data.lastUpdated).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Not available';

  // Function to render the score history chart using rectangles
  const renderScoreHistory = () => {
    if (!data?.history || data.history.length === 0) {
      return (
        <div className="flex items-center justify-center h-24 bg-gray-50 dark:bg-gray-800 rounded-md">
          <p className="text-sm text-gray-500 dark:text-gray-400">No history data available</p>
        </div>
      );
    }

    // Use the last 12 data points or all if less than 12
    const historyData = data.history.slice(-12);
    const maxScore = 100; // Max possible score
    
    return (
      <div className="relative h-24 w-full bg-gray-50 dark:bg-gray-800 rounded-md px-2 py-1">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full w-8 flex flex-col justify-between text-xs text-gray-400 dark:text-gray-500 py-1">
          <span>100</span>
          <span>50</span>
          <span>0</span>
        </div>
        
        {/* Chart area */}
        <div className="relative h-full ml-8 flex items-end justify-between">
          {historyData.map((point, index) => {
            const height = (point.score / maxScore) * 100;
            const date = new Date(point.date);
            const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`;
            
            // Determine trend color based on comparison with previous data point
            const prevScore = index > 0 ? historyData[index - 1].score : point.score;
            const colorClass = point.score > prevScore 
              ? 'bg-green-500 dark:bg-green-600' 
              : point.score < prevScore 
                ? 'bg-red-500 dark:bg-red-600' 
                : 'bg-blue-500 dark:bg-blue-600';
                
            return (
              <div key={index} className="flex flex-col items-center justify-end h-full">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className={`w-4 ${colorClass} rounded-t transition-all duration-300 ease-in-out`} 
                      style={{ height: `${Math.max(height, 2)}%` }}
                    ></div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Score: {point.score}</p>
                    <p className="text-xs">{new Date(point.date).toLocaleDateString()}</p>
                  </TooltipContent>
                </Tooltip>
                <span className="text-[8px] text-gray-500 dark:text-gray-400 mt-1">{formattedDate}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  
  // Function to render improvement suggestions
  const renderImprovementSuggestions = () => {
    if (!data?.improvementAreas || data.improvementAreas.length === 0) return null;
    
    return (
      <div className="mt-4 border-t border-gray-100 dark:border-gray-700 pt-3">
        <h4 className={`text-sm font-medium mb-2 flex items-center ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-800'
        }`}>
          <TrendingUp className="h-4 w-4 mr-1" />
          Score Improvement Tips
        </h4>
        <div className="space-y-2 text-left">
          {data.improvementAreas.map((area, index) => (
            <div key={index} className="bg-gray-50 dark:bg-gray-800 p-2 rounded-md">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{area.factor}</span>
                <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-full">
                  +{area.potentialScoreGain} pts
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{area.improvementStrategy}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="text-center space-y-4">
      <div className="flex justify-between items-center mb-2">
        <div className="relative inline-block">
          <div className={`h-24 w-24 rounded-full border-4 flex items-center justify-center mx-auto ${
            theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-white'
          }`}>
            <span className={`text-3xl font-bold ${
              theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
            }`}>{score}</span>
          </div>
          <div className={`absolute -top-2 -right-2 px-2 py-1 text-xs rounded-full ${
            score >= 70 
              ? (theme === 'dark' ? 'bg-green-900 text-green-100' : 'bg-green-100 text-green-800') 
              : score >= 50 
              ? (theme === 'dark' ? 'bg-yellow-900 text-yellow-100' : 'bg-yellow-100 text-yellow-800')
              : (theme === 'dark' ? 'bg-red-900 text-red-100' : 'bg-red-100 text-red-800')
          }`}>
            {rating}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">Last Month</SelectItem>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="ghost" 
            size="icon"
            className={`h-8 w-8 rounded-full ${
              theme === 'dark' ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-900'
            } ${isRefreshing ? 'opacity-70 cursor-not-allowed' : ''}`}
            onClick={() => recalculateScoreMutation.mutate()}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>
      
      {/* Score History Chart */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-800'}`}>
            Score History
          </h4>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs px-2"
            onClick={() => {
              const newState = !showHistory;
              setShowHistory(newState);
              
              // Track when users view their score history details
              trackDashboardEngagement(
                'rivu_score_history', 
                newState ? 'expanded' : 'collapsed'
              );
            }}
          >
            {showHistory ? 'Hide Details' : 'Show Details'}
          </Button>
        </div>
        {renderScoreHistory()}
      </div>
      
      {/* Score Factors */}
      <div className="space-y-2 mt-4">
        <h4 className={`text-sm font-medium text-left ${theme === 'dark' ? 'text-gray-300' : 'text-gray-800'}`}>
          Score Factors
        </h4>
        {data?.factors && data.factors.map((factor, index) => (
          <div key={index}>
            <div className={`flex justify-between text-sm ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              <div className="flex items-center">
                <span>{factor.name}</span>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 ml-1 text-gray-400" />
                  </TooltipTrigger>
                  <TooltipContent side="right" align="start">
                    <p className="text-xs max-w-[200px]">
                      {factor.name === 'Budget Adherence' && 'How well you stay within your set budgets'}
                      {factor.name === 'Savings Rate' && 'The percentage of income you save monthly'}
                      {factor.name === 'Weekly Engagement' && 'How frequently you log in and track finances'}
                      {factor.name === 'Goals Progress' && 'Progress towards your savings goals'}
                      {factor.name === 'Income vs Spending' && 'Ratio of income to expenses'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-center">
                <span>{factor.percentage}%</span>
                {/* Show trend indicator if we have history data */}
                {data?.history && data.history.length > 1 && (
                  <span className="ml-1">
                    {factor.rating === 'improving' ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : factor.rating === 'declining' ? (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    ) : null}
                  </span>
                )}
              </div>
            </div>
            <div className={`w-full rounded-full h-2 mt-1 ${
              theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'
            }`}>
              <div 
                className={`h-2 rounded-full ${factor.color || 'bg-blue-600'}`} 
                style={{ width: `${Math.max(factor.percentage, 0)}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Recent changes section */}
      {data?.recentChanges && (
        <div className="mt-3 border-t border-gray-100 dark:border-gray-700 pt-3">
          <h4 className={`text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-800'}`}>
            Recent Score Changes
          </h4>
          <div className="text-sm">
            <div className={`flex items-center justify-between mb-1 ${
              data.recentChanges.netChange > 0 
                ? 'text-green-500' 
                : data.recentChanges.netChange < 0 
                  ? 'text-red-500' 
                  : ''
            }`}>
              <span>Net change:</span>
              <span>
                {data.recentChanges.netChange > 0 ? '+' : ''}
                {data.recentChanges.netChange} points
              </span>
            </div>
            
            <div className="space-y-1 mt-2">
              {data.recentChanges.changes.map((change, index) => (
                <div key={index} className="flex items-center justify-between text-xs">
                  <span className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>
                    {change.factor}:
                  </span>
                  <span className={
                    change.change > 0 
                      ? 'text-green-500' 
                      : change.change < 0 
                        ? 'text-red-500' 
                        : theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }>
                    {change.change > 0 ? '+' : ''}
                    {change.change}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Improvement suggestions section */}
      {showHistory && renderImprovementSuggestions()}
      
      {data?.lastUpdated && lastUpdated !== 'Not available' && (
        <div className={`text-xs mt-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
          Last updated: {lastUpdated}
        </div>
      )}
      
      <div className="mt-2">
        <Link 
          to="/rivu-score-info" 
          className={`text-xs underline ${theme === 'dark' ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
        >
          How your Rivu Score works
        </Link>
      </div>
    </div>
  );
}