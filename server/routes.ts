import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import OpenAI from "openai";
import cors from "cors";
import { BudgetCategory, Transaction, transactions, users, budgetCategories, savingsGoals, rivuScores, nudges, transactionAccounts, categories, plaidAccounts, plaidItems } from "@shared/schema";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import path from "path";
import fs from "fs";
import { categorizeTransaction, generateSpendingInsights, getCategoryIcon, getCategoryColor } from "./utils/transactionCategorizer";

// Initialize OpenAI client
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

export async function registerRoutes(app: Express): Promise<Server> {
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

    // Import rate limiter for auth routes
    const { loginLimiter } = await import('./controllers-ts/userController');
    
    // Register auth routes with our TypeScript controller and rate limiting
    const apiPath = '/api';
    app.post(`${apiPath}/register`, loginLimiter, registerUser);
    app.post(`${apiPath}/login`, loginLimiter, loginUser);
    app.post(`${apiPath}/logout`, protect, logoutUser);
    app.get(`${apiPath}/user`, protect, getUserProfile);
    app.put(`${apiPath}/user`, protect, updateUserProfile);
    app.put(`${apiPath}/user/demographics`, protect, updateDemographics);
    app.post(`${apiPath}/user/login-metric`, protect, updateLoginMetrics);
    
    // User profile endpoint that works with JWT cookies for OAuth flows
    app.get(`${apiPath}/profile`, async (req: any, res) => {
      try {
        // Get token from rivu_token cookie (set by Google OAuth)
        const token = req.cookies['rivu_token'];
        
        if (!token) {
          return res.status(401).json({ 
            message: 'Not authenticated',
            code: 'NO_TOKEN'
          });
        }
        
        // Verify JWT token
        const jwt = await import('jsonwebtoken');
        const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'rivu_jwt_secret_dev') as any;
        
        // Get user from database
        const user = await storage.getUserById(parseInt(decoded.id.toString(), 10));
        
        if (!user) {
          return res.status(401).json({ 
            message: 'User not found',
            code: 'USER_NOT_FOUND'
          });
        }
        
        // Return user profile data (exclude sensitive fields)
        const userProfile = {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profilePic: user.profilePic,
          avatarInitials: user.avatarInitials,
          authMethod: user.authMethod,
          emailVerified: user.emailVerified,
          tosAcceptedAt: user.tosAcceptedAt,
          googleId: user.googleId,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin,
          loginCount: user.loginCount,
          demographics: {
            ageRange: user.ageRange,
            incomeBracket: user.incomeBracket,
            goals: user.goals ? user.goals.split(',') : [],
            riskTolerance: user.riskTolerance,
            experienceLevel: user.experienceLevel,
            completed: user.demographicsCompleted,
            skipPermanently: user.skipDemographics
          }
        };
        
        res.json(userProfile);
        
      } catch (error: any) {
        console.error('Profile endpoint error:', error);
        
        if (error.name === 'TokenExpiredError') {
          return res.status(401).json({ 
            message: 'Token expired',
            code: 'TOKEN_EXPIRED'
          });
        }
        
        return res.status(401).json({ 
          message: 'Authentication failed',
          code: 'AUTH_FAILED'
        });
      }
    });
    
    // TOS acceptance endpoint
    app.post(`${apiPath}/user/accept-tos`, protect, async (req: any, res) => {
      try {
        const userId = req.user.id;
        const tosAcceptedAt = new Date();
        
        // Update user's TOS acceptance timestamp
        await storage.updateUser(userId, { tosAcceptedAt });
        
        res.json({ 
          message: 'Terms of Service accepted successfully',
          tosAcceptedAt: tosAcceptedAt.toISOString()
        });
      } catch (error) {
        console.error('TOS acceptance error:', error);
        res.status(500).json({ message: 'Failed to accept Terms of Service' });
      }
    });

    // CCPA Data Deletion endpoint
    app.post(`${apiPath}/user/delete`, protect, async (req: any, res) => {
      try {
        const userId = req.user.id;
        
        if (!userId) {
          console.error('Account Deletion: No user ID found in request');
          return res.status(401).json({
            message: 'User ID not found in request. Authentication may have failed.',
            code: 'AUTH_ERROR'
          });
        }
        
        const userIdNum = typeof userId === 'string' ? parseInt(userId, 10) : userId;
        
        console.log(`Account Deletion: Starting complete deletion for user ID: ${userIdNum}`);
        
        // Use database transaction to ensure all-or-nothing deletion
        const deletionResult = await db.transaction(async (tx) => {
          // 1. First verify user exists and session is valid
          const userExists = await tx.select().from(users).where(eq(users.id, userIdNum)).limit(1);
          if (userExists.length === 0) {
            throw new Error('User not found or session invalid');
          }
          
          console.log(`Account Deletion: User ${userIdNum} verified, proceeding with data deletion`);
          
          // 2. Delete all related data BEFORE deleting user (proper order)
          const deletionCounts = {
            transactions: 0,
            budgetCategories: 0,
            savingsGoals: 0,
            rivuScores: 0,
            nudges: 0,
            transactionAccounts: 0,
            categories: 0,
            plaidAccounts: 0,
            plaidItems: 0,
            user: 0
          };
          
          // Delete transactions
          const deletedTransactions = await tx.delete(transactions).where(eq(transactions.userId, userIdNum)).returning();
          deletionCounts.transactions = deletedTransactions.length;
          
          // Delete budget categories
          const deletedBudgetCategories = await tx.delete(budgetCategories).where(eq(budgetCategories.userId, userIdNum)).returning();
          deletionCounts.budgetCategories = deletedBudgetCategories.length;
          
          // Delete savings goals
          const deletedSavingsGoals = await tx.delete(savingsGoals).where(eq(savingsGoals.userId, userIdNum)).returning();
          deletionCounts.savingsGoals = deletedSavingsGoals.length;
          
          // Delete Rivu scores
          const deletedRivuScores = await tx.delete(rivuScores).where(eq(rivuScores.userId, userIdNum)).returning();
          deletionCounts.rivuScores = deletedRivuScores.length;
          
          // Delete nudges
          const deletedNudges = await tx.delete(nudges).where(eq(nudges.userId, userIdNum)).returning();
          deletionCounts.nudges = deletedNudges.length;
          
          // Delete transaction accounts
          const deletedTransactionAccounts = await tx.delete(transactionAccounts).where(eq(transactionAccounts.userId, userIdNum)).returning();
          deletionCounts.transactionAccounts = deletedTransactionAccounts.length;
          
          // Delete categories and subcategories
          const deletedCategories = await tx.delete(categories).where(eq(categories.userId, userIdNum)).returning();
          deletionCounts.categories = deletedCategories.length;
          
          // Delete Plaid accounts and items
          const deletedPlaidAccounts = await tx.delete(plaidAccounts).where(eq(plaidAccounts.userId, userIdNum)).returning();
          deletionCounts.plaidAccounts = deletedPlaidAccounts.length;
          
          const deletedPlaidItems = await tx.delete(plaidItems).where(eq(plaidItems.userId, userIdNum)).returning();
          deletionCounts.plaidItems = deletedPlaidItems.length;
          
          // 3. Finally delete the user account (last step)
          const deletedUser = await tx.delete(users).where(eq(users.id, userIdNum)).returning();
          deletionCounts.user = deletedUser.length;
          
          console.log(`Account Deletion: Deletion counts:`, deletionCounts);
          
          if (deletionCounts.user === 0) {
            throw new Error('Failed to delete user account');
          }
          
          return deletionCounts;
        });
        
        // 4. Clear session AFTER successful deletion
        res.clearCookie('rivu_token');
        
        // Log success to troubleshooting
        const timestamp = new Date().toISOString();
        console.log(`Account Deletion SUCCESS: User ${userIdNum} completely deleted at ${timestamp}`);
        console.log(`Account Deletion: Deleted data counts:`, deletionResult);
        
        res.json({ 
          message: 'All user data has been permanently deleted',
          deletedAt: timestamp,
          success: true,
          deletionCounts: deletionResult
        });
        
      } catch (error: any) {
        console.error('Account Deletion ERROR:', error);
        console.error('Account Deletion ERROR Stack:', error.stack);
        
        // Log to troubleshooting
        const timestamp = new Date().toISOString();
        console.log(`TROUBLESHOOTING LOG ${timestamp}: Account deletion failed - ${error.message}`);
        
        res.status(500).json({ 
          message: error.message || 'Failed to delete user data',
          code: 'DELETION_ERROR' 
        });
      }
    });
    
    // Import theme preference controller
    const { updateThemePreference } = await import('./controllers-ts/userController');
    app.put(`${apiPath}/user/theme-preference`, protect, updateThemePreference);
    app.post(`${apiPath}/forgot-password`, forgotPassword);
    app.get(`${apiPath}/verify-reset-token/:token`, verifyResetToken);
    app.post(`${apiPath}/reset-password/:token`, resetPassword);
    
    // Google OAuth routes
    const { googleAuth, googleCallback } = await import('./controllers-ts/googleAuthController');
    app.get('/auth/google', googleAuth);
    app.get('/auth/google/callback', googleCallback);
    
    // Email verification routes
    const { sendVerificationEmail, verifyEmail } = await import('./controllers-ts/emailVerificationController');
    app.post(`${apiPath}/send-verification-email`, sendVerificationEmail);
    app.get('/verify-email/:token', verifyEmail);
    
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
    
    // Import nudge controller
    const {
      getNudges,
      createNudge,
      dismissNudge,
      completeNudge,
      checkAndCreateNudges,
      updateOnboardingStage
    } = await import('./controllers-ts/nudgeController');
    
    // Nudge system routes
    app.get(`${apiPath}/nudges`, protect, getNudges);
    app.post(`${apiPath}/nudges`, protect, createNudge);
    app.post(`${apiPath}/nudges/check`, protect, checkAndCreateNudges);
    app.put(`${apiPath}/nudges/:id/dismiss`, protect, dismissNudge);
    app.put(`${apiPath}/nudges/:id/complete`, protect, completeNudge);
    app.put(`${apiPath}/onboarding-stage`, protect, updateOnboardingStage);
    
    // Import CSV controller for transaction uploads
    const { uploadCSV, importCSV } = await import('./controllers-ts/csvController');
    const { createTransactionsBatch } = await import('./controllers-ts/transactionController');
    
    // CSV upload routes
    app.post(`${apiPath}/transactions/upload`, protect, uploadCSV, importCSV);
    app.post(`${apiPath}/transactions/batch`, protect, createTransactionsBatch);
    
    // Delete all transactions route
    app.delete(`${apiPath}/transactions/all`, protect, async (req: any, res) => {
      try {
        // Ensure we have a valid user ID from the auth token
        const userId = req.user.id;
        
        if (!userId) {
          console.error('Clear All Transactions: No user ID found in request');
          return res.status(401).json({
            message: 'User ID not found in request. Authentication may have failed.',
            code: 'AUTH_ERROR'
          });
        }
        
        // Convert to number if it's a string
        const userIdNum = typeof userId === 'string' ? parseInt(userId, 10) : userId;
        
        if (isNaN(userIdNum)) {
          console.error(`Clear All Transactions: Invalid user ID format: ${userId}`);
          return res.status(400).json({
            message: 'Invalid user ID format',
            code: 'INVALID_USER_ID'
          });
        }
        
        console.log(`Clear All Transactions: Starting deletion for user ID: ${userIdNum}`);
        
        // Use database transaction to ensure atomicity
        const deletionResult = await db.transaction(async (tx) => {
          // First, verify user exists and session is valid
          const userExists = await tx.select().from(users).where(eq(users.id, userIdNum)).limit(1);
          if (userExists.length === 0) {
            throw new Error('User not found or session invalid');
          }
          
          // Count transactions before deletion
          const countBefore = await tx.select({ count: sql`count(*)` })
            .from(transactions)
            .where(eq(transactions.userId, userIdNum));
          
          console.log(`Clear All Transactions: Found ${countBefore[0]?.count || 0} transactions to delete`);
          
          // Delete all transactions for this user
          const deletedTransactions = await tx
            .delete(transactions)
            .where(eq(transactions.userId, userIdNum))
            .returning();
          
          console.log(`Clear All Transactions: Successfully deleted ${deletedTransactions.length} transactions`);
          
          return {
            deletedCount: deletedTransactions.length,
            beforeCount: countBefore[0]?.count || 0
          };
        });
        
        // Log success to troubleshooting
        console.log(`Clear All Transactions SUCCESS: User ${userIdNum} - Deleted ${deletionResult.deletedCount} transactions`);
        
        res.json({
          message: deletionResult.deletedCount > 0 
            ? 'All transactions deleted successfully' 
            : 'No transactions found to delete',
          success: true,
          count: deletionResult.deletedCount
        });
        
      } catch (error: any) {
        console.error('Clear All Transactions ERROR:', error);
        console.error('Clear All Transactions ERROR Stack:', error.stack);
        
        // Log to troubleshooting
        const timestamp = new Date().toISOString();
        console.log(`TROUBLESHOOTING LOG ${timestamp}: Clear All Transactions failed - ${error.message}`);
        
        res.status(500).json({ 
          message: error.message || 'Error deleting all transactions',
          code: 'SERVER_ERROR'
        });
      }
    });
    
    // Delete all user data route (comprehensive cascade delete)
    app.delete(`${apiPath}/user/data/all`, protect, async (req: any, res) => {
      try {
        const userId = req.user.id;
        
        if (!userId) {
          console.error('Delete All User Data: No user ID found in request');
          return res.status(401).json({
            message: 'User ID not found in request. Authentication may have failed.',
            code: 'AUTH_ERROR'
          });
        }
        
        const userIdNum = typeof userId === 'string' ? parseInt(userId, 10) : userId;
        
        if (isNaN(userIdNum)) {
          console.error(`Delete All User Data: Invalid user ID format: ${userId}`);
          return res.status(400).json({
            message: 'Invalid user ID format',
            code: 'INVALID_USER_ID'
          });
        }
        
        console.log(`Delete All User Data: Starting comprehensive deletion for user ID: ${userIdNum}`);
        
        // Simple approach: Delete user data in correct order without complex SQL
        await db.transaction(async (tx) => {
          // Delete in order to respect foreign key constraints
          
          // 1. Delete transactions first (no dependencies)
          await tx.delete(transactions).where(eq(transactions.userId, userIdNum));
          
          // 2. Delete budget categories
          await tx.delete(budgetCategories).where(eq(budgetCategories.userId, userIdNum));
          
          // 3. Delete savings goals
          await tx.delete(savingsGoals).where(eq(savingsGoals.userId, userIdNum));
          
          // 4. Delete Rivu scores
          await tx.delete(rivuScores).where(eq(rivuScores.userId, userIdNum));
          
          // 5. Delete nudges
          await tx.delete(nudges).where(eq(nudges.userId, userIdNum));
          
          // 6. Delete transaction accounts
          await tx.delete(transactionAccounts).where(eq(transactionAccounts.userId, userIdNum));
          
          // 7. Delete categories (subcategories will be handled by cascade if configured)
          await tx.delete(categories).where(eq(categories.userId, userIdNum));
          
          // 8. Delete Plaid items (accounts will be handled by cascade if configured)
          await tx.delete(plaidItems).where(eq(plaidItems.userId, userIdNum));
          
          // 9. Finally, delete the user account itself
          await tx.delete(users).where(eq(users.id, userIdNum));
          
          console.log(`Successfully deleted all data and user account for user ${userIdNum}`);
        });
        
        // Log success to troubleshooting
        const timestamp = new Date().toISOString();
        console.log(`Delete All User Data SUCCESS: User ${userIdNum} - All data deleted at ${timestamp}`);
        
        res.json({
          message: 'Account and all data deleted successfully',
          success: true,
          timestamp
        });
        
      } catch (error: any) {
        console.error('Delete All User Data ERROR:', error);
        console.error('Delete All User Data ERROR Stack:', error.stack);
        
        // Log to troubleshooting
        const timestamp = new Date().toISOString();
        console.log(`TROUBLESHOOTING LOG ${timestamp}: Delete All User Data failed - ${error.message}`);
        
        res.status(500).json({ 
          message: error.message || 'Error deleting all user data',
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
    
    // Register Plaid status route
    app.get(`${apiPath}/plaid/status`, (req, res) => {
      const hasCredentials = process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET_PRODUCTION;
      if (!hasCredentials) {
        return res.status(503).json({ error: 'Bank connection services not configured' });
      }
      return res.status(200).json({ status: 'ready' });
    });
    
    // Import and register Plaid routes
    const {
      createLinkToken,
      exchangePublicToken,
      getConnectedAccounts,
      refreshAccountData,
      disconnectAccount,
      getPlaidEnvironment
    } = await import('./controllers-ts/plaidController');
    
    // Import Plaid webhook handler
    const { handlePlaidWebhook } = await import('./controllers-ts/plaidWebhookController');
    
    // Plaid Webhook Route (no authentication required for Plaid webhooks)
    app.post(`${apiPath}/plaid/webhook`, handlePlaidWebhook);
    
    // Plaid Integration Routes
    app.post(`${apiPath}/plaid/create_link_token`, protect, createLinkToken);
    app.post(`${apiPath}/plaid/exchange_public_token`, protect, exchangePublicToken);
    app.post(`${apiPath}/plaid/exchange_token`, protect, exchangePublicToken);
    app.get(`${apiPath}/plaid/environment`, protect, getPlaidEnvironment);
    
    // GET route for Plaid OAuth callback (for production OAuth redirects)
    app.get('/plaid-callback', async (req: any, res: any) => {
      try {
        const { oauth_state_id, link_token, public_token, error } = req.query;
        
        console.log('Plaid OAuth callback received:', { 
          oauth_state_id: oauth_state_id ? 'present' : 'missing',
          link_token: link_token ? 'present' : 'missing', 
          public_token: public_token ? 'present' : 'missing',
          error: error ? error : 'none',
          full_query: req.query,
          session_id: req.sessionID,
          host: req.get('host'),
          origin: req.get('origin'),
          referer: req.get('referer')
        });
        
        // Handle OAuth errors first
        if (error) {
          console.error('Plaid OAuth error received:', error);
          return res.redirect(`/dashboard?error=plaid_oauth_error&message=${encodeURIComponent(error)}`);
        }
        
        // CRITICAL FIX: If no oauth_state_id, this is not a valid OAuth callback
        // Redirect to main app instead of treating as OAuth resume
        if (!oauth_state_id) {
          console.log('Plaid callback without oauth_state_id - redirecting to dashboard');
          return res.redirect('/dashboard');
        }
        
        // Store OAuth callback data in session for frontend to retrieve
        if (!req.session.plaidOAuth) {
          req.session.plaidOAuth = {};
        }
        
        req.session.plaidOAuth[oauth_state_id] = {
          oauth_state_id,
          link_token,
          public_token,
          timestamp: Date.now(),
          query_params: req.query,
          user_agent: req.get('User-Agent'),
          ip: req.ip
        };
        
        // Save session before redirect
        req.session.save((err: any) => {
          if (err) {
            console.error('Error saving session:', err);
          }
          console.log('Stored OAuth callback data in session for state:', oauth_state_id);
          
          // Redirect to frontend with oauth_state_id to complete the flow
          res.redirect(`/plaid-callback?oauth_state_id=${encodeURIComponent(oauth_state_id)}`);
        });
        
      } catch (error: any) {
        console.error('Plaid OAuth callback error:', error);
        res.redirect('/dashboard?error=plaid_oauth_error');
      }
    });
    
    // API endpoint to retrieve OAuth callback data from session
    app.get(`${apiPath}/plaid/oauth_state/:oauth_state_id`, protect, async (req: any, res: any) => {
      try {
        const { oauth_state_id } = req.params;
        
        if (!oauth_state_id) {
          return res.status(400).json({ error: 'Missing oauth_state_id parameter' });
        }
        
        console.log('Retrieving OAuth state from session:', oauth_state_id);
        
        // Check if OAuth data exists in session
        const oauthData = req.session.plaidOAuth?.[oauth_state_id];
        
        if (!oauthData) {
          console.log('No OAuth data found in session for state:', oauth_state_id);
          return res.status(404).json({ 
            error: 'OAuth state not found or expired',
            oauth_state_id 
          });
        }
        
        // Check if data is not too old (30 minutes max)
        const maxAge = 30 * 60 * 1000; // 30 minutes
        if (Date.now() - oauthData.timestamp > maxAge) {
          console.log('OAuth data expired for state:', oauth_state_id);
          delete req.session.plaidOAuth[oauth_state_id];
          return res.status(410).json({ 
            error: 'OAuth state expired',
            oauth_state_id 
          });
        }
        
        console.log('Found OAuth data in session:', {
          oauth_state_id,
          has_link_token: !!oauthData.link_token,
          has_public_token: !!oauthData.public_token,
          timestamp: oauthData.timestamp
        });
        
        // Return the OAuth data
        return res.json({
          success: true,
          oauth_state_id: oauthData.oauth_state_id,
          link_token: oauthData.link_token,
          public_token: oauthData.public_token,
          query_params: oauthData.query_params,
          timestamp: oauthData.timestamp
        });
        
      } catch (error: any) {
        console.error('Error retrieving OAuth state:', error);
        return res.status(500).json({ 
          error: 'Failed to retrieve OAuth state',
          details: error.message
        });
      }
    });
    
    // API endpoint to complete OAuth flow with public token
    app.post(`${apiPath}/plaid/complete_oauth`, protect, async (req: any, res: any) => {
      try {
        const { oauth_state_id, public_token, metadata } = req.body;
        
        if (!oauth_state_id) {
          return res.status(400).json({ error: 'Missing oauth_state_id parameter' });
        }
        
        if (!public_token) {
          return res.status(400).json({ error: 'Missing public_token parameter' });
        }
        
        console.log('Completing OAuth flow with public token for state:', oauth_state_id);
        
        // Use the existing exchange token functionality
        const { exchangePublicToken } = await import('./controllers-ts/plaidController');
        
        // Create a mock request object with the required data
        const mockReq = {
          ...req,
          body: {
            public_token,
            metadata,
            oauth_state_id
          }
        };
        
        // Exchange the public token
        await exchangePublicToken(mockReq as any, res);
        
        // Clean up session data after successful exchange
        if (req.session.plaidOAuth?.[oauth_state_id]) {
          delete req.session.plaidOAuth[oauth_state_id];
        }
        
      } catch (error: any) {
        console.error('Error completing OAuth flow:', error);
        return res.status(500).json({ 
          error: 'Failed to complete OAuth flow',
          details: error.message
        });
      }
    });
    app.get(`${apiPath}/plaid/accounts`, protect, getConnectedAccounts);
    app.post(`${apiPath}/plaid/accounts`, protect, getConnectedAccounts);
    app.post(`${apiPath}/plaid/refresh/:id`, protect, refreshAccountData);
    app.delete(`${apiPath}/plaid/disconnect/:id`, protect, disconnectAccount);
    
    console.log('✅ Auth routes successfully mounted at /api');
    console.log('✅ Plaid routes successfully mounted at /api/plaid');
  } catch (error) {
    console.error('⚠️ Error setting up API routes:', error);
  }
  
  // Current user helper (kept for compatibility with existing code)
  // Fallback user ID for development only - in production, always use req.user._id
  const DEMO_USER_ID = 7;  // Updated to match Eli's user ID in the database
  
  // Helper function to get the authenticated user ID from the request 
  const getCurrentUserId = (req: any): number => {
    // Check if user is authenticated from session or token
    if (req.user && req.user.id) {
      console.log(`Using authenticated user ID: ${req.user.id}`);
      return req.user.id;
    }
    
    // Fallback for development - use demo user ID
    console.warn('Using demo user ID for development - this should not happen in production');
    console.log('req.user:', req.user);
    return DEMO_USER_ID;
  };

  // Authentication middleware to protect routes
  const requireAuth = async (req: any, res: any, next: any) => {
    try {
      // Check if user is authenticated
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }
      next();
    } catch (error) {
      return res.status(401).json({
        message: 'Authentication failed',
        code: 'AUTH_FAILED'
      });
    }
  };
  
  // Dashboard summary API
  app.get("/api/dashboard/summary", requireAuth, async (req, res) => {
    try {
      // Get current user ID
      const userId = getCurrentUserId(req);
      
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
      const currentDateTime = new Date();
      const startOfMonth = new Date(currentDateTime.getFullYear(), currentDateTime.getMonth(), 1);
      
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
      
      // Calculate top spending category based on actual transaction data
      // Using the structure provided in the requirements for more accurate calculation
      let topSpendingCategory = null;
      
      // Get current month transactions only
      const currentDate = new Date();
      const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const currentMonthTransactions = transactions.filter(tx => 
        new Date(tx.date) >= currentMonthStart && 
        tx.type === 'expense'
        // Note: removed pending check as it's not in the transaction schema
      );
      
      // Create a map of category totals
      const categoryTotals: Record<string, number> = {};
      
      // Calculate totals for each category
      currentMonthTransactions.forEach(tx => {
        const category = tx.category || 'Uncategorized';
        
        if (!categoryTotals[category]) {
          categoryTotals[category] = 0;
        }
        
        // Ensure amount is a number before adding
        const amount = typeof tx.amount === 'string' 
          ? parseFloat(tx.amount) 
          : (tx.amount || 0);
          
        if (!isNaN(amount)) {
          categoryTotals[category] += amount;
        }
      });
      
      // Find the top category (with highest total spending)
      if (Object.keys(categoryTotals).length > 0) {
        const topCategoryEntry = Object.entries(categoryTotals)
          .sort((a, b) => b[1] - a[1])[0];
        
        const topCategoryName = topCategoryEntry[0];
        const topAmount = topCategoryEntry[1];
        
        // Calculate percentage relative to monthly expenses
        const percentage = monthlyExpenses > 0 
          ? Math.round((topAmount / monthlyExpenses) * 100) 
          : 0;
          
        topSpendingCategory = {
          name: topCategoryName,
          amount: topAmount,
          percentage: percentage
        };
      }
      
      res.json({
        totalBalance,
        weeklySpending,
        remainingBudget: calculatedRemainingBudget,
        monthlyIncome,
        monthlyExpenses,
        totalBudget,
        totalSpent: totalBudgetSpent, // Add category-based spent amount for consistency with budget page
        topSpendingCategory // Add top spending category data
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
      const userId = getCurrentUserId(req);
      
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
    const userId = getCurrentUserId(req);
    
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
      const userId = getCurrentUserId(req);
      
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
      const userId = getCurrentUserId(req);
      
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
    
    const userId = getCurrentUserId(req);
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

  // Transactions API with enhanced categorization
  app.get("/api/transactions", async (req, res) => {
    const userId = getCurrentUserId(req);
    const transactions = await storage.getTransactions(userId);
    
    // Enhance transactions with automatic categorization
    const enhancedTransactions = transactions.map(transaction => {
      // For CSV uploads, respect the transaction type instead of using raw amount
      const isIncomeTransaction = transaction.type === 'income';
      const effectiveAmount = isIncomeTransaction ? 
        parseFloat(transaction.amount.toString()) : 
        -parseFloat(transaction.amount.toString());
        
      const { category: autoCategory, icon, color } = categorizeTransaction(
        transaction.categoryId ? [transaction.categoryId] : null,
        transaction.merchant,
        effectiveAmount
      );
      
      return {
        ...transaction,
        autoCategory,
        categoryIcon: icon,
        categoryColor: color
      };
    });
    
    res.json(enhancedTransactions);
  });

  // New spending insights endpoint with automatic categorization
  app.get("/api/transactions/insights", async (req, res) => {
    const userId = getCurrentUserId(req);
    const transactions = await storage.getTransactions(userId);
    
    // Convert to format expected by insights generator
    const formattedTransactions = transactions.map(t => ({
      ...t,
      amount: parseFloat(t.amount.toString()),
      categoryId: t.categoryId
    }));
    
    const insights = generateSpendingInsights(formattedTransactions);
    res.json(insights);
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
      const userId = getCurrentUserId(req);
      
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
      const userId = getCurrentUserId(req);
      
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
    
    const userId = getCurrentUserId(req);
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

  // Helper function to get rating based on percentage
  function getRating(percentage: number): string {
    if (percentage >= 80) return "Excellent";
    if (percentage >= 60) return "Good";
    if (percentage >= 40) return "Fair";
    if (percentage >= 20) return "Poor";
    return "Very Poor";
  }

  // Rivu Score API
  app.get("/api/rivu-score", async (req, res) => {
    const userId = getCurrentUserId(req);
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
      const userId = getCurrentUserId(req);
      
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
      const userId = getCurrentUserId(req);
      console.log(`Fetching transaction summary for user: ${userId}`);
      
      // Get transactions for this user
      const transactions = await storage.getTransactions(userId);
      console.log(`Found ${transactions.length} transactions for summary calculation`);
      
      // Get current month and previous month dates
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      
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
    targetDate?: Date | string | null;
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
      targetDate: g.targetDate || undefined,
      monthlySavings: g.monthlySavings ? JSON.parse(g.monthlySavings) : [],
      createdAt: g.createdAt,
      updatedAt: g.updatedAt
    }));
  };
  
  // Get all goals for a user
  app.get("/api/goals", async (req, res) => {
    try {
      const userId = getCurrentUserId(req);
      
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
      console.log(`Found ${dbGoals.length} goals in DB and ${(globalThis as any).appGoals?.length || 0} goals in memory, total: ${dbGoals.length}`);
      
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
      
      const userId = getCurrentUserId(req);
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
      
      const userId = getCurrentUserId(req);
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
      
      const userId = getCurrentUserId(req);
      
      // Get existing goal from database
      const existingGoal = await storage.getSavingsGoal(id);
      
      if (!existingGoal || existingGoal.userId !== userId) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      const schema = z.object({
        name: z.string().min(1).optional(),
        targetAmount: z.number().or(z.string()).transform(val => 
          typeof val === 'string' ? parseFloat(val) : val
        ).refine(val => val > 0, "Target amount must be greater than 0").optional(),
        targetDate: z.string().nullable().optional(),
        amountToAdd: z.number().or(z.string()).transform(val => 
          typeof val === 'string' ? parseFloat(val) : val
        ).optional(),
      });
      
      const validation = schema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validation.error.errors 
        });
      }
      
      // Use validated data
      const validated = validation.data;
      
      // Update basic properties
      // Prepare update data
      const updateData: Record<string, any> = {};
      
      if (validated.name !== undefined) updateData.name = validated.name;
      
      if (validated.targetAmount !== undefined) {
        updateData.targetAmount = validated.targetAmount.toString();
      }
      
      if (validated.targetDate !== undefined) {
        updateData.targetDate = validated.targetDate ? new Date(validated.targetDate) : null;
      }
      
      // Handle adding to current amount if specified
      if (validated.amountToAdd !== undefined && validated.amountToAdd > 0) {
        const currentAmount = parseFloat(String(existingGoal.currentAmount));
        const amountToAdd = validated.amountToAdd;
        updateData.currentAmount = (currentAmount + amountToAdd).toString();
      }
      
      // Update goal in the database
      const updatedGoal = await storage.updateSavingsGoal(id, updateData);
      
      if (!updatedGoal) {
        return res.status(500).json({ message: "Failed to update goal" });
      }
      
      // Format response for client
      const formattedGoal = {
        id: updatedGoal.id,
        userId: updatedGoal.userId,
        name: updatedGoal.name,
        targetAmount: parseFloat(String(updatedGoal.targetAmount)),
        currentAmount: parseFloat(String(updatedGoal.currentAmount)),
        progressPercentage: parseFloat(String(updatedGoal.progressPercentage)),
        targetDate: updatedGoal.targetDate,
        monthlySavings: updatedGoal.monthlySavings ? JSON.parse(updatedGoal.monthlySavings) : [],
        createdAt: updatedGoal.createdAt,
        updatedAt: updatedGoal.updatedAt
      };
      
      // Update Rivu score if amount added
      if (validated.amountToAdd) {
        await storage.calculateRivuScore(userId);
      }
      
      res.json(formattedGoal);
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
      
      const userId = getCurrentUserId(req);
      
      // Get existing goal from database
      const existingGoal = await storage.getSavingsGoal(id);
      
      if (!existingGoal || existingGoal.userId !== userId) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      // Delete goal from database
      const result = await storage.deleteSavingsGoal(id);
      
      if (!result) {
        return res.status(500).json({ message: "Failed to delete goal" });
      }
      
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

  // Enhanced AI Coach API - Behavior-Aware Financial Assistant
  app.post("/api/advice", async (req, res) => {
    try {
      const userId = getCurrentUserId(req);
      const { userPrompt } = req.body;

      // Validate user request
      if (!userPrompt || typeof userPrompt !== 'string' || userPrompt.trim().length === 0) {
        return res.status(400).json({ 
          error: "INVALID_REQUEST",
          message: "Please ask me a specific question about your finances!" 
        });
      }

      // Get comprehensive user data for behavior analysis
      const [user, transactions, goals, rivuScore] = await Promise.all([
        storage.getUser(userId),
        storage.getTransactions(userId),
        storage.getSavingsGoals(userId),
        storage.getRivuScore(userId)
      ]);

      // Calculate financial context
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      const recentTransactions = transactions.filter(t => new Date(t.date) >= thirtyDaysAgo);

      const monthlyIncome = recentTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || '0')), 0);

      const monthlyExpenses = recentTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount || '0')), 0);

      const surplus = monthlyIncome - monthlyExpenses;
      const savingsRate = monthlyIncome > 0 ? (surplus / monthlyIncome) * 100 : 0;

      // Top spending categories
      const categorySpending = recentTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
          const category = t.category || 'Other';
          acc[category] = (acc[category] || 0) + Math.abs(parseFloat(t.amount || '0'));
          return acc;
        }, {} as Record<string, number>);

      const topSpendingCategories = Object.entries(categorySpending)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 3)
        .map(([category]) => category);

      // Build intelligent prompt with real user data
      const intelligentPrompt = `You are Rivu, a personal and friendly AI financial coach. Be warm, direct, and use the user's real financial data to give specific advice.

USER QUESTION: "${userPrompt}"

REAL FINANCIAL SNAPSHOT:
- Monthly surplus: $${surplus.toFixed(0)} ${surplus > 0 ? '(Good! You have money left over)' : '(Warning: You are overspending)'}
- Savings rate: ${savingsRate.toFixed(1)}%
- Income: $${monthlyIncome.toFixed(0)}/month
- Expenses: $${monthlyExpenses.toFixed(0)}/month
- Top spending: ${topSpendingCategories.join(', ') || 'No major categories yet'}
- Rivu Score: ${rivuScore?.score || 'Not calculated yet'}

COACHING GUIDELINES:
1. Be personal and friendly - reference their actual numbers
2. Give specific, actionable advice based on their real financial situation
3. If they have surplus money, suggest specific dollar amounts to allocate
4. Keep responses under 150 words and conversational
5. Be encouraging but honest about their financial health

Respond as their personal financial coach:`;

      // Generate AI response
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: intelligentPrompt }],
        max_tokens: 400,
        temperature: 0.7,
      });

      const coachResponse = completion.choices[0]?.message?.content || 
        "I'm having trouble connecting right now. Please try again in a moment!";

      res.json({
        message: coachResponse,
        financialSnapshot: {
          surplus: surplus,
          savingsRate: savingsRate.toFixed(1),
          topSpending: topSpendingCategories[0] || 'No major expenses'
        }
      });

    } catch (error) {
      console.error('Error generating coach response:', error);
      res.status(500).json({ 
        error: 'Failed to generate coaching response',
        message: 'I apologize, but I\'m having trouble right now. Please try again!' 
      });
    }
  });

  // Create server
  const server = createServer(app);
  return server;
}
