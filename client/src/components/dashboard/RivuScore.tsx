import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Skeleton } from '@/components/ui/skeleton';

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
          <Skeleton className="h-24 w-24 rounded-full" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
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
        <div className="h-24 w-24 rounded-full border-4 border-gray-100 flex items-center justify-center mx-auto">
          <span className="text-3xl font-bold">{score}</span>
        </div>
        <div className={`absolute -top-2 -right-2 px-2 py-1 text-xs rounded-full ${
          score >= 70 ? 'bg-green-100 text-green-800' : 
          score >= 50 ? 'bg-yellow-100 text-yellow-800' : 
          'bg-red-100 text-red-800'
        }`}>
          {rating}
        </div>
      </div>
      
      <div className="space-y-2">
        {data?.factors && data.factors.map((factor, index) => (
          <div key={index}>
            <div className="flex justify-between text-sm text-gray-700">
              <span>{factor.name}</span>
              <span>{factor.percentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
              <div 
                className={`h-2 rounded-full ${factor.color || 'bg-blue-600'}`} 
                style={{ width: `${factor.percentage}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="text-gray-500 text-xs">
        Last updated: {lastUpdated}
      </div>
    </div>
  );
}