import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/hooks/use-theme';

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

type ScoreFactor = {
  name: string;
  percentage: number;
  rating: string;
  color: string;
};

export default function RivuScore() {
  // Access theme context
  const { theme } = useTheme();
  
  // Fetch Rivu score data
  const { data, isLoading } = useQuery<RivuScoreResponse>({
    queryKey: ['/api/rivu-score'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/rivu-score');
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
        day: 'numeric' 
      })
    : 'Not available';

  return (
    <div className="text-center space-y-4">
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
      
      <div className="space-y-2">
        {data?.factors && data.factors.map((factor, index) => (
          <div key={index}>
            <div className={`flex justify-between text-sm ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              <span>{factor.name}</span>
              <span>{factor.percentage}%</span>
            </div>
            <div className={`w-full rounded-full h-2 mt-1 ${
              theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'
            }`}>
              <div 
                className={`h-2 rounded-full ${factor.color || 'bg-blue-600'}`} 
                style={{ width: `${factor.percentage}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
      
      <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
        Last updated: {lastUpdated}
      </div>
    </div>
  );
}