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

export type RivuScore = typeof rivuScores.$inferSelect;
export type InsertRivuScore = z.infer<typeof insertRivuScoreSchema>;
