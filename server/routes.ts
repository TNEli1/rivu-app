import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import OpenAI from "openai";
import cors from "cors";
import { BudgetCategory, Transaction } from "@shared/schema";

// Initialize OpenAI client
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup CORS
  app.use(cors());
  
  // CRITICAL FIX: Register manual bridge to the MongoDB API routes
  try {
    // Since we can't directly import the CommonJS router in ESM module,
    // we'll manually create routes that call the controller functions
    
    // First, let's register the API routes with the MongoDB version
    const apiPath = '/api';
    console.log(`⚙️ Setting up MongoDB API routes at ${apiPath}...`);
    
    // Import our TypeScript controller
    // Get all the individual exports from userController
    const {
      registerUser,
      loginUser,
      logoutUser,
      getUserProfile,
      updateUserProfile,
      updateDemographics,
      updateLoginMetrics,
      protect,
      forgotPassword,
      resetPassword
    } = await import('./controllers-ts/userController');
    
    // Import goals controller functions
    const {
      getGoals,
      getGoalById,
      createGoal,
      updateGoal,
      deleteGoal
    } = await import('./controllers/goalController');

    // Register auth routes with our TypeScript controller
    app.post(`${apiPath}/register`, registerUser);
    app.post(`${apiPath}/login`, loginUser);
    app.post(`${apiPath}/logout`, protect, logoutUser);
    app.get(`${apiPath}/user`, protect, getUserProfile);
    app.put(`${apiPath}/user`, protect, updateUserProfile);
    app.put(`${apiPath}/user/demographics`, protect, updateDemographics);
    app.post(`${apiPath}/user/login-metric`, protect, updateLoginMetrics);
    app.post(`${apiPath}/forgot-password`, forgotPassword);
    app.post(`${apiPath}/reset-password/:token`, resetPassword);
    
    // Register goal routes
    app.get(`${apiPath}/goals`, protect, getGoals);
    app.get(`${apiPath}/goals/:id`, protect, getGoalById);
    app.post(`${apiPath}/goals`, protect, createGoal);
    app.put(`${apiPath}/goals/:id`, protect, updateGoal);
    app.delete(`${apiPath}/goals/:id`, protect, deleteGoal);
    
    console.log('✅ Auth routes (MongoDB) successfully mounted at /api');
  } catch (error) {
    console.error('⚠️ Error setting up MongoDB routes:', error);
    console.log('⚠️ Falling back to in-memory API routes');
  }
  
  // Current user helper (kept for compatibility with existing code)
  const getCurrentUserId = () => 1; // Always return the demo user for now

  // Budget Categories API
  app.get("/api/budget-categories", async (req, res) => {
    const userId = getCurrentUserId();
    const categories = await storage.getBudgetCategories(userId);
    res.json(categories);
  });

  app.post("/api/budget-categories", async (req, res) => {
    const schema = z.object({
      name: z.string().min(1, "Category name is required"),
      budgetAmount: z.number().positive("Budget amount must be positive"),
    });

    try {
      const validated = schema.parse(req.body);
      const userId = getCurrentUserId();
      
      const newCategory = await storage.createBudgetCategory({
        userId,
        name: validated.name,
        budgetAmount: validated.budgetAmount.toString(), // Convert to string
      });
      
      res.status(201).json(newCategory);
    } catch (error) {
      res.status(400).json({ message: "Invalid input", error });
    }
  });

  app.put("/api/budget-categories/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    
    const schema = z.object({
      name: z.string().optional(),
      budgetAmount: z.number().positive().optional(),
      spentAmount: z.number().optional(),
    });

    try {
      const validated = schema.parse(req.body);
      const userId = getCurrentUserId();
      
      const category = await storage.getBudgetCategory(id);
      if (!category || category.userId !== userId) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      // Create update data with string conversions for numeric fields
      const updateData: Partial<BudgetCategory> = {};
      
      if (validated.name !== undefined) {
        updateData.name = validated.name;
      }
      
      if (validated.budgetAmount !== undefined) {
        updateData.budgetAmount = validated.budgetAmount.toString();
      }
      
      if (validated.spentAmount !== undefined) {
        updateData.spentAmount = validated.spentAmount.toString();
      }
      
      const updatedCategory = await storage.updateBudgetCategory(id, updateData);
      res.json(updatedCategory);
    } catch (error) {
      res.status(400).json({ message: "Invalid input", error });
    }
  });

  app.delete("/api/budget-categories/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    
    const userId = getCurrentUserId();
    const category = await storage.getBudgetCategory(id);
    
    if (!category || category.userId !== userId) {
      return res.status(404).json({ message: "Category not found" });
    }
    
    const success = await storage.deleteBudgetCategory(id);
    if (success) {
      res.status(204).send();
    } else {
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Transactions API
  app.get("/api/transactions", async (req, res) => {
    const userId = getCurrentUserId();
    const transactions = await storage.getTransactions(userId);
    res.json(transactions);
  });

  app.post("/api/transactions", async (req, res) => {
    const schema = z.object({
      amount: z.number().positive("Amount must be positive"),
      merchant: z.string().min(1, "Merchant is required"),
      category: z.string().min(1, "Category is required"),
      account: z.string().min(1, "Account is required"),
      type: z.enum(['expense', 'income']).default('expense'),
      date: z.string().optional(),
    });

    try {
      const validated = schema.parse(req.body);
      const userId = getCurrentUserId();
      
      const newTransaction = await storage.createTransaction({
        userId,
        amount: validated.amount.toString(),
        merchant: validated.merchant,
        category: validated.category,
        account: validated.account,
        type: validated.type,
        date: validated.date ? new Date(validated.date) : new Date(),
      });
      
      res.status(201).json(newTransaction);
    } catch (error) {
      res.status(400).json({ message: "Invalid input", error });
    }
  });

  app.put("/api/transactions/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    
    const schema = z.object({
      amount: z.number().positive().optional(),
      merchant: z.string().optional(),
      category: z.string().optional(),
      account: z.string().optional(),
      type: z.enum(['income', 'expense']).optional(),
    });

    try {
      const validated = schema.parse(req.body);
      const userId = getCurrentUserId();
      
      const transaction = await storage.getTransaction(id);
      if (!transaction || transaction.userId !== userId) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      // Create update data with string conversions
      const updateData: Partial<Transaction> = {};
      
      if (validated.type !== undefined) {
        updateData.type = validated.type;
      }
      
      if (validated.amount !== undefined) {
        updateData.amount = validated.amount.toString();
      }
      
      if (validated.merchant !== undefined) {
        updateData.merchant = validated.merchant;
      }
      
      if (validated.category !== undefined) {
        updateData.category = validated.category;
      }
      
      if (validated.account !== undefined) {
        updateData.account = validated.account;
      }
      
      const updatedTransaction = await storage.updateTransaction(id, updateData);
      res.json(updatedTransaction);
    } catch (error) {
      res.status(400).json({ message: "Invalid input", error });
    }
  });

  app.delete("/api/transactions/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    
    const userId = getCurrentUserId();
    const transaction = await storage.getTransaction(id);
    
    if (!transaction || transaction.userId !== userId) {
      return res.status(404).json({ message: "Transaction not found" });
    }
    
    const success = await storage.deleteTransaction(id);
    if (success) {
      res.status(204).send();
    } else {
      res.status(500).json({ message: "Failed to delete transaction" });
    }
  });

  // Rivu Score API
  app.get("/api/rivu-score", async (req, res) => {
    const userId = getCurrentUserId();
    const rivuScore = await storage.getRivuScore(userId);
    
    if (!rivuScore) {
      // Calculate score if it doesn't exist
      await storage.calculateRivuScore(userId);
      const newScore = await storage.getRivuScore(userId);
      return res.json({
        score: newScore?.score || 0,
        factors: [
          { 
            name: "Budget Adherence", 
            percentage: newScore?.budgetAdherence || 0, 
            rating: getRating(newScore?.budgetAdherence || 0), 
            color: "bg-[#00C2A8]" 
          },
          { 
            name: "Savings Goal Progress", 
            percentage: newScore?.savingsProgress || 0, 
            rating: getRating(newScore?.savingsProgress || 0), 
            color: "bg-[#2F80ED]" 
          },
          { 
            name: "Weekly Activity", 
            percentage: newScore?.weeklyActivity || 0, 
            rating: getRating(newScore?.weeklyActivity || 0), 
            color: "bg-[#D0F500]" 
          },
        ]
      });
    }
    
    res.json({
      score: rivuScore.score,
      factors: [
        { 
          name: "Budget Adherence", 
          percentage: rivuScore.budgetAdherence, 
          rating: getRating(rivuScore.budgetAdherence), 
          color: "bg-[#00C2A8]" 
        },
        { 
          name: "Savings Goal Progress", 
          percentage: rivuScore.savingsProgress, 
          rating: getRating(rivuScore.savingsProgress), 
          color: "bg-[#2F80ED]" 
        },
        { 
          name: "Weekly Activity", 
          percentage: rivuScore.weeklyActivity, 
          rating: getRating(rivuScore.weeklyActivity), 
          color: "bg-[#D0F500]" 
        },
      ]
    });
  });
  
  // Transaction Summary API
  app.get("/api/transactions/summary", async (req, res) => {
    try {
      const userId = getCurrentUserId();
      const transactions = await storage.getTransactions(userId);
      
      // Get current month and previous month
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      // Filter transactions for current month
      const currentMonthTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
      });
      
      // Filter transactions for previous month
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const prevMonthTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === prevMonth && tDate.getFullYear() === prevYear;
      });
      
      // Calculate current month totals
      const currentMonthSpending = currentMonthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
        
      const currentMonthIncome = currentMonthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
        
      const currentMonthSavings = currentMonthIncome - currentMonthSpending;
      
      // Calculate previous month totals
      const prevMonthSpending = prevMonthTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
        
      const prevMonthIncome = prevMonthTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
        
      const prevMonthSavings = prevMonthIncome - prevMonthSpending;
      
      // Calculate percent changes
      const calculateChange = (current: number, previous: number) => {
        if (previous === 0) return 0;
        return Number(((current - previous) / previous * 100).toFixed(1));
      };
      
      const spendingChange = calculateChange(currentMonthSpending, prevMonthSpending);
      const incomeChange = calculateChange(currentMonthIncome, prevMonthIncome);
      const savingsChange = calculateChange(currentMonthSavings, prevMonthSavings);
      
      res.json({
        monthlySpending: currentMonthSpending,
        monthlyIncome: currentMonthIncome,
        monthlySavings: currentMonthSavings > 0 ? currentMonthSavings : 0,
        spendingChange: spendingChange,
        incomeChange: incomeChange,
        savingsChange: savingsChange
      });
    } catch (error) {
      console.error('Error calculating transaction summary:', error);
      res.status(500).json({ message: 'Failed to calculate transaction summary' });
    }
  });
  
  // Goals Summary API
  app.get("/api/goals/summary", async (req, res) => {
    try {
      // This would connect to a goals collection in MongoDB
      // For now we'll simulate with in-memory data
      
      const activeGoals = 3; // This would be a count from the database
      const totalProgress = 60; // This would be calculated from actual goals
      
      res.json({
        activeGoals: activeGoals,
        totalProgress: totalProgress
      });
    } catch (error) {
      console.error('Error fetching goals summary:', error);
      res.status(500).json({ message: 'Failed to fetch goals summary' });
    }
  });

  // Financial advice API using OpenAI
  app.post("/api/advice", async (req, res) => {
    try {
      const userId = getCurrentUserId();
      const transactions = await storage.getTransactions(userId);
      const categories = await storage.getBudgetCategories(userId);
      const rivuScore = await storage.getRivuScore(userId);
      
      // Extract relevant financial information
      const financialContext = {
        rivuScore: rivuScore?.score,
        budgetCategories: categories.map(c => ({
          name: c.name,
          budgeted: c.budgetAmount,
          spent: c.spentAmount,
          percentUsed: ((parseFloat(c.spentAmount.toString()) / parseFloat(c.budgetAmount.toString())) * 100).toFixed(0) + '%'
        })),
        recentTransactions: transactions.slice(0, 5).map(t => ({
          date: new Date(t.date).toLocaleDateString(),
          merchant: t.merchant,
          amount: t.amount,
          category: t.category,
          type: t.type
        }))
      };
      
      const userPrompt = req.body.prompt || '';
      
      let prompt = 'As an AI financial coach, analyze this user\'s financial data and provide personalized advice:';
      prompt += '\n\nFinancial Context: ' + JSON.stringify(financialContext, null, 2);
      
      if (userPrompt) {
        prompt += `\n\nThe user is asking: "${userPrompt}"`;
      }
      
      prompt += '\n\nProvide specific, actionable financial advice based on the user\'s spending patterns, budget adherence, and Rivu score. Keep your response concise (1-2 short paragraphs) and easy to understand.';
      
      try {
        // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 300,
        });
        
        const message = response.choices[0].message.content || 
          "I notice some trends in your spending. Consider reviewing your budget categories and adjust as needed to improve your financial health.";
        
        res.json({ message });
      } catch (error) {
        console.error("OpenAI API error:", error);
        // Fallback message if API fails
        res.json({ 
          message: "You're doing great — keep it up! Continue tracking your expenses to improve your financial health."
        });
      }
    } catch (error) {
      console.error("Server error:", error);
      res.status(500).json({ 
        message: "I'm having trouble analyzing your finances right now. Please try again later."
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to get rating text based on percentage
function getRating(percentage: number): string {
  if (percentage >= 90) return "Excellent";
  if (percentage >= 70) return "Good";
  if (percentage >= 50) return "Fair";
  if (percentage >= 30) return "Poor";
  return "Needs Improvement";
}
