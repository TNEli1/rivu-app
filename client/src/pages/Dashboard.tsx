import React, { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea"; 
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency } from "@/lib/utils";

// Sample data for the dashboard UI
const sampleSummaryData = {
  totalBalance: 12480,
  weeklySpending: 834.2,
  remainingBudget: 1165.8
};

const sampleTransactions = [
  { id: "1", date: "2025-05-18", description: "Groceries", amount: 82.45, type: 'expense' as const },
  { id: "2", date: "2025-05-17", description: "Gas", amount: 45.60, type: 'expense' as const },
  { id: "3", date: "2025-05-16", description: "Paycheck", amount: 1200.00, type: 'income' as const }
];

// Types for transaction data
type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
};

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [coachPrompt, setCoachPrompt] = useState("");
  const [summaryData, setSummaryData] = useState(sampleSummaryData);
  const [transactions, setTransactions] = useState<Transaction[]>(sampleTransactions);
  
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

  // Handle AI coach prompt submission
  const handleSubmitPrompt = async () => {
    if (!coachPrompt.trim()) return;
    
    try {
      await apiRequest('POST', '/api/ai-coach/prompt', {
        prompt: coachPrompt
      });
      setCoachPrompt("");
      // Optionally navigate to AI Coach page
      setLocation('/ai-coach');
    } catch (error) {
      console.error('Failed to submit AI coach prompt:', error);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar - Desktop only */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 p-8 md:ml-64">
        {/* Welcome Header */}
        <header className="mb-6">
          <h1 className="text-3xl font-semibold text-gray-900">Welcome back{user?.firstName ? `, ${user.firstName}` : ''}</h1>
          <p className="text-sm text-gray-600">Here's a summary of your finances this week</p>
        </header>

        {/* Summary Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white rounded-lg p-5 shadow-sm">
            <CardContent className="p-0">
              <h2 className="text-sm text-gray-500">Total Balance</h2>
              <p className="text-xl font-bold mt-2">{formatCurrency(summaryData?.totalBalance || 0)}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white rounded-lg p-5 shadow-sm">
            <CardContent className="p-0">
              <h2 className="text-sm text-gray-500">Spent This Week</h2>
              <p className="text-xl font-bold mt-2">{formatCurrency(summaryData?.weeklySpending || 0)}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white rounded-lg p-5 shadow-sm">
            <CardContent className="p-0">
              <h2 className="text-sm text-gray-500">Remaining Budget</h2>
              <p className="text-xl font-bold mt-2">{formatCurrency(summaryData?.remainingBudget || 0)}</p>
            </CardContent>
          </Card>
        </section>

        {/* Transaction Table */}
        <Card className="bg-white p-6 rounded-lg shadow-sm mb-8">
          <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th className="pb-2 font-medium">Date</th>
                  <th className="pb-2 font-medium">Description</th>
                  <th className="pb-2 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactionsData && transactionsData.length > 0 ? (
                  transactionsData.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="py-2">
                        {new Date(transaction.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-2">{transaction.description}</td>
                      <td className={`py-2 ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.type === 'income' ? '+ ' : '- '}
                        {formatCurrency(Math.abs(transaction.amount))}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-gray-500">
                      No recent transactions
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <Button 
              variant="outline"
              onClick={() => setLocation('/transactions')}
              className="text-sm"
            >
              View All Transactions
            </Button>
          </div>
        </Card>

        {/* AI Coach Prompt */}
        <Card className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-2">AI Coach</h3>
          <p className="text-sm text-gray-600 mb-4">Get personalized financial insights</p>
          <Textarea 
            className="w-full p-3 border border-gray-300 rounded mb-3"
            rows={3} 
            placeholder="Ask your AI coach anything..."
            value={coachPrompt}
            onChange={(e) => setCoachPrompt(e.target.value)}
          />
          <Button 
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleSubmitPrompt}
          >
            Ask Coach
          </Button>
        </Card>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}
