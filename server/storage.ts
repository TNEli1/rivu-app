import { 
  User, InsertUser, 
  BudgetCategory, InsertBudgetCategory,
  Transaction, InsertTransaction,
  SavingsGoal, InsertSavingsGoal,
  RivuScore, InsertRivuScore,
  Nudge, InsertNudge,
  TransactionAccount, InsertTransactionAccount,
  Category, InsertCategory,
  Subcategory, InsertSubcategory,
  PlaidItem, InsertPlaidItem,
  PlaidAccount, InsertPlaidAccount,
  PlaidWebhookEvent, InsertPlaidWebhookEvent,
  PlaidUserIdentity, InsertPlaidUserIdentity,
  ScoreHistory, InsertScoreHistory
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
  subcategories,
  plaidItems,
  plaidAccounts,
  plaidWebhookEvents,
  plaidUserIdentities,
  scoreHistory
} from "@shared/schema";
// Import direct database access
// We'll modify the getSavingsGoals function to handle in-memory goals

// Storage interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  deleteUserPermanently(id: number): Promise<boolean>;
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
  deleteAllTransactions(userId: number): Promise<boolean>;
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
  
  // Score History operations
  getScoreHistory(userId: number, limit?: number): Promise<ScoreHistory[]>;
  addScoreHistoryEntry(entry: InsertScoreHistory): Promise<ScoreHistory>;
  
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

  // Plaid Item operations
  getPlaidItems(userId: number): Promise<PlaidItem[]>;
  getPlaidItemByItemId(itemId: string): Promise<PlaidItem | undefined>;
  getPlaidItemById(id: number): Promise<PlaidItem | undefined>;
  createPlaidItem(item: InsertPlaidItem): Promise<PlaidItem>;
  updatePlaidItem(id: number, data: Partial<PlaidItem>): Promise<PlaidItem | undefined>;
  updatePlaidItemByItemId(itemId: string, data: Partial<PlaidItem>): Promise<PlaidItem | undefined>;
  deletePlaidItem(id: number): Promise<boolean>;
  disconnectPlaidItem(id: number): Promise<boolean>; // Sets status to 'disconnected' but keeps the record
  
  // Plaid Account operations
  getPlaidAccounts(userId: number): Promise<PlaidAccount[]>;
  getPlaidAccountsByItemId(plaidItemId: number): Promise<PlaidAccount[]>;
  getPlaidAccountByAccountId(accountId: string): Promise<PlaidAccount | undefined>;
  getPlaidAccount(id: number): Promise<PlaidAccount | undefined>;
  createPlaidAccount(account: InsertPlaidAccount): Promise<PlaidAccount>;
  updatePlaidAccount(id: number, data: Partial<PlaidAccount>): Promise<PlaidAccount | undefined>;
  deletePlaidAccount(id: number): Promise<boolean>;
  
  // Plaid Webhook operations
  getPlaidWebhookEvents(itemId: string): Promise<PlaidWebhookEvent[]>;
  createPlaidWebhookEvent(event: InsertPlaidWebhookEvent): Promise<PlaidWebhookEvent>;
  markPlaidWebhookEventAsProcessed(id: number): Promise<PlaidWebhookEvent | undefined>;
  
  // Plaid User Identity operations
  getPlaidUserIdentities(userId: number): Promise<PlaidUserIdentity[]>;
  getPlaidUserIdentity(id: number): Promise<PlaidUserIdentity | undefined>;
  createPlaidUserIdentity(identity: InsertPlaidUserIdentity): Promise<PlaidUserIdentity>;
  updatePlaidUserIdentity(id: number, data: Partial<PlaidUserIdentity>): Promise<PlaidUserIdentity | undefined>;
  
  // Helper methods
  calculateRivuScore(userId: number): Promise<number>;
  updateOnboardingStage(userId: number, stage: string): Promise<User | undefined>;
  isNewUser(userId: number): Promise<boolean>; // Check if user is within first 7 days
  createDefaultCategoriesForUser(userId: number): Promise<void>; // Create default categories for new users
  
  // Plaid Helpers
  hasLinkedPlaidItemForInstitution(userId: number, institutionId: string): Promise<boolean>; // Check for duplicate institution connections
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
  
  async deleteUserPermanently(id: number): Promise<boolean> {
    try {
      // Delete the user record completely from the database
      await db.delete(users).where(eq(users.id, id));
      return true;
    } catch (error) {
      console.error('Error permanently deleting user:', error);
      return false;
    }
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
    // Ensure userId is properly typed as a number
    const userIdNum = typeof userId === 'string' ? parseInt(userId, 10) : userId;
    
    // Query transactions for this user
    const results = await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userIdNum))
      .orderBy(desc(transactions.date));
    
    console.log(`Found ${results.length} transactions for user ID ${userIdNum}`);
    
    return results;
  }

  async getTransaction(id: number, userId?: number): Promise<Transaction | undefined> {
    // If userId is provided, ensure we only return transactions belonging to that user
    // This prevents data leakage between accounts
    const query = db.select().from(transactions);
    
    if (userId !== undefined) {
      // When userId is provided, strictly enforce user data isolation
      query.where(and(
        eq(transactions.id, id),
        eq(transactions.userId, userId)
      ));
    } else {
      // Only use this branch for system operations, never for user-facing queries
      query.where(eq(transactions.id, id));
    }
    
    const [transaction] = await query;
    return transaction || undefined;
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    // Make sure we have the required type field
    const typeValue = transaction.type || 'expense';
    
    // Check for duplicate transactions
    const isDuplicate = await this.checkForDuplicateTransactions(transaction);
    
    // Fix date handling to prevent timezone issues
    let dateValue: Date;
    if (transaction.date) {
      // If the date is already a Date object
      if (transaction.date instanceof Date) {
        // Create a new date object with the same year, month, day at 12:00:00
        dateValue = new Date(
          transaction.date.getFullYear(),
          transaction.date.getMonth(),
          transaction.date.getDate(),
          12, 0, 0, 0
        );
      } else {
        // If it's a string, first convert to Date
        const tempDate = new Date(transaction.date);
        // Then create a new date at noon to avoid timezone issues
        dateValue = new Date(
          tempDate.getFullYear(),
          tempDate.getMonth(),
          tempDate.getDate(),
          12, 0, 0, 0
        );
      }
    } else {
      // If no date provided, use today at noon
      const now = new Date();
      dateValue = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        12, 0, 0, 0
      );
    }
    
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

  async updateTransaction(id: number, data: Partial<Transaction>, userId?: number): Promise<Transaction | undefined> {
    // First retrieve the transaction, ensuring it belongs to the correct user if userId is provided
    const query = db.select().from(transactions);
    
    if (userId !== undefined) {
      // Strict user data isolation - only allow updating transactions that belong to this user
      query.where(and(
        eq(transactions.id, id),
        eq(transactions.userId, userId)
      ));
    } else {
      // Only for system operations, never for user-facing requests
      query.where(eq(transactions.id, id));
    }
    
    const [transaction] = await query;
    if (!transaction) return undefined;
    
    // Now perform the update with the same user isolation
    const updateQuery = db.update(transactions).set(data);
    
    if (userId !== undefined) {
      updateQuery.where(and(
        eq(transactions.id, id),
        eq(transactions.userId, userId)
      ));
    } else {
      updateQuery.where(eq(transactions.id, id));
    }
    
    const [updatedTransaction] = await updateQuery.returning();
    
    // Recalculate Rivu score after updating a transaction
    await this.calculateAndUpdateRivuScore(transaction.userId);
    
    return updatedTransaction || undefined;
  }

  async deleteTransaction(id: number, userId?: number): Promise<boolean> {
    // First verify the transaction exists and belongs to the correct user if userId is provided
    const query = db.select().from(transactions);
    
    if (userId !== undefined) {
      // Strict user data isolation - only allow deleting transactions that belong to this user
      query.where(and(
        eq(transactions.id, id),
        eq(transactions.userId, userId)
      ));
    } else {
      // Only for system operations, never for user-facing requests
      query.where(eq(transactions.id, id));
    }
    
    const [transaction] = await query;
    if (!transaction) return false;
    
    // Now perform the delete with the same user isolation
    const deleteQuery = db.delete(transactions);
    
    if (userId !== undefined) {
      deleteQuery.where(and(
        eq(transactions.id, id),
        eq(transactions.userId, userId)
      ));
    } else {
      deleteQuery.where(eq(transactions.id, id));
    }
    
    const result = await deleteQuery;
    
    // Recalculate Rivu score after deleting a transaction
    if (result) {
      await this.calculateAndUpdateRivuScore(transaction.userId);
    }
    
    return !!result;
  }
  
  async deleteAllTransactions(userId: number): Promise<boolean> {
    try {
      console.log(`Attempting to delete all transactions for user ID: ${userId}`);
      
      // Delete transactions directly without additional queries
      const result = await db
        .delete(transactions)
        .where(eq(transactions.userId, userId));
      
      console.log(`Delete operation completed for user ${userId}`);
      
      // Update user's lastTransactionDate to track this activity
      await this.updateUser(userId, {
        lastTransactionDate: new Date()
      });
      
      return true;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error deleting all transactions:', errorMessage);
      return false;
    }
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
        
        // Create transaction object with explicit userId
        const transactionData: InsertTransaction = {
          userId: userId, // Explicitly set userId to ensure it matches the authenticated user
          amount,
          date: transactionDate,
          merchant,
          category,
          account,
          type,
          notes,
          source: 'csv'
        };
        
        // Debug log to verify the correct user ID is being used
        console.log(`Creating CSV transaction for user ID: ${userId}, merchant: ${merchant}, amount: ${amount}`);
        
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
    const { userId, score } = scoreData;
    
    // Prepare for potential history tracking
    let previousScore: number | null = null;
    let scoreChanged = false;
    let result: RivuScore;
    
    if (existingScore) {
      previousScore = existingScore.score;
      scoreChanged = existingScore.score !== score;
      
      const [updatedScore] = await db
        .update(rivuScores)
        .set({
          ...scoreData,
          updatedAt: new Date(),
        })
        .where(eq(rivuScores.userId, scoreData.userId))
        .returning();
      result = updatedScore;
    } else {
      const [newScore] = await db
        .insert(rivuScores)
        .values({
          ...scoreData,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      result = newScore;
      
      // For new users, always record first score in history
      scoreChanged = true;
    }
    
    // Record in history if score changed
    if (scoreChanged) {
      await this.addScoreHistoryEntry({
        userId,
        score,
        previousScore,
        change: previousScore !== null ? score - previousScore : undefined,
        reason: 'periodic_update',
        notes: 'Automatic score update'
      });
    }
    
    return result;
  }
  
  // Score History operations
  async getScoreHistory(userId: number, limit?: number): Promise<ScoreHistory[]> {
    try {
      // Create base query
      let query = db.select().from(scoreHistory)
        .where(eq(scoreHistory.userId, userId))
        .orderBy(desc(scoreHistory.createdAt));
      
      // Execute with or without limit
      if (limit) {
        return await query.limit(limit);
      } else {
        return await query;
      }
    } catch (error) {
      console.error('Error getting score history:', error);
      return [];
    }
  }
  
  async addScoreHistoryEntry(entry: InsertScoreHistory): Promise<ScoreHistory> {
    try {
      const [result] = await db.insert(scoreHistory)
        .values({
          ...entry,
          createdAt: new Date()
        })
        .returning();
      return result;
    } catch (error) {
      console.error('Error adding score history entry:', error);
      throw error;
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
    
    // Get active savings goals from database first
    const dbGoals = await this.getSavingsGoals(userId);
    
    // IMPORTANT: We need to also check the in-memory goals from routes.ts
    // Since we can't import directly from routes.ts (circular dependency),
    // we need to find the goals in the global context (which we know exists in routes.ts)
    // @ts-ignore: Use dynamic access to in-memory goals
    const inMemoryGoals = global.appGoals?.filter(g => g.userId === userId) || [];
    
    // Combine both sources of goals, giving priority to in-memory goals
    // as they're more likely to be updated recently
    const goals = [...dbGoals, ...inMemoryGoals];
    console.log(`Found ${dbGoals.length} goals in DB and ${inMemoryGoals.length} goals in memory, total: ${goals.length}`);
    
    // Calculate savings progress based on active goals
    // Savings Progress = total saved / total target goal (only for active goals)
    let totalTargetAmount = 0;
    let totalSavedAmount = 0;
    let validGoalCount = 0;
    
    // Enhanced logging for goal progress calculation
    console.log(`Calculating savings progress for ${goals.length} goals...`);
    
    for (const goal of goals) {
      // Ensure we have valid numeric values by explicit conversion and validation
      const targetAmount = parseFloat(String(goal.targetAmount));
      const currentAmount = parseFloat(String(goal.currentAmount));
      
      // Detailed logging for each goal's values to help with debugging
      console.log(`Processing goal: ${goal.name}`);
      console.log(`  - Raw target amount: ${goal.targetAmount} (${typeof goal.targetAmount})`);
      console.log(`  - Raw current amount: ${goal.currentAmount} (${typeof goal.currentAmount})`);
      console.log(`  - Parsed target: ${targetAmount}, Parsed current: ${currentAmount}`);
      
      // Skip goals with invalid target amounts - they shouldn't affect the overall calculation
      if (isNaN(targetAmount) || targetAmount <= 0) {
        console.log(`  - WARNING: Goal "${goal.name}" has invalid target amount (${goal.targetAmount}), skipping in progress calculation`);
        continue;
      }
      
      // Skip goals with invalid current amounts
      if (isNaN(currentAmount)) {
        console.log(`  - WARNING: Goal "${goal.name}" has invalid current amount (${goal.currentAmount}), skipping in progress calculation`);
        continue;
      }
      
      // Calculate individual progress percentage for this goal
      const individualProgress = (currentAmount / targetAmount * 100).toFixed(2);
      console.log(`  - Valid goal: Target: ${targetAmount.toFixed(2)}, Current: ${currentAmount.toFixed(2)}, Progress: ${individualProgress}%`);
      
      // Add to totals for valid goals only
      totalTargetAmount += targetAmount;
      totalSavedAmount += currentAmount;
      validGoalCount++;
    }
    
    // If no active goals or target amounts, default to 0% savings progress
    let savingsProgress = 0;
    
    console.log(`Summary: Found ${validGoalCount} valid goals with total target: ${totalTargetAmount.toFixed(2)}, total saved: ${totalSavedAmount.toFixed(2)}`);
    
    if (totalTargetAmount > 0) {
      // Perform accurate calculation and round to nearest integer
      const progressRatio = totalSavedAmount / totalTargetAmount;
      savingsProgress = Math.round(progressRatio * 100);
      
      // Cap at 100% maximum
      savingsProgress = Math.min(savingsProgress, 100);
      
      // Log the calculation for debugging
      console.log(`Overall Savings Progress: ${totalSavedAmount.toFixed(2)} / ${totalTargetAmount.toFixed(2)} = ${progressRatio.toFixed(4)} => ${savingsProgress}%`);
    } else if (goals.length > 0) {
      // If there are goals but no valid target amounts
      savingsProgress = 0;
      console.log(`Goals exist but no valid target amounts - setting to zero progress: ${savingsProgress}%`);
    } else {
      console.log(`No goals found - savings progress: ${savingsProgress}%`);
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
  
  async getNudgesByStatus(userId: number, status: string): Promise<Nudge[]> {
    try {
      const results = await db.select()
        .from(nudges)
        .where(and(
          eq(nudges.userId, userId),
          eq(nudges.status, status)
        ))
        .orderBy(desc(nudges.createdAt));
      
      return results;
    } catch (error) {
      console.error('Error fetching nudges by status:', error);
      throw error;
    }
  }
  
  async hasLinkedPlaidAccount(userId: number): Promise<boolean> {
    try {
      // Check if the user has any Plaid items (linked bank accounts)
      const items = await db.select()
        .from(plaidItems)
        .where(eq(plaidItems.userId, userId));
      
      return items.length > 0;
    } catch (error) {
      console.error('Error checking for linked Plaid accounts:', error);
      return false; // Safely default to false in case of error
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
      
      // Format money helper
      const formatMoney = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
      });
      
      // Get current date
      const now = new Date();
      
      // Check for existing active nudges to avoid duplication
      const activeNudges = await this.getNudges(userId, 'active');
      const existingNudgeTypes = new Set(activeNudges.map((n: Nudge) => {
        try {
          const condition = JSON.parse(n.triggerCondition);
          return condition.type;
        } catch (e) {
          return n.type;
        }
      }));
      
      // Check for recently dismissed or completed nudges (within 5 days)
      const fiveDaysAgo = new Date(now);
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      
      const recentlyHandledNudges = await db.select()
        .from(nudges)
        .where(and(
          eq(nudges.userId, userId),
          or(
            gte(nudges.dismissedAt, fiveDaysAgo),
            gte(nudges.completedAt, fiveDaysAgo)
          )
        ));
      
      const recentlyHandledTypes = new Set(recentlyHandledNudges.map((n: Nudge) => {
        try {
          const condition = JSON.parse(n.triggerCondition);
          return condition.type;
        } catch (e) {
          return n.type;
        }
      }));
      
      // RULE 1: Check if user has any budget categories
      const budgetCategories = await this.getBudgetCategories(userId);
      if (budgetCategories.length === 0) {
        // Only create if no active nudge of this type and not recently handled
        if (!existingNudgeTypes.has('empty_budget') && !recentlyHandledTypes.has('empty_budget')) {
          const nudge = await this.createNudge({
            userId,
            type: 'budget_suggestion',
            message: 'Try setting a monthly budget to take control of your spending.',
            status: 'active',
            triggerCondition: JSON.stringify({ 
              type: 'empty_budget',
              checked_at: now.toISOString()
            }),
            // Set a reasonable due date (7 days from now)
            dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
          });
          newNudges.push(nudge);
        }
      } else {
        // RULE 2: Check if user has reviewed budget recently (within a week)
        const lastWeek = new Date(now);
        lastWeek.setDate(lastWeek.getDate() - 7);
        
        // Check if the user has reviewed their budget recently
        const hasReviewedBudget = user.lastBudgetUpdateDate && new Date(user.lastBudgetUpdateDate) > lastWeek;
        
        if (!hasReviewedBudget && budgetCategories.length > 0) {
          if (!existingNudgeTypes.has('budget_review') && !recentlyHandledTypes.has('budget_review')) {
            const nudge = await this.createNudge({
              userId,
              type: 'budget_review',
              message: 'Review your budget and make sure your spending aligns with your goals.',
              status: 'active',
              triggerCondition: JSON.stringify({ 
                type: 'budget_review',
                checked_at: now.toISOString()
              }),
              dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000) // 3 days from now
            });
            newNudges.push(nudge);
          }
        }
        
        // RULE 2B: Check for budget categories at risk (75-95% spent)
        // Calculate remaining budget for each category
        const categoriesWithRemainingBudget = budgetCategories.map(category => {
          const spent = parseFloat(String(category.spentAmount || 0));
          const budget = parseFloat(String(category.budgetAmount || 0));
          const percentUsed = budget > 0 ? Math.min(Math.round((spent / budget) * 100), 100) : 0;
          const remaining = Math.max(0, budget - spent);
          
          return {
            ...category,
            percentUsed,
            remaining
          };
        });
        
        // Filter categories at risk (75-95% spent)
        const categoriesAtRisk = categoriesWithRemainingBudget.filter(category => {
          return category.percentUsed >= 75 && category.percentUsed < 95 && 
                 parseFloat(String(category.budgetAmount)) > 0;
        });
        
        // Only show ONE budget warning at a time to avoid overwhelming the user
        if (categoriesAtRisk.length > 0 && 
            !existingNudgeTypes.has('budget_at_risk') && 
            !recentlyHandledTypes.has('budget_at_risk')) {
          // Sort by percentage used (descending) to prioritize most at-risk budgets
          categoriesAtRisk.sort((a, b) => b.percentUsed - a.percentUsed);
          const category = categoriesAtRisk[0]; // Take the most at-risk category
          
          const today = new Date();
          const dayOfMonth = today.getDate();
          
          // Get the appropriate suffix for the day (1st, 2nd, 3rd, etc.)
          let suffix = 'th';
          if (dayOfMonth % 10 === 1 && dayOfMonth !== 11) suffix = 'st';
          else if (dayOfMonth % 10 === 2 && dayOfMonth !== 12) suffix = 'nd';
          else if (dayOfMonth % 10 === 3 && dayOfMonth !== 13) suffix = 'rd';
          
          const nudge = await this.createNudge({
            userId,
            type: 'budget_warning',
            message: `Your ${category.name} budget is ${category.percentUsed}% used${dayOfMonth < 20 ? ` and it's only the ${dayOfMonth}${suffix}` : ''}. You have ${formatMoney.format(category.remaining)} remaining.`,
            status: 'active',
            triggerCondition: JSON.stringify({ 
              type: 'budget_at_risk', 
              categoryId: category.id, 
              percentUsed: category.percentUsed,
              checked_at: now.toISOString()
            }),
          });
          newNudges.push(nudge);
        }
      }
      
      // RULE 3: Check if user has any savings goals
      const goals = await this.getSavingsGoals(userId);
      if (goals.length === 0) {
        if (!existingNudgeTypes.has('empty_goals') && !recentlyHandledTypes.has('empty_goals')) {
          const nudge = await this.createNudge({
            userId,
            type: 'goal_suggestion',
            message: 'Create a savings goal to start building financial momentum.',
            status: 'active',
            triggerCondition: JSON.stringify({ 
              type: 'empty_goals',
              checked_at: now.toISOString()
            }),
            dueDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000) // 5 days from now
          });
          newNudges.push(nudge);
        }
      } else {
        // RULE 3B: Check for goals that are at risk
        for (const goal of goals) {
          // Skip if we already have 2 nudges (to avoid overwhelming the user)
          if (newNudges.length >= 2) break;
          
          // Calculate goal progress
          const targetAmount = parseFloat(String(goal.targetAmount));
          const currentAmount = parseFloat(String(goal.currentAmount));
          const progress = targetAmount > 0 ? currentAmount / targetAmount : 0;
          
          // Calculate days remaining
          const targetDate = goal.targetDate ? new Date(goal.targetDate) : null;
          const daysLeft = targetDate ? Math.max(0, Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))) : null;
          
          // Check if goal is behind schedule and due soon (progress < 25% and < 30 days left)
          if (progress < 0.25 && daysLeft !== null && daysLeft < 30) {
            const goalRiskKey = `goal_behind_${goal.id}`;
            if (!existingNudgeTypes.has(goalRiskKey) && !recentlyHandledTypes.has(goalRiskKey)) {
              const nudge = await this.createNudge({
                userId,
                type: 'goal_at_risk',
                message: `You're behind on your goal for ${goal.name}. Consider increasing your contributions.`,
                status: 'active',
                triggerCondition: JSON.stringify({ 
                  type: goalRiskKey,
                  goalId: goal.id,
                  progress: progress,
                  daysLeft: daysLeft,
                  checked_at: now.toISOString()
                }),
              });
              newNudges.push(nudge);
            }
          }
        }
      }
      
      // RULE 4: Check if user has any transactions
      const transactions = await this.getTransactions(userId);
      
      // Check if the user has connected a Plaid account - FIXED
      // Get all plaid items for this user for data isolation enforcement
      const results = await db.select().from(plaidItems).where(eq(plaidItems.userId, userId));

      
      // Check if there are any linked bank accounts
      const hasBankLinked = results.length > 0;
      
      if (transactions.length === 0 && hasBankLinked) {
        if (!existingNudgeTypes.has('empty_transactions') && !recentlyHandledTypes.has('empty_transactions')) {
          const nudge = await this.createNudge({
            userId,
            type: 'transaction_reminder',
            message: 'No new transactions this week — make sure your bank is syncing properly.',
            status: 'active',
            triggerCondition: JSON.stringify({ 
              type: 'empty_transactions',
              checked_at: now.toISOString()
            }),
          });
          newNudges.push(nudge);
        }
      }
      
      // RULE 5: Check if user has linked a bank account
      if (!hasBankLinked) {
        const hasUploadedCSV = transactions.length > 0; // If they have transactions but no bank, they probably uploaded CSV
        
        if (!hasUploadedCSV && !existingNudgeTypes.has('no_bank_connection') && !recentlyHandledTypes.has('no_bank_connection')) {
          const nudge = await this.createNudge({
            userId,
            type: 'bank_connection',
            message: 'Connect your bank or upload a CSV to start tracking your finances.',
            status: 'active',
            triggerCondition: JSON.stringify({ 
              type: 'no_bank_connection',
              checked_at: now.toISOString()
            }),
            dueDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000) // 2 days from now
          });
          newNudges.push(nudge);
        }
      }
      
      // Limit to 2 nudges max at a time to avoid overwhelming the user
      if (newNudges.length > 2) {
        // Sort by priority and trim
        // We keep the first 2 in the list (we prioritize as we add them)
        newNudges.splice(2);
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
  
  // Plaid Item operations
  async getPlaidItems(userId: number): Promise<PlaidItem[]> {
    try {
      return await db.select().from(plaidItems)
        .where(eq(plaidItems.userId, userId))
        .orderBy(desc(plaidItems.createdAt));
    } catch (error) {
      console.error('Error getting Plaid items:', error);
      return [];
    }
  }
  
  async getPlaidItemByItemId(itemId: string): Promise<PlaidItem | undefined> {
    try {
      const results = await db.select().from(plaidItems)
        .where(eq(plaidItems.itemId, itemId))
        .limit(1);
      return results[0];
    } catch (error) {
      console.error('Error getting Plaid item by itemId:', error);
      return undefined;
    }
  }
  
  async getPlaidItemById(id: number): Promise<PlaidItem | undefined> {
    try {
      const results = await db.select().from(plaidItems)
        .where(eq(plaidItems.id, id))
        .limit(1);
      return results[0];
    } catch (error) {
      console.error('Error getting Plaid item by id:', error);
      return undefined;
    }
  }
  
  async createPlaidItem(item: InsertPlaidItem): Promise<PlaidItem> {
    try {
      const results = await db.insert(plaidItems)
        .values({
          ...item,
          lastUpdated: new Date(),
          createdAt: new Date()
        })
        .returning();
      return results[0];
    } catch (error) {
      console.error('Error creating Plaid item:', error);
      throw error;
    }
  }
  
  async updatePlaidItem(id: number, data: Partial<PlaidItem>): Promise<PlaidItem | undefined> {
    try {
      const results = await db.update(plaidItems)
        .set({
          ...data,
          lastUpdated: new Date()
        })
        .where(eq(plaidItems.id, id))
        .returning();
      return results[0];
    } catch (error) {
      console.error('Error updating Plaid item:', error);
      return undefined;
    }
  }
  
  async updatePlaidItemByItemId(itemId: string, data: Partial<PlaidItem>): Promise<PlaidItem | undefined> {
    try {
      const results = await db.update(plaidItems)
        .set({
          ...data,
          lastUpdated: new Date()
        })
        .where(eq(plaidItems.itemId, itemId))
        .returning();
      return results[0];
    } catch (error) {
      console.error('Error updating Plaid item by itemId:', error);
      return undefined;
    }
  }
  
  async deletePlaidItem(id: number): Promise<boolean> {
    try {
      const results = await db.delete(plaidItems)
        .where(eq(plaidItems.id, id))
        .returning();
      return results.length > 0;
    } catch (error) {
      console.error('Error deleting Plaid item:', error);
      return false;
    }
  }
  
  async disconnectPlaidItem(id: number): Promise<boolean> {
    try {
      const results = await db.update(plaidItems)
        .set({ 
          status: 'disconnected',
          lastUpdated: new Date()
        })
        .where(eq(plaidItems.id, id))
        .returning();
      return results.length > 0;
    } catch (error) {
      console.error('Error disconnecting Plaid item:', error);
      return false;
    }
  }
  
  // Plaid Account operations
  async getPlaidAccounts(userId: number): Promise<PlaidAccount[]> {
    try {
      return await db.select().from(plaidAccounts)
        .where(eq(plaidAccounts.userId, userId))
        .orderBy(desc(plaidAccounts.createdAt));
    } catch (error) {
      console.error('Error getting Plaid accounts:', error);
      return [];
    }
  }
  
  async getPlaidAccountsByItemId(plaidItemId: number): Promise<PlaidAccount[]> {
    try {
      return await db.select().from(plaidAccounts)
        .where(eq(plaidAccounts.plaidItemId, plaidItemId))
        .orderBy(desc(plaidAccounts.createdAt));
    } catch (error) {
      console.error('Error getting Plaid accounts by itemId:', error);
      return [];
    }
  }
  
  async getPlaidAccountByAccountId(accountId: string): Promise<PlaidAccount | undefined> {
    try {
      const results = await db.select().from(plaidAccounts)
        .where(eq(plaidAccounts.accountId, accountId))
        .limit(1);
      return results[0];
    } catch (error) {
      console.error('Error getting Plaid account by accountId:', error);
      return undefined;
    }
  }
  
  async getPlaidAccount(id: number): Promise<PlaidAccount | undefined> {
    try {
      const results = await db.select().from(plaidAccounts)
        .where(eq(plaidAccounts.id, id))
        .limit(1);
      return results[0];
    } catch (error) {
      console.error('Error getting Plaid account by id:', error);
      return undefined;
    }
  }
  
  async createPlaidAccount(account: InsertPlaidAccount): Promise<PlaidAccount> {
    try {
      const results = await db.insert(plaidAccounts)
        .values({
          ...account,
          lastUpdated: new Date(),
          createdAt: new Date()
        })
        .returning();
      return results[0];
    } catch (error) {
      console.error('Error creating Plaid account:', error);
      throw error;
    }
  }
  
  async updatePlaidAccount(id: number, data: Partial<PlaidAccount>): Promise<PlaidAccount | undefined> {
    try {
      const results = await db.update(plaidAccounts)
        .set({
          ...data,
          lastUpdated: new Date()
        })
        .where(eq(plaidAccounts.id, id))
        .returning();
      return results[0];
    } catch (error) {
      console.error('Error updating Plaid account:', error);
      return undefined;
    }
  }
  
  async deletePlaidAccount(id: number): Promise<boolean> {
    try {
      const results = await db.delete(plaidAccounts)
        .where(eq(plaidAccounts.id, id))
        .returning();
      return results.length > 0;
    } catch (error) {
      console.error('Error deleting Plaid account:', error);
      return false;
    }
  }
  
  // Plaid Webhook operations
  async getPlaidWebhookEvents(itemId: string): Promise<PlaidWebhookEvent[]> {
    try {
      return await db.select().from(plaidWebhookEvents)
        .where(eq(plaidWebhookEvents.itemId, itemId))
        .orderBy(desc(plaidWebhookEvents.createdAt));
    } catch (error) {
      console.error('Error getting Plaid webhook events:', error);
      return [];
    }
  }
  
  async createPlaidWebhookEvent(event: InsertPlaidWebhookEvent): Promise<PlaidWebhookEvent> {
    try {
      const results = await db.insert(plaidWebhookEvents)
        .values({
          ...event,
          createdAt: new Date()
        })
        .returning();
      return results[0];
    } catch (error) {
      console.error('Error creating Plaid webhook event:', error);
      throw error;
    }
  }
  
  async markPlaidWebhookEventAsProcessed(id: number): Promise<PlaidWebhookEvent | undefined> {
    try {
      const results = await db.update(plaidWebhookEvents)
        .set({ 
          processedAt: new Date() 
        })
        .where(eq(plaidWebhookEvents.id, id))
        .returning();
      return results[0];
    } catch (error) {
      console.error('Error marking Plaid webhook event as processed:', error);
      return undefined;
    }
  }
  
  // Plaid Helpers
  async hasLinkedPlaidItemForInstitution(userId: number, institutionId: string): Promise<boolean> {
    try {
      const results = await db.select().from(plaidItems)
        .where(
          and(
            eq(plaidItems.userId, userId),
            eq(plaidItems.institutionId, institutionId),
            eq(plaidItems.status, 'active')
          )
        )
        .limit(1);
      return results.length > 0;
    } catch (error) {
      console.error('Error checking for linked Plaid institution:', error);
      return false;
    }
  }

  // Plaid User Identity operations
  async getPlaidUserIdentities(userId: number): Promise<PlaidUserIdentity[]> {
    try {
      return await db.select().from(plaidUserIdentities)
        .where(eq(plaidUserIdentities.userId, userId))
        .orderBy(desc(plaidUserIdentities.createdAt));
    } catch (error) {
      console.error('Error getting Plaid user identities:', error);
      return [];
    }
  }

  async getPlaidUserIdentity(id: number): Promise<PlaidUserIdentity | undefined> {
    try {
      const results = await db.select().from(plaidUserIdentities)
        .where(eq(plaidUserIdentities.id, id))
        .limit(1);
      return results[0];
    } catch (error) {
      console.error('Error getting Plaid user identity:', error);
      return undefined;
    }
  }

  async createPlaidUserIdentity(identity: InsertPlaidUserIdentity): Promise<PlaidUserIdentity> {
    try {
      const results = await db.insert(plaidUserIdentities)
        .values({
          ...identity,
          lastUpdated: new Date(),
          createdAt: new Date()
        })
        .returning();
      return results[0];
    } catch (error) {
      console.error('Error creating Plaid user identity:', error);
      throw error;
    }
  }

  async updatePlaidUserIdentity(id: number, data: Partial<PlaidUserIdentity>): Promise<PlaidUserIdentity | undefined> {
    try {
      const results = await db.update(plaidUserIdentities)
        .set({
          ...data,
          lastUpdated: new Date()
        })
        .where(eq(plaidUserIdentities.id, id))
        .returning();
      return results[0];
    } catch (error) {
      console.error('Error updating Plaid user identity:', error);
      return undefined;
    }
  }
}

export const storage = new DatabaseStorage();
