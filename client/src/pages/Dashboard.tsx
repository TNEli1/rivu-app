import React, { useEffect, useState, useRef } from "react";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import BudgetSection from "@/components/dashboard/BudgetSection";
import RivuScore from "@/components/dashboard/RivuScore";
import NudgesBanner from "@/components/dashboard/NudgesBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea"; 
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";
import { useTheme } from "@/hooks/use-theme";
import { useQuery } from "@tanstack/react-query";

// Initial empty state for dashboard UI
const initialSummaryData = {
  totalBalance: 0,
  weeklySpending: 0,
  weeklySpendingChange: 0,
  remainingBudget: 0,
  monthlyIncome: 0,
  monthlyExpenses: 0,
  spendingRate: 0,
  projectedOverspend: 0,
  topSpendingCategory: {
    name: '',
    amount: 0,
    percentage: 0
  },
  netFlowTrend: [0, 0, 0]
};

// Types for transaction data
type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
};

// Define additional types
type DashboardSummary = {
  totalBalance: number;
  weeklySpending: number;
  weeklySpendingChange?: number;
  remainingBudget: number;
  monthlyIncome?: number;
  monthlyExpenses?: number;
  // New fields for projected spending
  spendingRate?: number;
  projectedOverspend?: number;
  // Top spending category
  topSpendingCategory?: {
    name: string;
    amount: number;
    percentage: number;
  };
  // Monthly net flow trend (3-month)
  netFlowTrend?: number[];
};

