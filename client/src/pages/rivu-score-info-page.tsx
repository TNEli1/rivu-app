import React from 'react';
import { Link } from 'wouter';
import { ChevronLeft, Info, PieChart, TrendingUp, Calendar, BarChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '@/hooks/use-theme';
import Sidebar from '@/components/layout/Sidebar';

export default function RivuScoreInfoPage() {
  // For theme
  const { theme } = useTheme();
  
  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Sidebar - Desktop only */}
      <Sidebar />
      
      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto max-h-screen">
        {/* Page Header */}
        <div className="flex items-center mb-6">
          <Link href="/dashboard">
            <Button
              variant="ghost"
              size="sm"
              className="mr-2"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold">How Your Rivu Score Works</h1>
        </div>
        
        <div className="max-w-3xl mx-auto">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <PieChart className="mr-2 h-5 w-5 text-primary" />
                What is the Rivu Score?
              </CardTitle>
              <CardDescription>
                Your personalized financial health metric
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                The Rivu Score is a personalized metric that measures your overall financial health on a scale from 0 to 100. 
                It's designed to give you quick insight into how well you're doing across multiple financial dimensions.
              </p>
              <div className={`p-4 rounded-md ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <p className="text-sm font-medium mb-2">Important: The Rivu Score is not a credit score</p>
                <p className="text-sm">
                  This score is private to you and is not shared with third parties. It's simply a way to track 
                  your personal financial progress over time.
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart className="mr-2 h-5 w-5 text-[#00C2A8]" />
                Budget Adherence (50%)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>
                This factor measures how well you stay within your budget categories.
              </p>
              <p className="text-sm">
                <strong>How it's calculated:</strong> The percentage of your budget categories where spending is at or below the budgeted amount.
              </p>
              <p className="text-sm">
                <strong>How to improve:</strong> Set realistic budgets and track your spending regularly. Adjust your spending habits to stay within your budget limits.
              </p>
            </CardContent>
          </Card>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5 text-[#2F80ED]" />
                Savings Goal Progress (30%)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>
                This factor measures how well you're progressing toward your savings goals.
              </p>
              <p className="text-sm">
                <strong>How it's calculated:</strong> (Total amount saved across all goals / Total target amount across all goals) × 100
              </p>
              <p className="text-sm">
                <strong>How to improve:</strong> Create realistic savings goals and contribute to them regularly. Even small, consistent contributions will gradually improve this score.
              </p>
            </CardContent>
          </Card>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="mr-2 h-5 w-5 text-[#D0F500]" />
                Weekly Activity (20%)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>
                This factor measures how actively you manage your finances in the app.
              </p>
              <p className="text-sm">
                <strong>How it's calculated:</strong> Based on the number of transactions recorded in the past 7 days.
              </p>
              <p className="text-sm">
                <strong>How to improve:</strong> Log your transactions regularly. More frequent updates help you stay aware of your spending patterns and improve your financial decision-making.
              </p>
            </CardContent>
          </Card>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Info className="mr-2 h-5 w-5 text-yellow-500" />
                Score Updates & History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>
                Your Rivu Score updates automatically whenever you:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Add or update budget categories</li>
                <li>Create or contribute to savings goals</li>
                <li>Add, edit, or delete transactions</li>
                <li>Manually refresh the score using the refresh button</li>
              </ul>
              <p className="text-sm mt-4">
                <strong>Score History:</strong> The app tracks your score over time, allowing you to see how your financial health trends as you build better habits.
              </p>
            </CardContent>
          </Card>
          
          <div className="flex justify-center mb-8">
            <Button
              className="bg-primary hover:bg-primary/90 text-white"
              onClick={() => window.location.href = '/dashboard'}
            >
              Return to Dashboard
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}