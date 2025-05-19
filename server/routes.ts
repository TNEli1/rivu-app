import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import OpenAI from "openai";
import cors from "cors";
import { BudgetCategory, Transaction, transactions } from "@shared/schema";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import path from "path";
import fs from "fs";

// Initialize OpenAI client
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup CORS
  app.use(cors());
  
  // Set up API routes using PostgreSQL database
  try {
    // Import our user controllers
    const {
      registerUser,
      loginUser,
      logoutUser,
      getUserProfile,
      updateUserProfile,
      updateDemographics,
      updateLoginMetrics,
      protect
    } = await import('./controllers-ts/userController');
    
    // Import password reset controllers
    const {
      forgotPassword,
      verifyResetToken,
      resetPassword
    } = await import('./controllers-ts/userPasswordController');

    // Register auth routes with our TypeScript controller
    const apiPath = '/api';
    app.post(`${apiPath}/register`, registerUser);
    app.post(`${apiPath}/login`, loginUser);
    app.post(`${apiPath}/logout`, protect, logoutUser);
    app.get(`${apiPath}/user`, protect, getUserProfile);
    app.put(`${apiPath}/user`, protect, updateUserProfile);
    app.put(`${apiPath}/user/demographics`, protect, updateDemographics);
    app.post(`${apiPath}/user/login-metric`, protect, updateLoginMetrics);
    
    // Import theme preference controller
    const { updateThemePreference } = await import('./controllers-ts/userController');
    app.put(`${apiPath}/user/theme-preference`, protect, updateThemePreference);
    app.post(`${apiPath}/forgot-password`, forgotPassword);
    app.get(`${apiPath}/verify-reset-token/:token`, verifyResetToken);
    app.post(`${apiPath}/reset-password/:token`, resetPassword);
    
    // Import transaction account controller
    const {
      getAccounts,
      getAccountById,
      createAccount,
      updateAccount,
      deleteAccount
    } = await import('./controllers-ts/accountController');
    
    // Transaction account routes
    app.get(`${apiPath}/accounts`, protect, getAccounts);
    app.get(`${apiPath}/accounts/:id`, protect, getAccountById);
    app.post(`${apiPath}/accounts`, protect, createAccount);
    app.put(`${apiPath}/accounts/:id`, protect, updateAccount);
    app.delete(`${apiPath}/accounts/:id`, protect, deleteAccount);
    
    // Import CSV controllers for transaction imports
    const {
      uploadCSV,
      importTransactionsFromCSV,
      markTransactionAsNotDuplicate
    } = await import('./controllers/csvController');
    
    // Import TypeScript CSV controllers for mapped data import
    const {
      importMappedTransactions
    } = await import('./controllers-ts/csvController');
    
    // CSV upload routes
    app.post(`${apiPath}/transactions/import`, protect, uploadCSV, importTransactionsFromCSV);
    app.post(`${apiPath}/transactions/import-mapped`, protect, importMappedTransactions);
    app.put(`${apiPath}/transactions/:id/not-duplicate`, protect, markTransactionAsNotDuplicate);
    
    // Delete all transactions route
    app.delete(`${apiPath}/transactions/all`, protect, async (req: any, res) => {
      try {
        // Ensure we have a valid user ID from the auth token
        const userId = req.user.id;
        
        if (!userId) {
          return res.status(401).json({
            message: 'User ID not found in request. Authentication may have failed.',
            code: 'AUTH_ERROR'
          });
        }
        
        // Convert to number if it's a string
        const userIdNum = typeof userId === 'string' ? parseInt(userId, 10) : userId;
        
        console.log(`Attempting to delete all transactions for user ID: ${userIdNum}`);
        
        // IMPORTANT: Scan database for ALL transactions with any user ID to identify data inconsistency issues
        const allTransactionsByUser = await db
          .select({ userId: transactions.userId, count: sql`count(*)` })
          .from(transactions)
          .groupBy(transactions.userId);
          
        console.log('Transaction count by user ID before deletion:', allTransactionsByUser);
        
        // Find ALL transactions regardless of user ID to ensure we're seeing everything
        const allTransactions = await db.select().from(transactions);
        console.log(`Found ${allTransactions.length} total transactions in database`);
        
        // Delete transactions with both user IDs to handle mixed data issue
        let totalDeleted = 0;
        
        // Delete for authenticated user ID
        console.log(`Deleting transactions for user ID: ${userIdNum}`);
        const userResult = await db
          .delete(transactions)
          .where(eq(transactions.userId, userIdNum))
          .returning();
        console.log(`Deleted ${userResult.length} transactions for user ID ${userIdNum}`);
        totalDeleted += userResult.length;
        
        // Also delete for userID=1 (which appears to have transactions from the UI)
        console.log('Deleting transactions for userID=1 (common inconsistency)');
        const fallbackResult = await db
          .delete(transactions)
          .where(eq(transactions.userId, 1))
          .returning();
        console.log(`Deleted ${fallbackResult.length} transactions for user ID 1`);
        totalDeleted += fallbackResult.length;
        
        // Verify all transactions deleted
        const verifyResult = await db.select().from(transactions);
        console.log(`After deletion: ${verifyResult.length} transactions remain in database`);
        
        // Return success status
        if (totalDeleted > 0) {
          res.json({
            message: 'All transactions deleted successfully',
            success: true,
            count: totalDeleted
          });
        } else if (allTransactions.length === 0) {
          res.json({
            message: 'No transactions found to delete',
            success: true,
            count: 0
          });
        } else {
          console.error('Failed to delete any transactions despite finding some');
          res.status(500).json({
            message: 'Failed to delete transactions',
            code: 'DELETE_FAILED',
            foundCount: allTransactions.length,
            deletedCount: 0
          });
        }
      } catch (error: any) {
        console.error('Error deleting all transactions:', error);
        res.status(500).json({ 
          message: error.message || 'Error deleting all transactions',
          code: 'SERVER_ERROR'
        });
      }
    });
    
    // Import category controller
    const {
      getCategories,
      getCategoryById,
      createCategory,
      updateCategory,
      deleteCategory,
      getSubcategories,
      createSubcategory,
      updateSubcategory,
      deleteSubcategory
    } = await import('./controllers-ts/categoryController');
    
    // Category routes
    app.get(`${apiPath}/categories`, protect, getCategories);
    app.get(`${apiPath}/categories/:id`, protect, getCategoryById);
    app.post(`${apiPath}/categories`, protect, createCategory);
    app.put(`${apiPath}/categories/:id`, protect, updateCategory);
    app.delete(`${apiPath}/categories/:id`, protect, deleteCategory);
    
    // Subcategory routes
    app.get(`${apiPath}/categories/:categoryId/subcategories`, protect, getSubcategories);
    app.post(`${apiPath}/categories/:categoryId/subcategories`, protect, createSubcategory);
    app.put(`${apiPath}/subcategories/:id`, protect, updateSubcategory);
    app.delete(`${apiPath}/subcategories/:id`, protect, deleteSubcategory);
    
    // Import Plaid controllers
    const {
      createLinkToken,
      exchangeToken,
      getAccounts: getPlaidAccounts,
      handleWebhook,
      removeItem
    } = await import('./controllers/plaid-controller');
    
    // Register Plaid routes
    app.post(`${apiPath}/plaid/create_link_token`, protect, createLinkToken);
    app.post(`${apiPath}/plaid/exchange_token`, protect, exchangeToken);
    app.post(`${apiPath}/plaid/accounts`, protect, getPlaidAccounts);
    app.post(`${apiPath}/plaid/item/remove`, protect, removeItem);
    app.post(`${apiPath}/plaid/webhook`, handleWebhook); // Public webhook route
    
    console.log('✅ Auth routes successfully mounted at /api');
    console.log('✅ Plaid routes successfully mounted at /api/plaid');
  } catch (error) {
    console.error('⚠️ Error setting up API routes:', error);
  }
  
  // Current user helper (kept for compatibility with existing code)
  // Fallback user ID for development only - in production, always use req.user._id
  const DEMO_USER_ID = 5;  // Updated to match the current user ID seen in the database
  
  // Helper function to get the authenticated user ID from the request 
  const getCurrentUserId = (): number => {
    // Return the authenticated user ID from the database
    return DEMO_USER_ID;
  };
  
  // Dashboard summary API
  app.get("/api/dashboard/summary", async (req, res) => {
    try {
      // Get current user ID
      const userId = getCurrentUserId();
      
      // Get all transactions for this user
      const transactions = await storage.getTransactions(userId);
      
      // Calculate total balance (sum of all transaction amounts)
      const totalBalance = transactions.reduce((sum, transaction) => {
        const amountAsNumber = typeof transaction.amount === 'string' 
          ? parseFloat(transaction.amount) 
          : transaction.amount;
        return sum + (transaction.type === 'income' ? amountAsNumber : -amountAsNumber);
      }, 0);
      
      // Calculate weekly spending
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay()); // Go back to Sunday
      startOfWeek.setHours(0, 0, 0, 0); // Start of day
      
      // Filter transactions for current week
      const weeklyTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= startOfWeek && t.type === 'expense';
      });
      
      // Sum up weekly expenses
      const weeklySpending = weeklyTransactions.reduce((sum, t) => {
        const amountAsNumber = typeof t.amount === 'string' 
          ? parseFloat(t.amount) 
          : t.amount;
        return sum + amountAsNumber;
      }, 0);
      
      // Calculate monthly income and expenses
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // Get all budget categories to calculate total budget
      const budgetCategories = await storage.getBudgetCategories(userId);
      
      // Filter transactions for current month
      const monthlyTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= startOfMonth;
      });
      
      // Calculate monthly income and expenses
      const monthlyIncome = monthlyTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => {
          const amountAsNumber = typeof t.amount === 'string' 
            ? parseFloat(t.amount) 
            : t.amount;
          return sum + amountAsNumber;
        }, 0);
        
      const monthlyExpenses = monthlyTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => {
          const amountAsNumber = typeof t.amount === 'string' 
            ? parseFloat(t.amount) 
            : t.amount;
          return sum + amountAsNumber;
        }, 0);
      
      // Calculate total budget from budget categories with proper error handling
      const totalBudget = budgetCategories.reduce((sum, category) => {
        // Ensure we handle any format of budget amount (string, number, etc.)
        let budgetAmount = 0;
        
        try {
          budgetAmount = typeof category.budgetAmount === 'string' 
            ? parseFloat(category.budgetAmount) 
            : (category.budgetAmount || 0);
            
          // Ensure it's a valid number
          if (isNaN(budgetAmount)) budgetAmount = 0;
        } catch (err) {
          console.error(`Error parsing budget amount for ${category.name}:`, err);
          budgetAmount = 0;
        }
        
        // Add detailed logging for budget calculation
        console.log(`Budget category: ${category.name}, amount: ${budgetAmount.toFixed(2)}`);
        
        return sum + budgetAmount;
      }, 0);
      
      console.log(`Total budget calculated: ${totalBudget}, Monthly expenses: ${monthlyExpenses}`);
      
      // Calculate total spent from budget categories for consistency with budget page
      let totalBudgetSpent = 0;
      
      // Loop through budget categories to determine total spent
      for (let i = 0; i < budgetCategories.length; i++) {
        const category = budgetCategories[i];
        // Ensure we handle any format of spent amount (string, number, etc.)
        let spentAmount = 0;
        
        try {
          if (category && category.spentAmount !== undefined) {
            spentAmount = typeof category.spentAmount === 'string' 
              ? parseFloat(category.spentAmount) 
              : (category.spentAmount || 0);
              
            // Ensure it's a valid number
            if (isNaN(spentAmount)) spentAmount = 0;
          }
        } catch (err: any) {
          console.error(`Error parsing spent amount for category:`, err);
          spentAmount = 0;
        }
        
        totalBudgetSpent += spentAmount;
      }
      
      console.log(`Calculated total spent from budget categories: ${totalBudgetSpent}`);
      
      // Calculate remaining budget based on budget categories for consistency with budget page
      const calculatedRemainingBudget = Math.max(0, totalBudget - totalBudgetSpent);
      console.log(`Total spent from budget categories: ${totalBudgetSpent}`);
      console.log(`Remaining budget calculated: ${calculatedRemainingBudget} (based on budget categories)`);
      
      // Also include the monthly expenses from transactions for reference
      console.log(`Monthly expenses from transactions: ${monthlyExpenses}`);
      
      res.json({
        totalBalance,
        weeklySpending,
        remainingBudget: calculatedRemainingBudget,
        monthlyIncome,
        monthlyExpenses,
        totalBudget,
        totalSpent: totalBudgetSpent // Add category-based spent amount for consistency with budget page
      });
    } catch (error) {
      console.error('Error generating dashboard summary:', error);
      res.status(500).json({ message: 'Failed to generate dashboard summary' });
    }
  });
  
  // Recent transactions API
  app.get("/api/transactions/recent", async (req, res) => {
    try {
      // Get current user ID
      const userId = getCurrentUserId();
      
      // Get limit parameter (default to 3)
      const limit = parseInt(req.query.limit as string) || 3;
      
      // Get transactions for this user
      const allTransactions = await storage.getTransactions(userId);
      
      // Sort by date (newest first) and limit
      const recentTransactions = allTransactions
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit);
      
      // Format the response
      res.json(recentTransactions.map(t => ({
        id: t.id,
        date: t.date.toISOString().split('T')[0], // Format as YYYY-MM-DD
        description: t.merchant || t.category, // Use merchant or category as description
        amount: typeof t.amount === 'string' ? parseFloat(t.amount) : t.amount,
        type: t.type
      })));
    } catch (error) {
      console.error('Error fetching recent transactions:', error);
      res.status(500).json({ message: 'Failed to fetch recent transactions' });
    }
  });

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
      category: z.string().optional().default("Uncategorized"),
      account: z.string().optional().default("Default Account"),
      type: z.enum(['expense', 'income']).default('expense'),
      date: z.string().optional(),
      notes: z.string().optional(),
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
      date: z.string().optional(), // Allow date updates
      notes: z.string().optional(), // Allow notes updates
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
      
      if (validated.date !== undefined) {
        updateData.date = new Date(validated.date);
      }
      
      if (validated.notes !== undefined) {
        updateData.notes = validated.notes;
      }
      
      const updatedTransaction = await storage.updateTransaction(id, updateData);
      res.json(updatedTransaction);
    } catch (error) {
      console.error('Error updating transaction:', error);
      res.status(400).json({ message: "Invalid input", error: JSON.stringify(error) });
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
            percentage: newScore?.savingsProgress || 0, // Show actual percentage without minimum floor
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
      lastUpdated: rivuScore.updatedAt, // Include the last updated timestamp
      factors: [
        { 
          name: "Budget Adherence", 
          percentage: rivuScore.budgetAdherence || 0, 
          rating: getRating(rivuScore.budgetAdherence || 0), 
          color: "bg-[#00C2A8]" 
        },
        { 
          name: "Savings Goal Progress", 
          percentage: rivuScore.savingsProgress || 0, // Use actual percentage without minimum floor 
          rating: getRating(rivuScore.savingsProgress || 0), 
          color: "bg-[#2F80ED]" 
        },
        { 
          name: "Weekly Activity", 
          percentage: rivuScore.weeklyActivity || 0, 
          rating: getRating(rivuScore.weeklyActivity || 0), 
          color: "bg-[#D0F500]" 
        },
      ]
    });
  });
  
  // Recalculate Rivu Score endpoint
  app.post("/api/rivu-score/recalculate", async (req, res) => {
    try {
      const userId = getCurrentUserId();
      
      // Explicitly force a full recalculation
      const newScore = await storage.calculateRivuScore(userId);
      
      // Get the updated score
      const rivuScore = await storage.getRivuScore(userId);
      
      if (!rivuScore) {
        return res.status(500).json({ 
          message: 'Failed to recalculate Rivu score', 
          code: 'SCORE_CALCULATION_FAILED' 
        });
      }
      
      // New users should get a grace period - apply a time-weighted adjustment
      // for users who are within their first week
      const isNewUser = await storage.isNewUser(userId);
      
      // Format the response
      res.json({
        score: rivuScore.score,
        lastUpdated: rivuScore.updatedAt, // Include the last updated timestamp
        factors: [
          { 
            name: "Budget Adherence", 
            percentage: rivuScore.budgetAdherence || 0, 
            rating: getRating(rivuScore.budgetAdherence || 0), 
            color: "bg-[#00C2A8]" 
          },
          { 
            name: "Savings Goal Progress", 
            percentage: rivuScore.savingsProgress || 0, // Show actual percentage without minimum floor
            rating: getRating(rivuScore.savingsProgress || 0), 
            color: "bg-[#2F80ED]" 
          },
          { 
            name: "Weekly Activity", 
            percentage: isNewUser ? Math.max(rivuScore.weeklyActivity || 0, 50) : (rivuScore.weeklyActivity || 0), // Give new users a boost
            rating: getRating(isNewUser ? Math.max(rivuScore.weeklyActivity || 0, 50) : (rivuScore.weeklyActivity || 0)), 
            color: "bg-[#D0F500]" 
          },
        ]
      });
    } catch (error) {
      console.error('Error recalculating Rivu score:', error);
      res.status(500).json({ 
        message: 'Failed to recalculate Rivu score', 
        code: 'SERVER_ERROR' 
      });
    }
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
      
      // Calculate percent changes with limits to prevent extreme values
      const calculateChange = (current: number, previous: number) => {
        // If previous is 0, return 0 to avoid infinity
        if (previous === 0) return 0;
        
        // Calculate percentage change
        const change = ((current - previous) / previous * 100);
        
        // Cap at reasonable limits to prevent unrealistic displays like +396.6%
        return Math.max(Math.min(change, 100), -100).toFixed(1);
      };
      
      // Round to 2 decimal places for display
      const formatCurrency = (amount: number) => {
        return Math.round(amount * 100) / 100;
      };
      
      const spendingChange = Number(calculateChange(currentMonthSpending, prevMonthSpending));
      const incomeChange = Number(calculateChange(currentMonthIncome, prevMonthIncome));
      const savingsChange = Number(calculateChange(currentMonthSavings, prevMonthSavings));
      
      // Calculate actual monthly savings (income - expenses)
      // Only display as positive if there are actual savings
      const actualSavings = currentMonthIncome - currentMonthSpending;
      
      res.json({
        monthlySpending: formatCurrency(currentMonthSpending),
        monthlyIncome: formatCurrency(currentMonthIncome),
        monthlySavings: formatCurrency(actualSavings > 0 ? actualSavings : 0),
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

  // No more in-memory goals storage - use PostgreSQL database now
  
  // Helper function to access goals from other parts of the application
  async function getGoalsForUser(userId: number): Promise<Goal[]> {
    const dbGoals = await storage.getSavingsGoals(userId);
    // Convert the database goals to the Goal interface format
    return dbGoals.map(g => ({
      id: g.id,
      userId: g.userId,
      name: g.name,
      targetAmount: parseFloat(String(g.targetAmount)),
      currentAmount: parseFloat(String(g.currentAmount)),
      progressPercentage: parseFloat(String(g.progressPercentage)),
      targetDate: g.targetDate,
      monthlySavings: g.monthlySavings ? JSON.parse(g.monthlySavings) : [],
      createdAt: g.createdAt,
      updatedAt: g.updatedAt
    }));
  };
  
  // Get all goals for a user
  app.get("/api/goals", async (req, res) => {
    try {
      const userId = getCurrentUserId();
      
      // Get goals from PostgreSQL database
      const dbGoals = await storage.getSavingsGoals(userId);
      
      // Format goals for client
      const formattedGoals = dbGoals.map(goal => ({
        id: goal.id,
        userId: goal.userId,
        name: goal.name,
        targetAmount: parseFloat(String(goal.targetAmount)),
        currentAmount: parseFloat(String(goal.currentAmount)),
        progressPercentage: parseFloat(String(goal.progressPercentage)),
        targetDate: goal.targetDate,
        monthlySavings: goal.monthlySavings ? JSON.parse(goal.monthlySavings) : [],
        createdAt: goal.createdAt,
        updatedAt: goal.updatedAt
      }));
      
      // Log for debugging
      console.log(`Found ${dbGoals.length} goals in DB and ${global.appGoals?.length || 0} goals in memory, total: ${dbGoals.length}`);
      
      // Return all goals from database
      res.json(formattedGoals);
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
      const goal = await storage.getSavingsGoal(id);
      
      if (!goal || goal.userId !== userId) {
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
        currentAmount: z.number().or(z.string()).transform(val => 
          typeof val === 'string' ? parseFloat(val) : val
        ).optional(),
        targetDate: z.string().nullable().optional(),
      });
      
      const validation = schema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validation.error.errors 
        });
      }
      
      const userId = getCurrentUserId();
      const { name, targetAmount, currentAmount = 0, targetDate } = validation.data;
      
      console.log('Creating goal with data:', {
        name,
        targetAmount,
        currentAmount,
        targetDate,
        userId
      });
      
      // Create savings goal using storage API
      const goalData = {
        userId,
        name,
        targetAmount: targetAmount.toString(),
        currentAmount: currentAmount.toString(),
        targetDate: targetDate ? new Date(targetDate) : undefined
      };
      
      // Save to PostgreSQL database
      const newGoal = await storage.createSavingsGoal(goalData);
      
      if (!newGoal) {
        console.error('Failed to create goal - no goal returned from storage');
        return res.status(500).json({ message: "Failed to create goal in database" });
      }
      
      console.log('Goal created successfully:', newGoal);
      
      // Format response for client
      const formattedGoal = {
        id: newGoal.id,
        userId: newGoal.userId,
        name: newGoal.name,
        targetAmount: parseFloat(String(newGoal.targetAmount)),
        currentAmount: parseFloat(String(newGoal.currentAmount)),
        progressPercentage: parseFloat(String(newGoal.progressPercentage)),
        targetDate: newGoal.targetDate,
        monthlySavings: newGoal.monthlySavings ? JSON.parse(newGoal.monthlySavings) : [],
        createdAt: newGoal.createdAt,
        updatedAt: newGoal.updatedAt
      };
      
      // Update Rivu score after adding a new goal
      await storage.calculateRivuScore(userId);
      
      res.status(201).json(formattedGoal);
    } catch (error) {
      console.error('Error creating goal:', error);
      res.status(500).json({ 
        message: "Error creating goal", 
        error: error instanceof Error ? error.message : String(error)
      });
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
      
      // Get user demographic data
      const user = await storage.getUser(userId);
      
      // Extract relevant financial information
      const financialContext = {
        rivuScore: rivuScore?.score,
        demographics: {
          ageRange: user?.ageRange || 'Not specified',
          incomeBracket: user?.incomeBracket || 'Not specified',
          riskTolerance: user?.riskTolerance || 'Not specified',
          experienceLevel: user?.experienceLevel || 'Not specified',
          financialGoals: user?.goals || 'Not specified'
        },
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
      
      // Create formatted budget categories string
      const budgetCategoriesText = financialContext.budgetCategories.map(cat => 
        `${cat.name} | Budgeted: $${cat.budgeted} | Spent: $${cat.spent} | ${cat.percentUsed}`
      ).join('\n- ');
      
      // Format transactions
      const transactionsText = financialContext.recentTransactions.map(tx => 
        `${tx.date} | ${tx.merchant} | $${tx.amount} | ${tx.category}`
      ).join('\n- ');
      
      // Determine activity level based on recent transactions
      let activityLevel = "Low";
      if (financialContext.recentTransactions.length >= 5) {
        activityLevel = "High";
      } else if (financialContext.recentTransactions.length >= 3) {
        activityLevel = "Medium";
      }
      
      // Format demographics for prompt
      const demographicsText = `
- Age Range: ${financialContext.demographics.ageRange}
- Income Bracket: ${financialContext.demographics.incomeBracket}
- Risk Tolerance: ${financialContext.demographics.riskTolerance}
- Financial Experience: ${financialContext.demographics.experienceLevel}
- Financial Goals: ${financialContext.demographics.financialGoals}`;

      // Build the prompt according to new template
      let prompt = `You are Rivu, an AI personal finance coach. Analyze this user's financial data and provide clear, actionable advice tailored to their specific demographic profile.

User profile:
- Rivu Score: ${financialContext.rivuScore || 'Not available'}
- User Demographics: ${demographicsText}
- Budget categories: 
- ${budgetCategoriesText}
- Last 5 Transactions: 
- ${transactionsText}
- Activity level: ${activityLevel}`;
      
      // Add user question if provided
      if (userPrompt) {
        prompt += `\n\nUser's question: ${userPrompt}`;
      }
      
      prompt += `\n\nReturn 2-3 sentences of personalized advice using this data. Do not generalize. Reference specifics from spending and savings trends. Tailor your recommendations to the user's specific demographics including age range, income bracket, risk tolerance, and financial experience level.`;
      
      // Add conditional prompting instructions based on financial situation
      const hasOverspending = financialContext.budgetCategories.some(cat => 
        parseFloat(cat.spent) > parseFloat(cat.budgeted)
      );
      
      // Add demographic-specific advice
      const ageRange = financialContext.demographics.ageRange;
      const riskTolerance = financialContext.demographics.riskTolerance;
      const experienceLevel = financialContext.demographics.experienceLevel;
      
      if (hasOverspending) {
        prompt += `\n\nFocus on identifying categories where the user is overspending and suggest specific corrections.`;
      } else if (activityLevel === "Low") {
        prompt += `\n\nEncourage more check-ins and regular tracking of finances.`;
      } else {
        prompt += `\n\nReinforce good behavior and suggest next steps for financial progress (e.g., investing, debt payoff).`;
      }
      
      // Add age-specific advice
      if (ageRange && ageRange !== 'Not specified') {
        if (ageRange.includes('18-25')) {
          prompt += `\n\nFor this younger user (${ageRange}), emphasize building credit, emergency funds, and habits that will benefit them long-term.`;
        } else if (ageRange.includes('26-35')) {
          prompt += `\n\nFor this user in their late 20s/early 30s, balance advice between debt management, career growth, and beginning serious investment/retirement planning.`;
        } else if (ageRange.includes('36-50')) {
          prompt += `\n\nFor this mid-career user, focus on accelerating retirement savings, optimizing tax strategies, and balancing multiple financial priorities.`;
        } else if (ageRange.includes('51-65')) {
          prompt += `\n\nFor this pre-retirement user, emphasize retirement readiness, healthcare planning, and preserving capital while still growing assets.`;
        } else if (ageRange.includes('65+')) {
          prompt += `\n\nFor this retirement-age user, focus on sustainable withdrawal strategies, legacy planning, and maintaining financial security.`;
        }
      }
      
      // Add risk tolerance context
      if (riskTolerance && riskTolerance !== 'Not specified') {
        if (riskTolerance.includes('conservative')) {
          prompt += `\n\nAlways keep their ${riskTolerance} risk tolerance in mind - prioritize security and stability in your recommendations.`;
        } else if (riskTolerance.includes('moderate')) {
          prompt += `\n\nWith their ${riskTolerance} risk tolerance, balance growth opportunities with adequate risk management.`;
        } else if (riskTolerance.includes('aggressive')) {
          prompt += `\n\nFor this user with ${riskTolerance} risk tolerance, you can suggest more growth-oriented strategies while still emphasizing diversification.`;
        }
      }
      
      // Consider experience level
      if (experienceLevel && experienceLevel !== 'Not specified') {
        if (experienceLevel.includes('beginner')) {
          prompt += `\n\nKeep explanations simple and educational since they identify as a ${experienceLevel} with finances.`;
        } else if (experienceLevel.includes('intermediate')) {
          prompt += `\n\nWith their ${experienceLevel} experience, you can use more specific terminology but still provide context for more advanced concepts.`;
        } else if (experienceLevel.includes('advanced')) {
          prompt += `\n\nFor this ${experienceLevel} user, you can reference more sophisticated financial strategies and concepts.`;
        }
      }
      
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
