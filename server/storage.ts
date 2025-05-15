import { 
  User, InsertUser, 
  BudgetCategory, InsertBudgetCategory,
  Transaction, InsertTransaction,
  RivuScore, InsertRivuScore
} from "@shared/schema";

// Storage interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
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
  
  // Rivu Score operations
  getRivuScore(userId: number): Promise<RivuScore | undefined>;
  createOrUpdateRivuScore(score: InsertRivuScore): Promise<RivuScore>;

  // Helper methods
  calculateRivuScore(userId: number): Promise<number>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private budgetCategories: Map<number, BudgetCategory>;
  private transactions: Map<number, Transaction>;
  private rivuScores: Map<number, RivuScore>;
  
  private userId = 1;
  private categoryId = 1;
  private transactionId = 1;
  private scoreId = 1;

  constructor() {
    this.users = new Map();
    this.budgetCategories = new Map();
    this.transactions = new Map();
    this.rivuScores = new Map();
    
    // Initialize with demo data
    this.initializeDemoData();
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userId++;
    const newUser: User = { 
      ...user, 
      id, 
      loginCount: 0,
      lastLogin: null,
      createdAt: new Date() 
    };
    this.users.set(id, newUser);
    return newUser;
  }

  // Budget category operations
  async getBudgetCategories(userId: number): Promise<BudgetCategory[]> {
    return Array.from(this.budgetCategories.values()).filter(
      (category) => category.userId === userId
    );
  }

  async getBudgetCategory(id: number): Promise<BudgetCategory | undefined> {
    return this.budgetCategories.get(id);
  }

  async createBudgetCategory(category: InsertBudgetCategory): Promise<BudgetCategory> {
    const id = this.categoryId++;
    const newCategory: BudgetCategory = {
      ...category,
      id,
      spentAmount: 0,
      createdAt: new Date(),
    };
    this.budgetCategories.set(id, newCategory);
    return newCategory;
  }

  async updateBudgetCategory(id: number, data: Partial<BudgetCategory>): Promise<BudgetCategory | undefined> {
    const category = this.budgetCategories.get(id);
    if (!category) return undefined;
    
    const updatedCategory = { ...category, ...data };
    this.budgetCategories.set(id, updatedCategory);
    return updatedCategory;
  }

  async deleteBudgetCategory(id: number): Promise<boolean> {
    return this.budgetCategories.delete(id);
  }

  // Transaction operations
  async getTransactions(userId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter((transaction) => transaction.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const id = this.transactionId++;
    const newTransaction: Transaction = {
      ...transaction,
      id,
      date: new Date(),
      createdAt: new Date(),
    };
    this.transactions.set(id, newTransaction);
    
    // Update budget category spent amount
    if (transaction.type === 'expense') {
      const categories = await this.getBudgetCategories(transaction.userId);
      const category = categories.find(c => c.name === transaction.category);
      if (category) {
        const currentSpent = parseFloat(category.spentAmount.toString());
        const transAmount = parseFloat(transaction.amount.toString());
        await this.updateBudgetCategory(category.id, {
          spentAmount: currentSpent + transAmount
        });
      }
    }
    
    // Recalculate Rivu score after a new transaction
    await this.calculateAndUpdateRivuScore(transaction.userId);
    
    return newTransaction;
  }

  async updateTransaction(id: number, data: Partial<Transaction>): Promise<Transaction | undefined> {
    const transaction = this.transactions.get(id);
    if (!transaction) return undefined;
    
    const updatedTransaction = { ...transaction, ...data };
    this.transactions.set(id, updatedTransaction);
    
    // Recalculate Rivu score after updating a transaction
    await this.calculateAndUpdateRivuScore(transaction.userId);
    
    return updatedTransaction;
  }

  async deleteTransaction(id: number): Promise<boolean> {
    const transaction = this.transactions.get(id);
    if (!transaction) return false;
    
    const userId = transaction.userId;
    const result = this.transactions.delete(id);
    
    // Recalculate Rivu score after deleting a transaction
    if (result) {
      await this.calculateAndUpdateRivuScore(userId);
    }
    
    return result;
  }

  // Rivu Score operations
  async getRivuScore(userId: number): Promise<RivuScore | undefined> {
    return Array.from(this.rivuScores.values()).find(
      (score) => score.userId === userId
    );
  }

  async createOrUpdateRivuScore(scoreData: InsertRivuScore): Promise<RivuScore> {
    const existingScore = await this.getRivuScore(scoreData.userId);
    
    if (existingScore) {
      const updatedScore: RivuScore = {
        ...existingScore,
        ...scoreData,
        updatedAt: new Date(),
      };
      this.rivuScores.set(existingScore.id, updatedScore);
      return updatedScore;
    } else {
      const id = this.scoreId++;
      const newScore: RivuScore = {
        ...scoreData,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.rivuScores.set(id, newScore);
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
    
    for (const category of categories) {
      const spent = parseFloat(category.spentAmount.toString());
      const budget = parseFloat(category.budgetAmount.toString());
      
      if (spent <= budget) {
        categoriesUnderBudget++;
      }
    }
    
    const budgetAdherence = totalCategories > 0 
      ? Math.round((categoriesUnderBudget / totalCategories) * 100)
      : 100;
    
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
    
    const totalIncome = incomeTransactions.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
    const totalExpenses = expenseTransactions.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
    
    // If no income, default to 0% savings
    let savingsProgress = 0;
    if (totalIncome > 0) {
      const savingsRate = Math.max(0, (totalIncome - totalExpenses) / totalIncome);
      savingsProgress = Math.min(Math.round(savingsRate * 100), 100);
    }
    
    // If no data, score should be 0
    const hasData = categories.length > 0 || transactions.length > 0 || loginCount > 0;
    
    // Calculate overall score (weighted average)
    const score = hasData ? Math.round(
      (budgetAdherence * 0.5) + (savingsProgress * 0.3) + (weeklyActivity * 0.2)
    ) : 0;
    
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

  // Initialize demo data
  private initializeDemoData(): void {
    // Create demo user
    const demoUser: User = {
      id: this.userId++,
      username: 'jamiesmith',
      password: 'password123',
      email: 'jamie@example.com',
      firstName: 'Jamie',
      lastName: 'Smith',
      avatarInitials: 'JS',
      createdAt: new Date(),
    };
    this.users.set(demoUser.id, demoUser);
    
    // Create budget categories
    const budgetCategoriesData = [
      { name: 'Food & Dining', budgetAmount: 600, spentAmount: 486 },
      { name: 'Rent/Mortgage', budgetAmount: 1200, spentAmount: 1200 },
      { name: 'Transportation', budgetAmount: 300, spentAmount: 127 },
      { name: 'Entertainment', budgetAmount: 150, spentAmount: 192 },
      { name: 'Shopping', budgetAmount: 350, spentAmount: 321 },
    ];
    
    for (const categoryData of budgetCategoriesData) {
      const category: BudgetCategory = {
        id: this.categoryId++,
        userId: demoUser.id,
        name: categoryData.name,
        budgetAmount: categoryData.budgetAmount,
        spentAmount: categoryData.spentAmount,
        createdAt: new Date(),
      };
      this.budgetCategories.set(category.id, category);
    }
    
    // Create transactions
    const transactionsData = [
      { 
        merchant: 'Starbucks', 
        amount: 5.42, 
        category: 'Food & Dining', 
        account: 'Credit Card',
        date: new Date(2023, 6, 24), // July 24, 2023
        type: 'expense'
      },
      { 
        merchant: 'Amazon', 
        amount: 34.76, 
        category: 'Shopping', 
        account: 'Credit Card',
        date: new Date(2023, 6, 22), // July 22, 2023
        type: 'expense'
      },
      { 
        merchant: 'Acme Corp. Salary', 
        amount: 2125.00, 
        category: 'Income', 
        account: 'Direct Deposit',
        date: new Date(2023, 6, 15), // July 15, 2023
        type: 'income'
      },
      { 
        merchant: 'Uber', 
        amount: 12.85, 
        category: 'Transportation', 
        account: 'Credit Card',
        date: new Date(2023, 6, 13), // July 13, 2023
        type: 'expense'
      },
      { 
        merchant: 'Parkside Apartments', 
        amount: 1200.00, 
        category: 'Rent/Mortgage', 
        account: 'Bank Transfer',
        date: new Date(2023, 6, 1), // July 1, 2023
        type: 'expense'
      },
    ];
    
    for (const transactionData of transactionsData) {
      const transaction: Transaction = {
        id: this.transactionId++,
        userId: demoUser.id,
        merchant: transactionData.merchant,
        amount: transactionData.amount,
        category: transactionData.category,
        account: transactionData.account,
        date: transactionData.date,
        type: transactionData.type as 'income' | 'expense',
        createdAt: new Date(),
      };
      this.transactions.set(transaction.id, transaction);
    }
    
    // Create initial Rivu score
    const rivuScore: RivuScore = {
      id: this.scoreId++,
      userId: demoUser.id,
      score: 75,
      budgetAdherence: 80,
      savingsProgress: 60,
      weeklyActivity: 95,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.rivuScores.set(rivuScore.id, rivuScore);
  }
}

export const storage = new MemStorage();
