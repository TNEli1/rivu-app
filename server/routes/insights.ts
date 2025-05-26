import type { Express } from "express";
import { storage } from "../storage";
import { getCategoryInsights, CATEGORY_MAPPINGS } from "../utils/categoryMapping";

export function registerInsightsRoutes(app: Express, getCurrentUserId: () => number) {
  // Monthly category insights endpoint
  app.get("/api/insights/categories", async (req, res) => {
    try {
      const userId = getCurrentUserId();
      
      // Get current month and previous month dates
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      
      // Get all user transactions
      const allTransactions = await storage.getTransactions(userId);
      
      // Filter transactions by month
      const currentMonthTransactions = allTransactions.filter(t => {
        const txDate = new Date(t.date);
        return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
      });
      
      const previousMonthTransactions = allTransactions.filter(t => {
        const txDate = new Date(t.date);
        return txDate.getMonth() === prevMonth && txDate.getFullYear() === prevYear;
      });
      
      // Generate insights
      const insights = getCategoryInsights(currentMonthTransactions, previousMonthTransactions);
      
      // Get top 3 categories by spending
      const topCategories = insights.slice(0, 3).map(insight => ({
        category: insight.category,
        amount: insight.currentAmount,
        icon: insight.categoryInfo.icon,
        color: insight.categoryInfo.color,
        percentChange: insight.percentChange
      }));
      
      // Identify behavioral flags (categories with significant increases)
      const behavioralFlags = insights
        .filter(insight => insight.percentChange > 25 && insight.currentAmount > 50)
        .map(insight => ({
          category: insight.category,
          message: `${insight.category} spending up ${insight.percentChange}% from last month`,
          icon: insight.categoryInfo.icon,
          severity: insight.percentChange > 50 ? 'high' : 'medium'
        }));
      
      // Calculate total monthly spending
      const totalSpending = currentMonthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + (typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount), 0);
      
      const previousTotalSpending = previousMonthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + (typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount), 0);
      
      const spendingChange = previousTotalSpending > 0 
        ? Math.round(((totalSpending - previousTotalSpending) / previousTotalSpending) * 100)
        : 0;
      
      res.json({
        topCategories,
        behavioralFlags,
        totalSpending: Math.round(totalSpending * 100) / 100,
        spendingChange,
        monthlyBreakdown: insights.slice(0, 10) // Top 10 categories
      });
      
    } catch (error) {
      console.error('Error generating category insights:', error);
      res.status(500).json({ message: 'Failed to generate insights' });
    }
  });
  
  // Transaction categorization endpoint
  app.get("/api/insights/category-breakdown", async (req, res) => {
    try {
      const userId = getCurrentUserId();
      const transactions = await storage.getTransactions(userId);
      
      // Group transactions by category with icons
      const categoryBreakdown: Record<string, any> = {};
      
      transactions.forEach(tx => {
        if (tx.type === 'expense') {
          const categoryInfo = CATEGORY_MAPPINGS[tx.category] || CATEGORY_MAPPINGS['Uncategorized'];
          const amount = typeof tx.amount === 'string' ? parseFloat(tx.amount) : tx.amount;
          
          if (!categoryBreakdown[tx.category]) {
            categoryBreakdown[tx.category] = {
              category: tx.category,
              icon: categoryInfo.icon,
              color: categoryInfo.color,
              totalAmount: 0,
              transactionCount: 0,
              transactions: []
            };
          }
          
          categoryBreakdown[tx.category].totalAmount += amount;
          categoryBreakdown[tx.category].transactionCount += 1;
          categoryBreakdown[tx.category].transactions.push({
            id: tx.id,
            merchant: tx.merchant,
            amount: amount,
            date: tx.date
          });
        }
      });
      
      // Convert to array and sort by total amount
      const breakdown = Object.values(categoryBreakdown)
        .sort((a: any, b: any) => b.totalAmount - a.totalAmount)
        .map((item: any) => ({
          ...item,
          totalAmount: Math.round(item.totalAmount * 100) / 100,
          transactions: item.transactions.slice(0, 5) // Latest 5 transactions per category
        }));
      
      res.json(breakdown);
      
    } catch (error) {
      console.error('Error generating category breakdown:', error);
      res.status(500).json({ message: 'Failed to generate category breakdown' });
    }
  });
}