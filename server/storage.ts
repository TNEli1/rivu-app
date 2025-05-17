import { 
  User, InsertUser, 
  BudgetCategory, InsertBudgetCategory,
  Transaction, InsertTransaction,
  SavingsGoal, InsertSavingsGoal,
  RivuScore, InsertRivuScore,
  Nudge, InsertNudge,
  TransactionAccount, InsertTransactionAccount,
  Category, InsertCategory,
  Subcategory, InsertSubcategory
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lt, isNull, sql, or, between } from "drizzle-orm";
import { 
  users, 
  budgetCategories, 
  transactions, 
  savingsGoals,
  rivuScores,
  nudges,
  transactionAccounts,
  categories,
  subcategories
} from "@shared/schema";

// Storage interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  createPasswordResetToken(email: string, tokenHash: string, expiry: Date): Promise<boolean>;
  verifyPasswordResetToken(tokenHash: string): Promise<User | null>;
  resetPassword(tokenHash: string, newPassword: string): Promise<boolean>;
  
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
  importTransactionsFromCSV(userId: number, csvData: string): Promise<{imported: number, duplicates: number}>;
  checkForDuplicateTransactions(transaction: InsertTransaction): Promise<boolean>;
  markTransactionAsNotDuplicate(id: number): Promise<boolean>;
  
  // Savings Goal operations
  getSavingsGoals(userId: number): Promise<SavingsGoal[]>;
  getSavingsGoal(id: number): Promise<SavingsGoal | undefined>;
  createSavingsGoal(goal: InsertSavingsGoal): Promise<SavingsGoal>;
  updateSavingsGoal(id: number, data: Partial<SavingsGoal>): Promise<SavingsGoal | undefined>;
  deleteSavingsGoal(id: number): Promise<boolean>;
  
  // Rivu Score operations
  getRivuScore(userId: number): Promise<RivuScore | undefined>;
  createOrUpdateRivuScore(score: InsertRivuScore): Promise<RivuScore>;
  
  // Nudge system operations
  getNudges(userId: number, status?: string): Promise<Nudge[]>;
  createNudge(nudge: InsertNudge): Promise<Nudge>;
  updateNudgeStatus(id: number, status: string): Promise<Nudge | undefined>;
  dismissNudge(id: number): Promise<boolean>;
  completeNudge(id: number): Promise<boolean>;
  checkAndCreateNudges(userId: number): Promise<Nudge[]>;
  
  // Transaction Account operations
  getTransactionAccounts(userId: number): Promise<TransactionAccount[]>;
  getTransactionAccount(id: number): Promise<TransactionAccount | undefined>;
  createTransactionAccount(account: InsertTransactionAccount): Promise<TransactionAccount>;
  updateTransactionAccount(id: number, data: Partial<TransactionAccount>): Promise<TransactionAccount | undefined>;
  deleteTransactionAccount(id: number): Promise<boolean>;
  
  // Category operations
  getCategories(userId: number, type?: string): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, data: Partial<Category>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;
  
  // Subcategory operations
  getSubcategories(categoryId: number): Promise<Subcategory[]>;
  getSubcategory(id: number): Promise<Subcategory | undefined>;
  createSubcategory(subcategory: InsertSubcategory): Promise<Subcategory>;
  updateSubcategory(id: number, data: Partial<Subcategory>): Promise<Subcategory | undefined>;
  deleteSubcategory(id: number): Promise<boolean>;

  // Helper methods
  calculateRivuScore(userId: number): Promise<number>;
  updateOnboardingStage(userId: number, stage: string): Promise<User | undefined>;
  isNewUser(userId: number): Promise<boolean>; // Check if user is within first 7 days
  createDefaultCategoriesForUser(userId: number): Promise<void>; // Create default categories for new users
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
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
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
      
    // Create default categories for the user
    await this.createDefaultCategoriesForUser(user.id);
    
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
  
  async createPasswordResetToken(email: string, tokenHash: string, expiry: Date): Promise<boolean> {
    // Find user by email
    const user = await this.getUserByEmail(email);
    if (!user) return false;
    
    // Save the token hash and expiry to the user's record
    await db.update(users)
      .set({
        resetToken: tokenHash,
        resetTokenExpiry: expiry
      })
      .where(eq(users.id, user.id));
    
    return true;
  }
  
  async verifyPasswordResetToken(tokenHash: string): Promise<User | null> {
    try {
      // Find user with this token hash
      const [user] = await db.select()
        .from(users)
        .where(eq(users.resetToken, tokenHash));
      
      if (!user) return null;
      
      // Check if token is expired
      if (!user.resetTokenExpiry || new Date() > new Date(user.resetTokenExpiry)) {
        // Clear expired token
        await db.update(users)
          .set({
            resetToken: null,
            resetTokenExpiry: null
          })
          .where(eq(users.id, user.id));
        
        return null;
      }
      
      return user;
    } catch (error) {
      console.error('Error verifying password reset token:', error);
      return null;
    }
  }
  
  async resetPassword(tokenHash: string, newPassword: string): Promise<boolean> {
    try {
      // Verify token is valid
      const user = await this.verifyPasswordResetToken(tokenHash);
      if (!user) return false;
      
      // Hash the new password
      const bcrypt = await import('bcrypt');
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      // Update password and clear token
      await db.update(users)
        .set({
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null
        })
        .where(eq(users.id, user.id));
      
      return true;
    } catch (error) {
      console.error('Error resetting password:', error);
      return false;
    }
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
    
    // Check for duplicate transactions
    const isDuplicate = await this.checkForDuplicateTransactions(transaction);
    
    const dateValue = transaction.date ? new Date(transaction.date) : new Date();
    
    const [newTransaction] = await db
      .insert(transactions)
      .values({
        ...transaction,
        type: typeValue,
        date: dateValue,
        source: transaction.source || 'manual',
        isDuplicate: isDuplicate,
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
  
  async checkForDuplicateTransactions(transaction: InsertTransaction): Promise<boolean> {
    // Check for transactions with similar amount, date and merchant
    const amount = parseFloat(transaction.amount.toString());
    const minAmount = amount * 0.95; // 5% tolerance below
    const maxAmount = amount * 1.05; // 5% tolerance above
    
    const transactionDate = transaction.date ? new Date(transaction.date) : new Date();
    
    // Get the date range (one day before and after)
    const startDate = new Date(transactionDate);
    startDate.setDate(startDate.getDate() - 1);
    
    const endDate = new Date(transactionDate);
    endDate.setDate(endDate.getDate() + 1);
    
    // Find similar transactions
    const similarTransactions = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, transaction.userId),
          eq(transactions.merchant, transaction.merchant),
          // Check type if it exists
          transaction.type ? eq(transactions.type, transaction.type) : undefined,
          between(transactions.date, startDate, endDate),
          gte(transactions.amount, minAmount.toString()),
          lt(transactions.amount, maxAmount.toString())
        )
      );
    
    return similarTransactions.length > 0;
  }
  
  async markTransactionAsNotDuplicate(id: number): Promise<boolean> {
    await db
      .update(transactions)
      .set({ isDuplicate: false })
      .where(eq(transactions.id, id));
    
    return true;
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
  
  async importTransactionsFromCSV(userId: number, csvData: string): Promise<{imported: number, duplicates: number}> {
    let importedCount = 0;
    let duplicateCount = 0;
    
    try {
      // Parse CSV data
      const lines = csvData.split('\n');
      if (lines.length <= 1) {
        throw new Error('CSV file appears to be empty or only contains headers');
      }
      
      // Get headers and normalize them
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      // Find required column indices
      const dateIndex = headers.indexOf('date');
      const amountIndex = headers.indexOf('amount');
      // For merchant/description, we'll accept either column name
      const merchantIndex = headers.indexOf('merchant') !== -1 ? 
                            headers.indexOf('merchant') : 
                            headers.indexOf('description');
      
      // Find optional columns
      const typeIndex = headers.indexOf('type');
      const categoryIndex = headers.indexOf('category');
      const accountIndex = headers.indexOf('account');
      const notesIndex = headers.indexOf('notes');
      
      // Ensure required fields exist
      if (dateIndex === -1 || amountIndex === -1 || merchantIndex === -1) {
        throw new Error('CSV is missing required columns (date, amount, and merchant/description)');
      }
      
      // Process each transaction row
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines
        
        const values = line.split(',').map(v => v.trim());
        
        // Process date - try to parse it properly
        let transactionDate: Date;
        try {
          transactionDate = new Date(values[dateIndex]);
          if (isNaN(transactionDate.getTime())) {
            // If date parsing fails, default to today
            transactionDate = new Date();
          }
        } catch (e) {
          transactionDate = new Date();
        }
        
        // Process amount - clean up amount string
        let amount = values[amountIndex].replace(/[^0-9.-]/g, '');
        
        // Determine transaction type based on amount sign or explicit type column
        let type = 'expense';
        if (typeIndex !== -1) {
          const typeValue = values[typeIndex].toLowerCase();
          type = typeValue.includes('income') || typeValue.includes('deposit') ? 'income' : 'expense';
        } else if (amount.startsWith('-')) {
          // Negative amounts are expenses by default
          type = 'expense';
          amount = amount.substring(1); // Remove the negative sign
        } else {
          // Otherwise assume income if not specified
          type = 'income';
        }
        
        const merchant = values[merchantIndex] || 'Unknown';
        const category = categoryIndex !== -1 ? values[categoryIndex] || 'Uncategorized' : 'Uncategorized';
        const account = accountIndex !== -1 ? values[accountIndex] || 'Imported' : 'Imported';
        const notes = notesIndex !== -1 ? values[notesIndex] || '' : '';
        
        // Create transaction object
        const transactionData: InsertTransaction = {
          userId,
          amount,
          date: transactionDate,
          merchant,
          category,
          account,
          type,
          notes,
          source: 'csv'
        };
        
        try {
          // Check for duplicates
          const isDuplicate = await this.checkForDuplicateTransactions(transactionData);
          if (isDuplicate) {
            duplicateCount++;
            transactionData.isDuplicate = true;
          }
          
          // Insert the transaction
          await this.createTransaction(transactionData);
          importedCount++;
        } catch (err) {
          console.error('Error importing CSV transaction:', err);
          // Continue with next transaction
        }
      }
      
      return { imported: importedCount, duplicates: duplicateCount };
    } catch (error) {
      console.error('Error importing transactions from CSV:', error);
      throw error;
    }
  }
  
  // Transaction Accounts operations
  async getTransactionAccounts(userId: number): Promise<TransactionAccount[]> {
    return db
      .select()
      .from(transactionAccounts)
      .where(eq(transactionAccounts.userId, userId));
  }

  async getTransactionAccount(id: number): Promise<TransactionAccount | undefined> {
    const [account] = await db
      .select()
      .from(transactionAccounts)
      .where(eq(transactionAccounts.id, id));
    return account || undefined;
  }

  async createTransactionAccount(account: InsertTransactionAccount): Promise<TransactionAccount> {
    const [newAccount] = await db
      .insert(transactionAccounts)
      .values({
        ...account,
        createdAt: new Date(),
      })
      .returning();
    return newAccount;
  }

  async updateTransactionAccount(id: number, data: Partial<TransactionAccount>): Promise<TransactionAccount | undefined> {
    const [updatedAccount] = await db
      .update(transactionAccounts)
      .set(data)
      .where(eq(transactionAccounts.id, id))
      .returning();
    return updatedAccount || undefined;
  }

  async deleteTransactionAccount(id: number): Promise<boolean> {
    const result = await db
      .delete(transactionAccounts)
      .where(eq(transactionAccounts.id, id));
    return !!result;
  }
  
  // Category and Subcategory operations
  async getCategories(userId: number, type?: string): Promise<Category[]> {
    if (type) {
      return db
        .select()
        .from(categories)
        .where(and(
          eq(categories.userId, userId),
          eq(categories.type, type)
        ));
    } else {
      return db
        .select()
        .from(categories)
        .where(eq(categories.userId, userId));
    }
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id));
    return category || undefined;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db
      .insert(categories)
      .values({
        ...category,
        createdAt: new Date(),
      })
      .returning();
    return newCategory;
  }

  async updateCategory(id: number, data: Partial<Category>): Promise<Category | undefined> {
    const [updatedCategory] = await db
      .update(categories)
      .set(data)
      .where(eq(categories.id, id))
      .returning();
    return updatedCategory || undefined;
  }

  async deleteCategory(id: number): Promise<boolean> {
    // First delete all subcategories
    await db
      .delete(subcategories)
      .where(eq(subcategories.categoryId, id));
    
    // Then delete the category
    const result = await db
      .delete(categories)
      .where(eq(categories.id, id));
    return !!result;
  }

  async getSubcategories(categoryId: number): Promise<Subcategory[]> {
    return db
      .select()
      .from(subcategories)
      .where(eq(subcategories.categoryId, categoryId));
  }

  async getSubcategory(id: number): Promise<Subcategory | undefined> {
    const [subcategory] = await db
      .select()
      .from(subcategories)
      .where(eq(subcategories.id, id));
    return subcategory || undefined;
  }

  async createSubcategory(subcategory: InsertSubcategory): Promise<Subcategory> {
    const [newSubcategory] = await db
      .insert(subcategories)
      .values({
        ...subcategory,
        createdAt: new Date(),
      })
      .returning();
    return newSubcategory;
  }

  async updateSubcategory(id: number, data: Partial<Subcategory>): Promise<Subcategory | undefined> {
    const [updatedSubcategory] = await db
      .update(subcategories)
      .set(data)
      .where(eq(subcategories.id, id))
      .returning();
    return updatedSubcategory || undefined;
  }

  async deleteSubcategory(id: number): Promise<boolean> {
    const result = await db
      .delete(subcategories)
      .where(eq(subcategories.id, id));
    return !!result;
  }
  
  async createDefaultCategoriesForUser(userId: number): Promise<void> {
    // Create default expense categories
    const defaultExpenseCategories = [
      'Housing', 'Utilities', 'Food', 'Transportation', 
      'Healthcare', 'Entertainment', 'Shopping', 'Personal Care',
      'Education', 'Travel', 'Debt Payments', 'Savings', 'Investments', 
      'Gifts & Donations', 'Taxes', 'Insurance', 'Miscellaneous'
    ];
    
    // Create default income categories
    const defaultIncomeCategories = [
      'Salary', 'Freelance', 'Business', 'Investments', 
      'Rental Income', 'Gifts', 'Refunds', 'Other Income'
    ];
    
    // Insert all expense categories
    for (const name of defaultExpenseCategories) {
      await this.createCategory({
        userId,
        name,
        type: 'expense',
        isDefault: true
      });
    }
    
    // Insert all income categories
    for (const name of defaultIncomeCategories) {
      await this.createCategory({
        userId,
        name,
        type: 'income',
        isDefault: true
      });
    }
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
    
    // Calculate total budgeted amount and overspent amount
    let totalBudgeted = 0;
    let totalOverspent = 0;
    
    if (totalCategories > 0) {
      for (const category of categories) {
        const spent = parseFloat(String(category.spentAmount));
        const budget = parseFloat(String(category.budgetAmount));
        
        totalBudgeted += budget;
        
        // Calculate overspent amount for each category
        if (spent > budget) {
          totalOverspent += (spent - budget);
        }
      }
    }
    
    // Budget Adherence = (total budgeted - overspent amount) / total budgeted
    // If no budget categories, set to 0 as there's nothing to adhere to yet
    let budgetAdherence = 0;
    if (totalBudgeted > 0) {
      const adherenceRatio = (totalBudgeted - totalOverspent) / totalBudgeted;
      budgetAdherence = Math.round(Math.max(0, Math.min(adherenceRatio, 1)) * 100);
    }
    
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
    
    // Get active savings goals
    const goals = await this.getSavingsGoals(userId);
    
    // Calculate savings progress based on active goals
    // Savings Progress = total saved / total target goal (only for active goals)
    let totalTargetAmount = 0;
    let totalSavedAmount = 0;
    
    for (const goal of goals) {
      const targetAmount = parseFloat(String(goal.targetAmount));
      const currentAmount = parseFloat(String(goal.currentAmount));
      
      totalTargetAmount += targetAmount;
      totalSavedAmount += currentAmount;
    }
    
    // If no active goals or target amounts, default to 0% savings progress
    let savingsProgress = 0;
    if (totalTargetAmount > 0) {
      const progressRatio = totalSavedAmount / totalTargetAmount;
      savingsProgress = Math.min(Math.round(progressRatio * 100), 100);
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
  
  // Nudge system methods
  async getNudges(userId: number, status?: string): Promise<Nudge[]> {
    try {
      if (status) {
        return await db
          .select()
          .from(nudges)
          .where(and(
            eq(nudges.userId, userId),
            eq(nudges.status, status)
          ))
          .orderBy(desc(nudges.createdAt));
      } else {
        return await db
          .select()
          .from(nudges)
          .where(eq(nudges.userId, userId))
          .orderBy(desc(nudges.createdAt));
      }
    } catch (error) {
      console.error('Error fetching nudges:', error);
      throw error;
    }
  }
  
  async createNudge(nudgeData: InsertNudge): Promise<Nudge> {
    try {
      const [nudge] = await db.insert(nudges).values(nudgeData).returning();
      return nudge;
    } catch (error) {
      console.error('Error creating nudge:', error);
      throw error;
    }
  }
  
  async updateNudgeStatus(id: number, status: string): Promise<Nudge | undefined> {
    try {
      const now = new Date();
      const updateData: Record<string, any> = { status };
      
      if (status === 'dismissed') {
        updateData.dismissedAt = now;
      } else if (status === 'completed') {
        updateData.completedAt = now;
      }
      
      const [nudge] = await db
        .update(nudges)
        .set(updateData)
        .where(eq(nudges.id, id))
        .returning();
      
      return nudge;
    } catch (error) {
      console.error('Error updating nudge status:', error);
      throw error;
    }
  }
  
  async dismissNudge(id: number): Promise<boolean> {
    try {
      const result = await this.updateNudgeStatus(id, 'dismissed');
      return !!result;
    } catch (error) {
      console.error('Error dismissing nudge:', error);
      throw error;
    }
  }
  
  async completeNudge(id: number): Promise<boolean> {
    try {
      const result = await this.updateNudgeStatus(id, 'completed');
      return !!result;
    } catch (error) {
      console.error('Error completing nudge:', error);
      throw error;
    }
  }
  
  async checkAndCreateNudges(userId: number): Promise<Nudge[]> {
    try {
      const newNudges: Nudge[] = [];
      const user = await this.getUser(userId);
      
      if (!user) {
        throw new Error('User not found');
      }
      
      // Check if user is still in onboarding period (first 7 days)
      const isNewUser = await this.isNewUser(userId);
      
      if (isNewUser) {
        // Create onboarding nudges based on onboarding stage
        const onboardingStage = user.onboardingStage || 'new';
        
        if (onboardingStage === 'new') {
          // First-time user nudge
          const nudge = await this.createNudge({
            userId,
            type: 'onboarding',
            message: 'Welcome to Rivu! Start by creating a budget category.',
            status: 'active',
            triggerCondition: JSON.stringify({ type: 'new_user' }),
          });
          newNudges.push(nudge);
        } else if (onboardingStage === 'budget_created' && !user.lastTransactionDate) {
          // User created budget but hasn't added transactions
          const nudge = await this.createNudge({
            userId,
            type: 'onboarding',
            message: "Let's add your first transaction together.",
            status: 'active',
            triggerCondition: JSON.stringify({ type: 'budget_created_no_transactions' }),
          });
          newNudges.push(nudge);
        } else if (onboardingStage === 'transaction_added') {
          // User has added transactions but no savings goal
          const goals = await this.getSavingsGoals(userId);
          if (goals.length === 0) {
            const nudge = await this.createNudge({
              userId,
              type: 'onboarding',
              message: 'Set a savings goal to start tracking your progress.',
              status: 'active',
              triggerCondition: JSON.stringify({ type: 'transactions_no_goals' }),
            });
            newNudges.push(nudge);
          }
        }
      } else {
        // User is past onboarding period, check for behavioral nudges
        const now = new Date();
        
        // Check for transaction inactivity (no transactions in 5 days)
        if (user.lastTransactionDate) {
          const lastTransactionDate = new Date(user.lastTransactionDate);
          const daysSinceLastTransaction = Math.floor((now.getTime() - lastTransactionDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysSinceLastTransaction >= 5) {
            const nudge = await this.createNudge({
              userId,
              type: 'transaction_reminder',
              message: 'You haven\'t logged a transaction in 5 days. Keep tracking to improve your Rivu Score!',
              status: 'active',
              triggerCondition: JSON.stringify({ type: 'transaction_inactivity', days: daysSinceLastTransaction }),
            });
            newNudges.push(nudge);
          }
        }
        
        // Check for goal inactivity (no updates in 14 days)
        if (user.lastGoalUpdateDate) {
          const lastGoalDate = new Date(user.lastGoalUpdateDate);
          const daysSinceLastGoalUpdate = Math.floor((now.getTime() - lastGoalDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysSinceLastGoalUpdate >= 14) {
            const nudge = await this.createNudge({
              userId,
              type: 'goal_reminder',
              message: 'Your savings goals haven\'t been updated in 2 weeks. Make progress towards your financial targets!',
              status: 'active',
              triggerCondition: JSON.stringify({ type: 'goal_inactivity', days: daysSinceLastGoalUpdate }),
            });
            newNudges.push(nudge);
          }
        }
        
        // Check budget categories at risk of being exceeded (> 80% spent)
        const categories = await this.getBudgetCategories(userId);
        const categoriesAtRisk = categories.filter(category => {
          const spent = parseFloat(String(category.spentAmount));
          const budget = parseFloat(String(category.budgetAmount));
          return (spent / budget) >= 0.8 && (spent / budget) < 1.0; // 80-99% of budget used
        });
        
        for (const category of categoriesAtRisk) {
          const percentUsed = Math.round((parseFloat(String(category.spentAmount)) / parseFloat(String(category.budgetAmount))) * 100);
          const nudge = await this.createNudge({
            userId,
            type: 'budget_warning',
            message: `Your ${category.name} budget is ${percentUsed}% used. Be careful with your spending!`,
            status: 'active',
            triggerCondition: JSON.stringify({ type: 'budget_at_risk', categoryId: category.id, percentUsed }),
          });
          newNudges.push(nudge);
        }
      }
      
      return newNudges;
    } catch (error) {
      console.error('Error checking and creating nudges:', error);
      throw error;
    }
  }
  
  async updateOnboardingStage(userId: number, stage: string): Promise<User | undefined> {
    try {
      // Valid stages: 'new', 'budget_created', 'transaction_added', 'goal_created', 'completed'
      const updateData: Record<string, any> = { 
        onboardingStage: stage 
      };
      
      if (stage === 'completed') {
        updateData.onboardingCompleted = true;
      }
      
      const [user] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();
      
      return user;
    } catch (error) {
      console.error('Error updating onboarding stage:', error);
      throw error;
    }
  }
  
  async isNewUser(userId: number): Promise<boolean> {
    try {
      const user = await this.getUser(userId);
      if (!user) return false;
      
      if (user.onboardingCompleted) return false;
      
      // Check if user was created less than 7 days ago
      const now = new Date();
      const creationDate = user.accountCreationDate || user.createdAt;
      if (!creationDate) return true; // Default to true if no creation date
      
      const daysSinceCreation = Math.floor((now.getTime() - new Date(creationDate).getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceCreation < 7;
    } catch (error) {
      console.error('Error checking if user is new:', error);
      return false; // Default to false on error
    }
  }
}

export const storage = new DatabaseStorage();
