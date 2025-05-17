import express from 'express';
import cookieParser from 'cookie-parser';

// Since we're dealing with CommonJS modules being imported in an ESM context,
// we need to use dynamic imports to avoid issues with default exports

// This function will help us import controllers safely
const importController = async (path: string) => {
  try {
    const controller = await import(path);
    return controller.default || controller;
  } catch (error) {
    console.error(`Error importing ${path}:`, error);
    return {};
  }
};

const router = express.Router();

// Use cookie parser to read JWT cookies
router.use(cookieParser());

// Initialization function to load all controllers and set up routes
async function initializeRoutes() {
  try {
    // Import all controllers
    const auth = await importController('../middleware/auth.js');
    const { protect, loginLimiter } = auth;
    
    const userController = await importController('../controllers/userController.js');
    const { 
      registerUser, loginUser, getUserProfile, 
      updateUserProfile, updateDemographics, 
      updateLoginMetrics, logoutUser,
      forgotPassword, resetPassword,
      updateThemePreference
    } = userController;
    
    const budgetController = await importController('../controllers/budgetController.js');
    const { getBudgets, createBudget, updateBudget, deleteBudget } = budgetController;
    
    const transactionController = await importController('../controllers/transactionController.js');
    const { 
      getTransactions, createTransaction, 
      updateTransaction, deleteTransaction 
    } = transactionController;
    
    const goalController = await importController('../controllers/goalController.js');
    const { getGoals, createGoal, updateGoal, deleteGoal } = goalController;
    
    // Use TypeScript controllers for better type safety
    const rivuScoreController = await importController('../controllers-ts/rivuScoreController.ts');
    const { getRivuScore, refreshRivuScore } = rivuScoreController;
    
    // Import nudge controller
    const nudgeController = await importController('../controllers-ts/nudgeController.ts');
    const { 
      getNudges, 
      createNudge,
      dismissNudge,
      completeNudge,
      checkAndCreateNudges,
      updateOnboardingStage 
    } = nudgeController;
    
    const adviceController = await importController('../controllers/adviceController.js');
    const { getAdvice } = adviceController;
    
    const plaidController = await importController('../controllers/plaidController.js');
    const { createLinkToken, exchangePublicToken, getConnectedAccounts, refreshAccountData, disconnectAccount } = plaidController;
    
    // Set up all routes
    
    // Auth Routes
    router.post('/register', registerUser);
    
    // Apply rate limiting to login route conditionally based on environment
    if (process.env.NODE_ENV === 'production') {
      router.post('/login', loginLimiter, loginUser); // Strict rate limiting in production
    } else {
      // In development, apply the relaxed rate limiter
      router.post('/login', loginLimiter, loginUser);
      console.log('⚠️ Using relaxed rate limiting for login endpoint in development mode');
    }
    
    router.post('/logout', protect, logoutUser);    // Require authentication for logout
    router.get('/user', protect, getUserProfile);
    router.put('/user', protect, updateUserProfile);
    router.put('/user/demographics', protect, updateDemographics);
    router.post('/user/login-metric', protect, updateLoginMetrics);
    router.put('/user/theme-preference', protect, updateThemePreference);
    
    // Password reset routes
    router.post('/forgot-password', forgotPassword);
    router.post('/reset-password/:token', resetPassword);
    
    // Budget Routes
    router.route('/budgets')
      .get(protect, getBudgets)
      .post(protect, createBudget);
    
    router.route('/budgets/:id')
      .put(protect, updateBudget)
      .delete(protect, deleteBudget);
    
    // Transaction Routes
    router.route('/transactions')
      .get(protect, getTransactions)
      .post(protect, createTransaction);
    
    router.route('/transactions/:id')
      .put(protect, updateTransaction)
      .delete(protect, deleteTransaction);
    
    // Goal Routes
    router.route('/goals')
      .get(protect, getGoals)
      .post(protect, createGoal);
    
    router.route('/goals/:id')
      .put(protect, updateGoal)
      .delete(protect, deleteGoal);
    
    // Rivu Score Routes
    router.get('/rivu-score', protect, getRivuScore);
    router.post('/rivu-score/refresh', protect, refreshRivuScore);
    
    // Nudge System Routes
    router.get('/nudges', protect, getNudges);
    router.post('/nudges', protect, createNudge);
    router.post('/nudges/check', protect, checkAndCreateNudges);
    router.put('/nudges/:id/dismiss', protect, dismissNudge);
    router.put('/nudges/:id/complete', protect, completeNudge);
    router.put('/onboarding-stage', protect, updateOnboardingStage);
    
    // AI Advice Route
    router.post('/advice', protect, getAdvice);
    
    // Username uniqueness check endpoint
    router.get('/check-username', async (req, res) => {
      try {
        const username = req.query.username as string;
        
        if (!username) {
          return res.status(400).json({ 
            message: "Username parameter is required", 
            available: false 
          });
        }
        
        // Import storage to check against PostgreSQL database
        const { storage } = await import('../storage.ts');
        
        // Check if username exists in PostgreSQL
        const existingUser = await storage.getUserByUsername(username);
        
        // If no user with that username exists, it's available
        res.json({ 
          available: !existingUser,
          message: existingUser ? "Username is already taken" : "Username is available"
        });
      } catch (error) {
        console.error("Error checking username:", error);
        res.status(500).json({ 
          message: "Error checking username availability",
          available: false
        });
      }
    });
    
    // Plaid Integration Routes
    router.post('/plaid/link-token', protect, createLinkToken);
    router.post('/plaid/exchange-token', protect, exchangePublicToken);
    router.get('/plaid/accounts', protect, getConnectedAccounts);
    router.post('/plaid/refresh/:id', protect, refreshAccountData);
    router.delete('/plaid/disconnect/:id', protect, disconnectAccount);
    
    // Simulated Plaid Transactions (temp until full integration)
    router.get('/plaid/transactions', protect, (req, res) => {
      // This is a placeholder for future Plaid integration
      // For now, it returns the user's existing transactions
      getTransactions(req, res);
    });
    
    console.log('✅ All API routes initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing API routes:', error);
  }
}

// Initialize the routes
initializeRoutes();

export default router;