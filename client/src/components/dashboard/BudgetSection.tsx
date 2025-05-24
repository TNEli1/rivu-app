import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useTheme } from '@/hooks/use-theme';

export type BudgetCategory = {
  id: string | number;
  name: string;
  budgetAmount: number | string;
  spentAmount: number | string;
};

export default function BudgetSection() {
  // Access theme context
  const { theme } = useTheme();
  
  // Fetch budget categories
  const { data: categories = [], isLoading } = useQuery<BudgetCategory[]>({
    queryKey: ['/api/budget-categories'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/budget-categories');
        return await res.json();
      } catch (error) {
        console.error('Error fetching budget categories:', error);
        return [];
      }
    }
  });

  // Calculate percentage spent
  const calculatePercentage = (spent: number | string, budget: number | string): number => {
    const spentNum = typeof spent === 'string' ? parseFloat(spent) : spent;
    const budgetNum = typeof budget === 'string' ? parseFloat(budget) : budget;
    
    if (budgetNum <= 0) return 0;
    return Math.min(Math.round((spentNum / budgetNum) * 100), 100);
  };

  // Determine color based on percentage
  const getProgressColor = (percentage: number): string => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className={`h-16 w-full ${theme === 'dark' ? 'bg-gray-700' : ''}`} />
        <Skeleton className={`h-16 w-full ${theme === 'dark' ? 'bg-gray-700' : ''}`} />
        <Skeleton className={`h-16 w-full ${theme === 'dark' ? 'bg-gray-700' : ''}`} />
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className={`text-center py-6 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
        <p>No budget categories set up yet.</p>
        <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>
          Create budget categories to track your spending and stay on target.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {categories.map((category) => {
        const spentAmount = typeof category.spentAmount === 'string' 
          ? parseFloat(category.spentAmount) 
          : category.spentAmount;
          
        const budgetAmount = typeof category.budgetAmount === 'string' 
          ? parseFloat(category.budgetAmount) 
          : category.budgetAmount;
          
        const percentage = calculatePercentage(spentAmount, budgetAmount);
        const progressColor = getProgressColor(percentage);
        
        return (
          <div 
            key={category.id} 
            className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}
          >
            <div className="flex justify-between items-center mb-2">
              <h4 className={`font-medium ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
                {category.name}
              </h4>
              <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                {formatCurrency(spentAmount)} / {formatCurrency(budgetAmount)}
              </div>
            </div>
            <div className={`w-full rounded-full h-2.5 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-200'}`}>
              <div 
                className={`h-2.5 rounded-full ${progressColor}`}
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
            <div className={`flex justify-between items-center mt-1 text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              <span>{percentage}% spent</span>
              <span>{formatCurrency(budgetAmount - spentAmount)} remaining</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}