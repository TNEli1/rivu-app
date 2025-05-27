import { pgTable, text, serial, integer, decimal, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password"),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  avatarInitials: text("avatar_initials").notNull(),
  themePreference: text("theme_preference").default("dark"),
  // Google OAuth fields
  googleId: text("google_id"),
  authMethod: text("auth_method").default("password").notNull(), // 'password' or 'google'
  emailVerified: boolean("email_verified").default(false).notNull(),
  profilePic: text("profile_pic"),
  // Legal compliance
  tosAcceptedAt: timestamp("tos_accepted_at"),
  // Password reset fields
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  // Demographics fields
  ageRange: text("age_range"),
  incomeBracket: text("income_bracket"),
  goals: text("goals"),
  riskTolerance: text("risk_tolerance"),
  experienceLevel: text("experience_level"),
  demographicsCompleted: boolean("demographics_completed").default(false),
  skipDemographics: boolean("skip_demographics").default(false),
  // Metrics
  loginCount: integer("login_count").default(0),
  lastLogin: timestamp("last_login"),
  lastTransactionDate: timestamp("last_transaction_date"),
  lastGoalUpdateDate: timestamp("last_goal_update_date"),
  lastBudgetUpdateDate: timestamp("last_budget_update_date"),
  lastBudgetReviewDate: timestamp("last_budget_review_date"), // Track when user last reviewed budget
  onboardingStage: text("onboarding_stage").default("new"), // 'new', 'budget_created', 'transaction_added', 'goal_created', 'completed'
  onboardingCompleted: boolean("onboarding_completed").default(false),
  tutorialCompleted: boolean("tutorial_completed").default(false), // Track if user has seen the tutorial
  accountCreationDate: timestamp("account_creation_date").defaultNow().notNull(),
  nudgeSettings: text("nudge_settings").default("{}"), // JSON string with nudge preferences
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  firstName: true,
  lastName: true,
  avatarInitials: true,
  themePreference: true,
  onboardingStage: true,
  onboardingCompleted: true,
  accountCreationDate: true,
  loginCount: true,
  lastLogin: true,
});

