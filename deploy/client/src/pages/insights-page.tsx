import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import RivuScoreCard from "@/components/dashboard/RivuScoreCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Send, Bot, BarChart3, PieChart, TrendingUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart as RePieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { useAuth } from "@/hooks/use-auth";

type FinanceAdvice = {
  message: string;
  timestamp?: Date;
};

type Transaction = {
  id: number;
  type: string;
  date: string;
  amount: string;
  merchant: string;
  category: string;
  account: string;
};

type BudgetCategory = {
  id: number;
  name: string;
  budgetAmount: string;
  spentAmount: string;
};

// Use highly distinctive colors with maximum contrast between adjacent slices
const COLORS = [
  '#e41a1c', // Bright red
  '#377eb8', // Blue
  '#4daf4a', // Green
  '#984ea3', // Purple
  '#ff7f00', // Orange
  '#ffff33', // Yellow
  '#a65628', // Brown
  '#f781bf', // Pink
  '#1e90ff', // Dodger blue
  '#00ced1', // Dark turquoise
  '#228b22', // Forest green
  '#b22222', // Firebrick red
  '#ff00ff', // Magenta
  '#00ff00', // Lime
  '#00008b', // Dark blue
  '#8b008b', // Dark magenta
  '#2e8b57', // Sea green
  '#daa520', // Goldenrod
  '#ff69b4', // Hot pink
  '#00bfff', // Deep sky blue
];

