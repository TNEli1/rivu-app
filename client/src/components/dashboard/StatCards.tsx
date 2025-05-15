import React from "react";
import { formatCurrency } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";

// Types for API responses
type TransactionSummary = {
  monthlySpending: number;
  monthlySavings: number;
  monthlyIncome: number;
  spendingChange: number;
  savingsChange: number;
  incomeChange: number;
};

type GoalsSummary = {
  activeGoals: number;
  totalProgress: number;
};

type StatCardProps = {
  title: string;
  value: number;
  icon: string;
  iconBg: string;
  iconColor: string;
  change: number;
  changeText: string;
  progressPercent?: number;
  isLoading?: boolean;
};

function StatCard({
  title,
  value,
  icon,
  iconBg,
  iconColor,
  change,
  changeText,
  progressPercent,
  isLoading = false,
}: StatCardProps) {
  const isPositive = change >= 0;
  const changeTextColor = isPositive ? "text-[#00C2A8]" : "text-[#FF4D4F]";
  const hasData = typeof value === 'number' && (value > 0 || title === 'Active Goals');
  
  // Check if we have real progress data
  const hasProgressData = progressPercent !== undefined && progressPercent > 0;

  return (
    <Card className="bg-card p-6 rounded-xl card-hover">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-muted-foreground text-sm mb-1">{title}</p>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <h3 className="text-2xl font-bold text-foreground">
              {hasData 
                ? (title === 'Active Goals' ? value : formatCurrency(value))
                : (title === 'Active Goals' ? '0' : '$0')}
            </h3>
          )}
        </div>
        <div className={`p-2 rounded-lg ${iconBg}`}>
          <i className={`${icon} ${iconColor}`}></i>
        </div>
      </div>
      {isLoading ? (
        <Skeleton className="h-4 w-28" />
      ) : (
        <div className="flex items-center">
          {hasData ? (
            <>
              <span className={`${changeTextColor} text-sm font-medium`}>
                {change > 0 ? "+" : ""}
                {change}%
              </span>
              <span className="text-muted-foreground text-sm ml-2">{changeText}</span>
            </>
          ) : (
            <span className="text-muted-foreground text-sm">No data available</span>
          )}
        </div>
      )}
      {progressPercent !== undefined && (
        <div className="flex items-center mt-2">
          {isLoading ? (
            <Skeleton className="h-1.5 w-full" />
          ) : (
            <>
              <div className="w-full bg-border/40 rounded-full h-1.5">
                <div
                  className="bg-[#2F80ED] h-1.5 rounded-full"
                  style={{ width: `${hasProgressData ? progressPercent : 0}%` }}
                ></div>
              </div>
              <span className="text-muted-foreground text-sm ml-2">
                {progressPercent || 0}%
              </span>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

export default function StatCards() {
  // Fetch transaction summary data
  const { data: transactionData, isLoading: isTransactionsLoading } = useQuery<TransactionSummary>({
    queryKey: ['/api/transactions/summary'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/transactions/summary');
        return await res.json();
      } catch (error) {
        console.error('Error fetching transaction summary:', error);
        // Return default data if API fails
        return {
          monthlySpending: 0,
          monthlySavings: 0,
          monthlyIncome: 0,
          spendingChange: 0,
          savingsChange: 0,
          incomeChange: 0
        };
      }
    }
  });

  // Fetch goals summary data
  const { data: goalsData, isLoading: isGoalsLoading } = useQuery<GoalsSummary>({
    queryKey: ['/api/goals/summary'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/goals/summary');
        return await res.json();
      } catch (error) {
        console.error('Error fetching goals summary:', error);
        // Return default data if API fails
        return {
          activeGoals: 0,
          totalProgress: 0
        };
      }
    }
  });

  // Default values when data is not available
  const spending = transactionData?.monthlySpending || 0;
  const savings = transactionData?.monthlySavings || 0;
  const income = transactionData?.monthlyIncome || 0;
  const spendingChange = transactionData?.spendingChange || 0;
  const savingsChange = transactionData?.savingsChange || 0;
  const incomeChange = transactionData?.incomeChange || 0;
  const activeGoals = goalsData?.activeGoals || 0;
  const goalsProgress = goalsData?.totalProgress || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <StatCard
        title="Monthly Spending"
        value={spending}
        icon="ri-arrow-down-line"
        iconBg="bg-[#FF4D4F]/10"
        iconColor="text-[#FF4D4F]"
        change={spendingChange}
        changeText="vs last month"
        isLoading={isTransactionsLoading}
      />
      
      <StatCard
        title="Monthly Savings"
        value={savings}
        icon="ri-arrow-up-line"
        iconBg="bg-[#00C2A8]/10"
        iconColor="text-[#00C2A8]"
        change={savingsChange}
        changeText="vs last month"
        isLoading={isTransactionsLoading}
      />
      
      <StatCard
        title="Monthly Income"
        value={income}
        icon="ri-arrow-up-line"
        iconBg="bg-[#D0F500]/10"
        iconColor="text-[#D0F500]"
        change={incomeChange}
        changeText="vs last month"
        isLoading={isTransactionsLoading}
      />
    </div>
  );
}
