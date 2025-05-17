import { 
  User, InsertUser, 
  BudgetCategory, InsertBudgetCategory,
  Transaction, InsertTransaction,
  SavingsGoal, InsertSavingsGoal,
  RivuScore, InsertRivuScore
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { 
  users, 
  budgetCategories, 
  transactions, 
  savingsGoals,
  rivuScores 
} from "@shared/schema";

// Storage interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  
  // Budget category operations
  getBudgetCategories(userId: number): Promise<BudgetCategory[]>;
  getBudgetCategory(id: number): Promise<BudgetCategory | undefined>;
  createBudgetCategory(category: InsertBudgetCategory): Promise<BudgetCategory>;
  updateBudgetCategory(id: number, data: Partial<BudgetCategory>): Promise<BudgetCategory | undefined>;
  deleteBudgetCategory(id: number): Promise<boolean>;
  
  // Transaction operations
  getTransactions(userId: number): Promise<Transaction[]>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, data: Partial<Transaction>): Promise<Transaction | undefined>;
  deleteTransaction(id: number): Promise<boolean>;
  
  // Savings Goal operations
  getSavingsGoals(userId: number): Promise<SavingsGoal[]>;
  getSavingsGoal(id: number): Promise<SavingsGoal | undefined>;
  createSavingsGoal(goal: InsertSavingsGoal): Promise<SavingsGoal>;
  updateSavingsGoal(id: number, data: Partial<SavingsGoal>): Promise<SavingsGoal | undefined>;
  deleteSavingsGoal(id: number): Promise<boolean>;
  
  // Rivu Score operations
  getRivuScore(userId: number): Promise<RivuScore | undefined>;
  createOrUpdateRivuScore(score: InsertRivuScore): Promise<RivuScore>;

  // Helper methods
  calculateRivuScore(userId: number): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        loginCount: 0,
        createdAt: new Date(),
      })
      .returning();
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }

  // Budget category operations
  async getBudgetCategories(userId: number): Promise<BudgetCategory[]> {
    return db
      .select()
      .from(budgetCategories)
      .where(eq(budgetCategories.userId, userId));
  }

  async getBudgetCategory(id: number): Promise<BudgetCategory | undefined> {
    const [category] = await db
      .select()
      .from(budgetCategories)
      .where(eq(budgetCategories.id, id));
    return category || undefined;
  }

  async createBudgetCategory(category: InsertBudgetCategory): Promise<BudgetCategory> {
    const [newCategory] = await db
      .insert(budgetCategories)
      .values({
        ...category,
        spentAmount: "0",
        createdAt: new Date(),
      })
      .returning();
    return newCategory;
  }

  async updateBudgetCategory(id: number, data: Partial<BudgetCategory>): Promise<BudgetCategory | undefined> {
    const [updatedCategory] = await db
      .update(budgetCategories)
      .set(data)
      .where(eq(budgetCategories.id, id))
      .returning();
    return updatedCategory || undefined;
  }

  async deleteBudgetCategory(id: number): Promise<boolean> {
    const result = await db
      .delete(budgetCategories)
      .where(eq(budgetCategories.id, id));
    return !!result;
  }

  // Transaction operations
  async getTransactions(userId: number): Promise<Transaction[]> {
    return db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.date));
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id));
    return transaction || undefined;
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    // Make sure we have the required type field
    const typeValue = transaction.type || 'expense';
    
    const [newTransaction] = await db
      .insert(transactions)
      .values({
        ...transaction,
        type: typeValue,
        date: transaction.date || new Date(),
        createdAt: new Date(),
      })
      .returning();
    
    // Update budget category spent amount
    if (transaction.type === 'expense') {
      const categories = await this.getBudgetCategories(transaction.userId);
      const category = categories.find(c => c.name === transaction.category);
      if (category) {
        const currentSpent = parseFloat(String(category.spentAmount));
        const transAmount = parseFloat(String(transaction.amount));
        await this.updateBudgetCategory(category.id, {
          spentAmount: (currentSpent + transAmount).toString()
        });
      }
    }
    
    // Recalculate Rivu score after a new transaction
    await this.calculateAndUpdateRivuScore(transaction.userId);
    
    return newTransaction;
  }

  async updateTransaction(id: number, data: Partial<Transaction>): Promise<Transaction | undefined> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id));
    
    if (!transaction) return undefined;
    
    const [updatedTransaction] = await db
      .update(transactions)
      .set(data)
      .where(eq(transactions.id, id))
      .returning();
    
    // Recalculate Rivu score after updating a transaction
    await this.calculateAndUpdateRivuScore(transaction.userId);
    
    return updatedTransaction || undefined;
  }

  async deleteTransaction(id: number): Promise<boolean> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id));
    
    if (!transaction) return false;
    
    const userId = transaction.userId;
    const result = await db
      .delete(transactions)
      .where(eq(transactions.id, id));
    
    // Recalculate Rivu score after deleting a transaction
    if (result) {
      await this.calculateAndUpdateRivuScore(userId);
    }
    
    return !!result;
  }
  
  // Savings Goal operations
  async getSavingsGoals(userId: number): Promise<SavingsGoal[]> {
    return db
      .select()
      .from(savingsGoals)
      .where(eq(savingsGoals.userId, userId))
      .orderBy(desc(savingsGoals.createdAt));
  }

  async getSavingsGoal(id: number): Promise<SavingsGoal | undefined> {
    const [goal] = await db
      .select()
      .from(savingsGoals)
      .where(eq(savingsGoals.id, id));
    return goal || undefined;
  }

  async createSavingsGoal(goal: InsertSavingsGoal): Promise<SavingsGoal> {
    // Calculate initial progress percentage if both target and current amounts are provided
    let progressPercentage = "0";
    if (goal.targetAmount && goal.currentAmount) {
      const target = parseFloat(String(goal.targetAmount));
      const current = parseFloat(String(goal.currentAmount));
      if (target > 0) {
        progressPercentage = ((current / target) * 100).toFixed(2);
      }
    }
    
    const [newGoal] = await db
      .insert(savingsGoals)
      .values({
        ...goal,
        progressPercentage,
        monthlySavings: "[]", // Initialize with empty array
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    // Recalculate Rivu score after creating a new goal
    await this.calculateAndUpdateRivuScore(goal.userId);
    
    return newGoal;
  }

  async updateSavingsGoal(id: number, data: Partial<SavingsGoal>): Promise<SavingsGoal | undefined> {
    const [goal] = await db
      .select()
      .from(savingsGoals)
      .where(eq(savingsGoals.id, id));
    
    if (!goal) return undefined;
    
    // If amountToAdd is provided, update currentAmount and recalculate progress
    if (data.currentAmount !== undefined) {
      const target = parseFloat(String(goal.targetAmount));
      const newCurrent = parseFloat(String(data.currentAmount));
      
      if (target > 0) {
        data.progressPercentage = ((newCurrent / target) * 100).toFixed(2);
      }
      
      // Handle monthly savings update if this is adding money
      if (newCurrent > parseFloat(String(goal.currentAmount))) {
        const addedAmount = newCurrent - parseFloat(String(goal.currentAmount));
        
        // Update the monthly savings data
        try {
          const monthlySavings = JSON.parse(goal.monthlySavings || '[]');
          const now = new Date();
          const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          
          // Find the entry for this month
          const monthEntry = monthlySavings.find((entry: any) => entry.month === monthKey);
          
          if (monthEntry) {
            // Update existing month
            monthEntry.amount += addedAmount;
          } else {
            // Add new month entry
            monthlySavings.push({
              month: monthKey,
              amount: addedAmount
            });
          }
          
          // Update the data
          data.monthlySavings = JSON.stringify(monthlySavings);
        } catch (error) {
          console.error('Error updating monthly savings data', error);
          // Initialize with new data if parsing fails
          data.monthlySavings = JSON.stringify([{
            month: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`,
            amount: addedAmount
          }]);
        }
      }
    }
    
    // Always update the timestamp
    data.updatedAt = new Date();
    
    const [updatedGoal] = await db
      .update(savingsGoals)
      .set(data)
      .where(eq(savingsGoals.id, id))
      .returning();
    
    // Recalculate Rivu score after updating a goal
    await this.calculateAndUpdateRivuScore(goal.userId);
    
    return updatedGoal || undefined;
  }

  async deleteSavingsGoal(id: number): Promise<boolean> {
    const [goal] = await db
      .select()
      .from(savingsGoals)
      .where(eq(savingsGoals.id, id));
    
    if (!goal) return false;
    
    const userId = goal.userId;
    const result = await db
      .delete(savingsGoals)
      .where(eq(savingsGoals.id, id));
    
    // Recalculate Rivu score after deleting a goal
    if (result) {
      await this.calculateAndUpdateRivuScore(userId);
    }
    
    return !!result;
  }

  // Rivu Score operations
  async getRivuScore(userId: number): Promise<RivuScore | undefined> {
    const [score] = await db
      .select()
      .from(rivuScores)
      .where(eq(rivuScores.userId, userId));
    return score || undefined;
  }

  async createOrUpdateRivuScore(scoreData: InsertRivuScore): Promise<RivuScore> {
    const existingScore = await this.getRivuScore(scoreData.userId);
    
    if (existingScore) {
      const [updatedScore] = await db
        .update(rivuScores)
        .set({
          ...scoreData,
          updatedAt: new Date(),
        })
        .where(eq(rivuScores.userId, scoreData.userId))
        .returning();
      return updatedScore;
    } else {
      const [newScore] = await db
        .insert(rivuScores)
        .values({
          ...scoreData,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      return newScore;
    }
  }

  // Helper methods
  async calculateRivuScore(userId: number): Promise<number> {
    // Get user's budget categories
    const categories = await this.getBudgetCategories(userId);
    
    // Calculate budget adherence (% of categories staying under budget)
    let totalCategories = categories.length;
    let categoriesUnderBudget = 0;
    
    // Check if we have any budget categories to calculate adherence
    if (totalCategories > 0) {
      for (const category of categories) {
        const spent = parseFloat(String(category.spentAmount));
        const budget = parseFloat(String(category.budgetAmount));
        
        if (spent <= budget) {
          categoriesUnderBudget++;
        }
      }
    }
    
    // If no categories, set to 0 as there's nothing to adhere to yet
    const budgetAdherence = totalCategories > 0 
      ? Math.round((categoriesUnderBudget / totalCategories) * 100)
      : 0;
    
    // Get transactions to calculate user activity
    const transactions = await this.getTransactions(userId);
    
    // Calculate weekly activity based on real transaction data
    // Count transactions in the past 7 days
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const recentTransactions = transactions.filter(t => {
      const transDate = new Date(t.date);
      return transDate >= weekAgo && transDate <= now;
    });
    
    // Score between 0-100 based on recent transactions (max 10 transactions = 100%)
    const weeklyActivity = Math.min(recentTransactions.length * 10, 100);
    
    // Get user to check login metrics for engagement
    const user = await this.getUser(userId);
    const loginCount = user?.loginCount || 0;
    
    // Calculate savings progress based on income vs expenses
    const incomeTransactions = transactions.filter(t => t.type === 'income');
    const expenseTransactions = transactions.filter(t => t.type === 'expense');
    
    const totalIncome = incomeTransactions.reduce((sum, t) => sum + parseFloat(String(t.amount)), 0);
    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + parseFloat(String(t.amount)), 0);
    
    // If no income, default to 0% savings
    let savingsProgress = 0;
    if (totalIncome > 0) {
      const savingsRate = Math.max(0, (totalIncome - totalExpenses) / totalIncome);
      savingsProgress = Math.min(Math.round(savingsRate * 100), 100);
    }
    
    // Determine if we have enough data to calculate a meaningful score
    const hasTransactionData = transactions.length > 0;
    const hasBudgetData = categories.length > 0;
    const hasEngagementData = loginCount > 0;
    
    let score = 0;
    
    // Only calculate a score if we have some data to work with
    if (hasTransactionData || hasBudgetData) {
      score = Math.round(
        (budgetAdherence * 0.5) + (savingsProgress * 0.3) + (weeklyActivity * 0.2)
      );
    } else if (hasEngagementData) {
      // Give a starting score just for logging in if no other data
      score = 10;
    }
    
    // Create or update the Rivu score
    await this.createOrUpdateRivuScore({
      userId,
      score,
      budgetAdherence,
      savingsProgress,
      weeklyActivity,
    });
    
    return score;
  }
  
  private async calculateAndUpdateRivuScore(userId: number): Promise<void> {
    await this.calculateRivuScore(userId);
  }
}

export const storage = new DatabaseStorage();
