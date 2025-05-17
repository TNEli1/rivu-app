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
  
  // Set up API routes using PostgreSQL database
  try {
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

    // Register auth routes with our TypeScript controller
    const apiPath = '/api';
    app.post(`${apiPath}/register`, registerUser);
    app.post(`${apiPath}/login`, loginUser);
    app.post(`${apiPath}/logout`, protect, logoutUser);
    app.get(`${apiPath}/user`, protect, getUserProfile);
    app.put(`${apiPath}/user`, protect, updateUserProfile);
    app.put(`${apiPath}/user/demographics`, protect, updateDemographics);
    app.post(`${apiPath}/user/login-metric`, protect, updateLoginMetrics);
    app.post(`${apiPath}/forgot-password`, forgotPassword);
    app.post(`${apiPath}/reset-password/:token`, resetPassword);
    
    console.log('✅ Auth routes successfully mounted at /api');
  } catch (error) {
    console.error('⚠️ Error setting up API routes:', error);
  }
  
  // Current user helper (kept for compatibility with existing code)
  // Fallback user ID for development only - in production, always use req.user._id
  const DEMO_USER_ID = 1;
  
  // Helper function to get the authenticated user ID from the request 
  const getCurrentUserId = (): number => {
    // For now, we'll return the demo user ID until all endpoint functions are updated to use req.user
    return DEMO_USER_ID;
  };

  // Budget Categories API
  app.get("/api/budget-categories", async (req, res) => {
    // Get current user ID (using the compatibility function for now)
    const userId = getCurrentUserId();
    
    try {
      const categories = await storage.getBudgetCategories(userId);
      res.json(categories);
    } catch (error) {
      console.error(`Error fetching budget categories for user ${userId}:`, error);
      res.status(500).json({ message: "Error fetching budget categories" });
    }
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
      // Get user ID - using demo user for now
      const userId = getCurrentUserId();
      console.log(`Fetching transaction summary for user: ${userId}`);
      
      // Get transactions for this user
      const transactions = await storage.getTransactions(userId);
      console.log(`Found ${transactions.length} transactions for summary calculation`);
      
      // Get current month and previous month dates
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      // Filter transactions for current month with proper date parsing
      const currentMonthTransactions = transactions.filter(t => {
        // Safely handle date parsing
        try {
          const tDate = new Date(t.date);
          return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
        } catch (err) {
          console.error(`Invalid date format for transaction: ${t.id}`, err);
          return false;
        }
      });
      
      // Filter transactions for previous month with proper date parsing
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const prevMonthTransactions = transactions.filter(t => {
        try {
          const tDate = new Date(t.date);
          return tDate.getMonth() === prevMonth && tDate.getFullYear() === prevYear;
        } catch (err) {
          console.error(`Invalid date format for transaction: ${t.id}`, err);
          return false;
        }
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
  
  // Goals API
  interface Goal {
    id: number;
    userId: number;
    name: string;
    targetAmount: number;
    currentAmount: number;
    targetDate?: Date | string;
    progressPercentage: number;
    monthlySavings: Array<{
      month: string; // Format: "YYYY-MM"
      amount: number;
    }>;
    createdAt: Date;
    updatedAt: Date;
  }

  // In-memory goals storage
  const goals: Goal[] = [];
  let goalId = 1;
  
  // Get all goals for a user
  app.get("/api/goals", async (req, res) => {
    try {
      const userId = getCurrentUserId();
      const userGoals = goals.filter(g => g.userId === userId);
      res.json(userGoals);
    } catch (error) {
      console.error('Error fetching goals:', error);
      res.status(500).json({ message: 'Failed to fetch goals' });
    }
  });
  
  // Get a specific goal by ID
  app.get("/api/goals/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid goal ID" });
      }
      
      const userId = getCurrentUserId();
      const goal = goals.find(g => g.id === id && g.userId === userId);
      
      if (!goal) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      res.json(goal);
    } catch (error) {
      console.error('Error fetching goal:', error);
      res.status(500).json({ message: 'Failed to fetch goal' });
    }
  });
  
  // Create a new goal
  app.post("/api/goals", async (req, res) => {
    try {
      const schema = z.object({
        name: z.string().min(1, "Goal name is required"),
        targetAmount: z.number().or(z.string()).transform(val => 
          typeof val === 'string' ? parseFloat(val) : val
        ).refine(val => val > 0, "Target amount must be greater than 0"),
        targetDate: z.string().optional(),
      });
      
      const validated = schema.parse(req.body);
      const userId = getCurrentUserId();
      
      const newGoal: Goal = {
        id: goalId++,
        userId,
        name: validated.name,
        targetAmount: validated.targetAmount,
        currentAmount: 0,
        targetDate: validated.targetDate,
        progressPercentage: 0,
        monthlySavings: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      goals.push(newGoal);
      
      // Update Rivu score after adding a new goal
      await storage.calculateRivuScore(userId);
      
      res.status(201).json(newGoal);
    } catch (error) {
      console.error('Error creating goal:', error);
      res.status(400).json({ message: "Invalid input", error });
    }
  });
  
  // Update an existing goal
  app.put("/api/goals/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid goal ID" });
      }
      
      const userId = getCurrentUserId();
      const goalIndex = goals.findIndex(g => g.id === id && g.userId === userId);
      
      if (goalIndex === -1) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      const schema = z.object({
        name: z.string().min(1).optional(),
        targetAmount: z.number().or(z.string()).transform(val => 
          typeof val === 'string' ? parseFloat(val) : val
        ).refine(val => val > 0, "Target amount must be greater than 0").optional(),
        targetDate: z.string().optional(),
        amountToAdd: z.number().or(z.string()).transform(val => 
          typeof val === 'string' ? parseFloat(val) : val
        ).optional(),
      });
      
      const validated = schema.parse(req.body);
      const goal = goals[goalIndex];
      
      // Update basic properties
      if (validated.name) goal.name = validated.name;
      if (validated.targetAmount) goal.targetAmount = validated.targetAmount;
      if (validated.targetDate) goal.targetDate = validated.targetDate;
      
      // If amount to add is included, update the savings amount
      if (validated.amountToAdd) {
        goal.currentAmount += validated.amountToAdd;
        
        // Update monthly savings tracking
        const now = new Date();
        const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        const existingMonthIndex = goal.monthlySavings.findIndex(m => m.month === monthKey);
        if (existingMonthIndex >= 0) {
          goal.monthlySavings[existingMonthIndex].amount += validated.amountToAdd;
        } else {
          goal.monthlySavings.push({ month: monthKey, amount: validated.amountToAdd });
        }
      }
      
      // Recalculate progress percentage
      goal.progressPercentage = goal.targetAmount > 0 
        ? (goal.currentAmount / goal.targetAmount) * 100 
        : 0;
      
      goal.updatedAt = new Date();
      
      // Update Rivu score after updating a goal
      await storage.calculateRivuScore(userId);
      
      res.json(goal);
    } catch (error) {
      console.error('Error updating goal:', error);
      res.status(400).json({ message: "Invalid input", error });
    }
  });
  
  // Delete a goal
  app.delete("/api/goals/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid goal ID" });
      }
      
      const userId = getCurrentUserId();
      const goalIndex = goals.findIndex(g => g.id === id && g.userId === userId);
      
      if (goalIndex === -1) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      goals.splice(goalIndex, 1);
      
      // Update Rivu score after deleting a goal
      await storage.calculateRivuScore(userId);
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting goal:', error);
      res.status(500).json({ message: "Failed to delete goal" });
    }
  });
  
  // Goals Summary API
  app.get("/api/goals/summary", async (req, res) => {
    try {
      // For now, initialize an empty summary response since we don't have user goals yet
      // Later we will integrate fully with MongoDB models
      
      // Return empty summary data
      res.json({
        activeGoals: 0,
        totalProgress: 0,
        totalTarget: 0,
        totalSaved: 0
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