export default function InsightsPage() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [chatHistory, setChatHistory] = useState<FinanceAdvice[]>([]);
  const { toast } = useToast();

  // Get advice
  const getAdviceMutation = useMutation({
    mutationFn: async (userPrompt: string) => {
      const res = await apiRequest('POST', '/api/advice', { prompt: userPrompt });
      return res.json() as Promise<FinanceAdvice>;
    },
    onSuccess: (data) => {
      setChatHistory(prev => [...prev, { message: data.message, timestamp: new Date() }]);
      setPrompt("");
    },
    onError: (error) => {
      toast({
        title: "Failed to get advice",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Get initial AI advice
  const { data: initialAdvice, isLoading: isAdviceLoading } = useQuery<FinanceAdvice>({
    queryKey: ['/api/advice'],
    queryFn: async () => {
      const res = await apiRequest('POST', '/api/advice', {});
      return res.json();
    }
  });

  // Get transactions
  const { data: transactions = [], isLoading: isTransactionsLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/transactions');
      return res.json();
    }
  });

  // Get budget categories
  const { data: categories = [], isLoading: isCategoriesLoading } = useQuery<BudgetCategory[]>({
    queryKey: ['/api/budget-categories'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/budget-categories');
      return res.json();
    }
  });

  const handleSendPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    // Add user message to chat
    setChatHistory(prev => [...prev, { message: prompt, timestamp: new Date() }]);
    
    // Get AI response
    getAdviceMutation.mutate(prompt);
  };

  // Prepare data for category spending chart
  const categoryData = categories.map(category => ({
    name: category.name,
    spent: parseFloat(category.spentAmount),
    budget: parseFloat(category.budgetAmount),
  }));

  // Prepare data for monthly spending chart
  const monthlyData = (() => {
    const months: Record<string, { month: string, income: number, expense: number }> = {};
    
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      
      if (!months[monthKey]) {
        months[monthKey] = { month: monthName, income: 0, expense: 0 };
      }
      
      const amount = parseFloat(transaction.amount);
      if (transaction.type === 'income') {
        months[monthKey].income += amount;
      } else {
        months[monthKey].expense += amount;
      }
    });
    
    return Object.values(months).sort((a, b) => {
      const [yearA, monthA] = Object.keys(months).find(key => months[key] === a)!.split('-').map(Number);
      const [yearB, monthB] = Object.keys(months).find(key => months[key] === b)!.split('-').map(Number);
      return yearA !== yearB ? yearA - yearB : monthA - monthB;
    });
  })();

  // Prepare data for spending by category pie chart
  const spendingByCategory = (() => {
    const catTotals: Record<string, number> = {};
    
    transactions.forEach(transaction => {
      if (transaction.type === 'expense') {
        // Clean the category name - trim whitespace and normalize to lowercase
        let category = (transaction.category || '').trim();
        
        // Skip transactions with empty categories
        if (!category) return;
        
        // Normalize category name to title case for display
        category = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
        
        if (!catTotals[category]) {
          catTotals[category] = 0;
        }
        catTotals[category] += Math.abs(parseFloat(transaction.amount));
      }
    });
    
    // Filter out any categories with zero or invalid values
    return Object.entries(catTotals)
      .filter(([name, value]) => name && !isNaN(value) && value > 0)
      .map(([name, value]) => ({ name, value }));
  })();

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Sidebar - Desktop only */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-grow md:ml-64 p-4 md:p-8 pb-20 md:pb-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Financial Insights</h1>
          <p className="text-muted-foreground">Understand your finances and get personalized advice</p>
        </div>

        {/* Rivu Score Card */}
        <div className="mb-8">
          <RivuScoreCard />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="advice" className="mb-8">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="advice" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              <span>AI Advice</span>
            </TabsTrigger>
            <TabsTrigger value="spending" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span>Spending Analysis</span>
            </TabsTrigger>
            <TabsTrigger value="trends" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span>Trends</span>
            </TabsTrigger>
          </TabsList>
          
          {/* AI Advice Tab */}
          <TabsContent value="advice">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">AI Financial Coach</h2>
              <p className="text-muted-foreground mb-6">
                Get personalized financial advice based on your spending habits, budget adherence, and financial goals.
              </p>
              
              {/* Chat history */}
              <div className="mb-4 space-y-4 max-h-80 overflow-y-auto">
                {isAdviceLoading ? (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
                      <Bot className="h-5 w-5" />
                    </div>
                    <div className="flex-1 p-3 bg-muted rounded-lg">
                      <p>{initialAdvice?.message}</p>
                    </div>
                  </div>
                )}
                
                {chatHistory.map((msg, index) => (
                  <div 
                    key={index}
                    className={`flex items-start gap-3 ${index % 2 === 0 ? 'justify-end' : ''}`}
                  >
                    {index % 2 === 0 ? (
                      <>
                        <div className="flex-1 p-3 bg-primary/10 rounded-lg">
                          <p>{msg.message}</p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-background border flex items-center justify-center overflow-hidden">
                          {user?.profilePicture ? (
                            <img src={user.profilePicture} alt={user.firstName || user.username} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-semibold">
                              {user?.firstName?.charAt(0) || user?.username?.charAt(0) || "U"}
                            </span>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
                          <Bot className="h-5 w-5" />
                        </div>
                        <div className="flex-1 p-3 bg-muted rounded-lg">
                          <p>{msg.message}</p>
                        </div>
                      </>
                    )}
                  </div>
                ))}
                
                {getAdviceMutation.isPending && (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
              </div>
              
              {/* Prompt input */}
              <form onSubmit={handleSendPrompt} className="flex gap-2">
                <Input
                  placeholder="Ask for financial advice..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="flex-1"
                  disabled={getAdviceMutation.isPending}
                />
                <Button
                  type="submit"
                  disabled={getAdviceMutation.isPending || !prompt.trim()}
                >
                  {getAdviceMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </Card>
          </TabsContent>
          
          {/* Spending Analysis Tab */}
          <TabsContent value="spending">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Budget vs. Actual</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Compare your budgeted amounts against actual spending by category
                </p>
                
                {isTransactionsLoading || isCategoriesLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : categoryData.length === 0 ? (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">
                    No budget categories found
                  </div>
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis 
                          tickFormatter={(value) => `$${value}`}
                        />
                        <Tooltip 
                          formatter={(value) => {
                            // Convert value to number and format with commas and 2 decimal places
                            const numValue = Number(value);
                            return [`$${numValue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, ""];
                          }}
                          labelFormatter={(value) => `Category: ${value}`}
                        />
                        <Legend />
                        <Bar name="Budget" dataKey="budget" fill="#2F80ED" />
                        <Bar name="Spent" dataKey="spent" fill="#00C2A8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
              
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">Spending by Category</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Breakdown of your expenses across different categories
                </p>
                
                {isTransactionsLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : spendingByCategory.length === 0 ? (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">
                    No transaction data found
                  </div>
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={spendingByCategory}
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={false}
                          outerRadius={80}
                          innerRadius={40}
                          paddingAngle={3}
                          fill="#8884d8"
                          dataKey="value"
                          isAnimationActive={true}
                          animationDuration={800}
                        >
                          {spendingByCategory.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={COLORS[index % COLORS.length]} 
                              stroke="var(--background)"
                              strokeWidth={1}
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value, name, props) => {
                            // Convert value to number and format with commas and 2 decimal places
                            const numValue = Number(value);
                            // Get the category name from payload
                            const categoryName = props.payload.name;
                            return [
                              `$${numValue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 
                              `${categoryName}`
                            ];
                          }}
                          contentStyle={{ 
                            backgroundColor: "var(--background)", 
                            border: "1px solid var(--border)", 
                            borderRadius: "8px", 
                            padding: "10px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                          }}
                          itemStyle={{ color: "var(--foreground)" }}
                          labelStyle={{ fontWeight: "bold" }}
                        />
                        <Legend 
                          layout="vertical"
                          verticalAlign="middle"
                          align="right"
                          iconSize={14}
                          iconType="circle"
                          wrapperStyle={{
                            paddingLeft: '20px',
                            fontSize: '13px',
                            fontWeight: '500'
                          }}
                          formatter={(value, entry) => (
                            <span style={{ color: "var(--foreground)" }}>{value}</span>
                          )}
                        />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>
          
          {/* Trends Tab */}
          <TabsContent value="trends">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Monthly Income vs. Expenses</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Track your monthly cash flow over time
              </p>
              
              {isTransactionsLoading ? (
                <div className="h-96 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : monthlyData.length === 0 ? (
                <div className="h-96 flex items-center justify-center text-muted-foreground">
                  No transaction data found
                </div>
              ) : (
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={monthlyData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis 
                        tickFormatter={(value) => `$${value}`}
                      />
                      <Tooltip 
                        formatter={(value) => {
                          // Convert value to number and format with commas and 2 decimal places
                          const numValue = Number(value);
                          return [`$${numValue.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, ""];
                        }}
                        labelFormatter={(value) => `Month: ${value}`}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="income"
                        stroke="#D0F500"
                        activeDot={{ r: 8 }}
                        strokeWidth={2}
                      />
                      <Line
                        type="monotone"
                        dataKey="expense"
                        stroke="#FF4D4F"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}