import { pgTable, text, serial, integer, decimal, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  avatarInitials: text("avatar_initials").notNull(),
  themePreference: text("theme_preference").default("light"),
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
  onboardingStage: text("onboarding_stage").default("new"), // 'new', 'budget_created', 'transaction_added', 'goal_created', 'completed'
  onboardingCompleted: boolean("onboarding_completed").default(false),
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
  category: text("category").notNull(),
  account: text("account").notNull(),
  date: timestamp("date").defaultNow().notNull(),
  type: text("type").notNull().default("expense"), // 'income' or 'expense'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  userId: true,
  amount: true,
  merchant: true,
  category: true,
  account: true,
  type: true,
  date: true,
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
