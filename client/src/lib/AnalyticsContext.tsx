import React, { createContext, useContext, ReactNode } from 'react';
import posthog from 'posthog-js';
import type { PostHog } from 'posthog-js';

interface AnalyticsContextProps {
  // Core PostHog instance
  posthog: typeof posthog;
  
  // User identification
  identifyUser: (userId: string, properties?: Record<string, any>) => void;
  resetIdentity: () => void;
  
  // Goal tracking
  trackGoalCreated: (
    category: string,
    amount: number,
    hasTargetDate: boolean
  ) => void;
  
  trackGoalContribution: (
    goalName: string,
    amount: number,
    progressAfter: number
  ) => void;
  
  trackGoalCompleted: (
    goalName: string,
    targetAmount: number,
    daysToComplete: number
  ) => void;
  
  // Budget tracking
  trackBudgetSet: (
    totalAmount: number,
    categoryCount: number
  ) => void;
  
  // Bank connection tracking
  trackPlaidConnected: (
    institutionName: string,
    accountCount: number
  ) => void;
  
  // Transaction tracking
  trackTransactionAdded: (
    source: 'manual' | 'csv' | 'plaid',
    count: number,
    categories?: string[]
  ) => void;
}

// Create the context with default values
const AnalyticsContext = createContext<AnalyticsContextProps>({
  posthog,
  identifyUser: () => {},
  resetIdentity: () => {},
  trackGoalCreated: () => {},
  trackGoalContribution: () => {},
  trackGoalCompleted: () => {},
  trackBudgetSet: () => {},
  trackPlaidConnected: () => {},
  trackTransactionAdded: () => {},
});

// Provider component
export function AnalyticsProvider({ children }: { children: ReactNode }) {
  // User identification function - identifies a user in PostHog
  const identifyUser = (userId: string, properties?: Record<string, any>) => {
    posthog.identify(userId, properties);
  };
  
  // Reset function for logout
  const resetIdentity = () => {
    posthog.reset();
  };
  
  // Track goal creation
  const trackGoalCreated = (
    category: string,
    amount: number,
    hasTargetDate: boolean
  ) => {
    posthog.capture('goal_created', {
      category,
      amount,
      has_target_date: hasTargetDate,
    });
  };
  
  // Track goal contribution
  const trackGoalContribution = (
    goalName: string,
    amount: number,
    progressAfter: number
  ) => {
    posthog.capture('goal_contribution', {
      goal_name: goalName,
      amount,
      progress_after: progressAfter
    });
  };
  
  // Track goal completion
  const trackGoalCompleted = (
    goalName: string,
    targetAmount: number,
    daysToComplete: number
  ) => {
    posthog.capture('goal_completed', {
      goal_name: goalName,
      target_amount: targetAmount,
      days_to_complete: daysToComplete
    });
  };
  
  // Track budget settings
  const trackBudgetSet = (
    totalAmount: number,
    categoryCount: number
  ) => {
    posthog.capture('budget_set', {
      total_amount: totalAmount, 
      category_count: categoryCount,
    });
  };
  
  // Track Plaid connections
  const trackPlaidConnected = (
    institutionName: string,
    accountCount: number
  ) => {
    posthog.capture('plaid_connected', {
      institution_name: institutionName,
      account_count: accountCount,
    });
  };
  
  // Track transaction imports/additions
  const trackTransactionAdded = (
    source: 'manual' | 'csv' | 'plaid',
    count: number,
    categories?: string[]
  ) => {
    posthog.capture('transaction_added', {
      source,
      count,
      categories: categories || [],
    });
  };
  
  // Create the value object with all tracking functions
  const value = {
    posthog,
    identifyUser,
    resetIdentity,
    trackGoalCreated,
    trackGoalContribution,
    trackGoalCompleted,
    trackBudgetSet,
    trackPlaidConnected,
    trackTransactionAdded,
  };
  
  return (
    <AnalyticsContext.Provider value={value}>
      {children}
    </AnalyticsContext.Provider>
  );
}

// Custom hook for using the analytics context
export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (context === undefined) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
}