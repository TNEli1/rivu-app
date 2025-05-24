// Types for Savings Goals feature

export type Goal = {
  _id?: string; // MongoDB ID format
  id?: number;  // In-memory ID format
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: Date | string;
  progressPercentage: number;
  monthlySavings: Array<{
    month: string; // Format: "YYYY-MM"
    amount: number;
  }>;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type GoalFormData = {
  name: string;
  targetAmount: string;
  targetDate?: string;
};

export type GoalContributionData = {
  amountToAdd: string;
};

export type GoalsSummary = {
  activeGoals: number;
  totalProgress: number;
  totalSaved: number;
  totalTarget: number;
};