// Budget Categories
export const budgetCategories = pgTable("budget_categories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  budgetAmount: decimal("budget_amount", { precision: 10, scale: 2 }).notNull(),
  spentAmount: decimal("spent_amount", { precision: 10, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBudgetCategorySchema = createInsertSchema(budgetCategories).pick({
  userId: true,
  name: true,
  budgetAmount: true,
});

// Transactions
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  merchant: text("merchant").notNull(),
  merchantName: text("merchant_name"), // Enhanced merchant name from Plaid
  category: text("category").notNull(),
  subcategory: text("subcategory"),
  categoryId: text("category_id"), // Plaid category ID
  account: text("account").notNull(),
  accountId: text("account_id"), // Plaid account ID
  date: timestamp("date").defaultNow().notNull(),
  type: text("type").notNull().default("expense"), // 'income' or 'expense'
  notes: text("notes"),
  source: text("source").notNull().default("manual"), // 'manual', 'csv', or 'plaid'
  isDuplicate: boolean("is_duplicate").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  userId: true,
  amount: true,
  merchant: true,
  merchantName: true,
  category: true,
  subcategory: true,
  categoryId: true,
  account: true,
  accountId: true,
  type: true,
  date: true,
  notes: true,
  source: true,
  isDuplicate: true,
});

// Savings Goals
export const savingsGoals = pgTable("savings_goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  targetAmount: decimal("target_amount", { precision: 10, scale: 2 }).notNull(),
  currentAmount: decimal("current_amount", { precision: 10, scale: 2 }).default("0").notNull(),
  targetDate: timestamp("target_date"),
  monthlySavings: text("monthly_savings").default("[]"), // JSON string of monthly savings data
  progressPercentage: decimal("progress_percentage", { precision: 5, scale: 2 }).default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSavingsGoalSchema = createInsertSchema(savingsGoals).pick({
  userId: true,
  name: true,
  targetAmount: true,
  currentAmount: true,
  targetDate: true,
});

// Rivu Score
export const rivuScores = pgTable("rivu_scores", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  score: integer("score").notNull(),
  budgetAdherence: integer("budget_adherence").notNull(),
  savingsProgress: integer("savings_progress").notNull(),
  weeklyActivity: integer("weekly_activity").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertRivuScoreSchema = createInsertSchema(rivuScores).pick({
  userId: true,
  score: true,
  budgetAdherence: true,
  savingsProgress: true,
  weeklyActivity: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type BudgetCategory = typeof budgetCategories.$inferSelect;
export type InsertBudgetCategory = z.infer<typeof insertBudgetCategorySchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type SavingsGoal = typeof savingsGoals.$inferSelect;
export type InsertSavingsGoal = z.infer<typeof insertSavingsGoalSchema>;

export type RivuScore = typeof rivuScores.$inferSelect;
export type InsertRivuScore = z.infer<typeof insertRivuScoreSchema>;

// Nudge System
export const nudges = pgTable("nudges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // 'transaction', 'goal', 'budget', 'onboarding', etc.
  message: text("message").notNull(),
  status: text("status").default("active").notNull(), // 'active', 'dismissed', 'completed'
  triggerCondition: text("trigger_condition").notNull(), // Serialized JSON of the condition that triggered the nudge
  dueDate: timestamp("due_date"), // When this nudge should be shown to the user
  createdAt: timestamp("created_at").defaultNow().notNull(),
  dismissedAt: timestamp("dismissed_at"),
  completedAt: timestamp("completed_at"),
});

export const insertNudgeSchema = createInsertSchema(nudges).pick({
  userId: true,
  type: true,
  message: true,
  status: true,
  triggerCondition: true,
  dueDate: true,
});

export type Nudge = typeof nudges.$inferSelect;
export type InsertNudge = z.infer<typeof insertNudgeSchema>;

// Transaction Accounts
export const transactionAccounts = pgTable("transaction_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  type: text("type").default("bank").notNull(), // 'bank', 'credit', 'cash', etc.
  institutionName: text("institution_name"),
  lastFour: text("last_four"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTransactionAccountSchema = createInsertSchema(transactionAccounts).pick({
  userId: true,
  name: true,
  type: true,
  institutionName: true,
  lastFour: true,
});

export type TransactionAccount = typeof transactionAccounts.$inferSelect;
export type InsertTransactionAccount = z.infer<typeof insertTransactionAccountSchema>;

// User Categories
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  type: text("type").default("expense").notNull(), // 'expense' or 'income'
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCategorySchema = createInsertSchema(categories).pick({
  userId: true,
  name: true,
  type: true,
  isDefault: true,
});

// User Subcategories
export const subcategories = pgTable("subcategories", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull(),
  name: text("name").notNull(),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSubcategorySchema = createInsertSchema(subcategories).pick({
  categoryId: true,
  name: true,
  isDefault: true,
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Subcategory = typeof subcategories.$inferSelect;
export type InsertSubcategory = z.infer<typeof insertSubcategorySchema>;

// Plaid Items (Institution connections)
export const plaidItems = pgTable("plaid_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  itemId: text("item_id").notNull().unique(),
  accessToken: text("access_token").notNull(),
  institutionId: text("institution_id"),
  institutionName: text("institution_name"),
  status: text("status").default("active").notNull(), // 'active', 'login_required', 'disconnected'
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  error: text("error"), // Serialized JSON of any error that occurred
  consentExpirationTime: timestamp("consent_expiration_time"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPlaidItemSchema = createInsertSchema(plaidItems).pick({
  userId: true,
  itemId: true,
  accessToken: true,
  institutionId: true,
  institutionName: true,
  status: true,
  error: true,
  consentExpirationTime: true,
});

// Plaid Accounts linked to Items
export const plaidAccounts = pgTable("plaid_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  plaidItemId: integer("plaid_item_id").notNull(),
  accountId: text("account_id").notNull().unique(),
  name: text("name").notNull(),
  officialName: text("official_name"),
  type: text("type").notNull(), // 'depository', 'credit', 'loan', 'investment', etc.
  subtype: text("subtype"), // 'checking', 'savings', 'credit card', etc.
  mask: text("mask"), // Last 4 digits of account number
  availableBalance: text("available_balance"),
  currentBalance: text("current_balance"),
  isoCurrencyCode: text("iso_currency_code"),
  status: text("status").default("active").notNull(), // 'active', 'inactive'
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPlaidAccountSchema = createInsertSchema(plaidAccounts).pick({
  userId: true,
  plaidItemId: true,
  accountId: true,
  name: true,
  officialName: true,
  type: true,
  subtype: true,
  mask: true,
  availableBalance: true,
  currentBalance: true,
  isoCurrencyCode: true,
  status: true,
});

// Plaid Webhook Events
export const plaidWebhookEvents = pgTable("plaid_webhook_events", {
  id: serial("id").primaryKey(),
  webhookType: text("webhook_type").notNull(),
  webhookCode: text("webhook_code").notNull(),
  itemId: text("item_id").notNull(),
  accountId: text("account_id"),
  error: text("error"),
  newTransactionsCount: text("new_transactions_count"),
  removedTransactionsCount: text("removed_transactions_count"),
  requestId: text("request_id"),
  rawData: text("raw_data"), // JSON string of the raw webhook data
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPlaidWebhookEventSchema = createInsertSchema(plaidWebhookEvents).pick({
  webhookType: true,
  webhookCode: true,
  itemId: true,
  accountId: true,
  error: true,
  newTransactionsCount: true,
  removedTransactionsCount: true,
  requestId: true,
  rawData: true,
  processedAt: true,
});

export type PlaidItem = typeof plaidItems.$inferSelect;
export type InsertPlaidItem = z.infer<typeof insertPlaidItemSchema>;

export type PlaidAccount = typeof plaidAccounts.$inferSelect;
export type InsertPlaidAccount = z.infer<typeof insertPlaidAccountSchema>;

export type PlaidWebhookEvent = typeof plaidWebhookEvents.$inferSelect;
export type InsertPlaidWebhookEvent = z.infer<typeof insertPlaidWebhookEventSchema>;