type GoalData = {
  id: number;
  userId: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  progressPercentage: number;
  targetDate?: string | Date;
  progressRate?: number; // Added for progress pace indicator
};

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [coachPrompt, setCoachPrompt] = useState("");
  const [summaryData, setSummaryData] = useState<DashboardSummary>(initialSummaryData);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  // Fetch goals data for metrics
  const { data: goalsData = [], isLoading: isGoalsLoading } = useQuery<GoalData[]>({
    queryKey: ['/api/goals'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/goals');
        return await res.json();
      } catch (error) {
        console.error('Error fetching goals data:', error);
        return [];
      }
    }
  });
  
  // Fetch data when component mounts
  useEffect(() => {
    // Fetch dashboard summary
    const fetchSummary = async () => {
      try {
        const res = await apiRequest('GET', '/api/dashboard/summary');
        const data = await res.json();
        setSummaryData(data);
      } catch (error) {
        console.log('Using sample dashboard summary data');
      }
    };
    
    // Fetch recent transactions
    const fetchTransactions = async () => {
      try {
        const res = await apiRequest('GET', '/api/transactions/recent');
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setTransactions(data);
        }
      } catch (error) {
        console.log('Using sample transaction data');
      }
    };
    
    fetchSummary();
    fetchTransactions();
  }, []);
  
  // Track user login for engagement metrics
  useEffect(() => {
    if (user) {
      // Update last login and increment login count
      const updateLoginMetrics = async () => {
        try {
          await apiRequest('POST', '/api/user/login-metric', {
            lastLogin: new Date(),
          });
        } catch (error) {
          console.error('Failed to update login metrics:', error);
        }
      };
      
      updateLoginMetrics();
      
      // Check if user needs to complete onboarding
      if (user.demographics && !user.demographics.completed) {
        setLocation('/onboarding');
      }
    }
  }, [user, setLocation]);

  // State for AI Coach response
  const [coachResponse, setCoachResponse] = useState<string>("");
  const [isLoadingCoachResponse, setIsLoadingCoachResponse] = useState(false);
  const [typingIndicator, setTypingIndicator] = useState<string>("Coach is typing");
  const coachResponseRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Handle Enter key in textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // If Enter is pressed without Shift, submit the form
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitPrompt();
    }
  };
  
  // Update typing indicator with animation dots
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (isLoadingCoachResponse) {
      let count = 0;
      intervalId = setInterval(() => {
        const dots = '.'.repeat(count % 4);
        setTypingIndicator(`Coach is typing${dots}`);
        count++;
      }, 500);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isLoadingCoachResponse]);
  
  // Handle suggested prompt click
  const handleSuggestedPromptClick = (prompt: string) => {
    setCoachPrompt(prompt);
    textareaRef.current?.focus();
  };

  // Simplify text to a more accessible reading level
  const simplifyText = async (text: string): Promise<string> => {
    try {
      // The API already provides simplified responses, so we'll
      // just return the text as-is for now.
      // In a future implementation, we could add a dedicated simplification endpoint.
      return text;
    } catch (error) {
      console.error('Error simplifying text:', error);
      return text; // Return original if simplification fails
    }
  };

  // Handle AI coach prompt submission
  const handleSubmitPrompt = async () => {
    if (!coachPrompt.trim()) return;
    
    setIsLoadingCoachResponse(true);
    
    try {
      const response = await apiRequest('POST', '/api/advice', {
        prompt: coachPrompt
      });
      
      const data = await response.json();
      const simplifiedMessage = await simplifyText(data.message);
      
      setCoachResponse(simplifiedMessage);
      setCoachPrompt("");
      
      // Scroll to response
      setTimeout(() => {
        coachResponseRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Failed to submit AI coach prompt:', error);
      setCoachResponse("I apologize, but I'm having trouble connecting to my knowledge base right now. Please try again later.");
    } finally {
      setIsLoadingCoachResponse(false);
    }
  };

  // Access theme context
  const { theme } = useTheme();

  return (
    <div className={`flex min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Sidebar - Desktop only */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 p-8 md:ml-64">
        {/* Welcome Header */}
        <header className="mb-6">
          <h1 className={`text-3xl font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
            Welcome back{user?.firstName ? `, ${user.firstName}` : ''}
          </h1>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>
            Here's a summary of your finances this week
          </p>
        </header>

        {/* Nudges Banner */}
        <NudgesBanner />

        {/* Summary Cards */}
        <section className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card className={`rounded-lg p-5 shadow-sm ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <CardContent className="p-0">
              <h2 className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>Monthly Net Flow</h2>
              <p className={`text-xl font-bold mt-2 ${
                ((summaryData?.monthlyIncome || 0) - (summaryData?.monthlyExpenses || 0) > 0) 
                  ? 'text-green-500' 
                  : 'text-red-500'
              }`}>
                {formatCurrency((summaryData?.monthlyIncome || 0) - (summaryData?.monthlyExpenses || 0))}
              </p>
              <div className="flex justify-between items-center">
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Income minus expenses
                </p>
                {/* 3-month trend visualization */}
                {summaryData?.netFlowTrend && summaryData.netFlowTrend.length > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    {summaryData.netFlowTrend.map((value, index) => (
                      <div 
                        key={index}
                        className={`h-3 w-1.5 rounded-sm ${
                          value > 0 
                            ? 'bg-green-500' 
                            : value < 0 
                              ? 'bg-red-500' 
                              : 'bg-gray-300'
                        }`}
                        style={{ 
                          height: `${Math.min(Math.abs(value) * 3, 12)}px`,
                          minHeight: '3px'
                        }}
                      ></div>
                    ))}
                    <span className="text-xs ml-1 text-gray-400">3mo</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card className={`rounded-lg p-5 shadow-sm ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <CardContent className="p-0">
              <h2 className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>Spent This Week</h2>
              <p className={`text-xl font-bold mt-2 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
                {formatCurrency(summaryData?.weeklySpending || 0)}
              </p>
              <p className={`text-xs mt-1 flex items-center ${
                (summaryData?.weeklySpendingChange || 0) > 0 
                  ? 'text-red-500' 
                  : (summaryData?.weeklySpendingChange || 0) < 0 
                    ? 'text-green-500' 
                    : theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {(summaryData?.weeklySpendingChange || 0) !== 0 && (
                  <>
                    {(summaryData?.weeklySpendingChange || 0) > 0 ? '↑' : '↓'}{' '}
                    {Math.abs(summaryData?.weeklySpendingChange || 0)}% from last week
                  </>
                )}
                {(summaryData?.weeklySpendingChange || 0) === 0 && 'Last 7 days'}
              </p>
            </CardContent>
          </Card>
          
          <Card className={`rounded-lg p-5 shadow-sm ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <CardContent className="p-0">
              <h2 className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>Budget Remaining</h2>
              <p className={`text-xl font-bold mt-2 ${
                summaryData?.remainingBudget > 0 
                  ? 'text-green-500' 
                  : 'text-red-500'
              }`}>
                {formatCurrency(summaryData?.remainingBudget || 0)}
              </p>
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                For this month
              </p>
              {/* Projected overspend logic */}
              {summaryData?.spendingRate && summaryData.spendingRate > 1 && (
                <p className="text-xs mt-1 text-red-500">
                  Projected to overspend by {formatCurrency(summaryData.projectedOverspend || 0)}
                </p>
              )}
              {summaryData?.spendingRate && summaryData.spendingRate <= 1 && summaryData.spendingRate > 0.85 && (
                <p className="text-xs mt-1 text-amber-500">
                  At current rate, you'll spend {Math.round(summaryData.spendingRate * 100)}% of budget
                </p>
              )}
            </CardContent>
          </Card>
          
          <Card className={`rounded-lg p-5 shadow-sm ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <CardContent className="p-0">
              <h2 className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>Goal Progress</h2>
              <p className={`text-xl font-bold mt-2 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
                {goalsData && goalsData.length > 0 ? 
                  `${Math.round(goalsData.reduce((acc: number, goal: GoalData) => acc + goal.progressPercentage, 0) / goalsData.length)}%` :
                  'No Goals'
                }
              </p>
              <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                {goalsData && goalsData.length > 0 ? 
                  `Across ${goalsData.length} goal${goalsData.length > 1 ? 's' : ''}` :
                  'Create a goal to track progress'
                }
              </p>
              
              {/* Estimated completion date if available */}
              {goalsData && goalsData.length > 0 && goalsData[0].targetDate && goalsData[0].progressPercentage > 0 && (
                <p className="text-xs mt-1 text-blue-500">
                  Est. completion: {new Date(goalsData[0].targetDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </p>
              )}
              
              {/* Progress pace indicator */}
              {goalsData && goalsData.length > 0 && goalsData[0].progressPercentage > 0 && goalsData[0].progressRate !== undefined && (
                <p className={`text-xs mt-1 ${
                  (goalsData[0].progressRate || 0) > 1 ? 'text-green-500' : 
                  (goalsData[0].progressRate || 0) >= 0.8 ? 'text-blue-500' : 'text-amber-500'
                }`}>
                  {(goalsData[0].progressRate || 0) > 1 
                    ? 'Ahead of schedule' 
                    : (goalsData[0].progressRate || 0) >= 0.8 
                      ? 'On track' 
                      : 'Behind schedule'}
                </p>
              )}
            </CardContent>
          </Card>
          
          {/* New Top Spending Category Card */}
          <Card className={`rounded-lg p-5 shadow-sm ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
            <CardContent className="p-0">
              <h2 className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>Top Spending Category</h2>
              <p className={`text-xl font-bold mt-2 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
                {summaryData?.topSpendingCategory?.name ? 
                  summaryData.topSpendingCategory.name : 
                  'None'
                }
              </p>
              {summaryData?.topSpendingCategory?.amount ? (
                <>
                  <p className={`text-base font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    {formatCurrency(summaryData.topSpendingCategory.amount)}
                  </p>
                  <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {summaryData.topSpendingCategory.percentage}% of monthly spend
                  </p>
                </>
              ) : (
                <p className={`text-xs mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Add transactions to see spending insights
                </p>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Transaction Table */}
        <Card className={`p-6 rounded-lg shadow-sm mb-8 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
          <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>Recent Transactions</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className={`pb-2 font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-800'}`}>Date</th>
                  <th className={`pb-2 font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-800'}`}>Description</th>
                  <th className={`pb-2 font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-800'}`}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions && transactions.length > 0 ? (
                  transactions.map((transaction: Transaction) => (
                    <tr key={transaction.id} className={theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}>
                      <td className={`py-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-800'}`}>
                        {new Date(transaction.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className={`py-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-800'}`}>
                        {transaction.description}
                      </td>
                      <td className={`py-2 ${
                        transaction.type === 'income' 
                          ? 'text-green-500'
                          : 'text-red-500'
                      }`}>
                        {transaction.type === 'income' ? '+ ' : '- '}
                        {formatCurrency(Math.abs(transaction.amount))}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className={`py-4 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                      No recent transactions
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <Button 
              variant={theme === 'dark' ? 'secondary' : 'outline'}
              onClick={() => setLocation('/transactions')}
              className="text-sm"
            >
              View All Transactions
            </Button>
          </div>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Left Column - Budget Management */}
          <div className="lg:col-span-2">
            <Card className={`p-6 rounded-lg shadow-sm ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
              <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>Budget Management</h3>
              
              {/* Budget loading skeleton */}
              <div id="budget-section">
                <BudgetSection />
              </div>
              
              <div className="mt-4">
                <Button 
                  variant={theme === 'dark' ? 'secondary' : 'outline'}
                  onClick={() => setLocation('/budget')}
                  className="text-sm"
                >
                  Manage Budget
                </Button>
              </div>
            </Card>
          </div>
          
          {/* Right Column - Rivu Score Card */}
          <div className="lg:col-span-1">
            <Card className={`p-6 rounded-lg shadow-sm mb-6 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
              <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>Rivu Score</h3>
              
              {/* Rivu Score loading skeleton */}
              <div id="rivu-score-section">
                <RivuScore />
              </div>
            </Card>
          </div>
        </div>

        {/* AI Coach Prompt */}
        <Card className={`p-6 rounded-lg shadow-sm ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
          <h3 className={`text-lg font-semibold mb-2 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>AI Coach</h3>
          <p className={`text-sm mb-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>Get personalized financial insights</p>
          <Textarea 
            ref={textareaRef}
            className={`w-full p-3 rounded mb-3 ${
              theme === 'dark' 
                ? 'bg-gray-700 border-gray-600 text-gray-100' 
                : 'border-gray-300 text-gray-900'
            }`}
            rows={3} 
            placeholder="Ask your AI coach anything..."
            value={coachPrompt}
            onChange={(e) => setCoachPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoadingCoachResponse}
          />
          <div className="flex justify-between items-center">
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleSubmitPrompt}
              disabled={isLoadingCoachResponse}
            >
              {isLoadingCoachResponse ? 'Processing...' : 'Ask Coach'}
            </Button>
            
            <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
          
          {/* Suggested Questions */}
          <div className="mt-4">
            <p className={`text-sm mb-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>Try asking:</p>
            <ul className={`list-disc pl-5 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              <li>
                <button 
                  className="hover:underline text-left"
                  onClick={() => handleSuggestedPromptClick("How much can I safely spend this week?")}
                >
                  How much can I safely spend this week?
                </button>
              </li>
              <li>
                <button 
                  className="hover:underline text-left"
                  onClick={() => handleSuggestedPromptClick("What's my biggest spending category?")}
                >
                  What's my biggest spending category?
                </button>
              </li>
              <li>
                <button 
                  className="hover:underline text-left"
                  onClick={() => handleSuggestedPromptClick("How should I adjust my budget to save faster?")}
                >
                  How should I adjust my budget to save faster?
                </button>
              </li>
            </ul>
          </div>
          
          {/* Coach Response Display */}
          {(coachResponse || isLoadingCoachResponse) && (
            <div 
              id="coach-response" 
              ref={coachResponseRef}
              className={`mt-4 p-4 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              {isLoadingCoachResponse ? (
                <div className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} italic`}>
                  {typingIndicator}
                </div>
              ) : (
                <p className={`whitespace-pre-line ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                  {coachResponse}
                </p>
              )}
            </div>
          )}
        </Card>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
